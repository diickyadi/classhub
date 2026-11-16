import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { connection } from "next/server";

export const instant = false;

export default async function DashboardPage() {
  await connection();

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
  .select("full_name, role")
  .eq("id", user.id)
  .maybeSingle();

console.log("CLASSHUB PROFILE DEBUG:", {
  authUserId: user.id,
  authEmail: user.email,
  profile,
  profileError: profileError?.message,
});

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="rounded-xl bg-white p-8 shadow">
          <h1 className="text-xl font-bold text-slate-900">
            Profil belum tersedia
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Hubungi PIC untuk memeriksa profil akun kamu.
          </p>
        </div>
      </main>
    );
  }

  const { data: participantDivision } = await supabase
    .from("participant_divisions")
    .select("division_id")
    .eq("user_id", user.id)
    .is("ended_at", null)
    .maybeSingle();

  const { data: membership } = await supabase
    .from("group_members")
    .select("group_id, is_leader")
    .eq("user_id", user.id)
    .is("left_at", null)
    .maybeSingle();

  let group: { name: string; division_id: number } | null = null;
  let divisionName = "-";

  if (membership?.group_id) {
    const { data: groupData } = await supabase
      .from("groups")
      .select("name, division_id")
      .eq("id", membership.group_id)
      .maybeSingle();

    group = groupData;

    if (group) {
      const { data: division } = await supabase
        .from("divisions")
        .select("name")
        .eq("id", group.division_id)
        .maybeSingle();

      divisionName = division?.name ?? "-";
    }
  }

  const divisionId = participantDivision?.division_id;

  const { data: assignments } = divisionId
    ? await supabase
        .from("assignments")
        .select("id, title, module, description, deadline")
        .eq("division_id", divisionId)
        .order("deadline", { ascending: true })
    : { data: [] };

  const { data: submissions } = membership?.group_id
    ? await supabase
        .from("submissions")
        .select("assignment_id, status, submitted_at")
        .eq("group_id", membership.group_id)
    : { data: [] };

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">ClassHub</h1>
            <p className="text-xs text-slate-500">
              Smart Assignment Submission Platform
            </p>
          </div>

          <form action="/auth/logout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Keluar
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        <section>
          <p className="text-sm text-slate-500">Dashboard Peserta</p>
          <h2 className="mt-1 text-3xl font-bold text-slate-900">
            Halo, {profile.full_name}! 👋
          </h2>
          <p className="mt-2 text-slate-600">
            Selamat datang kembali di ClassHub.
          </p>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Role Akun</p>
            <p className="mt-2 text-xl font-bold capitalize text-slate-900">
              {profile.role}
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Kelompok</p>
            <p className="mt-2 text-xl font-bold text-slate-900">
              {group?.name ?? "Belum ada kelompok"}
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Divisi</p>
            <p className="mt-2 text-xl font-bold text-slate-900">
              {divisionName}
            </p>
          </div>
        </section>

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Daftar Tugas
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Tugas yang perlu diselesaikan kelompokmu.
              </p>
            </div>

            <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
              {assignments?.length ?? 0} Tugas
            </span>
          </div>

          {!assignments?.length ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Belum ada tugas tersedia.
            </p>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => {
                const submission = submissions?.find(
                  (item) => item.assignment_id === assignment.id
                );

                return (
                  <div
                    key={assignment.id}
                    className="rounded-lg border border-slate-200 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-blue-600">
                          MODUL {assignment.module}
                        </p>

                        <h4 className="mt-1 font-bold text-slate-900">
                          {assignment.title}
                        </h4>

                        <p className="mt-2 text-sm text-slate-600">
                          {assignment.description}
                        </p>

                        <p className="mt-3 text-xs text-slate-500">
                          Deadline:{" "}
                          {new Date(assignment.deadline).toLocaleString(
                            "id-ID",
                            { timeZone: "Asia/Jakarta" }
                          )}
                        </p>
                      </div>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        {submission?.status === "submitted"
                          ? "Sudah dikumpulkan"
                          : submission?.status === "late"
                            ? "Terlambat"
                            : "Belum dikumpulkan"}
                      </span>
                    </div>

                    {membership?.is_leader && !submission && (
                      <p className="mt-4 text-xs text-blue-600">
                        Ketua kelompok dapat mengumpulkan tugas ini.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
