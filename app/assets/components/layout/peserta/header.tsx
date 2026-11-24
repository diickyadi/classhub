type PesertaHeaderProps = {
  title?: string;
  description?: string;
};

export default function PesertaHeader({
  title = "Dashboard Peserta",
  description,
}: PesertaHeaderProps) {
  return (
    <header className="ch-peserta-header">
      <div className="ch-peserta-heading">
        <span className="ch-peserta-eyebrow">
          WORKSPACE / VINIX7
        </span>

        <h1>{title}</h1>

        {description && (
          <p className="ch-peserta-heading-description">
            {description}
          </p>
        )}
      </div>
    </header>
  );
}
