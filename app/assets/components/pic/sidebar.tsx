"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UsersRound,
  UserCheck,
  ClipboardList,
  FolderCheck,
  Menu,
  X,
} from "lucide-react";

import PicLogoutButton from "@/app/assets/components/pic/logout-button";
import BrandLogo from "@/app/assets/components/common/brand-logo";
import styles from "@/app/style/pic/sidebar.module.css";

const menuItems = [
  {
    label: "Dashboard",
    href: "/dashboard/pic",
    icon: LayoutDashboard,
    disabled: false,
  },
  {
    label: "Kelola Kelas",
    href: "/dashboard/pic/kelola-kelas",
    icon: UsersRound,
    disabled: false,
  },
  {
    label: "Aktivasi Akun",
    href: "/dashboard/pic/aktivasi-akun",
    icon: UserCheck,
    disabled: false,
  },
  {
    label: "Buat Tugas",
    href: "/dashboard/pic/buat-tugas",
    icon: ClipboardList,
    disabled: false,
  },
  {
    label: "Pengumpulan",
    href: "/dashboard/pic/pengumpulan",
    icon: FolderCheck,
    disabled: false,
  },
];

export default function PicSidebar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <aside
      className={`${styles.sidebar} ${
        isMenuOpen ? styles.sidebarOpen : ""
      }`}
    >
      <div className={styles.sidebarHeader}>
        <Link
          href="/dashboard/pic"
          className={styles.brand}
          onClick={() => setIsMenuOpen(false)}
        ><BrandLogo width={110} /></Link>

        <button
          type="button"
          className={styles.mobileToggle}
          onClick={() => setIsMenuOpen((previous) => !previous)}
          aria-label={isMenuOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={isMenuOpen}
          aria-controls="pic-mobile-navigation"
        >
          {isMenuOpen ? <X size={23} /> : <Menu size={23} />}
        </button>
      </div>

      <div
        id="pic-mobile-navigation"
        className={styles.sidebarContent}
      >
        <p className={styles.menuCaption}>MENU UTAMA</p>

        <nav
          className={styles.navigation}
          aria-label="Navigasi PIC"
        >
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            if (item.disabled) {
              return (
                <div
                  key={item.href}
                  className={`${styles.menuItem} ${styles.menuItemDisabled}`}
                  aria-disabled="true"
                  title="Halaman belum tersedia"
                >
                  <Icon size={23} strokeWidth={2.3} aria-hidden="true" />
                  <span>{item.label}</span>
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className={`${styles.menuItem} ${
                  isActive ? styles.menuItemActive : ""
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={23} strokeWidth={2.3} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.roleCard}>
            <span className={styles.roleIndicator} />
            <div>
              <p className={styles.roleTitle}>Panel Pengelola</p>
              <p className={styles.roleDescription}>Akses PIC</p>
            </div>
          </div>

          <PicLogoutButton />
        </div>
      </div>
    </aside>
  );
}
