"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BrandLogo from "@/app/assets/components/common/brand-logo";
import "@/app/style/auth/login.css";

type UserRole = "PESERTA" | "PIC";

export default function Home() {
  const router = useRouter();

  const [role, setRole] = useState<UserRole>("PESERTA");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");

    const supabase = createClient();

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError || !data.user) {
        setError("Email atau password salah. Silakan periksa kembali.");
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        await supabase.auth.signOut();
        setError("Gagal memverifikasi akun. Silakan coba lagi.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, account_status, must_change_password")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setError("Gagal memverifikasi profil akun. Silakan coba lagi.");
        return;
      }

      if (profile.account_status !== "active") {
        await supabase.auth.signOut();
        setError("Akun belum diaktifkan atau telah dinonaktifkan. Hubungi PIC.");
        return;
      }

      if (profile.role !== role) {
        await supabase.auth.signOut();
        setError(
          role === "PESERTA"
            ? "Akun ini bukan akun Peserta. Silakan pilih login PIC."
            : "Akun ini bukan akun PIC. Silakan pilih login Peserta."
        );
        return;
      }

      if (profile.must_change_password) {
        router.replace("/change-password");
        router.refresh();
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      await supabase.auth.signOut();
      setError("Terjadi kesalahan. Silakan coba kembali.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-orb login-orb-one" />
      <div className="login-orb login-orb-two" />
      <div className="login-orb login-orb-three" />

      <section className="login-shell">
        {/* PANEL INFORMASI */}
        <aside className="login-showcase">
          <div className="showcase-glow showcase-glow-one" />
          <div className="showcase-glow showcase-glow-two" />

          <div className="showcase-brand">
            <BrandLogo width={125} />
          </div>

          <div className="showcase-content">
            <div className="showcase-badge">
              <span className="showcase-badge-dot" />
              COLLABORATION MADE SIMPLE
            </div>

            <h1>
              Submit smarter.
              <br />
              <span>Grow together.</span>
            </h1>

            <p>
              Satu tempat untuk mengelola tugas, berkolaborasi bersama
              kelompok, dan memantau progres pengumpulan tugas dengan lebih
              mudah.
            </p>

            <div className="showcase-features">
              <div className="showcase-feature">
                <span className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M16 21V19C16 16.8 14.2 15 12 15H6C3.8 15 2 16.8 2 19V21M9 11C11.2 11 13 9.2 13 7S11.2 3 9 3 5 4.8 5 7 6.8 11 9 11ZM18 8V14M21 11H15"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span>Kolaborasi kelompok</span>
              </div>

              <div className="showcase-feature">
                <span className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M4 4H20V20H4V4ZM8 8H16M8 12H16M8 16H13"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span>Pengelolaan tugas</span>
              </div>

              <div className="showcase-feature">
                <span className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M3 12L8 17L21 4M4 4H12M4 20H20"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span>Pemantauan pengumpulan</span>
              </div>
            </div>
          </div>

          <div className="showcase-bottom">
            <div className="showcase-bottom-line" />
            <span>Collaborate. Submit. Achieve.</span>
          </div>
        </aside>

        {/* PANEL LOGIN */}
        <section className="login-panel">
          <div className="login-panel-glow" />

          <div className="login-panel-content">
            <div className="login-heading">
              <span className="login-eyebrow">SELAMAT DATANG KEMBALI</span>
              <h2>Masuk ke VINIX7</h2>
              <p>Kelola tugas dan progresmu dengan lebih mudah.</p>
            </div>

            <form
              className="login-form"
              onSubmit={handleLogin}
              autoComplete="off"
            >
              <div className="login-role-wrapper">
                <span className="login-label">Masuk sebagai</span>

                <div className="role-selector">
                  <button
                    type="button"
                    className={`role-option ${
                      role === "PESERTA" ? "active" : ""
                    }`}
                    onClick={() => {
                      setRole("PESERTA");
                      setError("");
                    }}
                    aria-pressed={role === "PESERTA"}
                  >
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M16 21V19C16 16.8 14.2 15 12 15H6C3.8 15 2 16.8 2 19V21M9 11C11.2 11 13 9.2 13 7S11.2 3 9 3 5 4.8 5 7 6.8 11 9 11ZM18 8V14M21 11H15"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Peserta
                  </button>

                  <button
                    type="button"
                    className={`role-option ${role === "PIC" ? "active" : ""}`}
                    onClick={() => {
                      setRole("PIC");
                      setError("");
                    }}
                    aria-pressed={role === "PIC"}
                  >
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M16 21V19C16 16.8 14.2 15 12 15H6C3.8 15 2 16.8 2 19V21M9 11C11.2 11 13 9.2 13 7S11.2 3 9 3 5 4.8 5 7 6.8 11 9 11ZM16 11L18 13L22 9"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    PIC
                  </button>
                </div>

                <p className="role-description">
                  {role === "PESERTA"
                    ? "Masuk untuk melihat tugas dan mengelola pengumpulan kelompok."
                    : "Masuk untuk mengelola kelompok dan memantau pengumpulan tugas."}
                </p>
              </div>

              <div className="form-field">
                <label htmlFor="email">Email</label>

                <div className="input-wrapper">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M3 6.5L12 13L21 6.5M5 4H19C20.1 4 21 4.9 21 6V18C21 19.1 20.1 20 19 20H5C3.9 20 3 19.1 3 18V6C3 4.9 3.9 4 5 4Z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>

                  <input
                    id="email"
                    type="email"
                    autoComplete="off"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="nama@email.com"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="password">Password</label>

                <div className="input-wrapper">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect
                      x="4"
                      y="10"
                      width="16"
                      height="11"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                    <path
                      d="M8 10V7C8 4.8 9.8 3 12 3S16 4.8 16 7V10M12 14V17"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                  </svg>

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="off"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Masukkan password"
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((previous) => !previous)}
                    aria-label={
                      showPassword
                        ? "Sembunyikan password"
                        : "Tampilkan password"
                    }
                    disabled={loading}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d="M3 3L21 21M10.6 10.6C9.8 11.4 9.8 12.6 10.6 13.4C11.4 14.2 12.6 14.2 13.4 13.4M9.9 5.2C10.6 5.1 11.3 5 12 5C17 5 20.5 9.2 21.5 12C21.1 13.1 20.4 14.2 19.5 15.1M6.2 6.2C4.2 7.5 2.9 9.7 2.5 12C3.5 14.8 7 19 12 19C13.4 19 14.7 18.7 15.9 18.1"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d="M2.5 12C3.5 9.2 7 5 12 5S20.5 9.2 21.5 12C20.5 14.8 17 19 12 19S3.5 14.8 2.5 12Z"
                          stroke="currentColor"
                          strokeWidth="1.7"
                        />
                        <circle
                          cx="12"
                          cy="12"
                          r="3"
                          stroke="currentColor"
                          strokeWidth="1.7"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="login-error" role="alert">
                  <span className="error-icon">!</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="login-submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="login-spinner" />
                    Memproses...
                  </>
                ) : (
                  <>
                    Masuk
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M5 12H19M12 5L19 12L12 19"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className="login-account-info">
              <span>Belum punya akun?</span>
              <strong>Hubungi PIC/Admin</strong>
            </div>

            <footer className="login-footer">
              © 2026 VINIX7. All rights reserved.
            </footer>
          </div>
        </section>
      </section>

      <div className="login-copyright">
        A better way to manage group assignments.
      </div>
    </main>
  );
}
