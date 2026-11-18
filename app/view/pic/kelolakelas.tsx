"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Participant = {
  id: string;
  fullName: string;
  email: string;
};

type Props = {
  divisionName: string;
};

export default function KelolaKelas({ divisionName }: Props) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [leaderId, setLeaderId] = useState("");
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadParticipants() {
    setLoadingParticipants(true);
    setError("");

    try {
      const response = await fetch("/api/pic/groups/participants", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Gagal mengambil daftar peserta.");
        return;
      }

      setParticipants(result.participants ?? []);
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setLoadingParticipants(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      void loadParticipants();
    }
  }, [isOpen]);

  function toggleParticipant(id: string) {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        const next = current.filter((item) => item !== id);

        if (leaderId === id) {
          setLeaderId("");
        }

        return next;
      }

      return [...current, id];
    });
  }

  function resetForm() {
    setName("");
    setSelectedIds([]);
    setLeaderId("");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const trimmedName = name.trim();

    if (!trimmedName || trimmedName.length > 150) {
      setError("Nama kelompok wajib diisi, maksimal 150 karakter.");
      return;
    }

    if (selectedIds.length === 0) {
      setError("Pilih minimal satu anggota kelompok.");
      return;
    }

    if (!leaderId || !selectedIds.includes(leaderId)) {
      setError("Pilih ketua dari anggota kelompok.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/pic/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          memberIds: selectedIds,
          leaderId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Gagal membuat kelompok.");
        return;
      }

      setSuccess("Kelompok berhasil dibuat.");
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
    <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Kelola Kelompok
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Buat kelompok dan tentukan ketua untuk divisi {divisionName}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSuccess("");
            setError("");
            setIsOpen(true);
          }}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          + Buat Kelompok
        </button>
      </div>

      {success && (
        <p
          role="status"
          className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700"
        >
          {success}
        </p>
      )}

      {isOpen && (
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
            aria-labelledby="create-group-title"
            className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div>
                <h3
                  id="create-group-title"
                  className="text-xl font-bold text-slate-900"
                >
                  Buat Kelompok Baru
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Divisi {divisionName}
                </p>
              </div>

              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setIsOpen(false);
                  resetForm();
                }}
                aria-label="Tutup modal"
                className="rounded-lg px-3 py-2 text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="max-h-[65vh] space-y-6 overflow-y-auto p-6">
                <div>
                  <label
                    htmlFor="group-name"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Nama Kelompok
                  </label>

                  <input
                    id="group-name"
                    type="text"
                    required
                    maxLength={150}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Contoh: Kelompok 1"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800">
                        Pilih Anggota
                      </h4>
                      <p className="mt-1 text-xs text-slate-500">
                        {selectedIds.length} peserta dipilih
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void loadParticipants()}
                      disabled={loadingParticipants}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
                    >
                      Muat ulang
                    </button>
                  </div>

                  {loadingParticipants ? (
                    <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                      Memuat daftar peserta...
                    </p>
                  ) : participants.length > 0 ? (
                    <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                      {participants.map((participant) => {
                        const checked = selectedIds.includes(participant.id);

                        return (
                          <label
                            key={participant.id}
                            className={`flex cursor-pointer items-center gap-3 p-4 transition ${
                              checked ? "bg-blue-50" : "hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                toggleParticipant(participant.id)
                              }
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />

                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-slate-800">
                                {participant.fullName}
                              </span>
                              <span className="block truncate text-xs text-slate-500">
                                {participant.email}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                      Belum ada peserta yang tersedia untuk dimasukkan ke
                      kelompok.
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="group-leader"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Ketua Kelompok
                  </label>

                  <select
                    id="group-leader"
                    required
                    value={leaderId}
                    onChange={(event) => setLeaderId(event.target.value)}
                    disabled={selectedIds.length === 0}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  >
                    <option value="">Pilih ketua kelompok</option>
                    {participants
                      .filter((participant) =>
                        selectedIds.includes(participant.id)
                      )
                      .map((participant) => (
                        <option key={participant.id} value={participant.id}>
                          {participant.fullName}
                        </option>
                      ))}
                  </select>

                  <p className="mt-2 text-xs text-slate-500">
                    Ketua harus merupakan salah satu anggota kelompok.
                  </p>
                </div>

                {error && (
                  <p
                    role="alert"
                    className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
                  >
                    {error}
                  </p>
                )}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 p-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setIsOpen(false);
                    resetForm();
                  }}
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    loadingParticipants ||
                    participants.length === 0
                  }
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan Kelompok"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
