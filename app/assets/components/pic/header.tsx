"use client";

import { usePathname } from "next/navigation";
import styles from "@/app/style/pic/header.module.css";

type PicHeaderProps = {
  title?: string;
  description?: string;
};

const pageContent: Record<string, { title: string; description: string }> = {
  "/dashboard/pic": {
    title: "Dashboard PIC",
    description: "Pantau aktivitas dan kelola kebutuhan divisi.",
  },
  "/dashboard/pic/kelola-kelas": {
    title: "Kelola Kelompok",
    description: "Kelola kelompok, anggota, dan ketua divisi.",
  },
  "/dashboard/pic/aktivasi-akun": {
    title: "Aktivasi Akun",
    description: "Kelola status aktivasi akun peserta.",
  },
  "/dashboard/pic/buat-tugas": {
    title: "Buat Tugas",
    description: "Buat dan atur tugas untuk peserta divisi.",
  },
  "/dashboard/pic/pengumpulan": {
    title: "Pengumpulan Tugas",
    description: "Pantau dan periksa pengumpulan tugas peserta.",
  },
};

export default function PicHeader({
  title,
  description,
}: PicHeaderProps) {
  const pathname = usePathname();

  const currentPage = pageContent[pathname] ?? {
    title: "Panel PIC",
    description: "Kelola aktivitas dan kebutuhan divisi.",
  };

  return (
    <header className={styles.header}>
      <div className={styles.heading}>
        <span className={styles.eyebrow}>
          WORKSPACE / VINIX7
        </span>

        <h1 className={styles.title}>
          {title ?? currentPage.title}
        </h1>

        <p className={styles.description}>
          {description ?? currentPage.description}
        </p>
      </div>
    </header>
  );
}
