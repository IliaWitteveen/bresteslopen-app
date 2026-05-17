"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  formatDate,
  getProjectsForDate,
  isProjectActive,
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
  const [isMobile, setIsMobile] = useState(false);

  const [actionModal, setActionModal] = useState<{
    dateKey: string;
    dateLabel: string;
  } | null>(null);

  const [pickupModal, setPickupModal] = useState<{
    dateKey: string;
    dateLabel: string;
  } | null>(null);

    const [detailSheet, setDetailSheet] = useState<{
    title: string;
    subtitle?: string;
    items: { label: string; value?: string; href?: string }[];
  } | null>(null);

    const today = useMemo(() => new Date(), []);

  const recentProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const aTime = new Date(a.start_date || a.end_date || 0).getTime();
      const bTime = new Date(b.start_date || b.end_date || 0).getTime();
      return bTime - aTime;
    });
  }, [projects]);

  const todayKey = getDateKey(today);

  const deliveriesToday = bundles.reduce((sum, bundle) => {
    return (
      sum +
      bundle.containers.filter((container) => {
        const date = container.planned_delivery_date || container.actual_delivery_date;
        return date ? getDateKey(new Date(date)) === todayKey : false;
      }).length
    );
  }, 0);

  const pickupsToday = bundles.reduce((sum, bundle) => {
    return (
      sum +
      bundle.containers.filter((container) => {
        const date = container.planned_pickup_date || container.actual_pickup_date;
        return date ? getDateKey(new Date(date)) === todayKey : false;
      }).length
    );
  }, 0);

  const startingThisWeek = projects.filter((project) => {
    if (!project.start_date) return false;
    const start = new Date(project.start_date).getTime();
    const now = new Date(todayKey).getTime();
    const weekLater = now + 7 * 24 * 60 * 60 * 1000;
    return start >= now && start <= weekLater;
  }).length;

  function openSummarySheet(type: "active" | "planned" | "containers" | "tasks") {
    if (type === "active") {
      setDetailSheet({
        title: "Lopende projecten",
        subtitle: `${activeProjects} actief`,
        items: projects
          .filter(isProjectActive)
          .slice(0, 12)
          .map((project) => ({
            label: project.name,
            value: `${formatDate(project.start_date)} – ${formatDate(project.end_date)}`,
            href: `/projects/${project.id}`,
          })),
      });
      return;
    }

    if (type === "planned") {
      setDetailSheet({
        title: "Geplande projecten",
        subtitle: `${plannedProjects} gepland`,
        items: projects
          .filter(isProjectPlanned)
          .slice(0, 12)
          .map((project) => ({
            label: project.name,
            value: `${formatDate(project.start_date)} – ${formatDate(project.end_date)}`,
            href: `/projects/${project.id}`,
          })),
      });
      return;
    }

    if (type === "containers") {
      setDetailSheet({
        title: "Containers",
        subtitle: `${containerCount} totaal`,
        items: bundles
          .flatMap((bundle) =>
            bundle.containers.map((container) => ({
              label: `Container ${container.container_size}`,
              value:
                container.planned_delivery_date || container.actual_delivery_date
                  ? formatDate(container.planned_delivery_date || container.actual_delivery_date)
                  : "Geen datum",
              href: "/containers",
            }))
          )
          .slice(0, 16),
      });
      return;
    }

    setDetailSheet({
      title: "Analyse / taken",
      subtitle: `${openTasks} open taken`,
      items: [
        { label: "Analyse openen", value: "Overzicht", href: "/analyse" },
        { label: "Open taken", value: String(openTasks), href: "/analyse" },
        { label: "Geplande projecten", value: String(plannedProjects), href: "/projecten" },
        { label: "Containers", value: String(containerCount), href: "/containers" },
      ],
    });
  }

  function openSmartSheet(type: "today" | "pickup" | "week") {
    if (type === "today") {
      setDetailSheet({
        title: "Vandaag op planning",
        subtitle: `${planningTodayCount} items`,
        items: (days[0]?.items || []).map((item) => ({
          label: item.label,
          value:
            item.type === "project"
              ? "Project"
              : item.type === "container"
              ? "Container"
              : "Ophalen",
          href: item.href,
        })),
      });
      return;
    }

    if (type === "pickup") {
      setDetailSheet({
        title: "Transport vandaag",
        subtitle: `${deliveriesToday + pickupsToday} bewegingen`,
        items: [
          { label: "Te leveren containers", value: String(deliveriesToday), href: "/containers" },
          { label: "Op te halen containers", value: String(pickupsToday), href: "/containers" },
          { label: "Agenda openen", value: "Planning", href: "/agenda" },
        ],
      });
      return;
    }

    setDetailSheet({
      title: "Komende 7 dagen",
      subtitle: "Vooruit kijken",
      items: [
        { label: "Projecten die starten", value: String(startingThisWeek), href: "/projecten" },
        { label: "Geplande projecten", value: String(plannedProjects), href: "/projecten" },
        { label: "Open taken", value: String(openTasks), href: "/analyse" },
      ],
    });
  }

