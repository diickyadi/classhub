import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;


export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Validasi autentikasi PIC
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Validasi profil PIC
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, account_status, must_change_password")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Profile error:", profileError);
      return Response.json(
        { error: "Gagal memeriksa profil PIC" },
        { status: 500 }
      );
    }

    if (
      !profile ||
      profile.role !== "PIC" ||
      profile.account_status !== "active" ||
      profile.must_change_password
    ) {
      return Response.json(
        { error: "Akses PIC tidak valid" },
        { status: 403 }
      );
    }

    // 3. Ambil divisi aktif PIC
    const { data: assignment, error: assignmentError } = await supabase
      .from("division_pic_assignments")
      .select("division_id, divisions!inner(id, is_active)")
      .eq("pic_user_id", user.id)
      .is("ended_at", null)
      .maybeSingle();

    if (assignmentError) {
      console.error("Assignment error:", assignmentError);
      return Response.json(
        { error: "Gagal mengambil divisi PIC" },
        { status: 500 }
      );
    }

    const division = Array.isArray(assignment?.divisions)
      ? assignment.divisions[0]
      : assignment?.divisions;

    if (!assignment || !division?.is_active) {
      return Response.json(
        { error: "PIC tidak memiliki divisi aktif" },
        { status: 403 }
      );
    }

    const divisionId = assignment.division_id;

    // 4. Ambil kelompok yang belum diarsipkan
    const { data: groups, error: groupsError } = await supabase
      .from("groups")
      .select("id, name, created_at")
      .eq("division_id", divisionId)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (groupsError) {
      console.error("Groups error:", groupsError);
      return Response.json(
        { error: "Gagal mengambil data kelompok" },
        { status: 500 }
      );
    }

    if (!groups || groups.length === 0) {
      return Response.json({
        groups: [],
        summary: {
          totalGroups: 0,
          totalMembers: 0,
        },
      });
    }

    // 5. Ambil anggota aktif setiap kelompok
    const groupIds = groups.map((group) => group.id);

    const { data: memberships, error: membersError } = await supabase
      .from("group_members")
      .select("group_id, user_id, is_leader")
      .in("group_id", groupIds)
      .is("left_at", null);

    if (membersError) {
      console.error("Members error:", membersError);
      return Response.json(
        { error: "Gagal mengambil anggota kelompok" },
        { status: 500 }
      );
    }

    const memberIds = [
      ...new Set((memberships || []).map((member) => member.user_id)),
    ];

    // 6. Ambil nama anggota dari profiles
    let profiles: { id: string; full_name: string | null }[] = [];

    if (memberIds.length > 0) {
      const { data: profileData, error: membersProfileError } =
        await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", memberIds);

      if (membersProfileError) {
        console.error("Member profiles error:", membersProfileError);
        return Response.json(
          { error: "Gagal mengambil profil anggota" },
          { status: 500 }
        );
      }

      profiles = profileData || [];
    }

    // 7. Susun data kelompok
    const groupsWithMembers = groups.map((group) => {
      const groupMemberships = (memberships || []).filter(
        (member) => member.group_id === group.id
      );

      const members = groupMemberships.map((membership) => {
        const memberProfile = profiles.find(
          (profile) => profile.id === membership.user_id
        );

        return {
          id: membership.user_id,
          fullName: memberProfile?.full_name || "Nama tidak tersedia",
          isLeader: membership.is_leader,
        };
      });

      return {
        id: group.id,
        name: group.name,
        createdAt: group.created_at,
        memberCount: members.length,
        leader: members.find((member) => member.isLeader) || null,
        members,
      };
    });

    return Response.json({
      groups: groupsWithMembers,
      summary: {
        totalGroups: groupsWithMembers.length,
        totalMembers: groupsWithMembers.reduce(
          (total, group) => total + group.memberCount,
          0
        ),
      },
    });
  } catch (error) {
    console.error("GET /api/pic/groups error:", error);

    return Response.json(
      { error: "Terjadi kesalahan pada server" },
      { status: 500 }
    );
  }
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
