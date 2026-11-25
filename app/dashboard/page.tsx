import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, account_status, must_change_password")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    redirect("/");
  }

  if (profile.account_status !== "active") {
    redirect("/");
  }

  if (profile.role === "PESERTA" && profile.must_change_password) {
    redirect("/dashboard/peserta/password");
  }

  if (profile.role === "PIC" && profile.must_change_password) {
    redirect("/change-password");
  }

  if (profile.role === "PIC") {
    redirect("/dashboard/pic");
  }

  if (profile.role === "PESERTA") {
    redirect("/dashboard/peserta");
  }

  redirect("/");
}
