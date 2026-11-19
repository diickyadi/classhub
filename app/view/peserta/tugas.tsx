"use client";

import { useEffect, useState } from "react";
import PesertaSidebar from "@/app/assets/components/layout/peserta/sidebar";
import PesertaHeader from "@/app/assets/components/layout/peserta/header";

export interface TaskItem {
  id: number;
  title: string;
  module: string;
  description: string;
  deadline: string;
  submissionStatus: "submitted" | "late" | null;
}

interface PesertaTugasViewProps {
  tasks: TaskItem[];
  hasGroup: boolean;
  error?: string;
}

function formatDeadline(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function getTaskStatus(task: TaskItem) {
  if (task.submissionStatus === "submitted") {
    return { label: "Sudah dikumpulkan", className: "submitted" };
  }

  if (task.submissionStatus === "late") {
    return { label: "Terlambat dikumpulkan", className: "late" };
  }

  if (new Date(task.deadline).getTime() < Date.now()) {
    return { label: "Deadline terlewat", className: "expired" };
  }

  return { label: "Belum dikumpulkan", className: "pending" };
}

export default function PesertaTugasView({
  tasks,
  hasGroup,
  error,
}: PesertaTugasViewProps) {
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  useEffect(() => {
    if (!selectedTask) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedTask(null);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedTask]);

  return (
    <div className="ch-peserta-dashboard">
      <PesertaSidebar activeItem="Tugas" />

      <main className="ch-peserta-main">
        <div className="ch-peserta-content">
          <PesertaHeader
            title="Daftar Tugas"
            description="Lihat tugas divisi, instruksi, dan status pengumpulan kelompok."
          />

          <section
            className="ch-peserta-task-panel"
            aria-label="Daftar tugas divisi"
          >
            <div className="ch-peserta-task-panel-header">
              <h3>Tugas Divisi</h3>
              <span className="ch-peserta-task-count">
                {tasks.length} tugas
              </span>
            </div>

            {error ? (
              <div className="ch-peserta-task-empty" role="alert">
                <h4>Daftar tugas belum dapat ditampilkan</h4>
                <p>{error}</p>
              </div>
            ) : tasks.length === 0 ? (
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
                  Daftar tugas divisi akan ditampilkan di sini setelah PIC
                  membuat tugas.
                </p>
              </div>
            ) : (
              <div className="ch-peserta-task-list">
                {tasks.map((task) => {
                  const status = getTaskStatus(task);

                  return (
                    <article className="ch-peserta-task-item" key={task.id}>
                      <div className="ch-peserta-task-item-content">
                        <span className="ch-peserta-task-item-module">
                          {task.module}
                        </span>
                        <h4>{task.title}</h4>
                        <p>Deadline: {formatDeadline(task.deadline)}</p>
                        <span
                          className={`ch-peserta-task-status ch-peserta-task-status-${status.className}`}
                        >
                          {status.label}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="ch-peserta-task-detail-button"
                        onClick={() => setSelectedTask(task)}
                      >
                        Lihat detail
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {!hasGroup && !error && (
            <aside className="ch-peserta-task-information">
              <div className="ch-peserta-task-information-icon">
                <span aria-hidden="true">i</span>
              </div>
              <p>
                Kamu belum tergabung dalam kelompok aktif. Status pengumpulan
                tugas akan tersedia setelah kelompokmu terbentuk.
              </p>
            </aside>
          )}

          {hasGroup && (
            <aside className="ch-peserta-task-information">
              <div className="ch-peserta-task-information-icon">
                <span aria-hidden="true">i</span>
              </div>
              <p>
                Status pengumpulan ditampilkan berdasarkan pengumpulan
                kelompok. Untuk mengelola file atau revisi yang sudah dikirim,
                buka halaman Pengumpulan.
              </p>
            </aside>
          )}
        </div>
      </main>

      {selectedTask && (
        <div
          className="ch-peserta-task-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedTask(null);
            }
          }}
        >
          <section
            className="ch-peserta-task-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ch-peserta-task-modal-title"
          >
            <header className="ch-peserta-task-modal-header">
              <div>
                <span className="ch-peserta-task-modal-eyebrow">
                  Detail tugas
                </span>
                <h2 id="ch-peserta-task-modal-title">
                  {selectedTask.title}
                </h2>
              </div>

              <button
                type="button"
                className="ch-peserta-task-modal-close"
                aria-label="Tutup detail tugas"
                onClick={() => setSelectedTask(null)}
              >
                ×
              </button>
            </header>

            <div className="ch-peserta-task-modal-body">
              <div className="ch-peserta-task-modal-meta">
                <div className="ch-peserta-task-modal-meta-item">
                  <span>Modul</span>
                  <strong>{selectedTask.module}</strong>
                </div>
                <div className="ch-peserta-task-modal-meta-item">
                  <span>Deadline</span>
                  <strong>{formatDeadline(selectedTask.deadline)}</strong>
                </div>
                <div className="ch-peserta-task-modal-meta-item">
                  <span>Status pengumpulan</span>
                  <strong>{getTaskStatus(selectedTask).label}</strong>
                </div>
              </div>

              <div className="ch-peserta-task-modal-instruction">
                <h3>Instruksi tugas</h3>
                <p>
                  {selectedTask.description.trim() ||
                    "Belum ada instruksi tambahan untuk tugas ini."}
                </p>
              </div>

              <div className="ch-peserta-task-modal-notice">
                <svg
                  width="19"
                  height="19"
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
                <p>
                  Pengumpulan dan revisi file dikelola melalui halaman
                  Pengumpulan. Pastikan memperhatikan deadline tugas.
                </p>
              </div>
            </div>

            <footer className="ch-peserta-task-modal-footer">
              <button
                type="button"
                className="ch-peserta-task-modal-secondary"
                onClick={() => setSelectedTask(null)}
              >
                Tutup
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
