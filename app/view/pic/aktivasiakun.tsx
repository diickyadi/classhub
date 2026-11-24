"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Plus, UserPlus } from "lucide-react";
import {
  Ban,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Search,
  ShieldCheck,
  UsersRound,
  UserCheck,
  UserX,
  X,
} from "lucide-react";

import PicButton from "@/app/assets/components/pic/button";
import styles from "@/app/style/pic/activation.module.css";

type AccountStatus = "pending" | "active" | "inactive";
type StatusFilter = "all" | AccountStatus;

type Participant = {
  id: string;
  fullName: string;
  email: string;
  accountStatus: AccountStatus;
  mustChangePassword: boolean;
};

type ActivationSummary = {
  total: number;
  pending: number;
  active: number;
  inactive: number;
};

type ConfirmationTarget = {
  participant: Participant;
  accountStatus: "active" | "inactive";
};

const FILTER_OPTIONS: {
  value: StatusFilter;
  label: string;
}[] = [
  { value: "all", label: "Semua" },
  { value: "pending", label: "Menunggu" },
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Nonaktif" },
];

function getStatusLabel(status: AccountStatus) {
  switch (status) {
    case "pending":
      return "Menunggu Aktivasi";
    case "active":
      return "Aktif";
    case "inactive":
      return "Nonaktif";
  }
}

