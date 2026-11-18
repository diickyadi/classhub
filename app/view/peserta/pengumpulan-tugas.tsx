"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Assignment = {
  id: number;
  title: string;
  module: string | null;
  description: string | null;
  deadline: string;
};

type GroupMember = {
  user_id: string;
  full_name: string;
};

type Submission = {
  assignment_id: number;
  status: string;
  submitted_at: string;
  file_name: string;
};

type Props = {
  groupId: number | null;
  isLeader: boolean;
  groupMembers: GroupMember[];
  assignments: Assignment[];
  submissions: Submission[];
};

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
]);

function formatDate(value: string) {
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function PengumpulanTugas({
  groupId,
  isLeader,
  groupMembers,
  assignments,
  submissions,
}: Props) {
  const router = useRouter();

  const [files, setFiles] = useState<Record<number, File | null>>({});
  const [contributors, setContributors] = useState<
    Record<number, string[]>
  >({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [notices, setNotices] = useState<Record<number, string>>({});

  function toggleContributor(assignmentId: number, userId: string) {
    setContributors((current) => {
      const selected = current[assignmentId] ?? [];
      const exists = selected.includes(userId);

      if (!exists && selected.length >= 7) {
        setErrors((previous) => ({
          ...previous,
          [assignmentId]: "Maksimal 7 anggota dapat dipilih.",
        }));
        return current;
      }

      return {
        ...current,
        [assignmentId]: exists
          ? selected.filter((id) => id !== userId)
          : [...selected, userId],
      };
    });

    setErrors((previous) => ({
      ...previous,
      [assignmentId]: "",
    }));
  }

  async function submitAssignment(assignment: Assignment) {
    const assignmentId = assignment.id;
    const file = files[assignmentId];
    const contributorIds = contributors[assignmentId] ?? [];

    setErrors((previous) => ({ ...previous, [assignmentId]: "" }));
    setNotices((previous) => ({ ...previous, [assignmentId]: "" }));

    if (!groupId) {
      setErrors((previous) => ({
        ...previous,
        [assignmentId]: "Kelompok belum tersedia.",
      }));
      return;
    }

    if (!isLeader) {
      setErrors((previous) => ({
        ...previous,
        [assignmentId]: "Hanya ketua kelompok yang dapat mengunggah tugas.",
      }));
      return;
    }

    if (!file) {
      setErrors((previous) => ({
        ...previous,
        [assignmentId]: "Pilih file tugas terlebih dahulu.",
      }));
      return;
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      setErrors((previous) => ({
        ...previous,
        [assignmentId]: "Ukuran file harus lebih dari 0 dan maksimal 50 MB.",
      }));
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (
      !extension ||
      !ALLOWED_EXTENSIONS.has(extension) ||
      !ALLOWED_TYPES.has(file.type)
    ) {
      setErrors((previous) => ({
        ...previous,
        [assignmentId]: "Format file harus PDF, DOC, DOCX, XLS, atau XLSX.",
      }));
      return;
    }

    if (contributorIds.length < 1 || contributorIds.length > 7) {
      setErrors((previous) => ({
        ...previous,
        [assignmentId]: "Pilih 1 sampai 7 anggota yang berkontribusi.",
      }));
      return;
    }

    setBusyId(assignmentId);

    try {
      // 1. Minta signed upload URL dari server.
      const uploadUrlResponse = await fetch(
        "/api/submissions/upload-url",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            groupId,
            assignmentId,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
          }),
        }
      );

      const uploadResult = await uploadUrlResponse.json();

      if (!uploadUrlResponse.ok || !uploadResult.success || !uploadResult.data) {
        throw new Error(
          uploadResult.message || "Gagal menyiapkan upload file."
        );
      }

      const uploadData = uploadResult.data;

      // 2. Upload file langsung ke Supabase Storage.
      const supabase = createClient();

      const { error: storageError } = await supabase.storage
        .from("submissions")
        .uploadToSignedUrl(
          uploadData.path,
          uploadData.token,
          file,
          {
            contentType: file.type,
            upsert: false,
          }
        );

      if (storageError) {
        throw new Error(`Upload file gagal: ${storageError.message}`);
      }

      // 3. Simpan data pengumpulan melalui API.
      const submitResponse = await fetch("/api/submissions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          assignmentId,
          path: uploadData.path,
          fileName: uploadData.fileName,
          originalFileName: uploadData.originalFileName,
          fileSize: uploadData.fileSize,
          fileType: uploadData.fileType,
          contributorIds,
        }),
      });

      const submitResult = await submitResponse.json();

      if (!submitResponse.ok || !submitResult.success) {
        throw new Error(
          submitResult.message || "Gagal menyimpan pengumpulan tugas."
        );
      }

      setNotices((previous) => ({
        ...previous,
        [assignmentId]: submitResult.message || "Tugas berhasil dikumpulkan.",
      }));

      setFiles((previous) => ({
        ...previous,
        [assignmentId]: null,
      }));

      setContributors((previous) => ({
        ...previous,
        [assignmentId]: [],
      }));

      router.refresh();
    } catch (error) {
      setErrors((previous) => ({
        ...previous,
        [assignmentId]:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat mengumpulkan tugas.",
      }));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 p-5">
        <h2 className="text-lg font-bold text-slate-800">
          Pengumpulan Tugas
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Pantau deadline dan kumpulkan berkas tugas kelompokmu.
        </p>
      </div>

      {!groupId ? (
        <p className="p-6 text-sm text-slate-600">
          Kamu belum memiliki kelompok aktif. Hubungi PIC divisi.
        </p>
      ) : assignments.length === 0 ? (
        <p className="p-6 text-sm text-slate-600">
          Belum ada tugas di divisi ini.
        </p>
      ) : (
        <div className="divide-y divide-slate-100">
          {assignments.map((assignment) => {
            const submission = submissions.find(
              (item) => item.assignment_id === assignment.id
            );

            const isLate =
              new Date(assignment.deadline).getTime() < Date.now();

            const isBusy = busyId === assignment.id;
            const selectedFile = files[assignment.id] ?? null;
            const selectedContributors =
              contributors[assignment.id] ?? [];

            return (
              <article key={assignment.id} className="space-y-4 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-800">
                      {assignment.title}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {assignment.module || "Tanpa modul"}
                    </p>

                    {assignment.description && (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                        {assignment.description}
                      </p>
                    )}

                    <p className="mt-2 text-sm text-slate-600">
                      Deadline: {formatDate(assignment.deadline)}
                    </p>
                  </div>

                  <div className="shrink-0">
                    {submission ? (
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                          submission.status === "late"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {submission.status === "late"
                          ? "Terkumpul terlambat"
                          : "Sudah dikumpulkan"}
                      </span>
                    ) : (
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                          isLate
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {isLate
                          ? "Belum dikumpulkan"
                          : "Belum mengumpulkan"}
                      </span>
                    )}
                  </div>
                </div>

                {submission && (
                  <div className="rounded-xl bg-green-50 p-3 text-sm text-green-800">
                    <p className="font-semibold">File terkumpul</p>
                    <p className="mt-1 break-all">{submission.file_name}</p>
                    <p className="mt-1 text-xs text-green-700">
                      Dikirim: {formatDate(submission.submitted_at)}
                    </p>
                  </div>
                )}

                {isLeader ? (
                  <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div>
                      <label
                        htmlFor={`file-${assignment.id}`}
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        {submission ? "Unggah revisi tugas" : "Pilih file tugas"}
                      </label>

                      <input
                        id={`file-${assignment.id}`}
                        type="file"
                        accept=".pdf,.doc,.docx,.xls,.xlsx"
                        disabled={isBusy}
                        onChange={(event) => {
                          const nextFile = event.target.files?.[0] ?? null;
                          setFiles((previous) => ({
                            ...previous,
                            [assignment.id]: nextFile,
                          }));
                        }}
                        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-100 file:px-4 file:py-2 file:font-semibold file:text-blue-700 hover:file:bg-blue-200 disabled:opacity-50"
                      />

                      <p className="mt-2 text-xs text-slate-500">
                        PDF, DOC, DOCX, XLS, XLSX. Maksimal 50 MB.
                      </p>

                      {selectedFile && (
                        <p className="mt-2 text-xs text-slate-600">
                          {selectedFile.name} · {formatFileSize(selectedFile.size)}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-semibold text-slate-700">
                        Anggota yang berkontribusi
                      </p>

                      {groupMembers.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          Data anggota kelompok tidak tersedia.
                        </p>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {groupMembers.map((member) => (
                            <label
                              key={member.user_id}
                              className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700"
                            >
                              <input
                                type="checkbox"
                                checked={selectedContributors.includes(
                                  member.user_id
                                )}
                                disabled={isBusy}
                                onChange={() =>
                                  toggleContributor(
                                    assignment.id,
                                    member.user_id
                                  )
                                }
                                className="h-4 w-4 rounded border-slate-300 text-blue-600"
                              />
                              <span>{member.full_name}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      <p className="mt-2 text-xs text-slate-500">
                        Dipilih: {selectedContributors.length}/7 anggota.
                      </p>
                    </div>

                    {errors[assignment.id] && (
                      <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                        {errors[assignment.id]}
                      </p>
                    )}

                    {notices[assignment.id] && (
                      <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                        {notices[assignment.id]}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => void submitAssignment(assignment)}
                      disabled={isBusy}
                      className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      {isBusy
                        ? "Mengunggah dan menyimpan..."
                        : submission
                          ? "Kirim Revisi Tugas"
                          : "Kumpulkan Tugas"}
                    </button>
                  </div>
                ) : (
                  <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                    Hanya ketua kelompok yang dapat mengunggah atau merevisi tugas.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
