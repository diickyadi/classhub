import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import PicLoginForm from "./login-form";
import styles from "@/app/style/pic/login.module.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Login PIC | ClassHub",
  description: "Login khusus pengelola divisi ClassHub",
};

export default function PicLoginPage() {
  return (
    <main className={`${styles.page} ${dmSans.className}`}>
      <div className={styles.backgroundDecoration} />

      <div className={styles.loginCard}>
        <section className={styles.introPanel}>
          <div className={styles.brand}>
            <div className={styles.brandLogo}>C</div>

            <div>
              <h1>
                Class<span>Hub</span>
              </h1>
              <p>Connect · Manage · Grow</p>
            </div>
          </div>

          <div className={styles.introContent}>
            <span className={styles.eyebrow}>
              PIC WORKSPACE
            </span>

            <h2>
              Kelola divisi,
              <br />
              pantau aktivitas,
              <br />
              dalam satu tempat.
            </h2>

            <p>
              Masuk ke ruang kerja PIC untuk mengelola kelompok,
              akun peserta, tugas, dan pengumpulan ClassHub.
            </p>

            <div className={styles.visualCard}>
              <svg
                viewBox="0 0 220 150"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-label="Ilustrasi dashboard ClassHub"
                role="img"
              >
                <rect
                  x="22"
                  y="18"
                  width="176"
                  height="108"
                  rx="12"
                  fill="white"
                  fillOpacity=".72"
                  stroke="white"
                  strokeWidth="2"
                />

                <rect
                  x="36"
                  y="33"
                  width="49"
                  height="78"
                  rx="6"
                  fill="#DCE6FF"
                />

                <rect
                  x="47"
                  y="44"
                  width="27"
                  height="5"
                  rx="2.5"
                  fill="#526DFF"
                />

                <rect
                  x="47"
                  y="57"
                  width="20"
                  height="4"
                  rx="2"
                  fill="#9AADEB"
                />

                <rect
                  x="47"
                  y="69"
                  width="27"
                  height="4"
                  rx="2"
                  fill="#9AADEB"
                />

                <rect
                  x="47"
                  y="81"
                  width="23"
                  height="4"
                  rx="2"
                  fill="#9AADEB"
                />

                <rect
                  x="97"
                  y="34"
                  width="87"
                  height="34"
                  rx="6"
                  fill="#EFF3FF"
                />

                <rect
                  x="106"
                  y="44"
                  width="26"
                  height="5"
                  rx="2.5"
                  fill="#8DA2E9"
                />

                <rect
                  x="106"
                  y="54"
                  width="54"
                  height="4"
                  rx="2"
                  fill="#C2CFF1"
                />

                <rect
                  x="97"
                  y="78"
                  width="87"
                  height="33"
                  rx="6"
                  fill="#EFF3FF"
                />

                <path
                  d="M107 99L121 89L135 96L149 84L162 91L175 81"
                  stroke="#526DFF"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <circle cx="178" cy="21" r="10" fill="#526DFF" />
                <path
                  d="M174 21L177 24L182 18"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <p className={styles.introFooter}>
            ClassHub · PIC Workspace
          </p>
        </section>

        <section className={styles.formPanel}>
          <div className={styles.formHeading}>
            <span className={styles.formBadge}>
              PIC ACCESS
            </span>

            <h2>Selamat Datang</h2>

            <p>
              Masuk menggunakan akun PIC yang telah terdaftar.
            </p>
          </div>

          <PicLoginForm />

          <p className={styles.formFooter}>
            ClassHub · Smart Assignment Platform
          </p>
        </section>
      </div>
    </main>
  );
}