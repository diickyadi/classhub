import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AccountStatus = "pending" | "active" | "inactive";

type PicContext =
  | {
      success: true;
      divisionId: number;
      divisionName: string;
    }
  | {
      success: false;
      response: NextResponse;
    };

async function getPicContext(): Promise<PicContext> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Silakan login terlebih dahulu." },
        { status: 401 }
      ),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, account_status, must_change_password")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("PIC profile verification failed:", profileError);

    return {
      success: false,
      response: NextResponse.json(
        { error: "Gagal memverifikasi akun PIC." },
        { status: 500 }
      ),
    };
  }

  if (
    !profile ||
    profile.role !== "PIC" ||
    profile.account_status !== "active"
  ) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Akses hanya tersedia untuk PIC aktif." },
        { status: 403 }
      ),
    };
  }

  if (profile.must_change_password) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: "Ganti password terlebih dahulu.",
          code: "PASSWORD_CHANGE_REQUIRED",
        },
        { status: 403 }
      ),
    };
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from("division_pic_assignments")
    .select("division_id, divisions!inner(id, name, is_active)")
    .eq("pic_user_id", user.id)
    .is("ended_at", null)
    .maybeSingle();

  if (assignmentError) {
    console.error("PIC division lookup failed:", assignmentError);

    return {
      success: false,
      response: NextResponse.json(
        { error: "Gagal memverifikasi divisi PIC." },
        { status: 500 }
      ),
    };
  }

  const division = Array.isArray(assignment?.divisions)
    ? assignment.divisions[0]
    : assignment?.divisions;

  if (!assignment || !division?.is_active) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "PIC tidak memiliki divisi aktif." },
        { status: 403 }
      ),
    };
  }

  return {
    success: true,
    divisionId: assignment.division_id,
    divisionName: division.name,
  };
}

