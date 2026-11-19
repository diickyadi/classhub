export default function GroupEmptyState() {
  return (
    <div className="ch-peserta-group-empty">
      <div className="ch-peserta-group-empty-icon">
        <svg
          width="34"
          height="34"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20v-1a6 6 0 0 1 12 0v1" />
          <path d="M16 5.5a3 3 0 0 1 0 5.8M18 14a5 5 0 0 1 3 4.6V20" />
        </svg>
      </div>

      <h3>Informasi kelompok belum tersedia</h3>
      <p>
        Informasi nama kelompok, ketua, dan anggota akan ditampilkan di sini
        setelah kamu terdaftar dalam kelompok.
      </p>
    </div>
  );
}
