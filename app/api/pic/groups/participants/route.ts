import { NextResponse, connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

    // Ambil peserta aktif yang sudah menyelesaikan penggantian password.
    const { data: placements, error: placementsError } = await supabase
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
      .eq("division_id", assignment.division_id)
      .is("ended_at", null)
      .eq("profiles.role", "PESERTA")
      .eq("profiles.account_status", "active")
      .eq("profiles.must_change_password", false);

    if (placementsError) {
      console.error("Participant lookup failed:", placementsError);

      return NextResponse.json(
        { error: "Gagal mengambil daftar peserta." },
        { status: 500 }
      );
    }

    const candidates = (placements ?? [])
      .map((placement) => {
        const participant = Array.isArray(placement.profiles)
          ? placement.profiles[0]
          : placement.profiles;

        if (!participant) return null;

        return {
          id: placement.user_id,
          fullName: participant.full_name,
        };
      })
      .filter(
        (participant): participant is {
          id: string;
          fullName: string;
        } => participant !== null
      );

    if (candidates.length === 0) {
      return NextResponse.json(
        { participants: [] },
        { status: 200 }
      );
    }

    // Periksa kelompok aktif agar peserta tidak terpilih dua kali.
    const candidateIds = candidates.map((participant) => participant.id);

    const { data: memberships, error: membershipError } = await supabase
      .from("group_members")
      .select("user_id")
      .in("user_id", candidateIds)
      .is("left_at", null);

    if (membershipError) {
      console.error("Group membership lookup failed:", membershipError);

      return NextResponse.json(
        { error: "Gagal memeriksa keanggotaan kelompok." },
        { status: 500 }
      );
    }

    const assignedIds = new Set(
      (memberships ?? []).map((membership) => membership.user_id)
    );

    const availableCandidates = candidates.filter(
      (participant) => !assignedIds.has(participant.id)
    );

    if (availableCandidates.length === 0) {
      return NextResponse.json(
        { participants: [] },
        { status: 200 }
      );
    }

    // Email dibaca melalui Admin Auth, bukan dari tabel profiles.
    const admin = createAdminClient();

    const participants = await Promise.all(
      availableCandidates.map(async (participant) => {
        const { data, error } = await admin.auth.admin.getUserById(
          participant.id
        );

        if (error || !data.user) {
          throw new Error(
            `Gagal mengambil data email peserta: ${participant.id}`
          );
        }

        return {
          id: participant.id,
          fullName: participant.fullName,
          email: data.user.email ?? "",
        };
      })
    );

    participants.sort((a, b) =>
      a.fullName.localeCompare(b.fullName, "id")
    );

    return NextResponse.json(
      { participants },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get available participants error:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil daftar peserta." },
      { status: 500 }
    );
  }
}