export default function AktivasiAkun() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [summary, setSummary] = useState<ActivationSummary>({
    total: 0,
    pending: 0,
    active: 0,
    inactive: 0,
  });

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmation, setConfirmation] =
    useState<ConfirmationTarget | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingParticipant, setCreatingParticipant] = useState(false);
  const [createFullName, setCreateFullName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createError, setCreateError] = useState("");
  const [copiedPassword, setCopiedPassword] = useState(false);

  const [createdCredentials, setCreatedCredentials] = useState<{
    fullName: string;
    email: string;
    temporaryPassword: string;
  } | null>(null);


  const loadParticipants = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/pic/participants/activation", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Gagal mengambil daftar peserta."
        );
      }

      setParticipants(
        Array.isArray(result.participants) ? result.participants : []
      );


      setSummary({
        total: Number(result.summary?.total ?? 0),
        pending: Number(result.summary?.pending ?? 0),
        active: Number(result.summary?.active ?? 0),
        inactive: Number(result.summary?.inactive ?? 0),
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Tidak dapat mengambil data peserta."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchInitialParticipants() {
      try {
        const response = await fetch("/api/pic/participants/activation", {
          method: "GET",
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "Gagal mengambil daftar peserta."
          );
        }

        if (cancelled) return;

        setParticipants(
          Array.isArray(result.participants) ? result.participants : []
        );


        setSummary({
          total: Number(result.summary?.total ?? 0),
          pending: Number(result.summary?.pending ?? 0),
          active: Number(result.summary?.active ?? 0),
          inactive: Number(result.summary?.inactive ?? 0),
        });
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Tidak dapat mengambil data peserta."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchInitialParticipants();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredParticipants = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return participants.filter((participant) => {
      const matchesSearch =
        !keyword ||
        participant.fullName.toLowerCase().includes(keyword) ||
        participant.email.toLowerCase().includes(keyword);

      const matchesStatus =
        filterStatus === "all" ||
        participant.accountStatus === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [participants, search, filterStatus]);

  function requestStatusChange(
    participant: Participant,
    accountStatus: "active" | "inactive"
  ) {
    setError("");
    setNotice("");
    setConfirmation({ participant, accountStatus });
  }

  async function confirmStatusChange() {
    if (!confirmation || savingId) return;

    const { participant, accountStatus } = confirmation;

    setSavingId(participant.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/pic/participants/activation", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participantId: participant.id,
          accountStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Gagal memperbarui status akun."
        );
      }

      setParticipants((current) =>
        current.map((item) =>
          item.id === participant.id
            ? {
                ...item,
                accountStatus: result.participant.accountStatus,
                mustChangePassword:
                  result.participant.mustChangePassword,
              }
            : item
        )
      );

      const updatedStatus = result.participant.accountStatus;

      setSummary((current) => ({
        ...current,
        pending:
          current.pending -
          (participant.accountStatus === "pending" ? 1 : 0),
        active:
          current.active -
          (participant.accountStatus === "active" ? 1 : 0) +
          (updatedStatus === "active" ? 1 : 0),
        inactive:
          current.inactive -
          (participant.accountStatus === "inactive" ? 1 : 0) +
          (updatedStatus === "inactive" ? 1 : 0),
      }));

      setNotice(result.message || "Status akun berhasil diperbarui.");
      setConfirmation(null);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Tidak dapat memperbarui status akun."
      );
    } finally {
      setSavingId(null);
    }
  }

  async function createParticipant() {
    if (creatingParticipant || createdCredentials) return;

    const fullName = createFullName.trim();
    const email = createEmail.trim().toLowerCase();

    if (!fullName || !email) {
      setCreateError("Nama lengkap dan Gmail wajib diisi.");
      return;
    }

    setCreatingParticipant(true);
    setCreateError("");

    try {
      const response = await fetch("/api/pic/participants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          email,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Gagal membuat akun peserta."
        );
      }

      const participant = result.participant;

      if (
        !participant ||
        typeof participant.temporaryPassword !== "string"
      ) {
        throw new Error(
          "Akun dibuat, tetapi password sementara tidak diterima. Periksa data peserta sebelum mencoba lagi."
        );
      }

      setCreatedCredentials({
        fullName: participant.fullName,
        email: participant.email,
        temporaryPassword: participant.temporaryPassword,
      });

      setCreateFullName("");
      setCreateEmail("");
      setCopiedPassword(false);

      // Perbarui daftar peserta setelah akun berhasil dibuat.
      await loadParticipants();
    } catch (createError) {
      setCreateError(
        createError instanceof Error
          ? createError.message
          : "Terjadi kesalahan saat membuat akun."
      );
    } finally {
      setCreatingParticipant(false);
    }
  }

  async function copyTemporaryPassword() {
    if (!createdCredentials) return;

    try {
      await navigator.clipboard.writeText(
        createdCredentials.temporaryPassword
      );
      setCopiedPassword(true);
    } catch {
      setCreateError(
        "Gagal menyalin password. Silakan salin secara manual."
      );
    }
  }

  function closeCreateModal() {
    if (creatingParticipant) return;

    setShowCreateModal(false);
    setCreateFullName("");
    setCreateEmail("");
    setCreateError("");
    setCreatedCredentials(null);
    setCopiedPassword(false);
  }

  function renderStatus(participant: Participant) {
    return (
      <div className={styles.statusGroup}>
        <span
          className={`${styles.statusBadge} ${
            styles[participant.accountStatus]
          }`}
        >
          {participant.accountStatus === "pending" && (
            <Clock3 size={13} />
          )}
          {participant.accountStatus === "active" && (
            <CheckCircle2 size={13} />
          )}
          {participant.accountStatus === "inactive" && (
            <Ban size={13} />
          )}
          {getStatusLabel(participant.accountStatus)}
        </span>

        {participant.mustChangePassword && (
          <span className={styles.passwordBadge}>
            Wajib ganti password
          </span>
        )}
      </div>
    );
  }

  function renderAction(participant: Participant) {
    const isSaving = savingId === participant.id;
    const isDeactivation = participant.accountStatus === "active";

    return (
      <PicButton
        type="button"
        size="small"
        variant={isDeactivation ? "danger" : "primary"}
        disabled={savingId !== null}
        loading={isSaving}
        onClick={() =>
          requestStatusChange(
            participant,
            isDeactivation ? "inactive" : "active"
          )
        }
      >
        {isSaving
          ? "Memproses..."
          : isDeactivation
            ? "Nonaktifkan"
            : participant.accountStatus === "pending"
              ? "Aktifkan"
              : "Aktifkan Kembali"}
      </PicButton>
    );
  }

  return (
    <div className={styles.page}>
<section className={styles.intro}>
        <div>
          <span className={styles.eyebrow}>MANAJEMEN PENGGUNA</span>
          <h2 className={styles.pageTitle}>Status Akun Peserta</h2>
          <p className={styles.pageDescription}>
            Pantau dan atur akses akun peserta sesuai kebutuhan divisi.
          </p>
        </div>

        <div className={styles.introActions}>
          <PicButton
            variant="primary"
            type="button"
            onClick={() => {
              setCreateError("");
              setCreatedCredentials(null);
              setShowCreateModal(true);
            }}
          >
            <Plus size={16} />
            Aktivasi Peserta
          </PicButton>

          <PicButton
            variant="secondary"
            type="button"
            disabled={loading}
            onClick={() => void loadParticipants()}
          >
            <RefreshCw size={16} />
            Refresh
          </PicButton>
        </div>
      </section>

      {error && (
        <div className={styles.alertError} role="alert">
          <UserX size={18} />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div className={styles.alertSuccess} role="status">
          <CheckCircle2 size={18} />
          <span>{notice}</span>
        </div>
      )}

      <section className={styles.summaryGrid} aria-label="Ringkasan akun">
        <article className={styles.summaryCard}>
          <div className={`${styles.summaryIcon} ${styles.totalIcon}`}>
            <UsersRound size={21} />
          </div>
          <div>
            <p className={styles.summaryLabel}>Total Peserta</p>
            <p className={styles.summaryValue}>{summary.total}</p>
          </div>
        </article>

        <article className={styles.summaryCard}>
          <div className={`${styles.summaryIcon} ${styles.pendingIcon}`}>
            <Clock3 size={21} />
          </div>
          <div>
            <p className={styles.summaryLabel}>Menunggu Aktivasi</p>
            <p className={styles.summaryValue}>{summary.pending}</p>
          </div>
        </article>

        <article className={styles.summaryCard}>
          <div className={`${styles.summaryIcon} ${styles.activeIcon}`}>
            <UserCheck size={21} />
          </div>
          <div>
            <p className={styles.summaryLabel}>Akun Aktif</p>
            <p className={styles.summaryValue}>{summary.active}</p>
          </div>
        </article>

        <article className={styles.summaryCard}>
          <div className={`${styles.summaryIcon} ${styles.inactiveIcon}`}>
            <UserX size={21} />
          </div>
          <div>
            <p className={styles.summaryLabel}>Akun Nonaktif</p>
            <p className={styles.summaryValue}>{summary.inactive}</p>
          </div>
        </article>
      </section>

      <section className={styles.contentCard}>
        <div className={styles.contentHeader}>
          <div>
            <h3 className={styles.sectionTitle}>Daftar Peserta</h3>
            <p className={styles.sectionDescription}>
              Peserta yang terdaftar pada divisi Anda.
            </p>
          </div>

          <span className={styles.resultCount}>
            {filteredParticipants.length} peserta
          </span>
        </div>

        <div className={styles.toolbar}>
          <label className={styles.searchBox}>
            <Search size={18} />
            <input
              type="search"
              placeholder="Cari nama atau email peserta..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Cari peserta"
            />
          </label>

          <div className={styles.filterGroup} aria-label="Filter status">
            {FILTER_OPTIONS.map((option) => (
              <PicButton
                key={option.value}
                type="button"
                size="small"
                variant={
                  filterStatus === option.value
                    ? "primary"
                    : "secondary"
                }
                onClick={() => setFilterStatus(option.value)}
              >
                {option.label}
              </PicButton>
            ))}
          </div>
        </div>

        {loading ? (
          <div className={styles.loadingState} role="status">
            <RefreshCw size={21} className={styles.spin} />
            <p>Memuat daftar peserta...</p>
          </div>
        ) : filteredParticipants.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <UsersRound size={27} />
            </div>
            <h4>
              {participants.length === 0
                ? "Belum ada peserta"
                : "Peserta tidak ditemukan"}
            </h4>
            <p>
              {participants.length === 0
                ? "Belum ada peserta yang terdaftar pada divisi ini."
                : "Coba ubah kata pencarian atau filter status."}
            </p>
          </div>
        ) : (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.participantTable}>
                <thead>
                  <tr>
                    <th>Peserta</th>
                    <th>Status Akun</th>
                    <th>Keterangan</th>
                    <th>Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredParticipants.map((participant) => (
                    <tr key={participant.id}>
                      <td>
                        <div className={styles.participantIdentity}>
                          <div className={styles.avatar}>
                            {participant.fullName
                              .trim()
                              .charAt(0)
                              .toUpperCase() || "P"}
                          </div>
                          <div className={styles.identityText}>
                            <span className={styles.participantName}>
                              {participant.fullName}
                            </span>
                            <span className={styles.participantEmail}>
                              {participant.email || "Email tidak tersedia"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>{renderStatus(participant)}</td>
                      <td>
                        <span className={styles.passwordInfo}>
                          {participant.mustChangePassword
                            ? "Password sementara belum diganti"
                            : "Tidak ada kewajiban penggantian password"}
                        </span>
                      </td>
                      <td className={styles.actionCell}>
                        {renderAction(participant)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.mobileList}>
              {filteredParticipants.map((participant) => (
                <article
                  key={participant.id}
                  className={styles.mobileParticipant}
                >
                  <div className={styles.mobileIdentity}>
                    <div className={styles.avatar}>
                      {participant.fullName
                        .trim()
                        .charAt(0)
                        .toUpperCase() || "P"}
                    </div>
                    <div className={styles.identityText}>
                      <span className={styles.participantName}>
                        {participant.fullName}
                      </span>
                      <span className={styles.participantEmail}>
                        {participant.email || "Email tidak tersedia"}
                      </span>
                    </div>
                  </div>

                  {renderStatus(participant)}

                  <p className={styles.passwordInfo}>
                    {participant.mustChangePassword
                      ? "Password sementara belum diganti"
                      : "Tidak ada kewajiban penggantian password"}
                  </p>

                  <div className={styles.mobileAction}>
                    {renderAction(participant)}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {showCreateModal && (
        <div
          className={styles.modalBackdrop}
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !creatingParticipant
            ) {
              closeCreateModal();
            }
          }}
        >
          <section
            className={styles.createDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-participant-title"
          >
            <button
              type="button"
              className={styles.closeButton}
              aria-label="Tutup modal"
              disabled={creatingParticipant}
              onClick={closeCreateModal}
            >
              <X size={19} />
            </button>

            {!createdCredentials ? (
              <>
                <div className={styles.createIcon}>
                  <UserPlus size={25} />
                </div>

                <h3 id="create-participant-title">
                  Aktivasi Peserta
                </h3>

                <p className={styles.createDescription}>
                  Masukkan nama lengkap dan Gmail untuk membuat akun peserta.
                </p>

                {createError && (
                  <div className={styles.createError} role="alert">
                    <UserX size={17} />
                    <span>{createError}</span>
                  </div>
                )}

                <form
                  className={styles.createForm}
                  onSubmit={(event) => {
                    event.preventDefault();
                    void createParticipant();
                  }}
                >
                  <label className={styles.formField}>
                    <span>Nama lengkap</span>
                    <input
                      type="text"
                      value={createFullName}
                      onChange={(event) =>
                        setCreateFullName(event.target.value)
                      }
                      placeholder="Masukkan nama lengkap"
                      maxLength={150}
                      autoComplete="name"
                      required
                      disabled={creatingParticipant}
                    />
                  </label>

                  <label className={styles.formField}>
                    <span>Alamat Gmail</span>
                    <input
                      type="email"
                      value={createEmail}
                      onChange={(event) =>
                        setCreateEmail(event.target.value)
                      }
                      placeholder="nama@gmail.com"
                      maxLength={254}
                      autoComplete="email"
                      required
                      disabled={creatingParticipant}
                    />
                  </label>

                  <div className={styles.createNote}>
                    Akun baru akan berstatus Menunggu Aktivasi.
                    Peserta belum dapat login sebelum PIC mengaktifkan akun.
                  </div>

                  <div className={styles.confirmActions}>
                    <PicButton
                      variant="secondary"
                      type="button"
                      disabled={creatingParticipant}
                      onClick={closeCreateModal}
                    >
                      Batal
                    </PicButton>

                    <PicButton
                      variant="primary"
                      type="submit"
                      loading={creatingParticipant}
                      disabled={creatingParticipant}
                    >
                      Buat Akun
                    </PicButton>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className={styles.createSuccessIcon}>
                  <CheckCircle2 size={26} />
                </div>

                <h3 id="create-participant-title">
                  Akun Berhasil Dibuat
                </h3>

                <p className={styles.createDescription}>
                  Simpan password sementara ini dan berikan kepada peserta.
                  Password hanya ditampilkan pada proses pembuatan akun ini.
                </p>

                <div className={styles.credentialBox}>
                  <div>
                    <span>Nama peserta</span>
                    <strong>{createdCredentials.fullName}</strong>
                  </div>

                  <div>
                    <span>Gmail</span>
                    <strong>{createdCredentials.email}</strong>
                  </div>

                  <div>
                    <span>Password sementara</span>
                    <strong className={styles.temporaryPassword}>
                      {createdCredentials.temporaryPassword}
                    </strong>
                  </div>
                </div>

                {createError && (
                  <div className={styles.createError} role="alert">
                    <UserX size={17} />
                    <span>{createError}</span>
                  </div>
                )}

                <div className={styles.createNote}>
                  Status akun: Menunggu Aktivasi. PIC harus menekan tombol
                  Aktifkan pada daftar peserta sebelum peserta dapat login.
                </div>

                <div className={styles.confirmActions}>
                  <PicButton
                    variant="secondary"
                    type="button"
                    onClick={() => void copyTemporaryPassword()}
                  >
                    <Copy size={15} />
                    {copiedPassword ? "Tersalin" : "Salin Password"}
                  </PicButton>

                  <PicButton
                    variant="primary"
                    type="button"
                    onClick={closeCreateModal}
                  >
                    Selesai
                  </PicButton>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {confirmation && (
        <div
          className={styles.modalBackdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !savingId) {
              setConfirmation(null);
            }
          }}
        >
          <section
            className={styles.confirmDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="activation-confirm-title"
          >
            <button
              type="button"
              className={styles.closeButton}
              aria-label="Tutup konfirmasi"
              disabled={savingId !== null}
              onClick={() => setConfirmation(null)}
            >
              <X size={19} />
            </button>

            <div
              className={`${styles.confirmIcon} ${
                confirmation.accountStatus === "active"
                  ? styles.confirmActivate
                  : styles.confirmDeactivate
              }`}
            >
              {confirmation.accountStatus === "active" ? (
                <ShieldCheck size={25} />
              ) : (
                <Ban size={25} />
              )}
            </div>

            <h3 id="activation-confirm-title">
              {confirmation.accountStatus === "active"
                ? "Aktifkan akun peserta?"
                : "Nonaktifkan akun peserta?"}
            </h3>

            <p>
              Anda akan mengubah status akun{" "}
              <strong>{confirmation.participant.fullName}</strong> menjadi{" "}
              <strong>{getStatusLabel(confirmation.accountStatus)}</strong>.
            </p>

            <p className={styles.confirmNote}>
              {confirmation.accountStatus === "active"
                ? "Peserta dapat login setelah akun diaktifkan. Jika masih wajib mengganti password, peserta akan diarahkan ke halaman penggantian password."
                : "Peserta tidak dapat menggunakan fitur yang membutuhkan akun aktif. Riwayat dan data peserta tidak dihapus."}
            </p>

            <div className={styles.confirmActions}>
              <PicButton
                variant="secondary"
                type="button"
                disabled={savingId !== null}
                onClick={() => setConfirmation(null)}
              >
                Batal
              </PicButton>

              <PicButton
                variant={
                  confirmation.accountStatus === "active"
                    ? "primary"
                    : "danger"
                }
                type="button"
                loading={savingId !== null}
                disabled={savingId !== null}
                onClick={() => void confirmStatusChange()}
              >
                {confirmation.accountStatus === "active"
                  ? "Ya, Aktifkan"
                  : "Ya, Nonaktifkan"}
              </PicButton>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
