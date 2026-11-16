import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";


const BUCKET = "submissions";
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx"];

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

    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Format request tidak valid." },
        { status: 400 }
      );
    }

    const groupId = Number(body.groupId);
    const assignmentId = Number(body.assignmentId);
    const fileName = String(body.fileName ?? "").trim();
    const fileSize = Number(body.fileSize);
    const fileType = String(body.fileType ?? "").trim();

    if (
      !Number.isSafeInteger(groupId) ||
      groupId <= 0 ||
      !Number.isSafeInteger(assignmentId) ||
      assignmentId <= 0 ||
      !fileName ||
      fileName.length > 255 ||
      !Number.isSafeInteger(fileSize) ||
      fileSize <= 0 ||
      fileSize > MAX_FILE_SIZE ||
      !ALLOWED_TYPES.includes(fileType)
    ) {
      return NextResponse.json(
        { success: false, message: "Data file atau tugas tidak valid." },
        { status: 400 }
      );
    }

    const extension = fileName.split(".").pop()?.toLowerCase();

    if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        { success: false, message: "Ekstensi file tidak diizinkan." },
        { status: 400 }
      );
    }

    // Pastikan pengguna adalah ketua yang masih aktif di kelompok.
    const { data: membership, error: membershipError } = await supabase
      .from("group_members")
      .select("id, division_id")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .eq("is_leader", true)
      .is("left_at", null)
      .maybeSingle();

    if (membershipError) {
      console.error("Membership check error:", membershipError);
      return NextResponse.json(
        { success: false, message: "Gagal memeriksa keanggotaan kelompok." },
        { status: 500 }
      );
    }

    if (!membership) {
      return NextResponse.json(
        { success: false, message: "Hanya ketua kelompok aktif yang dapat mengunggah tugas." },
        { status: 403 }
      );
    }

    // Pastikan kelompok masih aktif.
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("id, division_id")
      .eq("id", groupId)
      .is("archived_at", null)
      .maybeSingle();

    if (groupError) {
      console.error("Group check error:", groupError);
      return NextResponse.json(
        { success: false, message: "Gagal memeriksa kelompok." },
        { status: 500 }
      );
    }

    if (!group || group.division_id !== membership.division_id) {
      return NextResponse.json(
        { success: false, message: "Kelompok tidak ditemukan atau sudah tidak aktif." },
        { status: 404 }
      );
    }

    // Pastikan tugas berasal dari divisi yang sama dengan kelompok.
    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .select("id, division_id, deadline")
      .eq("id", assignmentId)
      .eq("division_id", group.division_id)
      .maybeSingle();

    if (assignmentError) {
      console.error("Assignment check error:", assignmentError);
      return NextResponse.json(
        { success: false, message: "Gagal memeriksa tugas." },
        { status: 500 }
      );
    }

    if (!assignment) {
      return NextResponse.json(
        { success: false, message: "Tugas tidak ditemukan untuk divisi kelompok ini." },
        { status: 404 }
      );
    }

    const safeFileName = `submission-${crypto.randomUUID()}.${extension}`;
    const filePath = `${groupId}/${assignmentId}/${safeFileName}`;

    // Admin hanya digunakan untuk membuat signed URL setelah seluruh
    // pemeriksaan otorisasi dilakukan menggunakan session pengguna.
    const admin = createAdminClient();

    const { data: signedUpload, error: uploadError } =
      await admin.storage.from(BUCKET).createSignedUploadUrl(filePath);

    if (uploadError || !signedUpload) {
      console.error("Signed upload URL error:", uploadError);
      return NextResponse.json(
        { success: false, message: "Gagal membuat URL upload." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "URL upload berhasil dibuat.",
      data: {
        path: filePath,
        token: signedUpload.token,
        signedUrl: signedUpload.signedUrl,
        fileName: safeFileName,
        originalFileName: fileName,
        fileSize,
        fileType,
        deadline: assignment.deadline,
      },
    });
  } catch (error) {
    console.error("Upload URL API error:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}