export async function GET() {
  try {
    const context = await getPicContext();

    if (!context.success) {
      return context.response;
    }

    const admin = createAdminClient();

    // Admin Client diperlukan untuk membaca seluruh status akun,
    // termasuk pending dan inactive yang dibatasi oleh RLS.
    const { data: placements, error: placementsError } = await admin
      .from("participant_divisions")
      .select(`
        user_id,
        profiles!inner(
          id,
          full_name,
          role,
          account_status,
          must_change_password
        )
      `)
      .eq("division_id", context.divisionId)
      .is("ended_at", null)
      .eq("profiles.role", "PESERTA");

    if (placementsError) {
      console.error("Activation participant lookup failed:", placementsError);

      return NextResponse.json(
        { error: "Gagal mengambil daftar peserta." },
        { status: 500 }
      );
    }

    const participantProfiles = (placements ?? [])
      .map((placement) => {
        const profile = Array.isArray(placement.profiles)
          ? placement.profiles[0]
          : placement.profiles;

        if (!profile) {
          return null;
        }

        return {
          id: placement.user_id,
          fullName: profile.full_name,
          accountStatus: profile.account_status as AccountStatus,
          mustChangePassword: Boolean(profile.must_change_password),
        };
      })
      .filter((participant) => participant !== null);

    const participants = await Promise.all(
      participantProfiles.map(async (participant) => {
        const { data, error } = await admin.auth.admin.getUserById(
          participant.id
        );

        if (error) {
          console.error(
            "Participant email lookup failed:",
            participant.id,
            error.message
          );

          throw new Error("Gagal mengambil email peserta.");
        }

        return {
          ...participant,
          email: data.user?.email ?? "",
        };
      })
    );

    participants.sort((first, second) =>
      first.fullName.localeCompare(second.fullName, "id")
    );

    const summary = {
      total: participants.length,
      pending: participants.filter(
        (item) => item.accountStatus === "pending"
      ).length,
      active: participants.filter(
        (item) => item.accountStatus === "active"
      ).length,
      inactive: participants.filter(
        (item) => item.accountStatus === "inactive"
      ).length,
    };

    return NextResponse.json({
      divisionName: context.divisionName,
      participants,
      summary,
    });
  } catch (error) {
    console.error("Get activation participants error:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil data aktivasi akun." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await getPicContext();

    if (!context.success) {
      return context.response;
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Format permintaan tidak valid." },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Data perubahan status tidak valid." },
        { status: 400 }
      );
    }

    const payload = body as Record<string, unknown>;
    const participantId = payload.participantId;
    const targetStatus = payload.accountStatus;

    if (
      typeof participantId !== "string" ||
      !UUID_REGEX.test(participantId)
    ) {
      return NextResponse.json(
        { error: "ID peserta tidak valid." },
        { status: 400 }
      );
    }

    if (targetStatus !== "active" && targetStatus !== "inactive") {
      return NextResponse.json(
        { error: "Status tujuan tidak valid." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Pastikan peserta masih terdaftar pada divisi PIC yang sedang login.
    const { data: placement, error: placementError } = await admin
      .from("participant_divisions")
      .select("user_id")
      .eq("user_id", participantId)
      .eq("division_id", context.divisionId)
      .is("ended_at", null)
      .maybeSingle();

    if (placementError) {
      console.error("Participant division verification failed:", placementError);

      return NextResponse.json(
        { error: "Gagal memverifikasi divisi peserta." },
        { status: 500 }
      );
    }

    if (!placement) {
      return NextResponse.json(
        { error: "Peserta tidak ditemukan pada divisi PIC ini." },
        { status: 404 }
      );
    }

    const { data: participant, error: participantError } = await admin
      .from("profiles")
      .select("id, role, account_status, must_change_password")
      .eq("id", participantId)
      .maybeSingle();

    if (participantError) {
      console.error("Participant profile lookup failed:", participantError);

      return NextResponse.json(
        { error: "Gagal memverifikasi profil peserta." },
        { status: 500 }
      );
    }

    if (!participant || participant.role !== "PESERTA") {
      return NextResponse.json(
        { error: "Akun peserta tidak ditemukan." },
        { status: 404 }
      );
    }

    const currentStatus = participant.account_status as AccountStatus;

    if (!["pending", "active", "inactive"].includes(currentStatus)) {
      return NextResponse.json(
        { error: "Status akun saat ini tidak dikenali." },
        { status: 409 }
      );
    }

    if (currentStatus === targetStatus) {
      return NextResponse.json({
        message: "Status akun sudah sesuai.",
        participant: {
          id: participant.id,
          accountStatus: currentStatus,
          mustChangePassword: participant.must_change_password,
        },
      });
    }

    // Perubahan dilakukan secara kondisional agar status yang sudah
    // berubah oleh request lain tidak tertimpa secara tidak sengaja.
    const { data: updatedParticipant, error: updateError } = await admin
      .from("profiles")
      .update({
        account_status: targetStatus,
      })
      .eq("id", participantId)
      .eq("role", "PESERTA")
      .eq("account_status", currentStatus)
      .select("id, account_status, must_change_password")
      .maybeSingle();

    if (updateError) {
      console.error("Participant status update failed:", updateError);

      return NextResponse.json(
        { error: "Gagal memperbarui status akun peserta." },
        { status: 500 }
      );
    }

    if (!updatedParticipant) {
      return NextResponse.json(
        {
          error:
            "Status akun sudah berubah. Muat ulang daftar peserta dan coba kembali.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      message:
        targetStatus === "active"
          ? "Akun peserta berhasil diaktifkan."
          : "Akun peserta berhasil dinonaktifkan.",
      participant: {
        id: updatedParticipant.id,
        accountStatus: updatedParticipant.account_status,
        mustChangePassword: updatedParticipant.must_change_password,
      },
    });
  } catch (error) {
    console.error("Update participant activation error:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan saat memperbarui status akun." },
      { status: 500 }
    );
  }
}
