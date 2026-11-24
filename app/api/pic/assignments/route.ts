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

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Format data tidak valid." },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Data tugas tidak valid." },
        { status: 400 }
      );
    }

    const payload = body as Record<string, unknown>;

    const title =
      typeof payload.title === "string" ? payload.title.trim() : "";

    const assignmentModule =
      typeof payload.module === "string" ? payload.module.trim() : "";

    const description =
      typeof payload.description === "string"
        ? payload.description.trim()
        : "";

    const deadline =
      typeof payload.deadline === "string"
        ? payload.deadline
        : "";

    if (
      !title ||
      title.length > 255 ||
      /[\u0000-\u001F\u007F]/.test(title)
    ) {
      return NextResponse.json(
        { error: "Judul tugas wajib diisi dan maksimal 255 karakter." },
        { status: 400 }
      );
    }

    if (
      !assignmentModule ||
      assignmentModule.length > 100 ||
      /[\u0000-\u001F\u007F]/.test(assignmentModule)
    ) {
      return NextResponse.json(
        { error: "Modul wajib diisi dan maksimal 100 karakter." },
        { status: 400 }
      );
    }

    if (description.length > 10000) {
      return NextResponse.json(
        { error: "Deskripsi maksimal 10.000 karakter." },
        { status: 400 }
      );
    }

    // Deadline wajib menggunakan ISO 8601 dengan zona waktu.
    if (
      !deadline ||
      !/(Z|[+-]\d{2}:\d{2})$/i.test(deadline) ||
      !Number.isFinite(Date.parse(deadline))
    ) {
      return NextResponse.json(
        { error: "Format tenggat waktu tidak valid." },
        { status: 400 }
      );
    }

    const { data, error: rpcError } = await supabase.rpc(
      "create_assignment",
      {
        p_title: title,
        p_module: assignmentModule,
        p_description: description || null,
        p_deadline: new Date(deadline).toISOString(),
      }
    );

    if (rpcError) {
      console.error("Create assignment RPC failed:", {
        code: rpcError.code,
        message: rpcError.message,
      });

      if (
        rpcError.message.includes("PIC account is not authorized") ||
        rpcError.message.includes("No active division assignment")
      ) {
        return NextResponse.json(
          { error: "Akun PIC atau penugasan divisi sudah tidak aktif." },
          { status: 403 }
        );
      }

      if (
        rpcError.message.includes("Invalid assignment title") ||
        rpcError.message.includes("Invalid assignment module") ||
        rpcError.message.includes("description is too long") ||
        rpcError.message.includes("Deadline must be within")
      ) {
        return NextResponse.json(
          { error: "Data tugas tidak valid. Periksa kembali isian tugas dan tenggat waktu." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Gagal menyimpan tugas. Silakan coba lagi." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Tugas berhasil dibuat.",
        assignment: data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create assignment error:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan saat membuat tugas." },
      { status: 500 }
    );
  }
}
