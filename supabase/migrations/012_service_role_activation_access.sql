-- =========================================================
-- CLASSHUB
-- Migration 012: Service Role Activation Access
-- =========================================================

BEGIN;

-- Admin API requires explicit read access to verify
-- participants and their division assignments.
GRANT SELECT
ON TABLE public.participant_divisions
TO service_role;

GRANT SELECT
ON TABLE public.profiles
TO service_role;

-- Allow the activation API to modify account status only.
GRANT UPDATE (account_status)
ON TABLE public.profiles
TO service_role;

COMMIT;
