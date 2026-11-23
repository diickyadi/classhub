import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function PicDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/");

  if (profile.role !== "PIC") {
    redirect(
      profile.role === "PESERTA" ? "/dashboard/peserta" : "/"
    );
  }

  // Cari penugasan divisi PIC yang masih aktif.
  const { data: picAssignment } = await supabase
    .from("division_pic_assignments")
    .select("division_id")
    .eq("pic_user_id", user.id)
    .is("ended_at", null)
    .maybeSingle();

  if (!picAssignment) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Dashboard PIC
        </h1>
        <p className="mt-4 text-slate-600">
          Halo, {profile.full_name}.
        </p>
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
          Kamu belum memiliki penugasan divisi yang aktif.
          Silakan hubungi administrator.
        </div>
      </main>
    );
  }

  // Ambil informasi divisi.
  const { data: division } = await supabase
    .from("divisions")
    .select("id, name, description, is_active")
    .eq("id", picAssignment.division_id)
    .maybeSingle();

  if (!division || !division.is_active) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Dashboard PIC
        </h1>
        <p className="mt-4 text-slate-600">
          Divisi yang ditugaskan tidak tersedia atau sedang tidak aktif.
        </p>
      </main>
    );
  }

  // Ambil ringkasan data divisi secara bersamaan.
  const [
    groupsResult,
    participantsResult,
    assignmentsResult,
    submissionsResult,
    upcomingResult,
  ] = await Promise.all([
    supabase
      .from("groups")
      .select("id", { count: "exact", head: true })
      .eq("division_id", division.id)
      .is("archived_at", null),

    supabase
      .from("group_members")
      .select("id", { count: "exact", head: true })
      .eq("division_id", division.id)
      .is("left_at", null),

    supabase
      .from("assignments")
      .select("id", { count: "exact", head: true })
      .eq("division_id", division.id),

    supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("division_id", division.id),

    supabase
      .from("assignments")
      .select("id, title, module, deadline")
      .eq("division_id", division.id)
      .order("deadline", { ascending: true })
      .limit(5),
  ]);

  const stats = [
    {
      label: "Kelompok Aktif",
      value: groupsResult.count ?? 0,
    },
    {
      label: "Peserta Aktif",
      value: participantsResult.count ?? 0,
    },
    {
      label: "Total Tugas",
      value: assignmentsResult.count ?? 0,
    },
    {
      label: "Pengumpulan",
      value: submissionsResult.count ?? 0,
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="text-sm font-medium text-blue-600">
            VINIX7 / DASHBOARD PIC
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Selamat datang, {profile.full_name}
          </h1>
          <p className="mt-2 text-slate-500">
            Kelola tugas dan pantau aktivitas divisi kamu.
          </p>
        </header>

        <section className="mb-8 rounded-2xl bg-blue-600 p-6 text-white shadow-sm">
          <p className="text-sm text-blue-100">
            Divisi yang kamu kelola
          </p>
          <h2 className="mt-2 text-2xl font-bold">
            {division.name}
          </h2>
          {division.description && (
            <p className="mt-2 text-sm text-blue-100">
              {division.description}
            </p>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-xl font-bold text-slate-900">
            Ringkasan Divisi
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-sm text-slate-500">
                  {stat.label}
                </p>
                <p className="mt-3 text-3xl font-bold text-slate-900">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold text-slate-900">
            Daftar Tugas
          </h2>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {upcomingResult.data && upcomingResult.data.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {upcomingResult.data.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {assignment.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {assignment.module}
                      </p>
                    </div>

                    <p className="text-sm text-slate-600">
                      Deadline:{" "}
                      {new Date(assignment.deadline).toLocaleString(
                        "id-ID",
                        {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "Asia/Jakarta",
                        }
                      )}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-6 text-center text-slate-500">
                Belum ada tugas di divisi ini.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