const quickTiles = [
  { href: "/nieuw-project", title: "Nieuw Project", icon: "+", color: "#ef6b1f" },
  { href: "/agenda", title: "Agenda", icon: "📅", color: "#94b6ea" },
  { href: "/projecten", title: "Projecten", icon: "🏗️", color: "#df8783" },
  { href: "/containers", title: "Containers", icon: "🗑️", color: "#7ea89d" },
  { href: "/analyse", title: "Analyse", icon: "📈", color: "#c39aca" },
  { href: "/opdrachtgevers", title: "Opdrachtgevers", icon: "👥", color: "#b7bcc7" },
];

  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth <= 760);
    }

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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

  const days = useMemo<PlannerDay[]>(() => {
    return Array.from({ length: 14 }).map((_, i) => {
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
        label:
  i === 0
    ? "Vandaag"
    : capitalizeFirst(
        new Intl.DateTimeFormat("nl-NL", { weekday: "long" }).format(date)
      ),
        shortDate: new Intl.DateTimeFormat("nl-NL", {
          day: "2-digit",
          month: "short",
        }).format(date),
        items: [...projectItems, ...containerItems],
      };
    });
  }, [projects, bundles]);

  const planningTodayCount = days[0]?.items.length || 0;
  const activeProjects = projects.filter(isProjectActive).length;
  const plannedProjects = projects.filter(isProjectPlanned).length;
  const containerCount = bundles.reduce((sum, bundle) => sum + bundle.containers.length, 0);
  const openTasks = bundles.reduce(
    (sum, bundle) => sum + bundle.tasks.filter((task) => !task.is_checked).length,
    0
  );

  if (loading) {
    return isMobile ? (
      <main className="app-dashboard-v3">Laden...</main>
    ) : (
      <main style={pageStyle}>Laden...</main>
    );
  }

  if (isMobile) {
      return (
    <main className="app-mobile-dashboard-v3">
      
      {/* PLANNING */}
      <section className="app-mobile-dashboard-v3__card">
        <div className="app-mobile-dashboard-v3__days-scroll">
          {days.slice(0, 10).map((day) => (
            <div
              key={day.key}
              className={
                day.isToday
                  ? "app-mobile-dashboard-v3__day app-mobile-dashboard-v3__day--today"
                  : "app-mobile-dashboard-v3__day"
              }
            >
              <div className="app-mobile-dashboard-v3__day-head">
                <div>
                  <strong>{day.label}</strong>
                  <span>{day.shortDate}</span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setActionModal({
                      dateKey: day.key,
                      dateLabel: day.shortDate,
                    })
                  }
                >
                  +
                </button>
              </div>

              <div className="app-mobile-dashboard-v3__day-items">
                {day.items.length === 0 ? (
                  <div className="app-mobile-dashboard-v3__empty">Geen planning</div>
                ) : (
                  day.items.slice(0, 3).map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="app-mobile-dashboard-v3__planning-pill"
                      style={{ background: COLORS[item.type] }}
                    >
                      {item.label}
                    </Link>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6 TEGELS */}
      <section className="app-mobile-dashboard-v3__quick-grid">
        {quickTiles.map((tile) => (
          <Link
            key={tile.title}
            href={tile.href}
            className="app-mobile-dashboard-v3__quick-tile"
            style={{ background: tile.color }}
          >
            <span>{tile.icon}</span>
            <strong>{tile.title}</strong>
          </Link>
        ))}
      </section>

      {/* SAMENVATTING COMPACT - RIJTJES */}
      <section className="app-mobile-dashboard-v3__card app-mobile-dashboard-v3__summary-card">
        <button
          type="button"
          className="app-mobile-dashboard-v3__summary-row"
          onClick={() => openSummarySheet("active")}
        >
          <div>
            <span>Lopende projecten</span>
            <strong>{activeProjects}</strong>
          </div>
          <em>Openen</em>
        </button>

        <button
          type="button"
          className="app-mobile-dashboard-v3__summary-row"
          onClick={() => openSummarySheet("planned")}
        >
          <div>
            <span>Geplande projecten</span>
            <strong>{plannedProjects}</strong>
          </div>
          <em>Openen</em>
        </button>

        <button
          type="button"
          className="app-mobile-dashboard-v3__summary-row"
          onClick={() => openSummarySheet("containers")}
        >
          <div>
            <span>Containers</span>
            <strong>{containerCount}</strong>
          </div>
          <em>Openen</em>
        </button>

        <button
          type="button"
          className="app-mobile-dashboard-v3__summary-row"
          onClick={() => openSummarySheet("tasks")}
        >
          <div>
            <span>Analyse / taken</span>
            <strong>{openTasks}</strong>
          </div>
          <em>Openen</em>
        </button>
      </section>

      {/* SLIMME SECTIE */}
      <section className="app-mobile-dashboard-v3__card">
        <div className="app-mobile-dashboard-v3__smart-list">
          <button
            type="button"
            className="app-mobile-dashboard-v3__smart-row"
            onClick={() => openSmartSheet("today")}
          >
            <div>
              <strong>Vandaag op planning</strong>
              <span>Projecten, containers en ophaalacties</span>
            </div>
            <b>{planningTodayCount}</b>
          </button>

          <button
            type="button"
            className="app-mobile-dashboard-v3__smart-row"
            onClick={() => openSmartSheet("pickup")}
          >
            <div>
              <strong>Transport vandaag</strong>
              <span>Leveringen en ophaalacties</span>
            </div>
            <b>{deliveriesToday + pickupsToday}</b>
          </button>

          <button
            type="button"
            className="app-mobile-dashboard-v3__smart-row"
            onClick={() => openSmartSheet("week")}
          >
            <div>
              <strong>Komende 7 dagen</strong>
              <span>Wat vraagt binnenkort aandacht</span>
            </div>
            <b>{startingThisWeek}</b>
          </button>
        </div>
      </section>

      {/* LAATSTE PROJECTEN - ZONDER HEADER */}
      <section className="app-mobile-dashboard-v3__card app-mobile-dashboard-v3__recent-card">
        <div className="app-mobile-dashboard-v3__project-scroll">
          {recentProjects.slice(0, 5).map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="app-mobile-dashboard-v3__project-row"
            >
              <div>
                <strong>{project.name}</strong>
                <span>{project.opdrachtgever || "Geen opdrachtgever"}</span>
              </div>

              <em>
                {formatDate(project.start_date)} – {formatDate(project.end_date)}
              </em>
            </Link>
          ))}
        </div>
      </section>

      {actionModal ? (
        <div className="app-mobile-dashboard-v3__sheet-backdrop" onClick={() => setActionModal(null)}>
          <div className="app-mobile-dashboard-v3__sheet" onClick={(e) => e.stopPropagation()}>
            <h2>Nieuwe actie</h2>
            <p>{actionModal.dateLabel}</p>

            <div className="app-mobile-dashboard-v3__sheet-list">
              <button
                type="button"
                onClick={() => {
                  setPickupModal(actionModal);
                  setActionModal(null);
                }}
              >
                Ophaalactie
              </button>

              <Link href="/containers">Container</Link>
              <Link href="/agenda">Agenda openen</Link>

              <button
                type="button"
                className="app-mobile-dashboard-v3__sheet-secondary"
                onClick={() => setActionModal(null)}
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pickupModal ? (
        <div className="app-mobile-dashboard-v3__sheet-backdrop" onClick={() => setPickupModal(null)}>
          <div className="app-mobile-dashboard-v3__sheet" onClick={(e) => e.stopPropagation()}>
            <h2>Ophaalactie plannen</h2>
            <p>{pickupModal.dateLabel}</p>

            <div className="app-mobile-dashboard-v3__form">
              <select>
                <option value="">Kies project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>

              <input placeholder="Wat moet opgehaald worden?" />
              <input placeholder="Waar ophalen?" />
              <input placeholder="Bedrijf / contactpersoon" />

              <select>
                <option>Huur</option>
                <option>Kantoor</option>
                <option>Kopen</option>
                <option>Retour leverancier</option>
                <option>Overig</option>
              </select>

              <textarea placeholder="Extra notitie" />

              <button
                type="button"
                onClick={() => {
                  alert("Ophaalactie opslaan komt in de volgende stap.");
                  setPickupModal(null);
                }}
              >
                Ophaalactie opslaan
              </button>

              <button
                type="button"
                className="app-mobile-dashboard-v3__sheet-secondary"
                onClick={() => setPickupModal(null)}
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {detailSheet ? (
        <div className="app-mobile-dashboard-v3__sheet-backdrop" onClick={() => setDetailSheet(null)}>
          <div className="app-mobile-dashboard-v3__sheet" onClick={(e) => e.stopPropagation()}>
            <h2>{detailSheet.title}</h2>
            {detailSheet.subtitle ? <p>{detailSheet.subtitle}</p> : null}

            <div className="app-mobile-dashboard-v3__sheet-scroll">
              {detailSheet.items.map((item, index) =>
                item.href ? (
                  <Link key={`${item.label}-${index}`} href={item.href} className="app-mobile-dashboard-v3__sheet-item">
                    <div>
                      <strong>{item.label}</strong>
                      {item.value ? <span>{item.value}</span> : null}
                    </div>
                    <em>Open</em>
                  </Link>
                ) : (
                  <div key={`${item.label}-${index}`} className="app-mobile-dashboard-v3__sheet-item">
                    <div>
                      <strong>{item.label}</strong>
                      {item.value ? <span>{item.value}</span> : null}
                    </div>
                  </div>
                )
              )}
            </div>

            <button
              type="button"
              className="app-mobile-dashboard-v3__sheet-close"
              onClick={() => setDetailSheet(null)}
            >
              Sluiten
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
  }

  return (
    <main style={pageStyle}>
      <section style={plannerSection}>
        <div style={legendStyle}>
          <DesktopLegend color={COLORS.project} label="Project" />
          <DesktopLegend color={COLORS.container} label="Container" />
          <DesktopLegend color={COLORS.pickup} label="Ophalen" />
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

      <section style={summaryGrid}>
        <DesktopKpi href="/projecten" label="Lopende projecten" value={activeProjects} />
        <DesktopKpi href="/projecten" label="Geplande projecten" value={plannedProjects} />
        <DesktopKpi href="/containers" label="Containers" value={containerCount} />
        <DesktopKpi href="/analyse" label="Analyse / taken" value={openTasks} />
      </section>

      <section style={projectsSection}>
        <div style={sectionHead}>
          <h2 style={sectionTitle}>Laatste projecten</h2>
          <Link href="/projecten" style={orangeLink}>
            Alles bekijken
          </Link>
        </div>

        <div style={projectGrid}>
          {projects.slice(0, 4).map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`} style={projectMiniCard}>
              <strong>{project.name}</strong>
              <span>{project.opdrachtgever || "Geen opdrachtgever"}</span>
              <span>
                {formatDate(project.start_date)} – {formatDate(project.end_date)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {renderActionModal(actionModal, setActionModal, setPickupModal)}
      {renderPickupModal(pickupModal, setPickupModal, projects)}
    </main>
  );
}

function renderActionModal(
  actionModal: { dateKey: string; dateLabel: string } | null,
  setActionModal: (value: { dateKey: string; dateLabel: string } | null) => void,
  setPickupModal: (value: { dateKey: string; dateLabel: string } | null) => void
) {
  if (!actionModal) return null;

  return (
    <div className="app-dashboard-v3__modal-backdrop" onClick={() => setActionModal(null)}>
      <div className="app-dashboard-v3__modal" onClick={(e) => e.stopPropagation()}>
        <h2>Nieuwe actie</h2>
        <p>{actionModal.dateLabel}</p>

        <div className="app-dashboard-v3__modal-grid">
          <button
            type="button"
            onClick={() => {
              setPickupModal(actionModal);
              setActionModal(null);
            }}
          >
            Ophaalactie
          </button>

          <Link href="/containers">Container</Link>
          <Link href="/agenda">Agenda openen</Link>

          <button
            type="button"
            className="app-dashboard-v3__modal-secondary"
            onClick={() => setActionModal(null)}
          >
            Sluiten
          </button>
        </div>
      </div>
    </div>
  );
}

function renderPickupModal(
  pickupModal: { dateKey: string; dateLabel: string } | null,
  setPickupModal: (value: { dateKey: string; dateLabel: string } | null) => void,
  projects: Project[]
) {
  if (!pickupModal) return null;

  return (
    <div className="app-dashboard-v3__modal-backdrop" onClick={() => setPickupModal(null)}>
      <div className="app-dashboard-v3__modal" onClick={(e) => e.stopPropagation()}>
        <h2>Ophaalactie plannen</h2>
        <p>{pickupModal.dateLabel}</p>

        <div className="app-dashboard-v3__form-grid">
          <select>
            <option value="">Kies project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          <input placeholder="Wat moet opgehaald worden?" />
          <input placeholder="Waar ophalen?" />
          <input placeholder="Bedrijf / contactpersoon" />

          <select>
            <option>Huur</option>
            <option>Kantoor</option>
            <option>Kopen</option>
            <option>Retour leverancier</option>
            <option>Overig</option>
          </select>

          <textarea placeholder="Extra notitie" />

          <button
            type="button"
            onClick={() => {
              alert("Ophaalactie opslaan komt in de volgende stap.");
              setPickupModal(null);
            }}
          >
            Ophaalactie opslaan
          </button>

          <button
            type="button"
            className="app-dashboard-v3__modal-secondary"
            onClick={() => setPickupModal(null)}
          >
            Sluiten
          </button>
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="app-dashboard-v3__legend-item">
      <span style={{ background: color }} />
      <strong>{label}</strong>
    </div>
  );
}

function ActionTile({
  href,
  title,
  icon,
  color,
}: {
  href: string;
  title: string;
  icon: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="app-mobile-dashboard-v3__quick-tile"
      style={{ background: color }}
    >
      <span>{icon}</span>
      <strong>{title}</strong>
    </Link>
  );
}

function MobileKpi({
  href,
  label,
  value,
}: {
  href: string;
  label: string;
  value: number;
}) {
  return (
    <Link href={href} className="app-dashboard-v3__kpi">
      <span>{label}</span>
      <strong>{value}</strong>
    </Link>
  );
}

function DesktopLegend({ color, label }: { color: string; label: string }) {
  return (
    <div style={legendItem}>
      <span style={{ ...legendDot, background: color }} />
      <span>{label}</span>
    </div>
  );
}

function DesktopKpi({ href, label, value }: { href: string; label: string; value: number }) {
  return (
    <Link href={href} style={kpiCard}>
      <span style={kpiLabel}>{label}</span>
      <strong style={kpiValue}>{value}</strong>
      <span style={kpiSub}>Klik om te openen</span>
    </Link>
  );
}

function capitalizeFirst(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
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
  minHeight: 170,
  background: "#fffdfb",
  borderRadius: 20,
  padding: 12,
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