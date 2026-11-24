import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import KelolaKelas from "@/app/view/pic/kelolakelas";
import Pengumpulan from "@/app/view/pic/pengumpulan";
import styles from "@/app/style/pic/dashboard.module.css";

export const instant = false;

export default async function PicDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, account_status, must_change_password")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/");

  if (profile.account_status !== "active") redirect("/");

  if (profile.must_change_password) redirect("/change-password");

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
    <main className={styles.dashboardMain}>
      <div className={styles.dashboardContainer}>
<section className={styles.divisionBanner}>
          <p className={styles.divisionEyebrow}>
            Divisi yang kamu kelola
          </p>
          <h2 className={styles.divisionName}>
            {division.name}
          </h2>
          {division.description && (
            <p className={styles.divisionDescription}>
              {division.description}
            </p>
          )}
        </section>

        <section>
          <h2 className={styles.sectionTitle}>
            Ringkasan Divisi
          </h2>

          <div className={styles.statsGrid}>
            {stats.map((stat) => (
              <div
                key={stat.label}
                className={styles.statCard}
              >
                <p className={styles.statLabel}>
                  {stat.label}
                </p>
                <p className={styles.statValue}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        <KelolaKelas divisionName={division.name} />

        <Pengumpulan />

        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold text-slate-900">
            Tugas Terbaru
          </h2>

          <div className={styles.taskListCard}>
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
