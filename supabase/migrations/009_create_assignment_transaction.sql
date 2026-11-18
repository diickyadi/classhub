-- =========================================================
-- CLASSHUB
-- Migration 009: Secure Assignment Creation
-- =========================================================

CREATE OR REPLACE FUNCTION public.create_assignment(
    p_title TEXT,
    p_module TEXT,
    p_description TEXT,
    p_deadline TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_division_id BIGINT;
    v_assignment_id BIGINT;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Lock and validate the PIC account.
    PERFORM 1
    FROM public.profiles p
    WHERE p.id = v_user_id
      AND p.role = 'PIC'
      AND p.account_status = 'active'
      AND p.must_change_password = FALSE
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PIC account is not authorized';
    END IF;

    -- Validate assignment fields.
    IF p_title IS NULL
       OR length(trim(p_title)) = 0
       OR length(trim(p_title)) > 255 THEN
        RAISE EXCEPTION 'Invalid assignment title';
    END IF;

    IF p_module IS NULL
       OR length(trim(p_module)) = 0
       OR length(trim(p_module)) > 100 THEN
        RAISE EXCEPTION 'Invalid assignment module';
    END IF;

    IF p_description IS NOT NULL
       AND length(p_description) > 10000 THEN
        RAISE EXCEPTION 'Assignment description is too long';
    END IF;

    IF p_deadline IS NULL
       OR p_deadline <= v_now
       OR p_deadline > v_now + INTERVAL '7 days' THEN
        RAISE EXCEPTION 'Deadline must be within the next 7 days';
    END IF;

    -- Find and lock the PIC's active division assignment.
    SELECT dpa.division_id
    INTO v_division_id
    FROM public.division_pic_assignments dpa
    JOIN public.divisions d
      ON d.id = dpa.division_id
    WHERE dpa.pic_user_id = v_user_id
      AND dpa.ended_at IS NULL
      AND d.is_active = TRUE
    FOR UPDATE OF dpa, d;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No active division assignment';
    END IF;

    -- Create the assignment.
    INSERT INTO public.assignments (
        division_id,
        created_by,
        title,
        module,
        description,
        deadline
    )
    VALUES (
        v_division_id,
        v_user_id,
        trim(p_title),
        trim(p_module),
        NULLIF(trim(p_description), ''),
        p_deadline
    )
    RETURNING id INTO v_assignment_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'assignment_id', v_assignment_id,
        'division_id', v_division_id,
        'title', trim(p_title),
        'module', trim(p_module),
        'deadline', p_deadline
    );
END;
$$;

REVOKE ALL ON FUNCTION public.create_assignment(
    TEXT, TEXT, TEXT, TIMESTAMPTZ
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_assignment(
    TEXT, TEXT, TEXT, TIMESTAMPTZ
) TO authenticated;

-- =========================================================
