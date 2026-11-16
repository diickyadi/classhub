import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";


const MAX_FILE_SIZE = 50 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

type SubmitBody = {
  groupId?: number;
  assignmentId?: number;
  path?: string;
  fileName?: string;
  originalFileName?: string;
  fileSize?: number;
  fileType?: string;
  contributorIds?: string[];
};

export async function POST(request: NextRequest) {
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

    let body: SubmitBody;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Format request tidak valid." },
        { status: 400 }
      );
    }

    const {
      groupId,
      assignmentId,
      path,
      fileName,
      originalFileName,
      fileSize,
      fileType,
      contributorIds,
    } = body;

    if (
      !Number.isSafeInteger(groupId) ||
      !Number.isSafeInteger(assignmentId) ||
      !groupId ||
      !assignmentId ||
      !path ||
      !fileName ||
      !originalFileName ||
      !Number.isSafeInteger(fileSize) ||
      !fileSize ||
      !fileType ||
      !Array.isArray(contributorIds)
    ) {
      return NextResponse.json(
        { success: false, message: "Data pengumpulan belum lengkap." },
        { status: 400 }
      );
    }

    if (fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: "Ukuran file maksimal 50 MB." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(fileType)) {
      return NextResponse.json(
        { success: false, message: "Format file tidak didukung." },
        { status: 400 }
      );
    }

    if (
      contributorIds.length < 1 ||
      contributorIds.length > 7 ||
      contributorIds.some(
        (id) => typeof id !== "string" ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      ) ||
      new Set(contributorIds).size !== contributorIds.length
    ) {
      return NextResponse.json(
        { success: false, message: "Pilih 1 sampai 7 anggota yang berkontribusi." },
        { status: 400 }
      );
    }

    if (
      typeof originalFileName !== "string" ||
      originalFileName.trim().length === 0 ||
      originalFileName.length > 255
    ) {
      return NextResponse.json(
        { success: false, message: "Nama file asli tidak valid." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc(
      "submit_group_assignment",
      {
        p_group_id: groupId,
        p_assignment_id: assignmentId,
        p_file_path: path,
        p_file_name: fileName,
        p_original_file_name: originalFileName.trim(),
        p_file_size: fileSize,
        p_file_type: fileType,
        p_contributor_ids: contributorIds,
      }
    );

    if (error) {
      console.error("Submission RPC error:", error.message);

      const message = error.message;

      if (message.includes("Only the active group leader")) {
        return NextResponse.json(
          { success: false, message: "Hanya ketua kelompok aktif yang dapat mengumpulkan tugas." },
          { status: 403 }
        );
      }

      if (message.includes("Revision period has expired")) {
        return NextResponse.json(
          { success: false, message: "Waktu revisi sudah berakhir. Hubungi PIC jika memerlukan izin revisi." },
          { status: 403 }
        );
      }

      if (message.includes("Authentication required")) {
        return NextResponse.json(
          { success: false, message: "Sesi login tidak valid." },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { success: false, message: "Pengumpulan gagal. Periksa file dan data kelompok." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: data.is_revision
          ? "Revisi tugas berhasil disimpan."
          : "Tugas berhasil dikumpulkan.",
        submission: data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Submission API error:", error);

    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}
