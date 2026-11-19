import PesertaSidebar from "@/app/assets/components/layout/peserta/sidebar";
import PesertaHeader from "@/app/assets/components/layout/peserta/header";
import GroupEmptyState from "@/app/assets/components/peserta/kelompok/group-empty-state";

interface GroupMember {
  id: number;
  fullName: string;
  isLeader: boolean;
  joinedAt: string;
}

interface GroupData {
  name: string;
  divisionName: string;
  members: GroupMember[];
  currentUserIsLeader: boolean;
}

interface PesertaKelompokViewProps {
  group: GroupData | null;
  error?: string | null;
}

export default function PesertaKelompokView({
  group,
  error = null,
}: PesertaKelompokViewProps) {
  return (
    <div className="ch-peserta-dashboard">
      <PesertaSidebar activeItem="Kelompok" />

      <main className="ch-peserta-main">
        <div className="ch-peserta-content">
          <PesertaHeader title="Kelompok Saya" description="Lihat informasi kelompok, ketua, dan anggota yang terdaftar." />



          <section
            className="ch-peserta-group-panel"
            aria-label="Informasi kelompok peserta"
          >
            <div className="ch-peserta-group-panel-header">
              <div>
                <h3>Informasi Kelompok</h3>
                <p>Data kelompok dan anggota</p>
              </div>

              <span className="ch-peserta-group-status">
                {error ? "Gagal dimuat" : group ? "Aktif" : "Belum tersedia"}
              </span>
            </div>

            {error ? (
              <div className="ch-peserta-group-error" role="alert">
                <p>{error}</p>
              </div>
            ) : !group ? (
              <GroupEmptyState />
            ) : (
              <div className="ch-peserta-group-content">
                <div className="ch-peserta-group-summary">
                  <div className="ch-peserta-group-summary-item">
                    <span>Nama Kelompok</span>
                    <strong>{group.name}</strong>
                  </div>

                  <div className="ch-peserta-group-summary-item">
                    <span>Divisi</span>
                    <strong>{group.divisionName}</strong>
                  </div>

                  <div className="ch-peserta-group-summary-item">
                    <span>Jumlah Anggota</span>
                    <strong>{group.members.length} Peserta</strong>
                  </div>

                  <div className="ch-peserta-group-summary-item">
                    <span>Peran Kamu</span>
                    <strong>
                      {group.currentUserIsLeader ? "Ketua Kelompok" : "Anggota"}
                    </strong>
                  </div>
                </div>

                <div className="ch-peserta-group-members">
                  <div className="ch-peserta-group-members-header">
                    <div>
                      <h4>Anggota Kelompok</h4>
                      <p>Daftar peserta yang masih aktif dalam kelompok.</p>
                    </div>

                    <span>{group.members.length} Anggota</span>
                  </div>

                  <div className="ch-peserta-group-member-list">
                    {group.members.map((member) => (
                      <article
                        className="ch-peserta-group-member"
                        key={member.id}
                      >
                        <div className="ch-peserta-group-member-avatar">
                          {member.fullName.charAt(0).toUpperCase()}
                        </div>

                        <div className="ch-peserta-group-member-info">
                          <strong>{member.fullName}</strong>
                          <span>
                            {member.isLeader ? "Ketua Kelompok" : "Anggota"}
                          </span>
                        </div>

                        {member.isLeader && (
                          <span className="ch-peserta-group-leader-badge">
                            Ketua
                          </span>
                        )}
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
