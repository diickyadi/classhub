import Link from "next/link";

import PesertaSidebar from "@/app/assets/components/layout/peserta/sidebar";
import PesertaHeader from "@/app/assets/components/layout/peserta/header";

export interface DashboardTask {
  id: number;
  title: string;
  module: string;
  deadline: string;
  status: "submitted" | "pending";
}

interface DashboardGroup {
  name: string;
  divisionName: string;
  isLeader: boolean;
}

interface DashboardStatistics {
  activeTasks: number;
  submittedTasks: number;
  pendingTasks: number;
  memberCount: number;
}

interface PesertaDashboardViewProps {
  welcomeName: string;
  group: DashboardGroup | null;
  statistics: DashboardStatistics;
  tasks: DashboardTask[];
  error?: string;
}

function formatDeadline(deadline: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(deadline));
}

const statisticItems = [
  {
    key: "activeTasks",
    label: "Tugas aktif",
    description: "Tugas yang masih berjalan",
  },
  {
    key: "submittedTasks",
    label: "Sudah dikumpulkan",
    description: "Tugas yang telah dikumpulkan",
  },
  {
    key: "pendingTasks",
    label: "Belum dikumpulkan",
    description: "Tugas yang perlu diselesaikan",
  },
  {
    key: "memberCount",
    label: "Anggota kelompok",
    description: "Peserta dalam kelompok aktif",
  },
] as const;

export default function PesertaDashboardView({
  welcomeName,
  group,
  statistics,
  tasks,
  error,
}: PesertaDashboardViewProps) {
  return (
    <div className="ch-peserta-dashboard">
      <PesertaSidebar activeItem="Dashboard" />

      <main className="ch-peserta-main">
        <div className="ch-peserta-content">
          <PesertaHeader />

          <section className="ch-peserta-welcome">
            <span className="ch-peserta-welcome-label">
              DASHBOARD PESERTA
            </span>

            <h2>Selamat datang, {welcomeName}</h2>

            <p>
              Berikut ringkasan aktivitas dan perkembangan tugas kelompokmu.
            </p>
          </section>

          <section
            aria-label="Informasi kelompok"
            className="ch-peserta-groupCard"
          >
            <div className="ch-peserta-section-heading">
              <div>
                <span className="ch-peserta-section-eyebrow">
                  KELOMPOK AKTIF
                </span>
                <h3>Informasi Kelompok</h3>
              </div>
              <Link href="/dashboard/peserta/kelompok">
                Lihat kelompok
              </Link>
            </div>

            {group ? (
              <div className="ch-peserta-group-info">
                <div className="ch-peserta-group-info-item">
                  <span>Nama kelompok</span>
                  <strong>{group.name}</strong>
                </div>

                <div className="ch-peserta-group-info-item">
                  <span>Divisi</span>
                  <strong>{group.divisionName}</strong>
                </div>

                <div className="ch-peserta-group-info-item">
                  <span>Peran</span>
                  <strong>{group.isLeader ? "Ketua Kelompok" : "Anggota"}</strong>
                </div>
              </div>
            ) : (
              <div className="ch-peserta-dashboard-empty">
                <strong>Belum tergabung dalam kelompok</strong>
                <p>
                  Informasi kelompok akan muncul setelah kamu terdaftar sebagai
                  anggota kelompok aktif.
                </p>
              </div>
            )}
          </section>

          <section
            aria-label="Ringkasan tugas"
            className="ch-peserta-statistics"
          >
            {statisticItems.map((item) => (
              <article
                className="ch-peserta-statisticCard"
                key={item.key}
              >
                <span className="ch-peserta-statistic-label">
                  {item.label}
                </span>

                <strong className="ch-peserta-statistic-value">
                  {statistics[item.key]}
                </strong>

                <span className="ch-peserta-statistic-description">
                  {item.description}
                </span>
              </article>
            ))}
          </section>

          <section
            aria-label="Tugas yang perlu diperhatikan"
            className="ch-peserta-taskCard"
          >
            <div className="ch-peserta-section-heading">
              <div>
                <span className="ch-peserta-section-eyebrow">
                  DAFTAR TUGAS
                </span>
                <h3>Tugas yang perlu diperhatikan</h3>
                <p>
                  Daftar tugas aktif berdasarkan tenggat pengumpulan.
                </p>
              </div>

              <Link href="/dashboard/peserta/tugas">
                Lihat semua
              </Link>
            </div>

            {error ? (
              <div className="ch-peserta-dashboard-error" role="alert">
                {error}
              </div>
            ) : tasks.length > 0 ? (
              <div className="ch-peserta-dashboard-task-list">
                {tasks.map((task) => (
                  <article
                    className="ch-peserta-dashboard-task"
                    key={task.id}
                  >
                    <div className="ch-peserta-dashboard-task-info">
                      <span>{task.module}</span>
                      <h4>{task.title}</h4>
                      <p>Tenggat: {formatDeadline(task.deadline)}</p>
                    </div>

                    <span
                      className={`ch-peserta-dashboard-task-status ${
                        task.status === "submitted"
                          ? "is-submitted"
                          : "is-pending"
                      }`}
                    >
                      {task.status === "submitted"
                        ? "Sudah dikumpulkan"
                        : "Belum dikumpulkan"}
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <div className="ch-peserta-dashboard-empty">
                <strong>Belum ada tugas aktif</strong>
                <p>
                  Tugas dengan tenggat yang masih berlaku akan ditampilkan di
                  bagian ini.
                </p>
              </div>
            )}
          </section>

          <section
            aria-label="Akses halaman peserta"
            className="ch-peserta-dashboard-quick-links"
          >
            <Link href="/dashboard/peserta/pengumpulan">
              <span>Pengumpulan</span>
              <strong>Lihat pengumpulan tugas</strong>
            </Link>

            <Link href="/dashboard/peserta/riwayat">
              <span>Riwayat</span>
              <strong>Lihat riwayat pengumpulan</strong>
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}
