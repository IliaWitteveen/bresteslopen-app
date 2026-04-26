"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  formatDate,
  getProjectsForDate,
  isProjectActive,
  isProjectCompleted,
  isProjectPlanned,
  loadProjectBundlesForCurrentUser,
  type ProjectBundle,
} from "@/lib/overview";
import DashboardTile from "@/components/dashboard-tile";
import { Project } from "@/types/project";

type PlanningItem = {
  id: string;
  label: string;
  href: string;
  type: "project" | "container" | "pickup";
};

type PlannerDay = {
  key: string;
  date: Date;
  isToday: boolean;
  label: string;
  shortDate: string;
  items: PlanningItem[];
};

const COLORS = {
  project: "#b7bcc7",
  container: "#7ea89d",
  pickup: "#8d6ccf",
};

function getDateKey(date: Date) {
  return date.toISOString().split("T")[0];
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [bundles, setBundles] = useState<ProjectBundle[]>([]);
  const [actionModal, setActionModal] = useState<{
  dateKey: string;
  dateLabel: string;
} | null>(null);

const [pickupModal, setPickupModal] = useState<{
  dateKey: string;
  dateLabel: string;
} | null>(null);

  useEffect(() => {
  async function init() {
    try {
      const overview = await loadProjectBundlesForCurrentUser();

      if (!overview) {
        window.location.href = "/login";
        return;
      }

      setProjects(overview.projects);
      setBundles(overview.bundles);
    } catch (error) {
      console.error("Dashboard load error:", error);
      window.location.href = "/login";
    } finally {
      setLoading(false);
    }
  }

  init();
}, []);

  const today = new Date();

  const days = useMemo<PlannerDay[]>(() => {
    return Array.from({ length: 30 }).map((_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const key = getDateKey(date);

      const projectItems = getProjectsForDate(projects, date).map((p) => ({
        id: p.id,
        label: p.name,
        href: `/projects/${p.id}`,
        type: "project" as const,
      }));

      const containerItems = bundles.flatMap((b) =>
        b.containers.flatMap((c) => {
          const items: PlanningItem[] = [];

          const deliveryDate = c.planned_delivery_date || c.actual_delivery_date;
const pickupDate = c.planned_pickup_date || c.actual_pickup_date;

const delivery = deliveryDate ? getDateKey(new Date(deliveryDate)) : "";
const pickup = pickupDate ? getDateKey(new Date(pickupDate)) : "";

          if (delivery === key) {
            items.push({
              id: `c-${c.id}`,
              label: `Container ${c.container_size}`,
              href: "/containers",
              type: "container",
            });
          }

          if (pickup === key) {
            items.push({
              id: `p-${c.id}`,
              label: `Ophalen ${c.container_size}`,
              href: "/containers",
              type: "pickup",
            });
          }

          return items;
        })
      );

      return {
        key,
        date,
        isToday: i === 0,
        label: i === 0 ? "Vandaag" : new Intl.DateTimeFormat("nl-NL", { weekday: "short" }).format(date),
        shortDate: new Intl.DateTimeFormat("nl-NL", { day: "2-digit", month: "short" }).format(date),
        items: [...projectItems, ...containerItems],
      };
    });
  }, [projects, bundles]);

  if (loading) return <p>Laden...</p>;

  return (
    <main style={pageStyle}>
      {/* PLANNER */}
      <section style={plannerSection}>
        <div style={legendStyle}>
          <Legend color={COLORS.project} label="Project" />
          <Legend color={COLORS.container} label="Container" />
          <Legend color={COLORS.pickup} label="Ophalen" />
        </div>

        <div style={scrollRow}>
          {days.map((day) => (
            <div
              key={day.key}
              style={{
                ...dayCard,
                border: day.isToday ? "2px solid #ef6b1f" : "1px solid #eadfd4",
              }}
            >
              <div style={dayTop}>
  <div style={dayHeaderCompact}>
    <span>{day.label}</span>
    <span style={dayDateSmall}>{day.shortDate}</span>
  </div>

  <button
  type="button"
  onClick={() => {
    setActionModal({
      dateKey: day.key,
      dateLabel: day.shortDate,
    });
  }}
  style={plusBtn}
>
  +
</button>
</div>

{actionModal ? (
  <div style={modalBackdrop} onClick={() => setActionModal(null)}>
    <div style={modalCard} onClick={(e) => e.stopPropagation()}>
      <h2 style={{ marginTop: 0 }}>Nieuwe actie</h2>
      <p style={{ color: "#6b675f" }}>{actionModal.dateLabel}</p>

      <div style={{ display: "grid", gap: 12 }}>
        <button
  type="button"
  onClick={() => {
    setPickupModal(actionModal);
    setActionModal(null);
  }}
  style={modalButton}
>
  Ophalen
</button>

        <Link href="/containers" style={modalButton}>
          Container
        </Link>

        <Link href="/agenda" style={modalButton}>
          Ophalen
        </Link>

        <button
          type="button"
          onClick={() => setActionModal(null)}
          style={modalCloseButton}
        >
          Sluiten
        </button>
      </div>
    </div>
  </div>
) : null}

{pickupModal ? (
  <div style={modalBackdrop} onClick={() => setPickupModal(null)}>
    <div style={pickupModalCard} onClick={(e) => e.stopPropagation()}>
      <h2 style={{ marginTop: 0 }}>Ophaalactie plannen</h2>
      <p style={{ color: "#6b675f", marginTop: -6 }}>{pickupModal.dateLabel}</p>

      <div style={pickupFormGrid}>
        <select style={inputStyle}>
          <option value="">Kies project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>

        <input style={inputStyle} placeholder="Wat moet opgehaald worden?" />

        <input style={inputStyle} placeholder="Waar ophalen?" />

        <input style={inputStyle} placeholder="Bedrijf / contactpersoon" />

        <select style={inputStyle}>
          <option>Huur</option>
          <option>Kantoor</option>
          <option>Kopen</option>
          <option>Retour leverancier</option>
          <option>Overig</option>
        </select>

        <textarea style={textareaStyle} placeholder="Extra notitie" />

        <button
          type="button"
          style={modalButton}
          onClick={() => {
            alert("Ophaalactie opslaan komt in de volgende stap.");
            setPickupModal(null);
          }}
        >
          Ophaalactie opslaan
        </button>

        <button type="button" style={modalCloseButton} onClick={() => setPickupModal(null)}>
          Sluiten
        </button>
      </div>
    </div>
  </div>
) : null}

              <div style={{ marginTop: 10 }}>
                {day.items.length === 0 && <div style={empty}>Geen planning</div>}

                {day.items.slice(0, 3).map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    style={{
                      ...pill,
                      background: COLORS[item.type],
                    }}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* KNOPPEN */}
      <section style={buttonWrap}>
        <div style={buttonGrid}>
          <DashboardTile title="Nieuw Project" href="/nieuw-project" color="#ef6b1f" />
          <DashboardTile title="Agenda" href="/agenda" color="#94b6ea" />
          <DashboardTile title="Projecten" href="/projecten" color="#df8783" />
          <DashboardTile title="Containers" href="/containers" color="#7ea89d" />
          <DashboardTile title="Analyse" href="/analyse" color="#c39aca" />
          <DashboardTile title="Opdrachtgevers" href="/opdrachtgevers" color="#b7bcc7" />
        </div>
      </section>
            {/* SAMENVATTING */}
      <section style={summaryGrid}>
        <Kpi href="/projecten" label="Lopende projecten" value={projects.filter(isProjectActive).length} />
        <Kpi href="/projecten" label="Geplande projecten" value={projects.filter(isProjectPlanned).length} />
        <Kpi href="/containers" label="Containers" value={bundles.reduce((s, b) => s + b.containers.length, 0)} />
        <Kpi href="/analyse" label="Analyse / taken" value={bundles.reduce((s, b) => s + b.tasks.filter((t) => !t.is_checked).length, 0)} />
      </section>

      {/* LAATSTE PROJECTEN */}
      <section style={projectsSection}>
        <div style={sectionHead}>
          <h2 style={sectionTitle}>Laatste projecten</h2>
          <Link href="/projecten" style={orangeLink}>Alles bekijken</Link>
        </div>

        <div style={projectGrid}>
          {projects.slice(0, 4).map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`} style={projectMiniCard}>
              <strong>{project.name}</strong>
              <span>{project.opdrachtgever || "Geen opdrachtgever"}</span>
              <span>{formatDate(project.start_date)} – {formatDate(project.end_date)}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div style={legendItem}>
      <span style={{ ...legendDot, background: color }} />
      <span>{label}</span>
    </div>
  );
}

function Kpi({ href, label, value }: { href: string; label: string; value: number }) {
  return (
    <Link href={href} style={kpiCard}>
      <span style={kpiLabel}>{label}</span>
      <strong style={kpiValue}>{value}</strong>
      <span style={kpiSub}>Klik om te openen</span>
    </Link>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background: "#f6f2ed",
  padding: 24,
  fontFamily: "Arial, sans-serif",
};

const plannerSection: CSSProperties = {
  background: "#fffaf6",
  border: "1px solid #eadfd4",
  borderRadius: 30,
  padding: 22,
  boxShadow: "0 14px 30px rgba(0,0,0,0.05)",
  marginBottom: 22,
};

const legendStyle: CSSProperties = {
  display: "flex",
  gap: 18,
  flexWrap: "wrap",
  marginBottom: 16,
};

const legendItem: CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  fontWeight: 800,
  color: "#4b4742",
};

const legendDot: CSSProperties = {
  width: 13,
  height: 13,
  borderRadius: 999,
};

const scrollRow: CSSProperties = {
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "210px",
  gap: 12,
  overflowX: "auto",
  paddingBottom: 10,
};

const dayCard: CSSProperties = {
  minHeight: 170, // was ~205 → compacter
  background: "#fffdfb",
  borderRadius: 20,
  padding: 12, // was 14
  boxShadow: "0 8px 16px rgba(0,0,0,0.035)",
};

const dayTop: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: 13,
  fontWeight: 900,
  color: "#6b675f",
  textTransform: "capitalize",
};

const plusBtn: CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: "50%",
  border: "1px solid #a7e0b8",
  background: "#e9fbef",
  color: "#15803d",
  fontSize: 22,
  fontWeight: 900,
  cursor: "pointer",
};

const dayDate: CSSProperties = {
  display: "none", // we gebruiken deze niet meer
};

const empty: CSSProperties = {
  background: "#f2ede8",
  color: "#7b746c",
  borderRadius: 10,
  padding: "8px 10px",
  fontSize: 12,
  fontWeight: 700,
};

const pill: CSSProperties = {
  display: "block",
  color: "#ffffff",
  textDecoration: "none",
  borderRadius: 10,
  padding: "7px 8px",
  fontSize: 11,
  fontWeight: 800,
  marginBottom: 6,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const buttonWrap: CSSProperties = {
  background: "#fffaf6",
  border: "1px solid #eadfd4",
  borderRadius: 26,
  padding: 20,
  boxShadow: "0 12px 24px rgba(0,0,0,0.04)",
  marginBottom: 22,
};

const buttonGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 22,
};

const summaryGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 16,
  marginBottom: 22,
};

const kpiCard: CSSProperties = {
  background: "#fffaf6",
  border: "1px solid #eadfd4",
  borderRadius: 22,
  padding: 18,
  textDecoration: "none",
  color: "#171717",
  boxShadow: "0 10px 20px rgba(0,0,0,0.04)",
};

const kpiLabel: CSSProperties = {
  color: "#6b675f",
  fontSize: 13,
  fontWeight: 900,
};

const kpiValue: CSSProperties = {
  display: "block",
  marginTop: 10,
  fontSize: 38,
  lineHeight: 1,
  color: "#ef6b1f",
};

const kpiSub: CSSProperties = {
  display: "block",
  marginTop: 10,
  fontSize: 13,
  color: "#6b675f",
};

const projectsSection: CSSProperties = {
  background: "#fffaf6",
  border: "1px solid #eadfd4",
  borderRadius: 26,
  padding: 20,
  boxShadow: "0 12px 24px rgba(0,0,0,0.04)",
};

const sectionHead: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 16,
};

const sectionTitle: CSSProperties = {
  margin: 0,
  fontSize: 24,
  color: "#171717",
};

const orangeLink: CSSProperties = {
  color: "#ef6b1f",
  textDecoration: "none",
  fontWeight: 900,
};

const projectGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 14,
};

const projectMiniCard: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #eee3d8",
  borderRadius: 18,
  padding: 16,
  textDecoration: "none",
  color: "#171717",
  display: "grid",
  gap: 6,
};

const dayHeaderCompact: CSSProperties = {
  display: "flex",
  gap: 6,
  alignItems: "baseline",
  fontWeight: 900,
  fontSize: 13,
  color: "#6b675f",
};

const dayDateSmall: CSSProperties = {
  fontSize: 14,
  fontWeight: 800,
  color: "#171717",
};

const modalBackdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(23,23,23,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
};

const modalCard: CSSProperties = {
  width: "100%",
  maxWidth: 360,
  background: "#ffffff",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 24px 60px rgba(0,0,0,0.22)",
};

const modalButton: CSSProperties = {
  background: "#ef6b1f",
  color: "#ffffff",
  textDecoration: "none",
  borderRadius: 14,
  padding: "14px 16px",
  fontWeight: 900,
};

const modalCloseButton: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #d8d0c7",
  borderRadius: 14,
  padding: "12px 16px",
  fontWeight: 800,
  cursor: "pointer",
};

const inputStyle: CSSProperties = {
  width: "100%",
  height: 54,
  padding: "0 15px",
  borderRadius: 16,
  border: "1px solid #d9cfc4",
  background: "#ffffff",
  color: "#171717",
  fontSize: 15,
};

const pickupModalCard: CSSProperties = {
  width: "100%",
  maxWidth: 560,
  background: "#ffffff",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 24px 60px rgba(0,0,0,0.22)",
};

const pickupFormGrid: CSSProperties = {
  display: "grid",
  gap: 12,
  marginTop: 18,
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: 110,
  paddingTop: 14,
  resize: "vertical",
};

