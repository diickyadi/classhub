import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

import "@/app/style/peserta/typography.css";
import "@/app/style/peserta/dashboard.css";
import "@/app/style/peserta/sidebar.css";
import "@/app/style/peserta/header.css";

import PesertaDashboardView, {
  type DashboardTask,
} from "@/app/view/peserta/dashboard";

export const instant = false;

export default async function PesertaDashboardPage() {
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) redirect("/");

  if (profile.role !== "PESERTA") {
    redirect(profile.role === "PIC" ? "/dashboard/pic" : "/");
  }

  const welcomeName = profile.full_name ?? "Peserta";

  const { data: membership, error: membershipError } = await supabase
    .from("group_members")
    .select("group_id, division_id, is_leader")
    .eq("user_id", user.id)
    .is("left_at", null)
    .maybeSingle();

  if (membershipError) {
    console.error("Dashboard membership error:", membershipError);

    return (
      <PesertaDashboardView
        welcomeName={welcomeName}
        group={null}
        statistics={{
          activeTasks: 0,
          submittedTasks: 0,
          pendingTasks: 0,
          memberCount: 0,
        }}
        tasks={[]}
        error="Gagal mengambil informasi kelompok."
      />
    );
  }

  if (!membership) {
    return (
      <PesertaDashboardView
        welcomeName={welcomeName}
        group={null}
        statistics={{
          activeTasks: 0,
          submittedTasks: 0,
          pendingTasks: 0,
          memberCount: 0,
        }}
        tasks={[]}
      />
    );
  }

  const [groupResult, divisionResult, membersResult] = await Promise.all([
    supabase
      .from("groups")
      .select("id, name, division_id")
      .eq("id", membership.group_id)
      .eq("division_id", membership.division_id)
      .is("archived_at", null)
      .maybeSingle(),

    supabase
      .from("divisions")
      .select("id, name")
      .eq("id", membership.division_id)
      .maybeSingle(),

    supabase
      .from("group_members")
      .select("id")
      .eq("group_id", membership.group_id)
      .is("left_at", null),
  ]);

  if (
    groupResult.error ||
    divisionResult.error ||
    membersResult.error ||
    !groupResult.data ||
    !divisionResult.data ||
    !membersResult.data
  ) {
    console.error("Dashboard group information error:", {
      groupError: groupResult.error,
      divisionError: divisionResult.error,
      membersError: membersResult.error,
    });

    return (
      <PesertaDashboardView
        welcomeName={welcomeName}
        group={null}
        statistics={{
          activeTasks: 0,
          submittedTasks: 0,
          pendingTasks: 0,
          memberCount: 0,
        }}
        tasks={[]}
        error="Gagal mengambil informasi kelompok."
      />
    );
  }

  const now = new Date().toISOString();

  const [assignmentsResult, submissionsResult] = await Promise.all([
    supabase
      .from("assignments")
      .select("id, title, module, deadline")
      .eq("division_id", membership.division_id)
      .gte("deadline", now)
      .order("deadline", { ascending: true }),

    supabase
      .from("submissions")
      .select("assignment_id, status")
      .eq("group_id", membership.group_id)
      .eq("division_id", membership.division_id),
  ]);

  if (assignmentsResult.error || !assignmentsResult.data) {
    console.error("Dashboard assignments error:", assignmentsResult.error);

    return (
      <PesertaDashboardView
        welcomeName={welcomeName}
        group={{
          name: groupResult.data.name,
          divisionName: divisionResult.data.name,
          isLeader: membership.is_leader,
        }}
        statistics={{
          activeTasks: 0,
          submittedTasks: 0,
          pendingTasks: 0,
          memberCount: membersResult.data.length,
        }}
        tasks={[]}
        error="Gagal mengambil daftar tugas."
      />
    );
  }

  if (submissionsResult.error || !submissionsResult.data) {
    console.error("Dashboard submissions error:", submissionsResult.error);

    return (
      <PesertaDashboardView
        welcomeName={welcomeName}
        group={{
          name: groupResult.data.name,
          divisionName: divisionResult.data.name,
          isLeader: membership.is_leader,
        }}
        statistics={{
          activeTasks: assignmentsResult.data.length,
          submittedTasks: 0,
          pendingTasks: assignmentsResult.data.length,
          memberCount: membersResult.data.length,
        }}
        tasks={[]}
        error="Gagal mengambil status pengumpulan tugas."
      />
    );
  }

  const submittedAssignmentIds = new Set(
    submissionsResult.data.map((submission) => submission.assignment_id)
  );

  const tasks: DashboardTask[] = assignmentsResult.data.map((assignment) => ({
    id: assignment.id,
    title: assignment.title,
    module: assignment.module,
    deadline: assignment.deadline,
    status: submittedAssignmentIds.has(assignment.id)
      ? "submitted"
      : "pending",
  }));

  const submittedTasks = tasks.filter(
    (task) => task.status === "submitted"
  ).length;

  const pendingTasks = tasks.length - submittedTasks;

  return (
    <PesertaDashboardView
      welcomeName={welcomeName}
      group={{
        name: groupResult.data.name,
        divisionName: divisionResult.data.name,
        isLeader: membership.is_leader,
      }}
      statistics={{
        activeTasks: tasks.length,
        submittedTasks,
        pendingTasks,
        memberCount: membersResult.data.length,
      }}
      tasks={tasks.slice(0, 5)}
    />
  );
}
