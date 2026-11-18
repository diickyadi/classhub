import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

import "@/app/style/peserta/typography.css";
import "@/app/style/peserta/dashboard.css";
import "@/app/style/peserta/sidebar.css";
import "@/app/style/peserta/header.css";
import "@/app/style/peserta/kelompok.css";

import PesertaKelompokView from "@/app/view/peserta/kelompok";

export const instant = false;

export default async function PesertaKelompokPage() {
  await connection();

  const supabase = await createClient();

  // 1. Validasi pengguna yang sedang login.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  // 2. Pastikan pengguna memiliki role PESERTA.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) redirect("/");

  if (profile.role !== "PESERTA") {
    redirect(profile.role === "PIC" ? "/dashboard/pic" : "/");
  }

  // 3. Cari keanggotaan kelompok yang masih aktif.
  const { data: membership, error: membershipError } = await supabase
    .from("group_members")
    .select("group_id, division_id, is_leader, joined_at")
    .eq("user_id", user.id)
    .is("left_at", null)
    .maybeSingle();

  if (membershipError) {
    console.error("Group membership error:", membershipError);

    return (
      <PesertaKelompokView
        group={null}
        error="Gagal mengambil informasi keanggotaan kelompok."
      />
    );
  }

  // 4. Tampilkan empty state jika peserta belum memiliki kelompok.
  if (!membership) {
    return <PesertaKelompokView group={null} />;
  }

  // 5. Ambil informasi kelompok, divisi, dan anggota aktif.
  const [groupResult, divisionResult, membersResult] = await Promise.all([
    supabase
      .from("groups")
      .select("id, name, division_id")
      .eq("id", membership.group_id)
      .is("archived_at", null)
      .maybeSingle(),

    supabase
      .from("divisions")
      .select("id, name")
      .eq("id", membership.division_id)
      .maybeSingle(),

    supabase
      .from("group_members")
      .select("id, user_id, is_leader, joined_at")
      .eq("group_id", membership.group_id)
      .is("left_at", null)
      .order("is_leader", { ascending: false })
      .order("joined_at", { ascending: true }),
  ]);

  if (
    groupResult.error ||
    divisionResult.error ||
    membersResult.error ||
    !groupResult.data ||
    !divisionResult.data ||
    !membersResult.data
  ) {
    console.error("Group detail error:", {
      groupError: groupResult.error,
      divisionError: divisionResult.error,
      membersError: membersResult.error,
    });

    return (
      <PesertaKelompokView
        group={null}
        error="Gagal mengambil informasi kelompok. Silakan coba kembali."
      />
    );
  }

  // 6. Ambil nama seluruh anggota berdasarkan user_id.
  const memberUserIds = membersResult.data.map(
    (member) => member.user_id
  );

  const { data: profiles, error: membersProfileError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", memberUserIds);

  if (membersProfileError || !profiles) {
    console.error("Group member profiles error:", membersProfileError);

    return (
      <PesertaKelompokView
        group={null}
        error="Gagal mengambil informasi profil anggota kelompok."
      />
    );
  }

  // 7. Gabungkan informasi keanggotaan dengan profil peserta.
  const groupMembers = membersResult.data.map((member) => {
    const memberProfile = profiles.find(
      (item) => item.id === member.user_id
    );

    return {
      id: member.id,
      fullName: memberProfile?.full_name ?? "Nama tidak tersedia",
      isLeader: member.is_leader,
      joinedAt: member.joined_at,
    };
  });

  return (
    <PesertaKelompokView
      group={{
        name: groupResult.data.name,
        divisionName: divisionResult.data.name,
        members: groupMembers,
        currentUserIsLeader: membership.is_leader,
      }}
    />
  );
}
