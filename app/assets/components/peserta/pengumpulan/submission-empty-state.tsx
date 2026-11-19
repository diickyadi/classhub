export default function SubmissionEmptyState() {
  return (
    <div className="ch-peserta-submission-empty">
      <div className="ch-peserta-submission-empty-icon">
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6M8 13h8M8 17h5" />
          <path d="m15 17 2 2 4-4" />
        </svg>
      </div>

      <h3>Belum ada pengumpulan</h3>
      <p>
        Pengumpulan tugas kelompok akan muncul di sini setelah ketua kelompok
        mengirimkan berkas tugas.
      </p>
    </div>
  );
}
