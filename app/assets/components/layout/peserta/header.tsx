type PesertaHeaderProps = {
  title?: string;
};

export default function PesertaHeader({
  title = "Dashboard Peserta",
}: PesertaHeaderProps) {
  return (
    <header className="ch-peserta-header">
      <div className="ch-peserta-heading">
        <span className="ch-peserta-eyebrow">
          WORKSPACE / CLASSHUB
        </span>
        <h1>{title}</h1>
      </div>
    </header>
  );
}
