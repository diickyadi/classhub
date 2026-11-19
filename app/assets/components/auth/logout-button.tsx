"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    if (isLoading) return;

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Logout gagal:", error.message);
        setIsLoading(false);
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error("Terjadi kesalahan saat logout:", error);
      setIsLoading(false);
    }
  }

  return (
    <button
      type="button"
      className="ch-peserta-logoutButton"
      onClick={handleLogout}
      disabled={isLoading}
    >
      <svg
        width="21"
        height="21"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
      </svg>

      <span>{isLoading ? "Keluar" : "Logout"}</span>
    </button>
  );
}
