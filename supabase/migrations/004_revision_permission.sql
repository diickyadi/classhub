-- =========================================================
-- CLASSHUB
-- Migration 004: PIC Revision Permission
-- =========================================================

ALTER TABLE public.submissions
ADD COLUMN revision_allowed_until TIMESTAMPTZ;

COMMENT ON COLUMN public.submissions.revision_allowed_until IS
'Batas waktu revisi khusus yang diberikan PIC. NULL berarti tidak ada izin revisi khusus.';
