"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import styles from "@/app/style/pic/dashboard.module.css";

export default function PicLogoutButton() {
  const router = useRouter();

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogout() {
    if (isLoading) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        setErrorMessage("Logout gagal. Silakan coba kembali.");
        setIsLoading(false);
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error("Logout PIC gagal:", error);
      setErrorMessage("Terjadi kesalahan saat logout.");
      setIsLoading(false);
    }
  }

  function closeConfirmation() {
    if (isLoading) return;

    setIsConfirmOpen(false);
    setErrorMessage("");
  }

  return (
    <>
      <button
        type="button"
        className={styles.logoutButton}
        onClick={() => setIsConfirmOpen(true)}
      >
        <LogOut size={19} strokeWidth={2} aria-hidden="true" />
        <span>Keluar</span>
      </button>

      {isConfirmOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={closeConfirmation}
        >
          <section
            className={styles.logoutDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pic-logout-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.modalClose}
              onClick={closeConfirmation}
              disabled={isLoading}
              aria-label="Tutup konfirmasi"
            >
              <X size={19} />
            </button>

            <div className={styles.logoutIcon}>
              <LogOut size={24} />
            </div>

            <h2 id="pic-logout-title">
              Keluar dari VINIX7?
            </h2>

            <p>
              Apakah kamu yakin ingin mengakhiri sesi dan keluar
              dari akun PIC?
            </p>

            {errorMessage && (
              <p className={styles.errorMessage} role="alert">
                {errorMessage}
              </p>
            )}

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={closeConfirmation}
                disabled={isLoading}
              >
                Batal
              </button>

              <button
                type="button"
                className={styles.confirmButton}
                onClick={handleLogout}
                disabled={isLoading}
              >
                {isLoading ? "Memproses..." : "Ya, Keluar"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
