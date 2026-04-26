"use client";

import type { CSSProperties } from "react";

type ChartMetric = {
  label: string;
  value: number;
};

type AnalysisChartsProps = {
  statusData: ChartMetric[];
  openTasksData: ChartMetric[];
  containerData: ChartMetric[];
  areaData: ChartMetric[];
  photoData: ChartMetric[];
  progressData: ChartMetric[];
  opdrachtgeverData: ChartMetric[];
};

function ColumnChartCard({
  title,
  subtitle,
  data,
  barColor = "#ef6b1f",
  valueSuffix = "",
}: {
  title: string;
  subtitle: string;
  data: ChartMetric[];
  barColor?: string;
  valueSuffix?: string;
}) {
  const width = 920;
  const height = 280;
  const paddingTop = 18;
  const paddingRight = 20;
  const paddingBottom = 68;
  const paddingLeft = 56;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const maxValue = Math.max(1, ...data.map((item) => item.value));
  const steps = 4;

  const barGap = 18;
  const availableWidth =
    data.length > 0 ? chartWidth - Math.max(0, data.length - 1) * barGap : chartWidth;
  const barWidth =
    data.length > 0 ? Math.max(28, Math.min(88, availableWidth / data.length)) : 40;

  const totalBarsWidth =
    data.length > 0 ? data.length * barWidth + (data.length - 1) * barGap : 0;

  const startX = paddingLeft + Math.max(0, (chartWidth - totalBarsWidth) / 2);

  const bars = data.map((item, index) => {
    const x = startX + index * (barWidth + barGap);
    const barHeight = (item.value / maxValue) * chartHeight;
    const y = paddingTop + chartHeight - barHeight;

    return {
      ...item,
      x,
      y,
      barHeight,
    };
  });

  return (
    <section
      style={{
        ...cardStyle,
        background:
          title === "Projectstatus verdeling"
            ? "#fff8f2"
            : title === "Open taken per project"
            ? "#fffaf4"
            : title === "Werkelijke containers per project"
            ? "#faf7ff"
            : title === "Oppervlakte per project"
            ? "#f7fbff"
            : title === "Foto's per project"
            ? "#f7fcfa"
            : title === "Taakvoortgang per project"
            ? "#fff8fb"
            : "#f9fbf6",
      }}
    >
      <div style={cardHeaderStyle}>
        <h2 style={cardTitleStyle}>{title}</h2>
        <p style={cardSubtitleStyle}>{subtitle}</p>
      </div>

      {data.length === 0 ? (
        <div style={emptyStateStyle}>Geen data binnen de gekozen filters.</div>
      ) : (
        <div style={svgWrapStyle}>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            style={svgStyle}
            role="img"
            aria-label={title}
          >
            <rect x="0" y="0" width={width} height={height} fill="transparent" />

            {Array.from({ length: steps + 1 }).map((_, index) => {
              const y = paddingTop + (index / steps) * chartHeight;
              const axisValue = Math.round((maxValue / steps) * (steps - index));

              return (
                <g key={index}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={width - paddingRight}
                    y2={y}
                    stroke="#e8ddd2"
                    strokeWidth="1"
                  />
                  <text
                    x={paddingLeft - 10}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="12"
                    fill="#7b746c"
                  >
                    {axisValue}
                    {valueSuffix}
                  </text>
                </g>
              );
            })}

            <line
              x1={paddingLeft}
              y1={paddingTop + chartHeight}
              x2={width - paddingRight}
              y2={paddingTop + chartHeight}
              stroke="#cfc3b7"
              strokeWidth="1.5"
            />

            <line
              x1={paddingLeft}
              y1={paddingTop}
              x2={paddingLeft}
              y2={paddingTop + chartHeight}
              stroke="#cfc3b7"
              strokeWidth="1.5"
            />

            {bars.map((bar) => (
              <g key={bar.label}>
                <rect
                  x={bar.x}
                  y={bar.y}
                  width={barWidth}
                  height={bar.barHeight}
                  rx="10"
                  ry="10"
                  fill={barColor}
                />

                <text
                  x={bar.x + barWidth / 2}
                  y={bar.y - 10}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="700"
                  fill="#171717"
                >
                  {bar.value}
                  {valueSuffix}
                </text>

                <line
                  x1={bar.x + barWidth / 2}
                  y1={paddingTop + chartHeight}
                  x2={bar.x + barWidth / 2}
                  y2={paddingTop + chartHeight + 6}
                  stroke="#cfc3b7"
                  strokeWidth="1"
                />

                <text
                  x={bar.x + barWidth / 2}
                  y={paddingTop + chartHeight + 24}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#6b675f"
                >
                  {bar.label.length > 14 ? `${bar.label.slice(0, 14)}…` : bar.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      )}
    </section>
  );
}

export function AnalysisCharts({
  statusData,
  openTasksData,
  containerData,
  areaData,
  photoData,
  progressData,
  opdrachtgeverData,
}: AnalysisChartsProps) {
  return (
    <div style={chartsWrapStyle}>
      <ColumnChartCard
        title="Projectstatus verdeling"
        subtitle="Aantal projecten per status binnen de gekozen filters."
        data={statusData}
        barColor="#ef6b1f"
      />

      <ColumnChartCard
        title="Open taken per project"
        subtitle="Welke projecten nu de meeste openstaande taken hebben."
        data={openTasksData}
        barColor="#c97a1a"
      />

      <ColumnChartCard
        title="Werkelijke containers per project"
        subtitle="Aantal werkelijk gebruikte containers per project."
        data={containerData}
        barColor="#8d6ccf"
      />

      <ColumnChartCard
        title="Oppervlakte per project"
        subtitle="Vergelijking van projectomvang in m²."
        data={areaData}
        barColor="#5f93df"
        valueSuffix=" m²"
      />

      <ColumnChartCard
        title="Foto's per project"
        subtitle="Mate van visuele documentatie per project."
        data={photoData}
        barColor="#5a9d7b"
      />

      <ColumnChartCard
        title="Taakvoortgang per project"
        subtitle="Projecten met de hoogste afgeronde taakvoortgang."
        data={progressData}
        barColor="#d477a8"
        valueSuffix="%"
      />

      <ColumnChartCard
        title="Projecten per opdrachtgever"
        subtitle="Verdeling van de huidige selectie over opdrachtgevers."
        data={opdrachtgeverData}
        barColor="#8bad56"
      />
    </div>
  );
}

const chartsWrapStyle: CSSProperties = {
  marginTop: 24,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
  gap: 20,
  alignItems: "stretch",
};

const cardStyle: CSSProperties = {
  background: "#fffdfb",
  borderRadius: 28,
  padding: 22,
  border: "1px solid #ebe2d8",
  boxShadow: "0 10px 20px rgba(0,0,0,0.04)",
  minHeight: 420,
  display: "flex",
  flexDirection: "column",
};

const cardHeaderStyle: CSSProperties = {
  marginBottom: 14,
  minHeight: 70,
};

const cardTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 22,
  lineHeight: 1.15,
  color: "#171717",
  fontWeight: 800,
};

const cardSubtitleStyle: CSSProperties = {
  margin: "8px 0 0 0",
  color: "#6b675f",
  lineHeight: 1.45,
  fontSize: 14,
  maxWidth: 520,
};

const svgWrapStyle: CSSProperties = {
  overflowX: "auto",
  marginTop: 8,
  flex: 1,
  display: "flex",
  alignItems: "stretch",
};

const svgStyle: CSSProperties = {
  width: "100%",
  minWidth: 760,
  height: "100%",
  display: "block",
};

const emptyStateStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 16,
  padding: 16,
  border: "1px solid #eee3d8",
  color: "#6b675f",
};