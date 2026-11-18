"use client";

import { useEffect } from "react";

export interface TaskDetailModalData {
  title: string;
  moduleName: string;
  deadline: string;
  instruction: string;
}

interface TaskDetailModalProps {
  isOpen: boolean;
  task: TaskDetailModalData | null;
  onClose: () => void;
  onStartSubmission?: () => void;
}

export default function TaskDetailModal({
  isOpen,
  task,
  onClose,
  onStartSubmission,
}: TaskDetailModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !task) return null;

  return (
    <div
      className="ch-peserta-task-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
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
              Detail Tugas
            </span>
            <h2 id="ch-peserta-task-modal-title">{task.title}</h2>
          </div>

          <button
            type="button"
            className="ch-peserta-task-modal-close"
            onClick={onClose}
            aria-label="Tutup detail tugas"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="m18 6-12 12M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="ch-peserta-task-modal-body">
          <div className="ch-peserta-task-modal-meta">
            <div className="ch-peserta-task-modal-meta-item">
              <span>Modul</span>
              <strong>{task.moduleName}</strong>
            </div>

            <div className="ch-peserta-task-modal-meta-item">
              <span>Deadline</span>
              <strong>{task.deadline}</strong>
            </div>
          </div>

          <div className="ch-peserta-task-modal-instruction">
            <h3>Instruksi Tugas</h3>
            <p>{task.instruction}</p>
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
              Hanya ketua kelompok aktif yang dapat mengirimkan tugas.
            </p>
          </div>
        </div>

        <footer className="ch-peserta-task-modal-footer">
          <button
            type="button"
            className="ch-peserta-task-modal-secondary"
            onClick={onClose}
          >
            Tutup
          </button>

          {onStartSubmission && (
            <button
              type="button"
              className="ch-peserta-task-modal-primary"
              onClick={onStartSubmission}
            >
              Mulai Pengumpulan
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}
