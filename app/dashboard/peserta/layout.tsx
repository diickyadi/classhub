import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function PesertaLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, account_status, must_change_password")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) redirect("/");

  if (profile.account_status !== "active") redirect("/");

  if (profile.must_change_password) {
    redirect("/change-password");
  }

  if (profile.role !== "PESERTA") {
    redirect(profile.role === "PIC" ? "/dashboard/pic" : "/");
  }

  return <>{children}</>;
}
