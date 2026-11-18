import PesertaSidebar from "@/app/assets/components/layout/peserta/sidebar";
import PesertaHeader from "@/app/assets/components/layout/peserta/header";

export default function PesertaTugasView() {
  return (
    <div className="ch-peserta-dashboard">
      <PesertaSidebar activeItem="Tugas" />

      <main className="ch-peserta-main">
        <div className="ch-peserta-content">
          <PesertaHeader title="Daftar Tugas" />

          <section className="ch-peserta-task-intro">
            <h2>Daftar Tugas</h2>
            <p>
              Buka detail untuk mengumpulkan atau mengedit tugas yang sudah
              dikirim.
            </p>
          </section>

          <section
            className="ch-peserta-task-panel"
            aria-label="Daftar tugas divisi"
          >
            <div className="ch-peserta-task-panel-header">
              <h3>Tugas Divisi</h3>
              <span className="ch-peserta-task-count">0 tugas</span>
            </div>

            <div className="ch-peserta-task-empty">
              <svg
                width="38"
                height="38"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6M8 13h8M8 17h8" />
              </svg>

              <h4>Belum ada tugas</h4>
              <p>
                Daftar tugas kelompok akan ditampilkan di sini setelah tugas
                tersedia.
              </p>
            </div>
          </section>

          <aside className="ch-peserta-task-information">
            <div className="ch-peserta-task-information-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 11v5M12 8h.01" />
              </svg>
            </div>

            <p>
              Ketua kelompok dapat mengedit file dan kontributor sebelum
              deadline. Setelah deadline, perubahan dikunci kecuali PIC
              memberikan izin revisi khusus.
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}
