import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function DashboardPage() {
  const supabase = await createClient();

  // Periksa sesi pengguna.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/");
  }

  // Ambil role dari profil pengguna yang sedang login.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    redirect("/");
  }

  // Arahkan pengguna sesuai role.
  if (profile.role === "PIC") {
    redirect("/dashboard/pic");
  }

  if (profile.role === "PESERTA") {
    redirect("/dashboard/peserta");
  }

  redirect("/");
}
