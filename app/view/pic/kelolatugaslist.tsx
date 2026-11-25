"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PicSelect from "@/app/assets/components/pic/select";
import PicButton from "@/app/assets/components/pic/button";

type Assignment = {
  id: number;
  title: string;
  module: string;
  description: string | null;
  deadline: string;
  created_at: string;
  updated_at: string;
};

type AssignmentFilter = "all" | "upcoming" | "overdue";

function formatDate(dateValue: string) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

export default function KelolaTugasList() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<AssignmentFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [referenceTime, setReferenceTime] = useState(0);

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/pic/assignments", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Gagal mengambil daftar tugas.");
        return;
      }

      setAssignments(
        Array.isArray(result.assignments) ? result.assignments : []
      );
      setReferenceTime(Date.now());
    } catch {
      setError("Tidak dapat menghubungi server. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    async function fetchInitialAssignments() {
      try {
        const response = await fetch("/api/pic/assignments", {
          method: "GET",
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "Gagal mengambil daftar tugas."
          );
        }

        if (isActive) {
          setAssignments(
            Array.isArray(result.assignments) ? result.assignments : []
          );
          setReferenceTime(Date.now());
        }
      } catch (loadError) {
        if (isActive) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Tidak dapat menghubungi server. Silakan coba lagi."
          );
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    void fetchInitialAssignments();

    return () => {
      isActive = false;
    };
  }, []);

  const now = referenceTime;

  const upcomingCount = assignments.filter(
    (assignment) => new Date(assignment.deadline).getTime() >= now
  ).length;

  const overdueCount = assignments.length - upcomingCount;

  const filteredAssignments = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return assignments.filter((assignment) => {
      const deadlineTime = new Date(assignment.deadline).getTime();
      const isOverdue = deadlineTime < referenceTime;

      const matchesSearch =
        !keyword ||
        assignment.title.toLowerCase().includes(keyword) ||
        assignment.module.toLowerCase().includes(keyword) ||
        (assignment.description ?? "").toLowerCase().includes(keyword);

      const matchesFilter =
        filter === "all" ||
        (filter === "upcoming" && !isOverdue) ||
        (filter === "overdue" && isOverdue);

      return matchesSearch && matchesFilter;
    });
  }, [assignments, search, filter, referenceTime]);

  return (
    <section className="mt-8 rounded-2xl border border-white/40 bg-white/20 p-5 shadow-[0_8px_32px_rgba(83,102,190,0.08)] backdrop-blur-2xl sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Kelola Tugas
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Daftar tugas yang telah dibuat untuk peserta divisi.
          </p>
        </div>

        <PicButton
          variant="ghost"
          type="button"
          onClick={() => void loadAssignments()}
          disabled={loading}
        >
          {loading ? "Memuat..." : "Muat Ulang"}
        </PicButton>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-blue-50 p-4">
          <p className="text-sm text-blue-600">Total Tugas</p>
          <p className="mt-1 text-2xl font-bold text-blue-900">
            {assignments.length}
          </p>
        </div>

        <div className="rounded-xl bg-emerald-50 p-4">
          <p className="text-sm text-emerald-600">Belum Deadline</p>
          <p className="mt-1 text-2xl font-bold text-emerald-900">
            {upcomingCount}
          </p>
        </div>

        <div className="rounded-xl bg-rose-50 p-4">
          <p className="text-sm text-rose-600">Terlambat</p>
          <p className="mt-1 text-2xl font-bold text-rose-900">
            {overdueCount}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari judul, modul, atau deskripsi tugas..."
          className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />

        <PicSelect
          value={filter}
          onValueChange={(value) =>
            setFilter(value as AssignmentFilter)
          }
          options={[
            { value: "all", label: "Semua Tugas" },
            { value: "upcoming", label: "Belum Deadline" },
            { value: "overdue", label: "Terlambat" },
          ]}
          ariaLabel="Filter daftar tugas"
          width="auto"
        />
      </div>

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          {error}
          <PicButton
            variant="ghost"
            size="small"
            type="button"
            onClick={() => void loadAssignments()}
            className="ml-2"
          >
            Coba lagi
          </PicButton>
        </div>
      )}

      {loading ? (
        <div className="mt-6 rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">
          Memuat daftar tugas...
        </div>
      ) : !error && filteredAssignments.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center">
          <p className="font-medium text-slate-700">
            {assignments.length === 0
              ? "Belum ada tugas yang dibuat."
              : "Tugas tidak ditemukan."}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {assignments.length === 0
              ? "Tugas yang berhasil dibuat akan muncul di bagian ini."
              : "Coba gunakan kata kunci atau filter yang berbeda."}
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {filteredAssignments.map((assignment) => {
            const isOverdue =
              new Date(assignment.deadline).getTime() < referenceTime;

            return (
              <article
                key={assignment.id}
                className="rounded-xl border border-white/45 bg-white/25 p-4 shadow-[0_4px_18px_rgba(83,102,190,0.04)] backdrop-blur-xl transition hover:border-white/70 hover:bg-white/40 sm:p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                      {assignment.module}
                    </p>

                    <h3 className="mt-1 break-words text-base font-semibold text-slate-900">
                      {assignment.title}
                    </h3>
                  </div>

                  <span
                    className={`w-fit shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                      isOverdue
                        ? "bg-rose-100 text-rose-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {isOverdue ? "Terlambat" : "Belum Deadline"}
                  </span>
                </div>

                {assignment.description && (
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">
                    {assignment.description}
                  </p>
                )}

                <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 sm:flex-row sm:justify-between">
                  <p>
                    Deadline:{" "}
                    <span className="font-medium text-slate-700">
                      {formatDate(assignment.deadline)}
                    </span>
                  </p>

                  <p>
                    Dibuat: {formatDate(assignment.created_at)}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-xs text-slate-400">
        Status ditentukan berdasarkan waktu deadline. Daftar ini hanya
        menampilkan tugas dari divisi PIC yang sedang aktif.
      </p>
    </section>
  );
}
