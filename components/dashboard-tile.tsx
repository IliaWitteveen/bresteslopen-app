import Link from "next/link";

type DashboardTileProps = {
  title: string;
  href: string;
  color: string;
};

function getTileIcon(title: string) {
  if (title === "Nieuw Project") return "＋";
  if (title === "Agenda") return "📅";
  if (title === "Projecten") return "🏗️";
  if (title === "Containers") return "🗑️";
  if (title === "Analyse") return "📈";
  if (title === "Opdrachtgevers") return "👥";
  return "•";
}

export default function DashboardTile({
  title,
  href,
  color,
}: DashboardTileProps) {
  const icon = getTileIcon(title);

  return (
    <Link
      href={href}
      style={{
        background: color,
        color: "#fff",
        borderRadius: 30,
        padding: 28,
        minHeight: 220,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textDecoration: "none",
        boxShadow:
          "0 22px 36px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.08)",
        border: "1px solid rgba(255,255,255,0.16)",
        textAlign: "center",
        transform: "translateY(0)",
        transition: "transform 0.18s ease, box-shadow 0.18s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow =
          "0 28px 42px rgba(0,0,0,0.14), 0 10px 18px rgba(0,0,0,0.10)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow =
          "0 22px 36px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.08)";
      }}
    >
      <div
        style={{
          width: 76,
          height: 76,
          borderRadius: 24,
          background: "rgba(255,255,255,0.16)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 36,
          fontWeight: 700,
          marginBottom: 24,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14)",
        }}
      >
        {icon}
      </div>

      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          lineHeight: 1.15,
        }}
      >
        {title}
      </div>
    </Link>
  );
}