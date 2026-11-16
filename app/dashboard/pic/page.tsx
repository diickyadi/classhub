import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  });
}

function StatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{description}</p>
    </div>
  );
}

export const instant = false;

export default async function PicDashboardPage() {
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "PIC") {
    redirect("/dashboard");
  }

  const { data: picAssignment, error: assignmentError } = await supabase
    .from("division_pic_assignments")
    .select("division_id")
    .eq("pic_user_id", user.id)
    .is("ended_at", null)
    .maybeSingle();

  if (assignmentError || !picAssignment) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-6xl rounded-2xl border bg-white p-8">
          <h1 className="text-xl font-bold text-gray-900">
            Divisi belum ditugaskan
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Akun PIC ini belum memiliki penugasan divisi yang aktif.
            Silakan hubungi administrator.
          </p>
        </div>
      </main>
    );
  }

  const divisionId = picAssignment.division_id;

  const [
    divisionResult,
    groupsResult,
    participantsResult,
    assignmentsResult,
    submissionsResult,
  ] = await Promise.all([
    supabase
      .from("divisions")
      .select("id, name")
      .eq("id", divisionId)
      .maybeSingle(),

    supabase
      .from("groups")
      .select("id, name")
      .eq("division_id", divisionId)
      .is("archived_at", null),

    supabase
      .from("participant_divisions")
      .select("id")
      .eq("division_id", divisionId)
      .is("ended_at", null),

    supabase
      .from("assignments")
      .select("id, title, module, deadline, created_at")
      .eq("division_id", divisionId)
      .order("deadline", { ascending: true }),

    supabase
      .from("submissions")
      .select("id, assignment_id, group_id, status, submitted_at")
      .eq("division_id", divisionId),
  ]);

  const queryError =
    divisionResult.error ||
    groupsResult.error ||
    participantsResult.error ||
    assignmentsResult.error ||
    submissionsResult.error;

  if (queryError) {
    console.error("PIC dashboard query error:", queryError);

    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-6xl rounded-2xl border border-red-200 bg-white p-8">
          <h1 className="text-xl font-bold text-red-700">
            Data dashboard gagal dimuat
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Silakan muat ulang halaman. Jika masalah berlanjut, hubungi
            administrator.
          </p>
        </div>
      </main>
    );
  }

  const division = divisionResult.data;
  const groups = groupsResult.data ?? [];
  const participants = participantsResult.data ?? [];
  const assignments = assignmentsResult.data ?? [];
  const submissions = submissionsResult.data ?? [];

  const activeGroupIds = new Set(groups.map((group) => group.id));

  const activeSubmissions = submissions.filter((submission) =>
    activeGroupIds.has(submission.group_id)
  );

  const onTimeCount = activeSubmissions.filter(
    (submission) => submission.status === "submitted"
  ).length;

  const lateCount = activeSubmissions.filter(
    (submission) => submission.status === "late"
  ).length;

  const notSubmittedCount = assignments.reduce((total, assignment) => {
    const submittedGroups = new Set(
      activeSubmissions
        .filter((submission) => submission.assignment_id === assignment.id)
        .map((submission) => submission.group_id)
    );

    return total + Math.max(0, groups.length - submittedGroups.size);
  }, 0);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <p className="text-sm font-medium text-indigo-600">
            ClassHub / Dashboard PIC
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
            Dashboard PIC
          </h1>

          <p className="mt-2 text-gray-600">
            Selamat datang, {profile.full_name}.
          </p>

          <div className="mt-4 inline-flex rounded-full bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700">
            Divisi: {division?.name ?? "Tidak diketahui"}
          </div>
        </header>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Ringkasan divisi
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Kelompok aktif"
              value={groups.length}
              description="Kelompok yang belum diarsipkan"
            />

            <StatCard
              title="Peserta aktif"
              value={participants.length}
              description="Peserta yang terdaftar di divisi"
            />

            <StatCard
              title="Total tugas"
              value={assignments.length}
              description="Tugas yang dibuat untuk divisi"
            />

            <StatCard
              title="Total pengumpulan"
              value={activeSubmissions.length}
              description="Pengumpulan dari kelompok aktif"
            />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Monitoring pengumpulan
          </h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              title="Tepat waktu"
              value={onTimeCount}
              description="Pengumpulan berstatus submitted"
            />

            <StatCard
              title="Terlambat"
              value={lateCount}
              description="Pengumpulan berstatus late"
            />

            <StatCard
              title="Belum mengumpulkan"
              value={notSubmittedCount}
              description="Jumlah kelompok yang belum mengumpulkan per tugas"
            />
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Daftar tugas
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Pantau pengumpulan setiap tugas di divisi ini.
            </p>
          </div>

          {assignments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
              <p className="font-medium text-gray-700">
                Belum ada tugas
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Tugas yang dibuat untuk divisi ini akan muncul di sini.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => {
                const taskSubmissions = activeSubmissions.filter(
                  (submission) =>
                    submission.assignment_id === assignment.id
                );

                const submittedGroupIds = new Set(
                  taskSubmissions.map((submission) => submission.group_id)
                );

                const taskOnTime = taskSubmissions.filter(
                  (submission) => submission.status === "submitted"
                ).length;

                const taskLate = taskSubmissions.filter(
                  (submission) => submission.status === "late"
                ).length;

                const remaining = Math.max(
                  0,
                  groups.length - submittedGroupIds.size
                );

                return (
                  <article
                    key={assignment.id}
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {assignment.title}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {assignment.module}
                        </p>
                      </div>

                      <span className="h-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                        Deadline: {formatDate(assignment.deadline)}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Total kelompok</p>
                        <p className="mt-1 text-xl font-bold text-gray-900">
                          {groups.length}
                        </p>
                      </div>

                      <div className="rounded-xl bg-green-50 p-3">
                        <p className="text-xs text-green-700">Tepat waktu</p>
                        <p className="mt-1 text-xl font-bold text-green-800">
                          {taskOnTime}
                        </p>
                      </div>

                      <div className="rounded-xl bg-orange-50 p-3">
                        <p className="text-xs text-orange-700">Terlambat</p>
                        <p className="mt-1 text-xl font-bold text-orange-800">
                          {taskLate}
                        </p>
                      </div>

                      <div className="rounded-xl bg-red-50 p-3">
                        <p className="text-xs text-red-700">Belum masuk</p>
                        <p className="mt-1 text-xl font-bold text-red-800">
                          {remaining}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <footer className="mt-10 border-t border-gray-200 pt-5 text-xs text-gray-400">
          ClassHub · Dashboard PIC · Data berdasarkan divisi yang ditugaskan
        </footer>
      </div>
    </main>
  );
}
