import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import KelolaKelas from "@/app/view/pic/kelolakelas";

export default async function KelolaKelasPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: picAssignment, error: assignmentError } = await supabase
    .from("division_pic_assignments")
    .select("division_id")
    .eq("pic_user_id", user.id)
    .is("ended_at", null)
    .maybeSingle();

  if (assignmentError || !picAssignment?.division_id) {
    if (assignmentError) {
      console.error("Kelola Kelas PIC assignment lookup failed:", assignmentError);
    }

    redirect("/dashboard/pic");
  }

  const { data: division, error: divisionError } = await supabase
    .from("divisions")
    .select("id, name, description, is_active")
    .eq("id", picAssignment.division_id)
    .maybeSingle();

  if (divisionError || !division?.name || !division.is_active) {
    if (divisionError) {
      console.error("Kelola Kelas division lookup failed:", divisionError);
    }

    redirect("/dashboard/pic");
  }

  return <KelolaKelas divisionName={division.name} />;
}
