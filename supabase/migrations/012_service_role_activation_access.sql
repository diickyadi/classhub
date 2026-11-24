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

-- Allow activation and first-password-change APIs to update their required columns.
GRANT UPDATE (account_status, must_change_password)
ON TABLE public.profiles
TO service_role;

COMMIT;
