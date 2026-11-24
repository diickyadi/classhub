"use client";

import PicSelect from "@/app/assets/components/pic/select";

import PicButton from "@/app/assets/components/pic/button";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "@/app/style/pic/dashboard.module.css";

type Assignment = {
  id: number;
  title: string;
  module: string | null;
  deadline: string;
};

type Group = {
  id: number;
  name: string;
};

type Contributor = {
  id: number;
  user_id: string;
  full_name_snapshot: string;
};

type Revision = {
  id: number;
  revision_number: number;
  original_file_name: string | null;
  file_name: string;
  file_size: number;
  uploaded_at: string;
};

type Submission = {
  id: number;
  assignment_id: number;
  group_id: number;
  status: "submitted" | "late";
  original_file_name: string | null;
  file_name: string;
  file_size: number;
  submitted_at: string;
  revision_allowed_until: string | null;
  assignment: Assignment | null;
  group: Group | null;
  contributors: Contributor[];
  revisions: Revision[];
};

type FilterStatus = "all" | "submitted" | "late";

function formatDate(value: string) {
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  });
}

function formatFileSize(bytes: number) {
  if (!bytes || bytes < 0) return "Ukuran tidak diketahui";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function Pengumpulan() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [permissionDates, setPermissionDates] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState("");

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/pic/submissions", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Gagal mengambil data pengumpulan.");
        return;
      }

      setSubmissions(result.submissions ?? []);
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchInitialSubmissions() {
      try {
        const response = await fetch("/api/pic/submissions", {
          method: "GET",
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "Gagal mengambil data pengumpulan."
          );
        }

        if (!cancelled) {
          setSubmissions(result.submissions ?? []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Tidak dapat menghubungi server."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchInitialSubmissions();

    return () => {
      cancelled = true;
    };
  }, []);

  const now = new Date();
  const minimumPermissionDate = new Date(
    now.getTime() - now.getTimezoneOffset() * 60000
  ).toISOString().slice(0, 16);

  const filteredSubmissions = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return submissions.filter((item) => {
      const matchesSearch =
        !keyword ||
        item.group?.name?.toLowerCase().includes(keyword) ||
        item.assignment?.title?.toLowerCase().includes(keyword) ||
        item.assignment?.module?.toLowerCase().includes(keyword) ||
        item.original_file_name?.toLowerCase().includes(keyword);

      const matchesStatus =
        filterStatus === "all" || item.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [submissions, search, filterStatus]);

  const submittedCount = submissions.filter(
    (item) => item.status === "submitted"
  ).length;

  const lateCount = submissions.filter(
    (item) => item.status === "late"
  ).length;

  async function downloadFile(submissionId: number, revisionId?: number) {
    setBusyId(submissionId);
    setError("");

    try {
      const response = await fetch("/api/pic/submissions/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          ...(revisionId ? { revisionId } : {}),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.url) {
        setError(result.error || "Gagal menyiapkan download.");
        return;
      }

      window.location.assign(result.url);
    } catch {
      setError("Tidak dapat mengunduh berkas. Silakan coba lagi.");
    } finally {
      setBusyId(null);
    }
  }

  async function grantRevisionPermission(submission: Submission) {
    const value = permissionDates[submission.id];

    if (!value) {
      setError("Pilih tanggal dan jam izin revisi terlebih dahulu.");
      return;
    }

    const allowedUntil = new Date(value);

    if (Number.isNaN(allowedUntil.getTime()) || allowedUntil <= new Date()) {
      setError("Waktu izin revisi harus lebih besar dari waktu sekarang.");
      return;
    }

    if (
      submission.assignment?.deadline &&
      allowedUntil <= new Date(submission.assignment.deadline)
    ) {
      setError("Izin revisi harus berakhir setelah deadline tugas.");
      return;
    }

    setBusyId(submission.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/submissions/revision-permission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: submission.id,
          revisionAllowedUntil: allowedUntil.toISOString(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Gagal memberikan izin revisi.");
        return;
      }

      setNotice(
        `Izin revisi untuk ${submission.group?.name ?? "kelompok"} berhasil diperbarui.`
      );

      await loadSubmissions();
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className={styles.submissionSection}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Pengumpulan Tugas
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Pantau berkas tugas, anggota pengumpul, dan riwayat revisi kelompok.
          </p>
        </div>

        <PicButton variant="secondary"
          type="button"
          onClick={() => void loadSubmissions()}
          disabled={loading}
        >
          {loading ? "Memuat..." : "↻ Muat ulang"}
        </PicButton>
      </div>

      {notice && (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
        >
          {notice}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <div className="flex items-start justify-between gap-3">
            <span>{error}</span>
            <PicButton variant="ghost"
              type="button"
              onClick={() => setError("")}
            >
              ×
            </PicButton>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Pengumpulan</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {submissions.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Tepat Waktu</p>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {submittedCount}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Terlambat</p>
          <p className="mt-2 text-3xl font-bold text-red-600">
            {lateCount}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari nama kelompok, tugas, atau berkas..."
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />

        <PicSelect
          ariaLabel="Filter status pengumpulan"
          width="auto"
          value={filterStatus}
          onValueChange={(value) =>
            setFilterStatus(value as FilterStatus)
          }
          options={[
            { value: "all", label: "Semua status" },
            { value: "submitted", label: "Tepat waktu" },
            { value: "late", label: "Terlambat" },
          ]}
        />
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            Memuat data pengumpulan...
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <p className="font-semibold text-slate-700">
              {submissions.length === 0
                ? "Belum ada pengumpulan tugas."
                : "Pengumpulan tidak ditemukan."}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {submissions.length === 0
                ? "Data akan muncul setelah kelompok mengumpulkan tugas."
                : "Coba ubah kata kunci atau filter pencarian."}
            </p>
          </div>
        ) : (
          filteredSubmissions.map((submission) => {
            const isExpanded = expandedId === submission.id;
            const isLate = submission.status === "late";

            return (
              <article
                key={submission.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-900">
                          {submission.group?.name ?? "Kelompok tidak diketahui"}
                        </h3>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            isLate
                              ? "bg-red-50 text-red-700"
                              : "bg-green-50 text-green-700"
                          }`}
                        >
                          {isLate ? "Terlambat" : "Tepat waktu"}
                        </span>
                      </div>

                      <p className="mt-1 font-medium text-blue-700">
                        {submission.assignment?.title ?? "Tugas tidak diketahui"}
                      </p>

                      {submission.assignment?.module && (
                        <p className="mt-1 text-sm text-slate-500">
                          {submission.assignment.module}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                        <span>
                          Dikumpulkan: {formatDate(submission.submitted_at)}
                        </span>
                        {submission.assignment?.deadline && (
                          <span>
                            Deadline: {formatDate(submission.assignment.deadline)}
                          </span>
                        )}
                        <span>
                          {submission.revisions.length} riwayat revisi
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <PicButton variant="primary"
                        type="button"
                        onClick={() => void downloadFile(submission.id)}
                        disabled={busyId === submission.id}
                      >
                        {busyId === submission.id
                          ? "Memproses..."
                          : "↓ Download"}
                      </PicButton>

                      <PicButton variant="secondary"
                        type="button"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : submission.id)
                        }
                      >
                        {isExpanded ? "Tutup detail" : "Detail"}
                      </PicButton>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                    <span className="text-xl">📄</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {submission.original_file_name || submission.file_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatFileSize(submission.file_size)}
                      </p>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="space-y-6 border-t border-slate-100 bg-slate-50/70 p-5">
                    <div>
                      <h4 className="mb-3 text-sm font-bold text-slate-800">
                        Anggota Kontributor
                      </h4>

                      {submission.contributors.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {submission.contributors.map((member) => (
                            <span
                              key={member.id}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                            >
                              {member.full_name_snapshot}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">
                          Belum ada data kontributor.
                        </p>
                      )}
                    </div>

                    <div>
                      <h4 className="mb-3 text-sm font-bold text-slate-800">
                        Riwayat Revisi
                      </h4>

                      {submission.revisions.length > 0 ? (
                        <div className="space-y-2">
                          {submission.revisions.map((revision) => (
                            <div
                              key={revision.id}
                              className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800">
                                  Revisi {revision.revision_number}
                                </p>
                                <p className="mt-1 truncate text-sm text-slate-600">
                                  {revision.original_file_name || revision.file_name}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {formatDate(revision.uploaded_at)} ·{" "}
                                  {formatFileSize(revision.file_size)}
                                </p>
                              </div>

                              <PicButton variant="primary" className="shrink-0"
                                type="button"
                                onClick={() =>
                                  void downloadFile(submission.id, revision.id)
                                }
                                disabled={busyId === submission.id}
                              >
                                ↓ Download revisi
                              </PicButton>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">
                          Belum ada riwayat revisi.
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <h4 className="font-bold text-slate-800">
                        Izin Revisi
                      </h4>

                      <p className="mt-1 text-sm text-slate-600">
                        Berikan izin kepada kelompok untuk mengunggah revisi
                        setelah deadline tugas.
                      </p>

                      {submission.revision_allowed_until && (
                        <p className="mt-2 text-sm font-medium text-amber-800">
                          Izin aktif sampai:{" "}
                          {formatDate(submission.revision_allowed_until)}
                        </p>
                      )}

                      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                        <input
                          type="datetime-local"
                          min={minimumPermissionDate}
                          value={permissionDates[submission.id] ?? ""}
                          onChange={(event) =>
                            setPermissionDates((current) => ({
                              ...current,
                              [submission.id]: event.target.value,
                            }))
                          }
                          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500"
                        />

                        <PicButton variant="warning"
                          type="button"
                          onClick={() =>
                            void grantRevisionPermission(submission)
                          }
                          disabled={busyId === submission.id}
                        >
                          {busyId === submission.id
                            ? "Memproses..."
                            : "Simpan Izin Revisi"}
                        </PicButton>
                      </div>

                      <p className="mt-2 text-xs text-slate-500">
                        Waktu mengikuti zona waktu perangkat kamu. Izin harus
                        berakhir setelah deadline tugas.
                      </p>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      <p className="text-xs text-slate-400">
        Menampilkan {filteredSubmissions.length} dari {submissions.length} pengumpulan.
      </p>
    </section>
  );
}
