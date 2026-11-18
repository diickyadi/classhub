-- =========================================================
-- CLASSHUB
-- Migration 006: Account Activation
-- =========================================================

-- 1. ACCOUNT STATUS
-- Existing accounts will be activated below.
-- Newly created accounts default to pending.

ALTER TABLE public.profiles
ADD COLUMN account_status VARCHAR(20) NOT NULL DEFAULT 'pending';

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_account_status_check
CHECK (account_status IN ('pending', 'active', 'inactive'));

-- Preserve access for all accounts that existed before this migration.
UPDATE public.profiles
SET account_status = 'active';

COMMENT ON COLUMN public.profiles.account_status IS
'Account activation status: pending, active, or inactive';

-- 2. ACCESS HELPERS
-- Only active accounts can use PIC, participant, and group access.

CREATE OR REPLACE FUNCTION public.is_pic_for_division(
    p_division_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.division_pic_assignments d
        JOIN public.profiles p ON p.id = d.pic_user_id
        WHERE d.division_id = p_division_id
          AND d.pic_user_id = (SELECT auth.uid())
          AND d.ended_at IS NULL
          AND p.account_status = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_active_participant_in_division(
    p_division_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.participant_divisions pd
        JOIN public.profiles p ON p.id = pd.user_id
        WHERE pd.division_id = p_division_id
          AND pd.user_id = (SELECT auth.uid())
          AND pd.ended_at IS NULL
          AND p.account_status = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_active_group_member(
    p_group_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.group_members gm
        JOIN public.profiles p ON p.id = gm.user_id
        WHERE gm.group_id = p_group_id
          AND gm.user_id = (SELECT auth.uid())
          AND gm.left_at IS NULL
          AND p.account_status = 'active'
    );
$$;

-- 3. SUBMISSION ACCOUNT PROTECTION
-- The account trigger checks authenticated callers.
-- The contributor trigger always requires an active contributor,
-- including for service-role operations.

CREATE OR REPLACE FUNCTION public.enforce_active_submission_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF auth.uid() IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM public.profiles p
           WHERE p.id = auth.uid()
             AND p.account_status = 'active'
       ) THEN
        RAISE EXCEPTION 'Account is not active';
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_active_submission_contributor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = NEW.user_id
          AND p.account_status = 'active'
    ) THEN
        RAISE EXCEPTION 'Contributor account is not active';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS submissions_require_active_account
ON public.submissions;

CREATE TRIGGER submissions_require_active_account
BEFORE INSERT OR UPDATE ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_active_submission_account();

DROP TRIGGER IF EXISTS submission_members_require_active_account
ON public.submission_members;

CREATE TRIGGER submission_members_require_active_account
BEFORE INSERT ON public.submission_members
FOR EACH ROW
EXECUTE FUNCTION public.enforce_active_submission_contributor();

-- 4. FUNCTION PERMISSIONS
-- Preserve authenticated access to the existing security helpers.

REVOKE ALL ON FUNCTION public.is_pic_for_division(BIGINT)
FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.is_active_participant_in_division(BIGINT)
FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.is_active_group_member(BIGINT)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_pic_for_division(BIGINT)
TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_active_participant_in_division(BIGINT)
TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_active_group_member(BIGINT)
TO authenticated;

-- Trigger functions are not intended for direct invocation.

REVOKE ALL ON FUNCTION public.enforce_active_submission_account()
FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.enforce_active_submission_contributor()
FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.enforce_active_submission_account()
TO postgres;

GRANT EXECUTE ON FUNCTION public.enforce_active_submission_contributor()
TO postgres;

-- can_access_group and can_access_submission already compose
-- the three updated helper functions above.


-- 006 REVIEW PATCH: ACTIVE ACCOUNT ACCESS

-- Helper untuk memeriksa status akun pengguna yang sedang login.
CREATE OR REPLACE FUNCTION public.is_account_active()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = (SELECT auth.uid())
          AND p.account_status = 'active'
    );
$$;

REVOKE ALL ON FUNCTION public.is_account_active()
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_account_active()
TO authenticated;

-- Batasi akses penugasan PIC untuk akun aktif.
DROP POLICY IF EXISTS division_pic_assignments_select
ON public.division_pic_assignments;

