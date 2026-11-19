"use client";

import { useEffect, useState } from "react";

import PesertaSidebar from "@/app/assets/components/layout/peserta/sidebar";
import PesertaHeader from "@/app/assets/components/layout/peserta/header";
import HistoryEmptyState from "@/app/assets/components/peserta/riwayat/history-empty-state";
import { createClient } from "@/lib/supabase/client";

interface HistoryFile {
  filePath: string;
  originalFileName: string;
  fileSize: number;
  uploadedAt: string;
}

interface HistoryContributor {
  userId: string;
  fullName: string;
}

interface HistoryRevision {
  id: number;
  revisionNumber: number;
  filePath: string;
  originalFileName: string;
  fileSize: number;
  uploadedAt: string;
}

export interface HistorySubmission {
  id: number;
  assignmentTitle: string;
  moduleName: string;
  deadline: string | null;
  status: "submitted" | "late";
  currentFile: HistoryFile;
  submittedAt: string;
  updatedAt: string;
  contributors: HistoryContributor[];
  revisions: HistoryRevision[];
}

interface PesertaRiwayatViewProps {
  submissions: HistorySubmission[];
  error?: string;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function PesertaRiwayatView({
  submissions,
  error,
}: PesertaRiwayatViewProps) {
  const [selectedSubmission, setSelectedSubmission] =
    useState<HistorySubmission | null>(null);
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    if (!selectedSubmission) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedSubmission(null);
        setDownloadError("");
      }
    }

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [selectedSubmission]);

  async function handleDownload(filePath: string) {
    setDownloadingPath(filePath);
    setDownloadError("");

    try {
      const supabase = createClient();
      const { data, error: storageError } = await supabase.storage
        .from("submissions")
        .createSignedUrl(filePath, 60);

      if (storageError || !data?.signedUrl) {
        throw new Error("File tidak dapat diakses. Silakan coba lagi.");
      }

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (downloadError) {
      setDownloadError(
        downloadError instanceof Error
          ? downloadError.message
          : "Terjadi kesalahan saat membuka file."
      );
    } finally {
      setDownloadingPath(null);
    }
  }

  return (
    <div className="ch-peserta-dashboard">
      <PesertaSidebar activeItem="Riwayat" />

      <main className="ch-peserta-main">
        <div className="ch-peserta-content">
          <PesertaHeader title="Riwayat Pengumpulan" description="Lihat catatan pengumpulan tugas kelompok dan seluruh versi berkas yang pernah dikirim." />



          <section
            className="ch-peserta-history-panel"
            aria-label="Riwayat pengumpulan tugas"
          >
            <div className="ch-peserta-history-panel-header">
              <div>
                <h3>Catatan Pengumpulan</h3>
                <p>Riwayat berkas tugas kelompok</p>
              </div>

              <span className="ch-peserta-history-count">
                {submissions.length} riwayat
              </span>
            </div>

            {error ? (
              <div className="ch-peserta-history-error" role="alert">
                {error}
              </div>
            ) : submissions.length === 0 ? (
              <HistoryEmptyState />
            ) : (
              <div className="ch-peserta-history-table-wrapper">
                <table className="ch-peserta-history-table">
                  <thead>
                    <tr>
                      <th>Nama tugas</th>
                      <th>File terbaru</th>
                      <th>Waktu diperbarui</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((submission) => (
                      <tr key={submission.id}>
                        <td>
                          <strong>{submission.assignmentTitle}</strong>
                          <span>{submission.moduleName}</span>
                        </td>
                        <td>
                          <strong className="ch-peserta-history-file-name">
                            {submission.currentFile.originalFileName}
                          </strong>
                          <span>
                            {formatFileSize(submission.currentFile.fileSize)}
                          </span>
                        </td>
                        <td>{formatDate(submission.updatedAt)}</td>
                        <td>
                          <span
                            className={`ch-peserta-history-status ${
                              submission.status === "late" ? "is-late" : ""
                            }`}
                          >
                            {submission.status === "late"
                              ? "Terlambat"
                              : "Terkumpul"}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="ch-peserta-history-detail-button"
                            onClick={() => {
                              setSelectedSubmission(submission);
                              setDownloadError("");
                            }}
                          >
                            Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>

      {selectedSubmission && (
        <div
          className="ch-peserta-history-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedSubmission(null);
              setDownloadError("");
            }
          }}
        >
          <section
            className="ch-peserta-history-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ch-peserta-history-modal-title"
          >
            <header className="ch-peserta-history-modal-header">
              <div>
                <span>DETAIL RIWAYAT</span>
                <h2 id="ch-peserta-history-modal-title">
                  {selectedSubmission.assignmentTitle}
                </h2>
                <p>{selectedSubmission.moduleName}</p>
              </div>

              <button
                type="button"
                aria-label="Tutup detail riwayat"
                onClick={() => {
                  setSelectedSubmission(null);
                  setDownloadError("");
                }}
              >
                ×
              </button>
            </header>

            <div className="ch-peserta-history-modal-body">
              <div className="ch-peserta-history-summary">
                <div>
                  <span>Status pengumpulan</span>
                  <strong>
                    {selectedSubmission.status === "late"
                      ? "Terlambat"
                      : "Terkumpul"}
                  </strong>
                </div>
                <div>
                  <span>Waktu pengumpulan</span>
                  <strong>{formatDate(selectedSubmission.submittedAt)}</strong>
                </div>
                <div>
                  <span>Terakhir diperbarui</span>
                  <strong>{formatDate(selectedSubmission.updatedAt)}</strong>
                </div>
              </div>

              <section className="ch-peserta-history-version-section">
                <h3>Versi terbaru</h3>
                <div className="ch-peserta-history-version-item">
                  <div>
                    <strong>{selectedSubmission.currentFile.originalFileName}</strong>
                    <span>
                      {formatDate(selectedSubmission.currentFile.uploadedAt)}
                      {" · "}
                      {formatFileSize(selectedSubmission.currentFile.fileSize)}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={
                      downloadingPath === selectedSubmission.currentFile.filePath
                    }
                    onClick={() =>
                      handleDownload(selectedSubmission.currentFile.filePath)
                    }
                  >
                    {downloadingPath === selectedSubmission.currentFile.filePath
                      ? "Membuka..."
                      : "Buka file"}
                  </button>
                </div>
              </section>

              <section className="ch-peserta-history-version-section">
                <h3>Riwayat revisi</h3>
                {selectedSubmission.revisions.length > 0 ? (
                  <ol className="ch-peserta-history-version-list">
                    {selectedSubmission.revisions.map((revision) => (
                      <li key={revision.id}>
                        <div>
                          <strong>
                            Revisi {revision.revisionNumber} ·{" "}
                            {revision.originalFileName}
                          </strong>
                          <span>
                            {formatDate(revision.uploadedAt)}
                            {" · "}
                            {formatFileSize(revision.fileSize)}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={downloadingPath === revision.filePath}
                          onClick={() => handleDownload(revision.filePath)}
                        >
                          {downloadingPath === revision.filePath
                            ? "Membuka..."
                            : "Buka file"}
                        </button>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="ch-peserta-history-no-revisions">
                    Belum ada revisi. Ini merupakan versi pengumpulan pertama.
                  </p>
                )}
              </section>

              <section className="ch-peserta-history-contributors">
                <h3>Kontributor pengumpulan terbaru</h3>
                {selectedSubmission.contributors.length > 0 ? (
                  <ul>
                    {selectedSubmission.contributors.map((contributor) => (
                      <li key={contributor.userId}>{contributor.fullName}</li>
                    ))}
                  </ul>
                ) : (
                  <p>Informasi kontributor tidak tersedia.</p>
                )}
              </section>

              {downloadError && (
                <p className="ch-peserta-history-download-error" role="alert">
                  {downloadError}
                </p>
              )}
            </div>

            <footer className="ch-peserta-history-modal-footer">
              <button
                type="button"
                onClick={() => {
                  setSelectedSubmission(null);
                  setDownloadError("");
                }}
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
