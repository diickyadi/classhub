-- =========================================================
-- 007. FIRST PASSWORD CHANGE
-- Menandai akun yang wajib mengganti password sementara.
-- Akun lama tetap tidak diwajibkan mengganti password.
-- =========================================================

ALTER TABLE public.profiles
ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.must_change_password IS
'TRUE jika pengguna wajib mengganti password sementara sebelum mengakses fitur aplikasi.';
