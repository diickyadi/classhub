import { redirect } from "next/navigation";
import { connection } from "next/server";

export const instant = false;
import { createClient } from "@/lib/supabase/server";

export default async function PesertaDashboardPage() {
  await connection();
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

  if (!profile || profile.role !== "PESERTA") redirect("/");

  const { data: participantDivision } = await supabase
    .from("participant_divisions")
    .select("division_id")
    .eq("user_id", user.id)
    .is("ended_at", null)
    .maybeSingle();

  if (!participantDivision) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 sm:p-10">
        <h1 className="text-2xl font-bold text-slate-800">
          Dashboard Peserta
        </h1>
        <p className="mt-4 text-slate-600">
          Kamu belum terdaftar di divisi aktif. Hubungi administrator.
        </p>
      </main>
    );
  }

  const divisionId = participantDivision.division_id;

  const { data: division } = await supabase
    .from("divisions")
    .select("id, name, description, is_active")
    .eq("id", divisionId)
    .maybeSingle();

  if (!division || !division.is_active) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 sm:p-10">
        <h1 className="text-2xl font-bold text-slate-800">
          Dashboard Peserta
        </h1>
        <p className="mt-4 text-slate-600">
          Divisimu sedang tidak aktif atau tidak tersedia.
        </p>
      </main>
    );
  }

  const { data: membership } = await supabase
    .from("group_members")
    .select("group_id, is_leader")
    .eq("user_id", user.id)
    .eq("division_id", divisionId)
    .is("left_at", null)
    .maybeSingle();

  let group: { id: number; name: string } | null = null;

  if (membership) {
    const { data: groupData } = await supabase
      .from("groups")
      .select("id, name")
      .eq("id", membership.group_id)
      .is("archived_at", null)
      .maybeSingle();

    group = groupData;
  }

  const { data: assignments } = await supabase
    .from("assignments")
    .select("id, title, module, description, deadline")
    .eq("division_id", divisionId)
    .order("deadline", { ascending: true });

  let submissions: {
    assignment_id: number;
    status: string;
    submitted_at: string;
    file_name: string;
  }[] = [];

  if (group) {
    const { data: submissionData } = await supabase
      .from("submissions")
      .select("assignment_id, status, submitted_at, file_name")
      .eq("group_id", group.id);

    submissions = submissionData ?? [];
  }

  const submissionMap = new Map(
    submissions.map((submission) => [
      submission.assignment_id,
      submission,
    ])
  );

  const taskList = assignments ?? [];

  return (
    <main className="min-h-screen bg-slate-50 p-6 sm:p-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <p className="text-sm font-medium text-blue-600">
            CLASSHUB / PESERTA
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Halo, {profile.full_name || "Peserta"}!
          </h1>
          <p className="mt-2 text-slate-500">
            Selamat datang di dashboard ClassHub.
          </p>
        </header>

        <section className="mb-6 rounded-2xl bg-blue-600 p-6 text-white shadow-sm">
          <p className="text-sm text-blue-100">Divisi kamu</p>
          <h2 className="mt-1 text-2xl font-bold">{division.name}</h2>
          <p className="mt-2 text-sm text-blue-100">
            {division.description || "Selamat mengerjakan tugas!"}
          </p>
        </section>

        <section className="mb-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Kelompok</p>
            <h3 className="mt-2 text-xl font-bold text-slate-800">
              {group?.name || "Belum ada kelompok"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {group
                ? membership?.is_leader
                  ? "Ketua kelompok"
                  : "Anggota kelompok"
                : "Hubungi PIC divisi untuk informasi kelompok."}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Total tugas divisi</p>
            <h3 className="mt-2 text-3xl font-bold text-slate-800">
              {taskList.length}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Tugas yang tersedia untuk divisi kamu
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-lg font-bold text-slate-800">
              Daftar Tugas
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Pantau deadline dan status pengumpulan kelompokmu.
            </p>
          </div>

          {taskList.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {taskList.map((assignment) => {
                const submission = submissionMap.get(assignment.id);
                const isLate =
                  new Date(assignment.deadline).getTime() < Date.now();

                return (
                  <article
                    key={assignment.id}
                    className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <h3 className="font-semibold text-slate-800">
                        {assignment.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {assignment.module}
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
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

                    <div className="shrink-0">
                      {submission ? (
                        <span className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
                          {submission.status === "late"
                            ? "Terkumpul terlambat"
                            : "Sudah dikumpulkan"}
                        </span>
                      ) : (
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                            isLate
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {isLate ? "Belum dikumpulkan" : "Belum mengumpulkan"}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="p-8 text-center text-slate-500">
              Belum ada tugas di divisi ini.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
