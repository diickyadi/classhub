import { connection, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";


export async function GET() {
  await connection();

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, account_status, must_change_password")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("PIC profile lookup failed:", profileError);
      return NextResponse.json(
        { error: "Gagal memverifikasi akun." },
        { status: 500 }
      );
    }

    if (
      !profile ||
      profile.role !== "PIC" ||
      profile.account_status !== "active"
    ) {
      return NextResponse.json(
        { error: "Akses hanya tersedia untuk PIC aktif." },
        { status: 403 }
      );
    }

    if (profile.must_change_password) {
      return NextResponse.json(
        {
          error: "Ganti password terlebih dahulu.",
          code: "PASSWORD_CHANGE_REQUIRED",
        },
        { status: 403 }
      );
    }

    const { data: picAssignment, error: assignmentError } = await supabase
      .from("division_pic_assignments")
      .select("division_id")
      .eq("pic_user_id", user.id)
      .is("ended_at", null)
      .maybeSingle();

    if (assignmentError) {
      console.error("PIC division lookup failed:", assignmentError);
      return NextResponse.json(
        { error: "Gagal memeriksa penugasan divisi." },
        { status: 500 }
      );
    }

    if (!picAssignment) {
      return NextResponse.json(
        { error: "Kamu belum memiliki penugasan divisi aktif." },
        { status: 403 }
      );
    }

    const divisionId = picAssignment.division_id;

    const { data: submissions, error: submissionsError } = await supabase
      .from("submissions")
      .select(`
        id,
        assignment_id,
        group_id,
        division_id,
        submitted_by,
        status,
        file_path,
        file_name,
        original_file_name,
        file_size,
        file_type,
        submitted_at,
        updated_at,
        revision_allowed_until
      `)
      .eq("division_id", divisionId)
      .order("submitted_at", { ascending: false });

    if (submissionsError) {
      console.error("PIC submissions lookup failed:", submissionsError);
      return NextResponse.json(
        { error: "Gagal mengambil data pengumpulan." },
        { status: 500 }
      );
    }

    if (!submissions || submissions.length === 0) {
      return NextResponse.json({
        submissions: [],
      });
    }

    const submissionIds = submissions.map((item) => item.id);
    const assignmentIds = [...new Set(
      submissions.map((item) => item.assignment_id)
    )];
    const groupIds = [...new Set(
      submissions.map((item) => item.group_id)
    )];

    const [
      assignmentsResult,
      groupsResult,
      revisionsResult,
      membersResult,
    ] = await Promise.all([
      supabase
        .from("assignments")
        .select("id, title, module, deadline")
        .eq("division_id", divisionId)
        .in("id", assignmentIds),

      supabase
        .from("groups")
        .select("id, name")
        .eq("division_id", divisionId)
        .in("id", groupIds),

      supabase
        .from("submission_revisions")
        .select(`
          id,
          submission_id,
          revision_number,
          uploaded_by,
          file_path,
          file_name,
          original_file_name,
          file_size,
          file_type,
          uploaded_at
        `)
        .in("submission_id", submissionIds)
        .order("revision_number", { ascending: false }),

      supabase
        .from("submission_members")
        .select(`
          id,
          submission_id,
          user_id,
          full_name_snapshot,
          created_at
        `)
        .in("submission_id", submissionIds)
        .order("created_at", { ascending: true }),
    ]);

    if (
      assignmentsResult.error ||
      groupsResult.error ||
      revisionsResult.error ||
      membersResult.error
    ) {
      console.error("PIC submission details lookup failed:", {
        assignments: assignmentsResult.error,
        groups: groupsResult.error,
        revisions: revisionsResult.error,
        members: membersResult.error,
      });

      return NextResponse.json(
        { error: "Gagal mengambil detail pengumpulan." },
        { status: 500 }
      );
    }

    const assignments = assignmentsResult.data ?? [];
    const groups = groupsResult.data ?? [];
    const revisions = revisionsResult.data ?? [];
    const members = membersResult.data ?? [];

    const result = submissions.map((submission) => ({
      ...submission,
      assignment:
        assignments.find(
          (item) => item.id === submission.assignment_id
        ) ?? null,
      group:
        groups.find(
          (item) => item.id === submission.group_id
        ) ?? null,
      contributors: members.filter(
        (item) => item.submission_id === submission.id
      ),
      revisions: revisions.filter(
        (item) => item.submission_id === submission.id
      ),
    }));

    return NextResponse.json({
      submissions: result,
    });
  } catch (error) {
    console.error("PIC submissions API error:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil pengumpulan." },
      { status: 500 }
    );
  }
}
