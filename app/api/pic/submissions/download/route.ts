import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";


export async function POST(request: NextRequest) {
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
      console.error("PIC download profile lookup failed:", profileError);
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

    const body = await request.json().catch(() => null);
    const submissionId = Number(body?.submissionId);
    const revisionId =
      body?.revisionId === undefined || body?.revisionId === null
        ? null
        : Number(body.revisionId);

    if (
      !Number.isSafeInteger(submissionId) ||
      submissionId <= 0 ||
      (revisionId !== null &&
        (!Number.isSafeInteger(revisionId) || revisionId <= 0))
    ) {
      return NextResponse.json(
        { error: "ID pengumpulan atau revisi tidak valid." },
        { status: 400 }
      );
    }

    const { data: submission, error: submissionError } = await supabase
      .from("submissions")
      .select("id, division_id, file_path, original_file_name")
      .eq("id", submissionId)
      .maybeSingle();

    if (submissionError) {
      console.error("PIC download submission lookup failed:", submissionError);
      return NextResponse.json(
        { error: "Gagal mengambil data pengumpulan." },
        { status: 500 }
      );
    }

    if (!submission) {
      return NextResponse.json(
        { error: "Pengumpulan tidak ditemukan atau tidak memiliki akses." },
        { status: 404 }
      );
    }

    const { data: isPic, error: permissionError } = await supabase.rpc(
      "is_pic_for_division",
      { p_division_id: submission.division_id }
    );

    if (permissionError) {
      console.error("PIC download permission check failed:", permissionError);
      return NextResponse.json(
        { error: "Gagal memeriksa izin akses." },
        { status: 500 }
      );
    }

    if (!isPic) {
      return NextResponse.json(
        { error: "Kamu tidak memiliki akses ke pengumpulan ini." },
        { status: 403 }
      );
    }

    let filePath = submission.file_path;
    let downloadName =
      submission.original_file_name || "pengumpulan";

    if (revisionId !== null) {
      const { data: revision, error: revisionError } = await supabase
        .from("submission_revisions")
        .select("file_path, original_file_name")
        .eq("id", revisionId)
        .eq("submission_id", submissionId)
        .maybeSingle();

      if (revisionError) {
        console.error("PIC revision lookup failed:", revisionError);
        return NextResponse.json(
          { error: "Gagal mengambil data revisi." },
          { status: 500 }
        );
      }

      if (!revision) {
        return NextResponse.json(
          { error: "Riwayat revisi tidak ditemukan." },
          { status: 404 }
        );
      }

      filePath = revision.file_path;
      downloadName = revision.original_file_name || "revisi";
    }

    if (!filePath) {
      return NextResponse.json(
        { error: "Lokasi berkas tidak tersedia." },
        { status: 404 }
      );
    }

    const { data: signedUrl, error: signedUrlError } =
      await supabase.storage
        .from("submissions")
        .createSignedUrl(filePath, 60, {
          download: downloadName,
        });

    if (signedUrlError || !signedUrl) {
      console.error("PIC signed download URL failed:", signedUrlError);
      return NextResponse.json(
        { error: "Gagal membuat tautan download berkas." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: signedUrl.signedUrl,
    });
  } catch (error) {
    console.error("PIC submission download API error:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan saat menyiapkan download." },
      { status: 500 }
    );
  }
}
