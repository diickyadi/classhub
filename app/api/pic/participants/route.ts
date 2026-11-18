import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function generateTemporaryPassword() {
  return `Ch${randomBytes(12).toString("base64url")}9!`;
}

async function rollbackParticipant(
  admin: ReturnType<typeof createAdminClient>,
  participantId: string
) {
  const { error: divisionError } = await admin
    .from("participant_divisions")
    .delete()
    .eq("user_id", participantId);

  if (divisionError) {
    console.error("Rollback participant division failed:", divisionError);
    return false;
  }

  const { error: profileError } = await admin
    .from("profiles")
    .delete()
    .eq("id", participantId);

  if (profileError) {
    console.error("Rollback participant profile failed:", profileError);
    return false;
  }

  const { error: authError } =
    await admin.auth.admin.deleteUser(participantId);

  if (authError) {
    console.error("Rollback participant Auth user failed:", authError);
    return false;
  }

  return true;
}

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

    const { data: picProfile, error: profileError } = await supabase
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
      !picProfile ||
      picProfile.role !== "PIC" ||
      picProfile.account_status !== "active"
    ) {
      return NextResponse.json(
        { error: "Akses hanya tersedia untuk PIC aktif." },
        { status: 403 }
      );
    }

    if (picProfile.must_change_password) {
      return NextResponse.json(
        {
          error: "Ganti password terlebih dahulu sebelum menggunakan fitur ini.",
          code: "PASSWORD_CHANGE_REQUIRED",
        },
        { status: 403 }
      );
    }

    const { data: assignment, error: assignmentError } = await supabase
      .from("division_pic_assignments")
      .select("division_id, divisions!inner(id, is_active)")
      .eq("pic_user_id", user.id)
      .is("ended_at", null)
      .maybeSingle();

    if (assignmentError) {
      console.error("PIC assignment lookup failed:", assignmentError);

      return NextResponse.json(
        { error: "Gagal memverifikasi divisi PIC." },
        { status: 500 }
      );
    }

    const division = Array.isArray(assignment?.divisions)
      ? assignment.divisions[0]
      : assignment?.divisions;

    if (!assignment || !division?.is_active) {
      return NextResponse.json(
        { error: "PIC tidak memiliki divisi aktif." },
        { status: 403 }
      );
    }

    let body: { fullName?: unknown; email?: unknown };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Format permintaan tidak valid." },
        { status: 400 }
      );
    }

    const fullName =
      typeof body.fullName === "string" ? body.fullName.trim() : "";

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (
      !fullName ||
      fullName.length > 150 ||
      /[\u0000-\u001F\u007F]/.test(fullName)
    ) {
      return NextResponse.json(
        { error: "Nama wajib diisi dan maksimal 150 karakter." },
        { status: 400 }
      );
    }

    if (
      !email ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        { error: "Format email tidak valid." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const temporaryPassword = generateTemporaryPassword();

    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      });

    if (createError || !created.user) {
      console.error("Participant Auth creation failed:", createError);

      return NextResponse.json(
        {
          error:
            createError?.message.toLowerCase().includes("already")
              ? "Email sudah terdaftar."
              : "Gagal membuat akun peserta.",
        },
        { status: 400 }
      );
    }

    const participantId = created.user.id;

    // Trigger handle_new_user() sudah membuat profile secara otomatis.
    // Tandai akun agar wajib mengganti password sementara.
    const { data: updatedProfile, error: profileUpdateError } = await admin
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", participantId)
      .select("id")
      .maybeSingle();

    if (profileUpdateError || !updatedProfile) {
      console.error(
        "Participant password flag update failed:",
        profileUpdateError
      );

      const rollbackSuccess = await rollbackParticipant(
        admin,
        participantId
      );

      if (!rollbackSuccess) {
        console.error(
          "Participant rollback incomplete. Manual cleanup may be required:",
          participantId
        );
      }

      return NextResponse.json(
        { error: "Gagal menyiapkan kewajiban penggantian password." },
        { status: 500 }
      );
    }

    const { error: divisionInsertError } = await admin
      .from("participant_divisions")
      .insert({
        user_id: participantId,
        division_id: assignment.division_id,
      });

    if (divisionInsertError) {
      console.error(
        "Participant division creation failed:",
        divisionInsertError
      );

      const rollbackSuccess = await rollbackParticipant(
        admin,
        participantId
      );

      if (!rollbackSuccess) {
        console.error(
          "Participant rollback incomplete. Manual cleanup may be required:",
          participantId
        );
      }

      return NextResponse.json(
        { error: "Gagal menghubungkan peserta ke divisi." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Akun peserta berhasil dibuat.",
        participant: {
          id: participantId,
          fullName,
          email,
          accountStatus: "pending",
          mustChangePassword: true,
          temporaryPassword,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create participant error:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}
