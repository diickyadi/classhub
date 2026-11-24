import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import BuatTugas from "@/app/view/pic/buattugas";

async function BuatTugasContent() {
  // Pemeriksaan autentikasi dan data divisi dilakukan per request.
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: picAssignment } = await supabase
    .from("division_pic_assignments")
    .select("division_id")
    .eq("pic_user_id", user.id)
    .is("ended_at", null)
    .maybeSingle();

  if (!picAssignment?.division_id) {
    redirect("/dashboard/pic");
  }

  const { data: division } = await supabase
    .from("divisions")
    .select("id, name, description, is_active")
    .eq("id", picAssignment.division_id)
    .maybeSingle();

  if (!division?.name) {
    redirect("/dashboard/pic");
  }

  return <BuatTugas divisionName={division.name} />;
}

function BuatTugasFallback() {
  return (
    <section
      className="rounded-3xl border border-white/70 bg-white/60 p-6 text-sm text-slate-500"
      role="status"
    >
      Memuat halaman Buat Tugas...
    </section>
  );
}

export default function BuatTugasPage() {
  return (
    <Suspense fallback={<BuatTugasFallback />}>
      <BuatTugasContent />
    </Suspense>
  );
}