CREATE POLICY division_pic_assignments_select
ON public.division_pic_assignments
FOR SELECT TO authenticated
USING (
    public.is_account_active()
    AND (
        pic_user_id = (SELECT auth.uid())
        OR public.is_pic_for_division(division_id)
    )
);


-- Batasi akses permintaan transfer divisi untuk akun aktif.
DROP POLICY IF EXISTS division_transfer_requests_select_accessible
ON public.division_transfer_requests;

CREATE POLICY division_transfer_requests_select_accessible
ON public.division_transfer_requests
FOR SELECT TO authenticated
USING (
    public.is_account_active()
    AND (
        participant_user_id = (SELECT auth.uid())
        OR public.is_pic_for_division(from_division_id)
        OR public.is_pic_for_division(to_division_id)
    )
);

-- Batasi pembacaan data keanggotaan sendiri untuk akun aktif.
DROP POLICY IF EXISTS participant_divisions_select
ON public.participant_divisions;

CREATE POLICY participant_divisions_select
ON public.participant_divisions
FOR SELECT TO authenticated
USING (
    (
        user_id = (SELECT auth.uid())
        AND public.is_account_active()
    )
    OR public.is_pic_for_division(division_id)
);

DROP POLICY IF EXISTS group_members_select_accessible
ON public.group_members;

CREATE POLICY group_members_select_accessible
ON public.group_members
FOR SELECT TO authenticated
USING (
    (
        user_id = (SELECT auth.uid())
        AND public.is_account_active()
    )
    OR public.can_access_group(group_id)
);

-- Profil anggota grup hanya dapat dilihat oleh pengguna aktif.
DROP POLICY IF EXISTS profiles_select_group_members
ON public.profiles;

CREATE POLICY profiles_select_group_members
ON public.profiles
FOR SELECT TO authenticated
USING (
    public.is_account_active()
    AND profiles.account_status = 'active'
    AND (
        EXISTS (
            SELECT 1
            FROM public.group_members gm_self
            JOIN public.group_members gm_other
              ON gm_other.group_id = gm_self.group_id
            WHERE gm_self.user_id = (SELECT auth.uid())
              AND gm_self.left_at IS NULL
              AND gm_other.user_id = profiles.id
              AND gm_other.left_at IS NULL
        )
        OR EXISTS (
            SELECT 1
            FROM public.participant_divisions pd
            WHERE pd.user_id = profiles.id
              AND pd.ended_at IS NULL
              AND public.is_pic_for_division(pd.division_id)
        )
    )
);

