import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
        { error: "Data kelompok tidak valid." },
        { status: 400 }
      );
    }

    const payload = body as Record<string, unknown>;

    const name =
      typeof payload.name === "string" ? payload.name.trim() : "";

    const memberIds = payload.memberIds;
    const leaderId = payload.leaderId;

    if (!name || name.length > 150) {
      return NextResponse.json(
        { error: "Nama kelompok wajib diisi (maksimal 150 karakter)." },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(memberIds) ||
      memberIds.length === 0 ||
      !memberIds.every(
        (id): id is string =>
          typeof id === "string" && UUID_REGEX.test(id)
      )
    ) {
      return NextResponse.json(
        { error: "Pilih minimal satu anggota yang valid." },
        { status: 400 }
      );
    }

    if (new Set(memberIds).size !== memberIds.length) {
      return NextResponse.json(
        { error: "Anggota yang sama tidak boleh dipilih dua kali." },
        { status: 400 }
      );
    }

    if (
      typeof leaderId !== "string" ||
      !UUID_REGEX.test(leaderId) ||
      !memberIds.includes(leaderId)
    ) {
      return NextResponse.json(
        { error: "Ketua kelompok harus dipilih dari anggota kelompok." },
        { status: 400 }
      );
    }

    const { data, error: rpcError } = await supabase.rpc(
      "create_group_with_members",
      {
        p_name: name,
        p_member_ids: memberIds,
        p_leader_id: leaderId,
      }
    );

    if (rpcError) {
      console.error("Create group RPC failed:", {
        code: rpcError.code,
        message: rpcError.message,
      });

      if (rpcError.code === "23505") {
        return NextResponse.json(
          { error: "Nama kelompok tersebut sudah digunakan di divisi ini." },
          { status: 409 }
        );
      }

      if (rpcError.message.includes("One or more participants")) {
        return NextResponse.json(
          {
            error:
              "Ada peserta yang sudah memiliki kelompok atau tidak lagi memenuhi syarat. Muat ulang daftar peserta.",
          },
          { status: 409 }
        );
      }

      if (
        rpcError.message.includes("Active PIC account") ||
        rpcError.message.includes("Active division assignment") ||
        rpcError.message.includes("Division is inactive")
      ) {
        return NextResponse.json(
          { error: "Akun PIC atau divisi sudah tidak aktif." },
          { status: 403 }
        );
      }

      if (
        rpcError.message.includes("Group name must contain") ||
        rpcError.message.includes("Invalid group members")
      ) {
        return NextResponse.json(
          { error: "Data kelompok tidak valid." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Gagal menyimpan kelompok. Silakan coba lagi." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Kelompok berhasil dibuat.",
        group: data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create group error:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan saat membuat kelompok." },
      { status: 500 }
    );
  }
}
