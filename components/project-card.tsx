"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";

export type ProjectCardData = {
  id: string;
  name?: string | null;
  status?: string | null;
  demolitionType?: string | null;
  buildingType?: string | null;
  opdrachtgever?: string | null;
  executors?: string[] | null;
  areaM2?: number | null;
  workDays?: number | null;
  openTasks?: number | null;
  checkedTasks?: number | null;
  plannedContainers?: number | null;
  actualContainers?: number | null;
  taskCompletion?: number | null;
};

type ProjectCardProps = {
  project: ProjectCardData;
  href?: string;
};

export default function ProjectCard({ project, href }: ProjectCardProps) {
  const [hovered, setHovered] = useState(false);

  const linkHref = href ?? `/projects/${project.id}`;

  const name = project.name || "Onbekend project";
  const status = project.status || "Onbekend";
  const demolitionType = project.demolitionType || "Onbekend";
  const buildingType = project.buildingType || "Onbekend";
  const opdrachtgever = project.opdrachtgever || "Onbekend";
  const executors = Array.isArray(project.executors) ? project.executors : [];
  const areaM2 = Number(project.areaM2 || 0);
  const workDays = Number(project.workDays || 0);
  const openTasks = Number(project.openTasks || 0);
  const checkedTasks = Number(project.checkedTasks || 0);
  const plannedContainers = Number(project.plannedContainers || 0);
  const actualContainers = Number(project.actualContainers || 0);
  const taskCompletion = Math.max(0, Math.min(100, Number(project.taskCompletion || 0)));

  return (
    <div
      style={{
        ...projectCardStyle,
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        boxShadow: hovered
          ? "0 12px 24px rgba(23,23,23,0.08)"
          : "0 4px 12px rgba(23,23,23,0.03)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={cardHeaderStyle}>
        <div style={{ minWidth: 0 }}>
          <h3 style={projectTitleStyle}>{name}</h3>
          <p style={projectMetaStyle}>
            {status} · {demolitionType} · {buildingType}
          </p>
        </div>

        <div style={progressPercentBadgeStyle}>{taskCompletion}%</div>
      </div>

      <div style={progressTrackStyle}>
        <div
          style={{
            ...progressFillStyle,
            width: `${taskCompletion}%`,
          }}
        />
      </div>

      <div style={projectProgressMetaGridStyle}>
        <InfoBox label="Opdrachtgever" value={opdrachtgever} />
        <InfoBox
          label="Uitvoerder(s)"
          value={executors.length > 0 ? executors.join(", ") : "Geen"}
        />
        <InfoBox label="m²" value={areaM2} />
        <InfoBox label="Werkdagen" value={workDays} />
        <InfoBox label="Open taken" value={openTasks} />
        <InfoBox label="Afgerond" value={checkedTasks} />
        <InfoBox label="Containers gepland" value={plannedContainers} />
        <InfoBox label="Containers werkelijk" value={actualContainers} />
      </div>

      <div style={footerStyle}>
        <Link href={linkHref} style={openProjectLinkStyle}>
          Open project →
        </Link>
      </div>
    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div style={infoBoxStyle}>
      <div style={infoLabelStyle}>{label}</div>
      <div style={infoValueStyle}>{value}</div>
    </div>
  );
}

const projectCardStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 22,
  padding: 18,
  border: "1px solid #eee3d8",
  boxShadow: "0 4px 12px rgba(23,23,23,0.03)",
  transition: "all 0.2s ease",
  cursor: "pointer",
};

const cardHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 14,
  flexWrap: "wrap",
};

const projectTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 18,
  fontWeight: 800,
  color: "#171717",
  letterSpacing: -0.2,
  lineHeight: 1.2,
};

const projectMetaStyle: CSSProperties = {
  margin: "6px 0 0 0",
  fontSize: 13,
  color: "#7b746c",
  lineHeight: 1.45,
};

const progressPercentBadgeStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  padding: "4px 10px",
  borderRadius: 999,
  background: "#fff3e8",
  color: "#ef6b1f",
  whiteSpace: "nowrap",
};

const progressTrackStyle: CSSProperties = {
  marginTop: 14,
  height: 8,
  background: "#ece7e1",
  borderRadius: 999,
  overflow: "hidden",
};

const progressFillStyle: CSSProperties = {
  height: "100%",
  background: "#ef6b1f",
  borderRadius: 999,
};

const projectProgressMetaGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  marginTop: 12,
};

const infoBoxStyle: CSSProperties = {
  background: "#fcf9f6",
  borderRadius: 14,
  padding: "10px 12px",
  border: "1px solid #f0e6dc",
  minWidth: 0,
};

const infoLabelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  color: "#8a8178",
  textTransform: "uppercase",
  letterSpacing: 0.3,
};

const infoValueStyle: CSSProperties = {
  marginTop: 4,
  fontSize: 14,
  fontWeight: 700,
  color: "#171717",
  lineHeight: 1.4,
  wordBreak: "break-word",
};

const footerStyle: CSSProperties = {
  marginTop: 14,
  display: "flex",
  justifyContent: "flex-end",
};

const openProjectLinkStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: "#ef6b1f",
  textDecoration: "none",
};