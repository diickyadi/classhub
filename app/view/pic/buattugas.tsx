"use client";

import PicButton from "@/app/assets/components/pic/button";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

type Props = {
  divisionName: string;
};

function toLocalDateTimeValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function BuatTugas({ divisionName }: Props) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [module, setModule] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [deadlineBounds, setDeadlineBounds] = useState({
    minimum: "",
    maximum: "",
  });

  function resetForm() {
    setTitle("");
    setModule("");
    setDescription("");
    setDeadline("");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) return;

    setError("");
    setSuccess("");

    const trimmedTitle = title.trim();
    const trimmedModule = module.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle || trimmedTitle.length > 255) {
      setError("Judul tugas wajib diisi dan maksimal 255 karakter.");
      return;
    }

    if (!trimmedModule || trimmedModule.length > 100) {
      setError("Modul wajib diisi dan maksimal 100 karakter.");
      return;
    }

    if (trimmedDescription.length > 10000) {
      setError("Deskripsi maksimal 10.000 karakter.");
      return;
    }

    if (!deadline) {
      setError("Tanggal dan jam deadline wajib diisi.");
      return;
    }

    const deadlineDate = new Date(deadline);
    const nowDate = new Date();
    const maximumDate = new Date(
      nowDate.getTime() + 7 * 24 * 60 * 60 * 1000
    );

    if (
      !Number.isFinite(deadlineDate.getTime()) ||
      deadlineDate <= nowDate ||
      deadlineDate > maximumDate
    ) {
      setError("Deadline harus berada dalam 7 hari ke depan.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/pic/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: trimmedTitle,
          module: trimmedModule,
          description: trimmedDescription,
          deadline: deadlineDate.toISOString(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Gagal membuat tugas.");
        return;
      }

      setSuccess("Tugas berhasil dibuat.");
      resetForm();
      setIsOpen(false);
      router.refresh();
    } catch {
      setError("Tidak dapat menghubungi server. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      className="mt-10 rounded-2xl border p-6 shadow-sm"
      style={{
        background: "rgba(255, 255, 255, 0.14)",
        borderColor: "rgba(255, 255, 255, 0.28)",
        boxShadow: "0 6px 22px rgba(83, 102, 190, 0.035)",
        backdropFilter: "blur(26px)",
        WebkitBackdropFilter: "blur(26px)",
      }}
    >
      <div className="flex justify-end">


        <PicButton variant="primary"
          type="button"
          onClick={() => {
            const now = new Date();

            setDeadlineBounds({
              minimum: toLocalDateTimeValue(now),
              maximum: toLocalDateTimeValue(
                new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
              ),
            });

            setError("");
            setSuccess("");
            setIsOpen(true);
          }}
        >
          + Buat Tugas
        </PicButton>
      </div>

      {success && (
        <p
          role="status"
          className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700"
        >
          {success}
        </p>
      )}

      {isOpen && createPortal((
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !submitting) {
              setIsOpen(false);
              resetForm();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-assignment-title"
            className="my-auto w-full max-w-xl rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div>
                <h3
                  id="create-assignment-title"
                  className="text-xl font-bold text-slate-900"
                >
                  Buat Tugas Baru
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Divisi {divisionName}
                </p>
              </div>

              <PicButton variant="ghost"
                type="button"
                disabled={submitting}
                onClick={() => {
                  setIsOpen(false);
                  resetForm();
                }}
                aria-label="Tutup modal"
              >
                ×
              </PicButton>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="max-h-[65vh] space-y-5 overflow-y-auto p-6">
                <div>
                  <label
                    htmlFor="assignment-title"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Judul Tugas
                  </label>
                  <input
                    id="assignment-title"
                    type="text"
                    maxLength={255}
                    required
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Contoh: Laporan Hasil Observasi"
                    disabled={submitting}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="assignment-module"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Modul
                  </label>
                  <input
                    id="assignment-module"
                    type="text"
                    maxLength={100}
                    required
                    value={module}
                    onChange={(event) => setModule(event.target.value)}
                    placeholder="Contoh: Modul 1 - Pengenalan"
                    disabled={submitting}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="assignment-description"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Deskripsi / Instruksi
                  </label>
                  <textarea
                    id="assignment-description"
                    rows={5}
                    maxLength={10000}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Tuliskan instruksi pengerjaan tugas..."
                    disabled={submitting}
                    className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  />
                  <p className="mt-1 text-right text-xs text-slate-400">
                    {description.length}/10.000 karakter
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="assignment-deadline"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Deadline
                  </label>
                  <input
                    id="assignment-deadline"
                    type="datetime-local"
                    required
                    min={deadlineBounds.minimum}
                    max={deadlineBounds.maximum}
                    value={deadline}
                    onChange={(event) => setDeadline(event.target.value)}
                    disabled={submitting}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Deadline harus lebih dari sekarang dan maksimal 7 hari ke depan.
                  </p>
                </div>

                {error && (
                  <p
                    role="alert"
                    className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
                  >
                    {error}
                  </p>
                )}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 p-6 sm:flex-row sm:justify-end">
                <PicButton variant="secondary"
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setIsOpen(false);
                    resetForm();
                  }}
                >
                  Batal
                </PicButton>

                <PicButton variant="primary"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? "Menyimpan..." : "Simpan Tugas"}
                </PicButton>
              </div>
            </form>
          </div>
        </div>
      ), document.body)}
    </section>
  );
}
