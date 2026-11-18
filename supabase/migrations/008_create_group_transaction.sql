-- =========================================================
-- CLASSHUB
-- Migration 008: Atomic Group Creation
-- =========================================================

CREATE OR REPLACE FUNCTION public.create_group_with_members(
    p_name TEXT,
    p_member_ids UUID[],
    p_leader_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_division_id BIGINT;
    v_group_id BIGINT;
    v_valid_count INTEGER;
    v_name TEXT;
    v_role TEXT;
    v_account_status TEXT;
    v_must_change_password BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    v_name := BTRIM(p_name);

    -- Authentication.
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Validate group name.
    IF v_name IS NULL OR v_name = '' OR LENGTH(v_name) > 150 THEN
        RAISE EXCEPTION 'Group name must contain 1 to 150 characters';
    END IF;

    -- Validate selected members.
    IF p_member_ids IS NULL
       OR CARDINALITY(p_member_ids) < 1
       OR p_leader_id IS NULL
       OR CARDINALITY(p_member_ids) <> (
           SELECT COUNT(DISTINCT selected.user_id)
           FROM UNNEST(p_member_ids) AS selected(user_id)
       )
       OR NOT (p_leader_id = ANY(p_member_ids)) THEN
        RAISE EXCEPTION 'Invalid group members or leader';
    END IF;

    -- Lock and validate PIC profile.
    SELECT
        p.role,
        p.account_status,
        p.must_change_password
    INTO
        v_role,
        v_account_status,
        v_must_change_password
    FROM public.profiles p
    WHERE p.id = v_user_id
    FOR UPDATE;

    IF NOT FOUND
       OR v_role <> 'PIC'
       OR v_account_status <> 'active'
       OR v_must_change_password IS DISTINCT FROM FALSE THEN
        RAISE EXCEPTION 'Active PIC account required';
    END IF;

    -- Get and lock the PIC's active division assignment.
    SELECT d.division_id
    INTO v_division_id
    FROM public.division_pic_assignments d
    WHERE d.pic_user_id = v_user_id
      AND d.ended_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active division assignment not found';
    END IF;

    -- Validate and lock the division.
    PERFORM 1
    FROM public.divisions d
    WHERE d.id = v_division_id
      AND d.is_active = TRUE
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Division is inactive or unavailable';
    END IF;

    -- Lock selected participant profiles in stable order.
    PERFORM p.id
    FROM public.profiles p
    WHERE p.id = ANY(p_member_ids)
    ORDER BY p.id
    FOR UPDATE;

    -- Lock active participant division assignments.
    PERFORM pd.id
    FROM public.participant_divisions pd
    WHERE pd.user_id = ANY(p_member_ids)
      AND pd.division_id = v_division_id
      AND pd.ended_at IS NULL
    ORDER BY pd.user_id
    FOR UPDATE;

    -- Every selected participant must:
    -- 1. Exist and have PESERTA role.
    -- 2. Have an active account.
    -- 3. Have completed the temporary password change.
    -- 4. Have an active assignment in this PIC's division.
    -- 5. Not already belong to an active group.
    SELECT COUNT(DISTINCT selected.user_id)
    INTO v_valid_count
    FROM UNNEST(p_member_ids) AS selected(user_id)
    JOIN public.profiles p
      ON p.id = selected.user_id
     AND p.role = 'PESERTA'
     AND p.account_status = 'active'
     AND p.must_change_password = FALSE
    JOIN public.participant_divisions pd
      ON pd.user_id = p.id
     AND pd.division_id = v_division_id
     AND pd.ended_at IS NULL
    WHERE NOT EXISTS (
        SELECT 1
        FROM public.group_members gm
        WHERE gm.user_id = p.id
          AND gm.left_at IS NULL
    );

    IF v_valid_count <> CARDINALITY(p_member_ids) THEN
        RAISE EXCEPTION
            'One or more participants are unavailable or already assigned to a group';
    END IF;

    -- Create group.
    INSERT INTO public.groups (
        division_id,
        name
    )
    VALUES (
        v_division_id,
        v_name
    )
    RETURNING id INTO v_group_id;

    -- Insert all members and designate the selected leader.
    INSERT INTO public.group_members (
        group_id,
        division_id,
        participant_division_id,
        user_id,
        is_leader
    )
    SELECT
        v_group_id,
        v_division_id,
        pd.id,
        selected.user_id,
        selected.user_id = p_leader_id
    FROM UNNEST(p_member_ids) AS selected(user_id)
    JOIN public.participant_divisions pd
      ON pd.user_id = selected.user_id
     AND pd.division_id = v_division_id
     AND pd.ended_at IS NULL;

    RETURN JSONB_BUILD_OBJECT(
        'success', TRUE,
        'group_id', v_group_id,
        'division_id', v_division_id,
        'name', v_name,
        'member_count', CARDINALITY(p_member_ids),
        'leader_id', p_leader_id
    );
END;
$$;

-- Restrict RPC execution.
REVOKE ALL ON FUNCTION public.create_group_with_members(TEXT, UUID[], UUID)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_group_with_members(TEXT, UUID[], UUID)
TO authenticated;

-- =========================================================
-- END MIGRATION 008
-- =========================================================
