export default function HistoryEmptyState() {
  return (
    <div className="ch-peserta-history-empty">
      <div className="ch-peserta-history-empty-icon">
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
          <path d="M3 12a9 9 0 1 0 2.64-6.36L3 8" />
          <path d="M3 3v5h5" />
          <path d="M12 7v5l3 2" />
        </svg>
      </div>

      <h3>Belum ada riwayat pengumpulan</h3>
      <p>
        Catatan pengumpulan tugas kelompok akan ditampilkan di sini setelah
        tugas berhasil dikirimkan.
      </p>
    </div>
  );
}
