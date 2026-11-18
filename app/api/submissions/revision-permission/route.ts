import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";


export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    // Tolak akun yang belum diaktifkan atau sudah dinonaktifkan.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("account_status, must_change_password")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Account status check error:", profileError);
      return NextResponse.json(
        { success: false, message: "Gagal memeriksa status akun." },
        { status: 500 }
      );
    }

    if (!profile || profile.account_status !== "active") {
      return NextResponse.json(
        { success: false, message: "Akun belum aktif atau telah dinonaktifkan." },
        { status: 403 }
      );
    }

    if (profile.must_change_password) {
      return NextResponse.json(
        {
          success: false,
          message: "Ganti password terlebih dahulu sebelum mengatur izin revisi.",
          code: "PASSWORD_CHANGE_REQUIRED",
        },
        { status: 403 }
      );
    }

    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Format request tidak valid." },
        { status: 400 }
      );
    }

    const submissionId = Number(body.submissionId);
    const allowedUntil = body.revisionAllowedUntil;

    if (
      !Number.isSafeInteger(submissionId) ||
      submissionId <= 0 ||
      typeof allowedUntil !== "string"
    ) {
      return NextResponse.json(
        { success: false, message: "Data izin revisi tidak valid." },
        { status: 400 }
      );
    }

    const permissionDate = new Date(allowedUntil);

    if (
      !Number.isFinite(permissionDate.getTime()) ||
      permissionDate.getTime() <= Date.now()
    ) {
      return NextResponse.json(
        { success: false, message: "Batas izin harus berupa waktu di masa depan." },
        { status: 400 }
      );
    }

    // Ambil submission menggunakan session pengguna.
    const { data: submission, error: submissionError } = await supabase
      .from("submissions")
      .select("id, division_id, assignment_id")
      .eq("id", submissionId)
      .maybeSingle();

    if (submissionError) {
      console.error("Submission lookup error:", submissionError);
      return NextResponse.json(
        { success: false, message: "Gagal memeriksa submission." },
        { status: 500 }
      );
    }

    if (!submission) {
      return NextResponse.json(
        { success: false, message: "Submission tidak ditemukan." },
        { status: 404 }
      );
    }

    // Pastikan pengguna adalah PIC aktif divisi submission.
    const { data: isPic, error: picError } = await supabase.rpc(
      "is_pic_for_division",
      { p_division_id: submission.division_id }
    );

    if (picError) {
      console.error("PIC authorization error:", picError);
      return NextResponse.json(
        { success: false, message: "Gagal memeriksa hak akses PIC." },
        { status: 500 }
      );
    }

    if (!isPic) {
      return NextResponse.json(
        { success: false, message: "Hanya PIC aktif divisi terkait yang dapat memberi izin revisi." },
        { status: 403 }
      );
    }

    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .select("deadline")
      .eq("id", submission.assignment_id)
      .eq("division_id", submission.division_id)
      .maybeSingle();

    if (assignmentError) {
      console.error("Assignment lookup error:", assignmentError);
      return NextResponse.json(
        { success: false, message: "Gagal memeriksa deadline tugas." },
        { status: 500 }
      );
    }

    if (!assignment) {
      return NextResponse.json(
        { success: false, message: "Tugas tidak ditemukan." },
        { status: 404 }
      );
    }

    if (permissionDate.getTime() <= new Date(assignment.deadline).getTime()) {
      return NextResponse.json(
        { success: false, message: "Batas izin revisi harus melewati deadline tugas." },
        { status: 400 }
      );
    }

    // Admin hanya digunakan setelah otorisasi PIC berhasil.
    const admin = createAdminClient();

    const { data: updated, error: updateError } = await admin
      .from("submissions")
      .update({
        revision_allowed_until: permissionDate.toISOString(),
      })
      .eq("id", submissionId)
      .eq("division_id", submission.division_id)
      .select("id, revision_allowed_until")
      .single();

    if (updateError || !updated) {
      console.error("Revision permission update error:", updateError);
      return NextResponse.json(
        { success: false, message: "Gagal menyimpan izin revisi." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Izin revisi berhasil diberikan.",
      data: updated,
    });
  } catch (error) {
    console.error("Revision permission API error:", error);

    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}
