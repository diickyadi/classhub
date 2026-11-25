"use client";

import PicSelect from "@/app/assets/components/pic/select";

import PicButton from "@/app/assets/components/pic/button";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/style/pic/dashboard.module.css";

type Participant = {
  id: string;
  fullName: string;
  email: string;
};

type GroupMember = {
  id: string;
  fullName: string;
  isLeader: boolean;
};

type Group = {
  id: number;
  name: string;
  createdAt: string;
  memberCount: number;
  leader: GroupMember | null;
  members: GroupMember[];
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

  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [groupError, setGroupError] = useState("");


  async function loadGroups() {
    setLoadingGroups(true);
    setGroupError("");

    try {
      const response = await fetch("/api/pic/groups", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal mengambil data kelompok.");
      }

      setGroups(result.groups ?? []);
    } catch (loadError) {
      setGroupError(
        loadError instanceof Error
          ? loadError.message
          : "Tidak dapat mengambil data kelompok."
      );
    } finally {
      setLoadingGroups(false);
    }
  }

  useEffect(() => {
    let isActive = true;

    async function fetchInitialGroups() {
      try {
        const response = await fetch("/api/pic/groups", {
          method: "GET",
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Gagal mengambil data kelompok.");
        }

        if (isActive) {
          setGroups(result.groups ?? []);
        }
      } catch (loadError) {
        if (isActive) {
          setGroupError(
            loadError instanceof Error
              ? loadError.message
              : "Tidak dapat mengambil data kelompok."
          );
        }
      } finally {
        if (isActive) {
          setLoadingGroups(false);
        }
      }
    }

    void fetchInitialGroups();

    return () => {
      isActive = false;
    };
  }, []);

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
      await loadGroups();
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


        <div className="flex flex-wrap items-center gap-3">




          <PicButton
            variant="primary"
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
      </div>

      <div className={styles.groupListSection}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Daftar Kelompok
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Kelompok yang sudah dibuat pada divisi {divisionName}.
            </p>
          </div>

          <PicButton
            variant="ghost"
            type="button"
            onClick={() => void loadGroups()}
            disabled={loadingGroups}
          >
            {loadingGroups ? "Memuat..." : "Muat Ulang"}
          </PicButton>
        </div>

        {groupError && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {groupError}
          </div>
        )}

        {loadingGroups ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Memuat daftar kelompok...
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="font-semibold text-slate-700">
              Belum ada kelompok
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Kelompok yang berhasil dibuat akan ditampilkan di sini.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm text-blue-700">Total Kelompok</p>
                <p className="mt-1 text-2xl font-bold text-blue-900">
                  {groups.length}
                </p>
              </div>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                <p className="text-sm text-indigo-700">Total Anggota</p>
                <p className="mt-1 text-2xl font-bold text-indigo-900">
                  {groups.reduce(
                    (total, group) => total + group.memberCount,
                    0
                  )}
                </p>
              </div>
            </div>

            <div className={styles.groupListScroll}>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {groups.map((group) => (
                <article
                  key={group.id}
                  className="rounded-xl border border-white/45 bg-white/25 p-5 shadow-[0_4px_18px_rgba(83,102,190,0.05)] backdrop-blur-xl transition duration-200 hover:border-white/70 hover:bg-white/40"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 className="text-base font-bold text-slate-900">
                        {group.name}
                      </h4>
                      <p className="mt-1 text-xs text-slate-500">
                        Dibuat:{" "}
                        {group.createdAt
                          ? new Date(group.createdAt).toLocaleDateString(
                              "id-ID",
                              {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              }
                            )
                          : "-"}
                      </p>
                    </div>

                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {group.memberCount} Anggota
                    </span>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Ketua Kelompok
                    </p>

                    <p className="text-sm font-semibold text-slate-800">
                      {group.leader?.fullName || "Belum ditentukan"}
                    </p>
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Anggota Kelompok
                    </p>

                    {group.members.length > 0 ? (
                      <div className="space-y-2">
                        {group.members.map((member) => (
                          <div
                            key={member.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2"
                          >
                            <span className="text-sm text-slate-700">
                              {member.fullName}
                            </span>

                            {member.isLeader && (
                              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                                Ketua
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">
                        Belum ada anggota.
                      </p>
                    )}
                  </div>
                </article>
                ))}
              </div>
            </div>
          </>
        )}
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
