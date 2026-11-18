import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

import "@/app/style/peserta/typography.css";
import "@/app/style/peserta/dashboard.css";
import "@/app/style/peserta/sidebar.css";
import "@/app/style/peserta/header.css";
import "@/app/style/peserta/pengumpulan.css";

import PesertaPengumpulanView, {
  type SubmissionItem,
  type GroupMemberOption,
} from "@/app/view/peserta/pengumpulan";

export const instant = false;

export default async function PesertaPengumpulanPage() {
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) redirect("/");

  if (profile.role !== "PESERTA") {
    redirect(profile.role === "PIC" ? "/dashboard/pic" : "/");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("group_members")
    .select("group_id, division_id, is_leader")
    .eq("user_id", user.id)
    .is("left_at", null)
    .maybeSingle();

  if (membershipError) {
    console.error("Submission membership error:", membershipError);

    return (
      <PesertaPengumpulanView
        submissions={[]}
        groupMembers={[]}
        currentUserIsLeader={false}
        error="Gagal mengambil informasi keanggotaan kelompok."
      />
    );
  }

  if (!membership) {
    return (
      <PesertaPengumpulanView
        submissions={[]}
        groupMembers={[]}
        currentUserIsLeader={false}
      />
    );
  }

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id")
    .eq("id", membership.group_id)
    .eq("division_id", membership.division_id)
    .is("archived_at", null)
    .maybeSingle();

  if (groupError) {
    console.error("Submission group error:", groupError);

    return (
      <PesertaPengumpulanView
        submissions={[]}
        groupMembers={[]}
        currentUserIsLeader={false}
        error="Gagal memeriksa informasi kelompok."
      />
    );
  }

  if (!group) {
    return (
      <PesertaPengumpulanView
        submissions={[]}
        groupMembers={[]}
        currentUserIsLeader={false}
      />
    );
  }

  const { data: groupMembers, error: groupMembersError } = await supabase
    .from("group_members")
    .select("user_id, is_leader, joined_at")
    .eq("group_id", membership.group_id)
    .is("left_at", null)
    .order("is_leader", { ascending: false })
    .order("joined_at", { ascending: true });

  if (groupMembersError || !groupMembers) {
    console.error("Submission group members error:", groupMembersError);

    return (
      <PesertaPengumpulanView
        submissions={[]}
        groupMembers={[]}
        currentUserIsLeader={membership.is_leader}
        error="Gagal mengambil daftar anggota kelompok."
      />
    );
  }

  const memberUserIds = groupMembers.map((member) => member.user_id);

  const { data: memberProfiles, error: memberProfilesError } =
    await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", memberUserIds);

  if (memberProfilesError || !memberProfiles) {
    console.error("Submission member profiles error:", memberProfilesError);

    return (
      <PesertaPengumpulanView
        submissions={[]}
        groupMembers={[]}
        currentUserIsLeader={membership.is_leader}
        error="Gagal mengambil nama anggota kelompok."
      />
    );
  }

  const groupMemberOptions: GroupMemberOption[] = groupMembers.map(
    (member) => {
      const memberProfile = memberProfiles.find(
        (item) => item.id === member.user_id
      );

      return {
        userId: member.user_id,
        fullName: memberProfile?.full_name ?? "Nama tidak tersedia",
        isLeader: member.is_leader,
      };
    }
  );

  const { data: submissions, error: submissionsError } = await supabase
    .from("submissions")
    .select(
      "id, assignment_id, status, original_file_name, file_size, submitted_at, updated_at, revision_allowed_until"
    )
    .eq("group_id", membership.group_id)
    .eq("division_id", membership.division_id)
    .order("submitted_at", { ascending: false });

  if (submissionsError || !submissions) {
    console.error("Submission data error:", submissionsError);

    return (
      <PesertaPengumpulanView
        submissions={[]}
        groupMembers={groupMemberOptions}
        currentUserIsLeader={membership.is_leader}
        error="Gagal mengambil daftar pengumpulan tugas."
      />
    );
  }

  if (submissions.length === 0) {
    return (
      <PesertaPengumpulanView
        submissions={[]}
        groupMembers={groupMemberOptions}
        currentUserIsLeader={membership.is_leader}
      />
    );
  }

  const submissionIds = submissions.map((submission) => submission.id);
  const assignmentIds = [
    ...new Set(submissions.map((submission) => submission.assignment_id)),
  ];

  const [assignmentsResult, membersResult, revisionsResult] =
    await Promise.all([
      supabase
        .from("assignments")
        .select("id, title, module, deadline")
        .eq("division_id", membership.division_id)
        .in("id", assignmentIds),

      supabase
        .from("submission_members")
        .select("submission_id, user_id, full_name_snapshot, created_at")
        .in("submission_id", submissionIds)
        .order("created_at", { ascending: true }),

      supabase
        .from("submission_revisions")
        .select(
          "id, submission_id, revision_number, original_file_name, file_size, uploaded_at"
        )
        .in("submission_id", submissionIds)
        .order("revision_number", { ascending: true }),
    ]);

  if (assignmentsResult.error || !assignmentsResult.data) {
    console.error(
      "Submission assignments error:",
      assignmentsResult.error
    );

    return (
      <PesertaPengumpulanView
        submissions={[]}
        groupMembers={groupMemberOptions}
        currentUserIsLeader={membership.is_leader}
        error="Gagal mengambil informasi tugas."
      />
    );
  }

  if (membersResult.error || !membersResult.data) {
    console.error("Submission members error:", membersResult.error);

    return (
      <PesertaPengumpulanView
        submissions={[]}
        groupMembers={groupMemberOptions}
        currentUserIsLeader={membership.is_leader}
        error="Gagal mengambil informasi kontributor."
      />
    );
  }

  if (revisionsResult.error || !revisionsResult.data) {
    console.error("Submission revisions error:", revisionsResult.error);

    return (
      <PesertaPengumpulanView
        submissions={[]}
        groupMembers={groupMemberOptions}
        currentUserIsLeader={membership.is_leader}
        error="Gagal mengambil riwayat revisi pengumpulan."
      />
    );
  }

  const submissionItems: SubmissionItem[] = submissions.map(
    (submission) => {
      const assignment = assignmentsResult.data.find(
        (item) => item.id === submission.assignment_id
      );

      const contributors = membersResult.data
        .filter((member) => member.submission_id === submission.id)
        .map((member) => ({
          userId: member.user_id,
          fullName: member.full_name_snapshot,
        }));

      const revisions = revisionsResult.data
        .filter((revision) => revision.submission_id === submission.id)
        .map((revision) => ({
          id: revision.id,
          revisionNumber: revision.revision_number,
          originalFileName: revision.original_file_name,
          fileSize: Number(revision.file_size),
          uploadedAt: revision.uploaded_at,
        }));

      return {
        id: submission.id,
        assignmentId: submission.assignment_id,
        groupId: membership.group_id,
        assignmentTitle: assignment?.title ?? "Tugas tidak ditemukan",
        moduleName: assignment?.module ?? "Modul tidak tersedia",
        deadline: assignment?.deadline ?? null,
        revisionAllowedUntil: submission.revision_allowed_until,
        status: submission.status as "submitted" | "late",
        originalFileName: submission.original_file_name,
        fileSize: Number(submission.file_size),
        submittedAt: submission.submitted_at,
        updatedAt: submission.updated_at,
        contributors,
        revisions,
      };
    }
  );

  return (
    <PesertaPengumpulanView
      submissions={submissionItems}
      groupMembers={groupMemberOptions}
      currentUserIsLeader={membership.is_leader}
    />
  );
}
