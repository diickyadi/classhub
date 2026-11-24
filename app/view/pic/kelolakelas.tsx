"use client";

import PicSelect from "@/app/assets/components/pic/select";

import PicButton from "@/app/assets/components/pic/button";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/style/pic/dashboard.module.css";

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
    <section className={styles.groupCard}>
      <div className="flex justify-end">


        <PicButton variant="primary"
          type="button"
          onClick={() => {
            setSuccess("");
            setError("");
            setIsOpen(true);
            void loadParticipants();
          }}
        >
          + Buat Kelompok
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

                    <PicButton variant="ghost"
                      type="button"
                      onClick={() => void loadParticipants()}
                      disabled={loadingParticipants}
                    >
                      Muat ulang
                    </PicButton>
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

                  <PicSelect
                    id="group-leader"
                    ariaLabel="Ketua kelompok"
                    width="full"
                    required
                    value={leaderId}
                    onValueChange={setLeaderId}
                    disabled={selectedIds.length === 0}
                    placeholder="Pilih ketua kelompok"
                    options={[
                      {
                        value: "",
                        label: "Pilih ketua kelompok",
                      },
                      ...participants
                        .filter((participant) =>
                          selectedIds.includes(participant.id)
                        )
                        .map((participant) => ({
                          value: participant.id,
                          label: participant.fullName,
                        })),
                    ]}
                  />

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
                  disabled={
                    submitting ||
                    loadingParticipants ||
                    participants.length === 0
                  }
                >
                  {submitting ? "Menyimpan..." : "Simpan Kelompok"}
                </PicButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
