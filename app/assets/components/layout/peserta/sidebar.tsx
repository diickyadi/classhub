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
import BrandLogo from "@/app/assets/components/common/brand-logo";

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
  isPasswordChangeRequired?: boolean;
};

export default function PesertaSidebar({
  activeItem = "Dashboard",
  isPasswordChangeRequired = false,
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
          onClick={(event) => {
            if (isPasswordChangeRequired) {
              event.preventDefault();
              return;
            }

            setIsMenuOpen(false);
          }}
          aria-disabled={isPasswordChangeRequired}
        >
          <BrandLogo width={110} />
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
            const isLocked =
              isPasswordChangeRequired && item.label !== "Password";

            const Icon = item.icon;

            const className = [
              "ch-peserta-menuItem",
              isActive ? "ch-peserta-active" : "",
              isLocked ? "ch-peserta-menuItem-locked" : "",
            ]
              .filter(Boolean)
              .join(" ");

            const menuContent = (
              <>
                <Icon
                  size={23}
                  strokeWidth={2.3}
                  aria-hidden="true"
                />

                <span>{item.label}</span>

                {isLocked && (
                  <LockKeyhole
                    className="ch-peserta-menuLockIcon"
                    size={17}
                    strokeWidth={2.2}
                    aria-hidden="true"
                  />
                )}
              </>
            );

            if (isLocked) {
              return (
                <div
                  key={item.href}
                  className={className}
                  aria-disabled="true"
                  title="Ganti password terlebih dahulu untuk membuka menu ini."
                >
                  {menuContent}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className={className}
                aria-current={isActive ? "page" : undefined}
              >
                {menuContent}
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
