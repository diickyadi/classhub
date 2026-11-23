-- =========================================================
-- VINIX7
-- Migration 003: Private Submission Storage Security
-- =========================================================

-- File hanya dapat dibaca oleh anggota aktif kelompok
-- atau PIC dari divisi kelompok tersebut.
--
-- Struktur path:
-- group_id/assignment_id/submission-uuid.ext

CREATE POLICY submissions_storage_select_accessible
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'submissions'
    AND CASE
        WHEN split_part(name, '/', 1) ~ '^[0-9]+$'
        THEN public.can_access_group(
            split_part(name, '/', 1)::BIGINT
        )
        ELSE FALSE
    END
);

-- Tidak ada INSERT, UPDATE, atau DELETE policy untuk
-- authenticated. Upload dan perubahan file dilakukan
-- melalui API server dengan Supabase secret key.
