import { redirect } from "next/navigation";
import { connection } from "next/server";

export const instant = false;
import { createClient } from "@/lib/supabase/server";
import PengumpulanTugas from "@/app/view/peserta/pengumpulan-tugas";

export default async function PesertaDashboardPage() {
  await connection();
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

  if (profile.role !== "PESERTA") redirect("/");

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

  let groupMembers: {
    user_id: string;
    full_name: string;
  }[] = [];

  if (membership) {
    const { data: groupData } = await supabase
      .from("groups")
      .select("id, name")
      .eq("id", membership.group_id)
      .is("archived_at", null)
      .maybeSingle();

    group = groupData;

    if (group) {
      const { data: membersData, error: membersError } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", group.id)
        .is("left_at", null);

      if (membersError) {
        console.error("Group members query error:", membersError);
      } else {
        const memberIds = [
          ...new Set((membersData ?? []).map((member) => member.user_id)),
        ];

        if (memberIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", memberIds);

          if (profilesError) {
            console.error("Group member profiles query error:", profilesError);
          } else {
            const profileMap = new Map(
              (profilesData ?? []).map((profile) => [
                profile.id,
                profile.full_name,
              ])
            );

            groupMembers = memberIds.flatMap((userId) => {
              const fullName = profileMap.get(userId);

              return fullName
                ? [{ user_id: userId, full_name: fullName }]
                : [];
            });
          }
        }
      }
    }
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

        <PengumpulanTugas
          groupId={group?.id ?? null}
          isLeader={membership?.is_leader === true}
          groupMembers={groupMembers}
          assignments={taskList.map((assignment) => ({
            ...assignment,
            module: assignment.module ?? null,
            description: assignment.description ?? null,
            deadline: assignment.deadline,
          }))}
          submissions={submissions}
        />
      </div>
    </main>
  );
}
