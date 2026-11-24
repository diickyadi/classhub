import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

import PicSidebar from "@/app/assets/components/pic/sidebar";
import PicHeader from "@/app/assets/components/pic/header";
import styles from "@/app/style/pic/dashboard.module.css";

type PicDashboardLayoutProps = {
  children: React.ReactNode;
};

async function PicDashboardContent({
  children,
}: PicDashboardLayoutProps) {
  // Menandai bahwa proses autentikasi dan data PIC dilakukan saat request.
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, account_status, must_change_password")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/");
  }

  if (profile.role !== "PIC") {
    redirect(
      profile.role === "PESERTA"
        ? "/dashboard/peserta"
        : "/"
    );
  }

  if (profile.account_status !== "active") {
    redirect("/");
  }

  if (profile.must_change_password) {
    redirect("/change-password");
  }

  return (
    <div className={styles.dashboardShell}>
      <PicSidebar />

      <div className={styles.dashboardContent}>
        <PicHeader />
        {children}
      </div>
    </div>
  );
}

function PicDashboardFallback() {
  return (
    <div className={styles.dashboardShell}>
      <div className={styles.dashboardContent}>
        <p role="status">Memuat panel PIC...</p>
      </div>
    </div>
  );
}

export default function PicDashboardLayout({
  children,
}: PicDashboardLayoutProps) {
  return (
    <Suspense fallback={<PicDashboardFallback />}>
      <PicDashboardContent>
        {children}
      </PicDashboardContent>
    </Suspense>
  );
}
