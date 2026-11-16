import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function DashboardRouter() {
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) {
    return (
      <main className="p-8">
        <h1>Profil tidak ditemukan</h1>
        <p>Silakan hubungi PIC untuk memeriksa akunmu.</p>
      </main>
    );
  }

  if (profile.role === "PIC") {
    redirect("/dashboard/pic");
  }

  if (profile.role === "PESERTA") {
    redirect("/dashboard/peserta");
  }

  return <main className="p-8">Role akun tidak dikenali.</main>;
}
