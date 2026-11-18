"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  ListChecks,
  UsersRound,
  CloudUpload,
  History,
  LockKeyhole,
  Menu,
  X,
} from "lucide-react";

import LogoutButton from "@/app/assets/components/auth/logout-button";

const menuItems = [
  {
    label: "Dashboard",
    href: "/dashboard/peserta",
    icon: LayoutDashboard,
  },
  {
    label: "Tugas",
    href: "/dashboard/peserta/tugas",
    icon: ListChecks,
  },
  {
    label: "Kelompok",
    href: "/dashboard/peserta/kelompok",
    icon: UsersRound,
  },
  {
    label: "Pengumpulan",
    href: "/dashboard/peserta/pengumpulan",
    icon: CloudUpload,
  },
  {
    label: "Riwayat",
    href: "/dashboard/peserta/riwayat",
    icon: History,
  },
  {
    label: "Password",
    href: "/dashboard/peserta/password",
    icon: LockKeyhole,
  },
];

type PesertaSidebarProps = {
  activeItem?: string;
};

export default function PesertaSidebar({
  activeItem = "Dashboard",
}: PesertaSidebarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <aside
      className={`ch-peserta-sidebar ${
        isMenuOpen ? "ch-peserta-sidebar-open" : ""
      }`}
    >
      <div className="ch-peserta-sidebarTopbar">
        <Link
          href="/dashboard/peserta"
          className="ch-peserta-brand"
          onClick={() => setIsMenuOpen(false)}
        >
          <span className="ch-peserta-brandMark">
            <svg
              viewBox="0 0 40 40"
              width="30"
              height="30"
              fill="none"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 12C16 9 10 9 5 11v20c5-2 11-2 15 1" />
              <path d="M20 12c4-3 10-3 15-1v20c-5-2-11-2-15 1" />
              <path d="M20 12v20" />
              <path d="M9 16c3-1 6-1 8 0M9 21c3-1 6-1 8 0" />
              <path d="M31 16c-3-1-6-1-8 0M31 21c-3-1-6-1-8 0" />
            </svg>
          </span>

          <span>ClassHub</span>
        </Link>

        <button
          type="button"
          className="ch-peserta-mobileToggle"
          onClick={() => setIsMenuOpen((previous) => !previous)}
          aria-label={isMenuOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={isMenuOpen}
          aria-controls="ch-peserta-mobile-navigation"
        >
          {isMenuOpen ? (
            <X size={23} strokeWidth={2} />
          ) : (
            <Menu size={23} strokeWidth={2} />
          )}
        </button>
      </div>

      <div
        id="ch-peserta-mobile-navigation"
        className="ch-peserta-sidebarContent"
      >
        <p className="ch-peserta-menuCaption">MENU UTAMA</p>

        <nav
          className="ch-peserta-navigation"
          aria-label="Navigasi Peserta"
        >
          {menuItems.map((item) => {
            const isActive = activeItem === item.label;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className={`ch-peserta-menuItem ${
                  isActive ? "ch-peserta-active" : ""
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  size={23}
                  strokeWidth={2.3}
                  aria-hidden="true"
                />

                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ch-peserta-sidebarFooter">
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