-- Fungsi submit dengan pemeriksaan status akun dan kontributor aktif.
CREATE OR REPLACE FUNCTION public.submit_group_assignment(
    p_group_id BIGINT,
    p_assignment_id BIGINT,
    p_file_path TEXT,
    p_file_name VARCHAR(255),
    p_original_file_name VARCHAR(255),
    p_file_size BIGINT,
    p_file_type VARCHAR(150),
    p_contributor_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_division_id BIGINT;
    v_deadline TIMESTAMPTZ;
    v_revision_allowed_until TIMESTAMPTZ;
    v_submission_id BIGINT;
    v_revision_number INTEGER;
    v_existing RECORD;
    v_storage RECORD;
    v_contributor_count INTEGER;
    v_status VARCHAR(20);
    v_is_revision BOOLEAN := FALSE;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    PERFORM 1
    FROM public.profiles p
    WHERE p.id = v_user_id
      AND p.account_status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Account is not active';
    END IF;

    IF p_file_size IS NULL OR p_file_size <= 0
       OR p_file_size > 52428800 THEN
        RAISE EXCEPTION 'Invalid file size';
    END IF;

    IF p_file_type NOT IN (
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) THEN
        RAISE EXCEPTION 'Unsupported file type';
    END IF;

    IF p_original_file_name IS NULL
       OR length(trim(p_original_file_name)) = 0
       OR length(p_original_file_name) > 255 THEN
        RAISE EXCEPTION 'Invalid original file name';
    END IF;

    IF p_file_name IS NULL
       OR p_file_name !~ '^submission-[0-9a-fA-F-]{36}\.(pdf|doc|docx|xls|xlsx)$' THEN
        RAISE EXCEPTION 'Invalid generated file name';
    END IF;

    IF p_file_path IS NULL
       OR p_file_path !~ (
           '^' || p_group_id::TEXT || '/' ||
           p_assignment_id::TEXT ||
           '/submission-[0-9a-fA-F-]{36}\.(pdf|doc|docx|xls|xlsx)$'
       ) THEN
        RAISE EXCEPTION 'Invalid storage path';
    END IF;

    -- Lock group to prevent concurrent first submissions.
    SELECT g.division_id
    INTO v_division_id
    FROM public.groups g
    WHERE g.id = p_group_id
      AND g.archived_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Group not found or archived';
    END IF;

    -- Only the active group leader may submit.
    IF NOT EXISTS (
        SELECT 1
        FROM public.group_members gm
        WHERE gm.group_id = p_group_id
          AND gm.user_id = v_user_id
          AND gm.is_leader = TRUE
          AND gm.left_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Only the active group leader can submit';
    END IF;

    -- Assignment must belong to the group's division.
    SELECT a.deadline
    INTO v_deadline
    FROM public.assignments a
    WHERE a.id = p_assignment_id
      AND a.division_id = v_division_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Assignment not found for this division';
    END IF;

    -- Verify that the uploaded object exists in private storage.
    SELECT
        o.metadata->>'size' AS file_size,
        o.metadata->>'mimetype' AS mime_type
    INTO v_storage
    FROM storage.objects o
    WHERE o.bucket_id = 'submissions'
      AND o.name = p_file_path;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Uploaded file not found in storage';
    END IF;

    IF v_storage.file_size IS NULL
       OR v_storage.file_size !~ '^[0-9]+$'
       OR v_storage.file_size::BIGINT <> p_file_size THEN
        RAISE EXCEPTION 'Uploaded file size does not match';
    END IF;

    IF v_storage.mime_type IS DISTINCT FROM p_file_type THEN
        RAISE EXCEPTION 'Uploaded file type does not match';
    END IF;

    -- Validate contributors: 1 to 7 active members, without duplicates.
    IF p_contributor_ids IS NULL
       OR cardinality(p_contributor_ids) < 1
       OR cardinality(p_contributor_ids) > 7 THEN
        RAISE EXCEPTION 'Select between 1 and 7 contributors';
    END IF;

    -- Lock active contributor profiles in stable order.
    PERFORM p.id
    FROM public.profiles p
    WHERE p.id = ANY(p_contributor_ids)
      AND p.account_status = 'active'
    ORDER BY p.id
    FOR UPDATE;

    -- Lock selected active group memberships.
    PERFORM gm.id
    FROM public.group_members gm
    WHERE gm.group_id = p_group_id
      AND gm.user_id = ANY(p_contributor_ids)
      AND gm.left_at IS NULL
    ORDER BY gm.user_id
    FOR UPDATE;

    -- Validate active membership and reject duplicate contributor IDs.
    SELECT count(DISTINCT gm.user_id)
    INTO v_contributor_count
    FROM unnest(p_contributor_ids) AS selected(user_id)
    JOIN public.group_members gm
      ON gm.user_id = selected.user_id
     AND gm.group_id = p_group_id
     AND gm.left_at IS NULL
    JOIN public.profiles p
      ON p.id = gm.user_id
     AND p.account_status = 'active';

    IF v_contributor_count <> cardinality(p_contributor_ids) THEN
        RAISE EXCEPTION 'One or more contributors are not active group members';
    END IF;

    -- Lock an existing submission, if any.
    SELECT s.*
    INTO v_existing
    FROM public.submissions s
    WHERE s.assignment_id = p_assignment_id
      AND s.group_id = p_group_id
    FOR UPDATE;

    IF FOUND THEN
        v_is_revision := TRUE;
        v_submission_id := v_existing.id;
        v_revision_allowed_until := v_existing.revision_allowed_until;

        IF v_existing.file_path = p_file_path THEN
            RAISE EXCEPTION 'The uploaded file is already the current submission';
        END IF;

        -- Revisions after deadline require PIC permission.
        IF NOW() > v_deadline
           AND (
               v_revision_allowed_until IS NULL
               OR NOW() > v_revision_allowed_until
           ) THEN
            RAISE EXCEPTION 'Revision period has expired';
        END IF;

        SELECT COALESCE(MAX(r.revision_number), 0) + 1
        INTO v_revision_number
        FROM public.submission_revisions r
        WHERE r.submission_id = v_submission_id;

        -- Preserve the previous file in revision history.
        INSERT INTO public.submission_revisions (
            submission_id,
            revision_number,
            uploaded_by,
            file_path,
            file_name,
            original_file_name,
            file_size,
            file_type
        ) VALUES (
            v_submission_id,
            v_revision_number,
            v_user_id,
            v_existing.file_path,
            v_existing.file_name,
            v_existing.original_file_name,
            v_existing.file_size,
            v_existing.file_type
        );

        -- Replace current submission file.
        UPDATE public.submissions
        SET file_path = p_file_path,
            file_name = p_file_name,
            original_file_name = p_original_file_name,
            file_size = p_file_size,
            file_type = p_file_type,
            updated_at = NOW()
        WHERE id = v_submission_id;

        -- Keep contributor list aligned with the latest file.
        DELETE FROM public.submission_members
        WHERE submission_id = v_submission_id;

    ELSE
        v_status := CASE
            WHEN NOW() <= v_deadline THEN 'submitted'
            ELSE 'late'
        END;

        INSERT INTO public.submissions (
            assignment_id,
            group_id,
            division_id,
            submitted_by,
            status,
            file_path,
            file_name,
            original_file_name,
            file_size,
            file_type
        ) VALUES (
            p_assignment_id,
            p_group_id,
            v_division_id,
            v_user_id,
            v_status,
            p_file_path,
            p_file_name,
            p_original_file_name,
            p_file_size,
            p_file_type
        )
        RETURNING id INTO v_submission_id;
    END IF;

    -- Save contributor name snapshots.
    INSERT INTO public.submission_members (
        submission_id,
        user_id,
        full_name_snapshot
    )
    SELECT
        v_submission_id,
        p.id,
        p.full_name
    FROM public.profiles p
    WHERE p.id = ANY(p_contributor_ids)
      AND p.account_status = 'active';

    RETURN jsonb_build_object(
        'success', TRUE,
        'submission_id', v_submission_id,
        'is_revision', v_is_revision,
        'revision_number', CASE
            WHEN v_is_revision THEN v_revision_number
            ELSE 0
        END,
        'status', CASE
            WHEN v_is_revision THEN v_existing.status
            ELSE v_status
        END
    );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_group_assignment(
    BIGINT, BIGINT, TEXT, VARCHAR, VARCHAR, BIGINT, VARCHAR, UUID[]
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.submit_group_assignment(
    BIGINT, BIGINT, TEXT, VARCHAR, VARCHAR, BIGINT, VARCHAR, UUID[]
) TO authenticated;

-- 8. STORAGE ACCESS PROTECTION
-- Hanya akun aktif yang boleh membaca file submission.

DROP POLICY IF EXISTS submissions_storage_select_accessible
ON storage.objects;

CREATE POLICY submissions_storage_select_accessible
ON storage.objects
FOR SELECT
TO authenticated
USING (
    public.is_account_active()
    AND bucket_id = 'submissions'
    AND CASE
        WHEN split_part(name, '/', 1) ~ '^[0-9]+$'
        THEN public.can_access_group(
            split_part(name, '/', 1)::BIGINT
        )
        ELSE FALSE
    END
);
-- =========================================================
-- =========================================================
-- 9. AUTOMATIC PROFILE CREATION
-- Akun baru dibuat sebagai PESERTA dengan status pending.
-- Penetapan divisi dilakukan terpisah oleh server melalui PIC.
-- =========================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        full_name,
        role
    )
    VALUES (
        NEW.id,
        COALESCE(
            NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''),
            NULLIF(TRIM(NEW.raw_user_meta_data ->> 'name'), ''),
            SPLIT_PART(NEW.email, '@', 1)
        ),
        'PESERTA'
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user()
FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.handle_new_user()
TO postgres;
