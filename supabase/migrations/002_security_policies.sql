-- =========================================================
-- VINIX7
-- Migration 002: Security and Read Policies
-- =========================================================

-- 1. HELPER FUNCTIONS

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
        WHERE d.division_id = p_division_id
          AND d.pic_user_id = (SELECT auth.uid())
          AND d.ended_at IS NULL
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
        WHERE pd.division_id = p_division_id
          AND pd.user_id = (SELECT auth.uid())
          AND pd.ended_at IS NULL
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
        WHERE gm.group_id = p_group_id
          AND gm.user_id = (SELECT auth.uid())
          AND gm.left_at IS NULL
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_group(
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
        FROM public.groups g
        WHERE g.id = p_group_id
          AND (
              public.is_pic_for_division(g.division_id)
              OR public.is_active_group_member(g.id)
          )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_submission(
    p_submission_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.submissions s
        WHERE s.id = p_submission_id
          AND public.can_access_group(s.group_id)
    );
$$;

-- 2. FUNCTION PERMISSIONS

REVOKE ALL ON FUNCTION public.is_pic_for_division(BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_participant_in_division(BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_group_member(BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_group(BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_submission(BIGINT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_pic_for_division(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_participant_in_division(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_group_member(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_group(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_submission(BIGINT) TO authenticated;

-- 3. DIVISIONS

CREATE POLICY divisions_select_own
ON public.divisions
FOR SELECT TO authenticated
USING (
    public.is_pic_for_division(id)
    OR public.is_active_participant_in_division(id)
);

-- 4. PROFILES

CREATE POLICY profiles_select_self
ON public.profiles
FOR SELECT TO authenticated
USING (id = (SELECT auth.uid()));

-- 5. DIVISION PIC ASSIGNMENTS

CREATE POLICY division_pic_assignments_select
ON public.division_pic_assignments
FOR SELECT TO authenticated
USING (
    pic_user_id = (SELECT auth.uid())
    OR public.is_pic_for_division(division_id)
);

-- 6. PARTICIPANT DIVISIONS

CREATE POLICY participant_divisions_select
ON public.participant_divisions
FOR SELECT TO authenticated
USING (
    user_id = (SELECT auth.uid())
    OR public.is_pic_for_division(division_id)
);

-- 7. GROUPS

CREATE POLICY groups_select_accessible
ON public.groups
FOR SELECT TO authenticated
USING (public.can_access_group(id));

-- 8. GROUP MEMBERS

CREATE POLICY group_members_select_accessible
ON public.group_members
FOR SELECT TO authenticated
USING (
    user_id = (SELECT auth.uid())
    OR public.can_access_group(group_id)
);

-- 9. ASSIGNMENTS

CREATE POLICY assignments_select_accessible
ON public.assignments
FOR SELECT TO authenticated
USING (
    public.is_pic_for_division(division_id)
    OR public.is_active_participant_in_division(division_id)
);

-- 10. SUBMISSIONS

CREATE POLICY submissions_select_accessible
ON public.submissions
FOR SELECT TO authenticated
USING (public.can_access_group(group_id));

-- 11. SUBMISSION REVISIONS

CREATE POLICY submission_revisions_select_accessible
ON public.submission_revisions
FOR SELECT TO authenticated
USING (public.can_access_submission(submission_id));

-- 12. SUBMISSION MEMBERS

CREATE POLICY submission_members_select_accessible
ON public.submission_members
FOR SELECT TO authenticated
USING (public.can_access_submission(submission_id));

-- 13. DIVISION TRANSFER REQUESTS

CREATE POLICY division_transfer_requests_select_accessible
ON public.division_transfer_requests
FOR SELECT TO authenticated
USING (
    participant_user_id = (SELECT auth.uid())
    OR public.is_pic_for_division(from_division_id)
    OR public.is_pic_for_division(to_division_id)
);

-- =========================================================
-- Catatan:
-- Migration ini hanya memberikan akses SELECT.
-- Operasi INSERT, UPDATE, DELETE akan dirancang terpisah.
-- =========================================================

-- 14. GROUP MEMBER PROFILE ACCESS

CREATE POLICY profiles_select_group_members
ON public.profiles
FOR SELECT TO authenticated
USING (
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
);
