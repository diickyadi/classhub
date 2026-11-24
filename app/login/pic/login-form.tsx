"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import styles from "@/app/style/pic/login.module.css";

export default function PicLoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const supabase = createClient();

      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (authError || !authData.user) {
        setErrorMessage(
          "Email atau password tidak sesuai."
        );
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role, account_status, must_change_password")
          .eq("id", authData.user.id)
          .maybeSingle();

      if (profileError || !profile) {
        await supabase.auth.signOut();

        setErrorMessage(
          "Profil akun tidak dapat diverifikasi. Silakan hubungi administrator."
        );
        return;
      }

      if (profile.role !== "PIC") {
        await supabase.auth.signOut();

        setErrorMessage(
          "Akun ini bukan akun PIC. Silakan gunakan halaman login Peserta."
        );
        return;
      }

      if (profile.account_status !== "active") {
        await supabase.auth.signOut();

        setErrorMessage(
          "Akun PIC belum aktif. Silakan hubungi administrator."
        );
        return;
      }

      if (profile.must_change_password) {
        router.replace("/change-password");
        router.refresh();
        return;
      }

      router.replace("/dashboard/pic");
      router.refresh();
    } catch (error) {
      console.error("PIC login error:", error);

      setErrorMessage(
        "Tidak dapat menghubungi server. Silakan coba kembali."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className={styles.loginForm}
      onSubmit={handleLogin}
    >
      <div className={styles.inputGroup}>
        <label htmlFor="pic-email">
          Email
        </label>

        <input
          id="pic-email"
          type="email"
          placeholder="Masukkan email PIC"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          disabled={isSubmitting}
        />
      </div>

      <div className={styles.inputGroup}>
        <label htmlFor="pic-password">
          Password
        </label>

        <input
          id="pic-password"
          type="password"
          placeholder="Masukkan password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          disabled={isSubmitting}
        />
      </div>

      {errorMessage && (
        <div
          className={styles.errorMessage}
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        className={styles.submitButton}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <span className={styles.spinner} />
            Memverifikasi...
          </>
        ) : (
          "Masuk ke Dashboard"
        )}
      </button>
    </form>
  );
}