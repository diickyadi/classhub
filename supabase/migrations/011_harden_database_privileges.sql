-- CLASSHUB
-- Migration 011: Harden Database Privileges

BEGIN;

-- =====================================================
-- 1. EXISTING TABLE PRIVILEGES
-- =====================================================

REVOKE ALL PRIVILEGES
ON ALL TABLES IN SCHEMA public
FROM anon, authenticated;

-- Authenticated users retain read access through RLS.
GRANT SELECT
ON ALL TABLES IN SCHEMA public
TO authenticated;

-- =====================================================
-- 2. EXISTING SEQUENCE PRIVILEGES
-- =====================================================

REVOKE ALL PRIVILEGES
ON ALL SEQUENCES IN SCHEMA public
FROM anon, authenticated;

-- =====================================================
-- 3. ACCESS CONTROL FUNCTIONS
-- =====================================================

-- These functions are used by RLS policies.
-- Authenticated must retain EXECUTE.
REVOKE ALL PRIVILEGES
ON FUNCTION public.can_access_group(BIGINT)
FROM PUBLIC, anon;

REVOKE ALL PRIVILEGES
ON FUNCTION public.can_access_submission(BIGINT)
FROM PUBLIC, anon;

-- Trigger function: direct execution is unnecessary.
-- Existing triggers remain installed.
REVOKE ALL PRIVILEGES
ON FUNCTION public.set_updated_at()
FROM PUBLIC, anon, authenticated;

-- =====================================================
-- 4. DEFAULT TABLE PRIVILEGES
-- For future objects created by postgres.
-- =====================================================

ALTER DEFAULT PRIVILEGES
FOR ROLE postgres
IN SCHEMA public
REVOKE ALL PRIVILEGES ON TABLES
FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES
FOR ROLE postgres
IN SCHEMA public
GRANT SELECT ON TABLES
TO authenticated;

-- =====================================================
-- 5. DEFAULT SEQUENCE PRIVILEGES
-- =====================================================

ALTER DEFAULT PRIVILEGES
FOR ROLE postgres
IN SCHEMA public
REVOKE ALL PRIVILEGES ON SEQUENCES
FROM anon, authenticated;

-- =====================================================
-- 6. DEFAULT FUNCTION PRIVILEGES
-- Future functions require explicit grants.
-- =====================================================

ALTER DEFAULT PRIVILEGES
FOR ROLE postgres
IN SCHEMA public
REVOKE EXECUTE ON FUNCTIONS
FROM PUBLIC, anon, authenticated;

COMMIT;
