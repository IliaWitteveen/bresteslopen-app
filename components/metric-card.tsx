import Link from "next/link";

type MetricCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  tone?: "orange" | "blue" | "green" | "purple" | "pink" | "slate";
  href?: string;
};

const toneMap: Record<NonNullable<MetricCardProps["tone"]>, { bg: string; text: string }> = {
  orange: { bg: "#f39b5d", text: "#ffffff" },
  blue: { bg: "#94b6ea", text: "#ffffff" },
  green: { bg: "#89b4a9", text: "#ffffff" },
  purple: { bg: "#c79ad0", text: "#ffffff" },
  pink: { bg: "#e79a9a", text: "#ffffff" },
  slate: { bg: "#aab1c4", text: "#ffffff" },
};

function InnerCard({ title, value, subtitle, tone = "orange" }: MetricCardProps) {
  const colors = toneMap[tone];

  return (
    <div
      style={{
        background: colors.bg,
        color: colors.text,
        borderRadius: 24,
        padding: 20,
        minHeight: 130,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ fontSize: 14, opacity: 0.95 }}>{title}</div>
      <div style={{ fontSize: 38, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 14, opacity: 0.95 }}>{subtitle || ""}</div>
    </div>
  );
}

export function MetricCard(props: MetricCardProps) {
  if (props.href) {
    return (
      <Link href={props.href} style={{ textDecoration: "none" }}>
        <InnerCard {...props} />
      </Link>
    );
  }

  return <InnerCard {...props} />;
}