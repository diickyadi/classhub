import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
      .select("account_status, must_change_password")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Change password profile lookup failed:", profileError);

      return NextResponse.json(
        { error: "Gagal memverifikasi profil akun." },
        { status: 500 }
      );
    }

    if (!profile || profile.account_status !== "active") {
      return NextResponse.json(
        { error: "Akun tidak aktif atau tidak ditemukan." },
        { status: 403 }
      );
    }

    if (!profile.must_change_password) {
      return NextResponse.json(
        { error: "Akun tidak sedang diwajibkan mengganti password." },
        { status: 400 }
      );
    }

    let body: { password?: unknown };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Format permintaan tidak valid." },
        { status: 400 }
      );
    }

    const password =
      typeof body.password === "string" ? body.password : "";

    if (password.length < 8 || password.length > 128) {
      return NextResponse.json(
        { error: "Password baru harus terdiri dari 8 sampai 128 karakter." },
        { status: 400 }
      );
    }

    const { error: passwordError } = await supabase.auth.updateUser({
      password,
    });

    if (passwordError) {
      console.error("Supabase password update failed:", passwordError);

      return NextResponse.json(
        { error: "Gagal mengganti password. Silakan coba kembali." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: updatedProfile, error: updateError } = await admin
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", user.id)
      .eq("account_status", "active")
      .eq("must_change_password", true)
      .select("id")
      .maybeSingle();

    if (updateError || !updatedProfile) {
      console.error(
        "Change password profile flag update failed:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Password berhasil diubah, tetapi penyelesaian akun belum berhasil. Silakan coba lagi atau hubungi administrator.",
          code: "PASSWORD_UPDATED_PROFILE_PENDING",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Password berhasil diubah." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Change password error:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}
