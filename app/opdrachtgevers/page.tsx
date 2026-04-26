"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  formatDate,
  isProjectActive,
  isProjectCompleted,
  loadProjectBundlesForCurrentUser,
  type ProjectBundle,
} from "@/lib/overview";

type CustomerGroup = {
  name: string;
  projects: ProjectBundle[];
  totalProjects: number;
  activeProjects: number;
  plannedProjects: number;
  completedProjects: number;
  conceptProjects: number;
  totalContainers: number;
  totalPhotos: number;
  totalTasks: number;
  openTasks: number;
  totalArea: number;
  totalWorkDays: number;
  latestDate: string;
};

type PopupState = {
  title: string;
  items: {
    id: string;
    title: string;
    subtitle: string;
    href: string;
  }[];
} | null;

export default function CustomersPage() {
  const [loading, setLoading] = useState(true);
  const [bundles, setBundles] = useState<ProjectBundle[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("projectsDesc");
  const [statusFilter, setStatusFilter] = useState("Alles");
  const [popupState, setPopupState] = useState<PopupState>(null);

  useEffect(() => {
    async function init() {
      try {
        const overview = await loadProjectBundlesForCurrentUser();

        if (!overview) {
          window.location.href = "/login";
          return;
        }

        setBundles(overview.bundles);
      } catch (error) {
        console.error(error);
        window.location.href = "/";
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  const groups = useMemo<CustomerGroup[]>(() => {
    const map = new Map<string, ProjectBundle[]>();

    bundles.forEach((bundle) => {
      const key = bundle.project.opdrachtgever?.trim() || "Onbekend";
      const existing = map.get(key) || [];
      existing.push(bundle);
      map.set(key, existing);
    });

    return Array.from(map.entries()).map(([name, items]) => {
      const sorted = [...items].sort((a, b) => {
        const aTime = a.project.updated_at
          ? new Date(a.project.updated_at).getTime()
          : 0;
        const bTime = b.project.updated_at
          ? new Date(b.project.updated_at).getTime()
          : 0;
        return bTime - aTime;
      });

      const totalTasks = sorted.reduce((sum, item) => sum + item.tasks.length, 0);
      const openTasks = sorted.reduce(
        (sum, item) =>
          sum +
          item.tasks.filter((task) => {
            const dynamicTask = task as { is_checked?: boolean | null; is_done?: boolean | null };
            return !Boolean(dynamicTask.is_checked ?? dynamicTask.is_done ?? false);
          }).length,
        0
      );

      const totalArea = sorted.reduce(
        (sum, item) => sum + Number(item.project.area_m2 || 0),
        0
      );

      const totalWorkDays = sorted.reduce(
        (sum, item) => sum + Number(item.project.work_days || 0),
        0
      );

      return {
        name,
        projects: sorted,
        totalProjects: sorted.length,
        activeProjects: sorted.filter((item) => isProjectActive(item.project)).length,
        plannedProjects: sorted.filter(
          (item) => (item.project.status || "").toLowerCase() === "gepland"
        ).length,
        completedProjects: sorted.filter((item) => isProjectCompleted(item.project)).length,
        conceptProjects: sorted.filter(
          (item) => (item.project.status || "").toLowerCase() === "concept"
        ).length,
        totalContainers: sorted.reduce((sum, item) => sum + item.containers.length, 0),
        totalPhotos: sorted.reduce((sum, item) => sum + item.photos.length, 0),
        totalTasks,
        openTasks,
        totalArea,
        totalWorkDays,
        latestDate: sorted[0]?.project.updated_at || sorted[0]?.project.created_at || "",
      };
    });
  }, [bundles]);

  const filteredGroups = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const result = groups.filter((group) => {
      const matchesSearch =
        !query ||
        group.name.toLowerCase().includes(query) ||
        group.projects.some((item) =>
          item.project.name.toLowerCase().includes(query)
        );

      const matchesStatus =
        statusFilter === "Alles" ||
        (statusFilter === "Met lopende projecten" && group.activeProjects > 0) ||
        (statusFilter === "Met geplande projecten" && group.plannedProjects > 0) ||
        (statusFilter === "Met afgeronde projecten" && group.completedProjects > 0) ||
        (statusFilter === "Met open taken" && group.openTasks > 0) ||
        (statusFilter === "Met containers" && group.totalContainers > 0) ||
        (statusFilter === "Met foto's" && group.totalPhotos > 0);

      return matchesSearch && matchesStatus;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case "nameAsc":
          return a.name.localeCompare(b.name, "nl");
        case "nameDesc":
          return b.name.localeCompare(a.name, "nl");
        case "containersDesc":
          return b.totalContainers - a.totalContainers;
        case "photosDesc":
          return b.totalPhotos - a.totalPhotos;
        case "openTasksDesc":
          return b.openTasks - a.openTasks;
        case "latestDesc":
          return safeTime(b.latestDate) - safeTime(a.latestDate);
        case "projectsDesc":
        default:
          return b.totalProjects - a.totalProjects;
      }
    });

    return result;
  }, [groups, searchTerm, sortBy, statusFilter]);

  const totals = useMemo(() => {
    return {
      customers: filteredGroups.length,
      projects: filteredGroups.reduce((sum, item) => sum + item.totalProjects, 0),
      active: filteredGroups.reduce((sum, item) => sum + item.activeProjects, 0),
      containers: filteredGroups.reduce((sum, item) => sum + item.totalContainers, 0),
      photos: filteredGroups.reduce((sum, item) => sum + item.totalPhotos, 0),
      openTasks: filteredGroups.reduce((sum, item) => sum + item.openTasks, 0),
      area: filteredGroups.reduce((sum, item) => sum + item.totalArea, 0),
    };
  }, [filteredGroups]);

  function openGroupProjects(group: CustomerGroup) {
    setPopupState({
      title: `${group.name} · projecten`,
      items: group.projects.map((item) => ({
        id: item.project.id,
        title: item.project.name,
        subtitle: `${item.project.status || "Concept"} · ${item.project.address || "Geen adres"}`,
        href: `/projects/${item.project.id}`,
      })),
    });
  }

  function openGroupContainers(group: CustomerGroup) {
    setPopupState({
      title: `${group.name} · containers`,
      items: group.projects.flatMap((item) =>
        item.containers.map((container) => ({
          id: container.id,
          title: `${container.waste_type || "-"} · ${container.container_size || "-"}`,
          subtitle: item.project.name,
          href: `/containers?projectId=${item.project.id}#container-${container.id}`,
        }))
      ),
    });
  }

  if (loading) {
    return (
      <main style={pageStyle}>
        <p>Laden...</p>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={pageInnerStyle}>
        <section style={headerStyle}>
          <div>
            <h1 style={pageTitleStyle}>Opdrachtgevers</h1>
            <p style={pageSubtitleStyle}>
              Analyseer opdrachtgevers op projecten, containers, taken, foto's en activiteit.
            </p>
          </div>

          <Link href="/" style={backLinkStyle}>
            ← Dashboard
          </Link>
        </section>

        <section style={summaryGridStyle}>
          <SummaryCard
            label="Opdrachtgevers"
            value={totals.customers}
            accent="#ef6b1f"
            onClick={() =>
              setPopupState({
                title: "Alle opdrachtgevers",
                items: filteredGroups.map((group) => ({
                  id: group.name,
                  title: group.name,
                  subtitle: `${group.totalProjects} project(en) · ${group.totalContainers} containers`,
                  href: `/opdrachtgevers/${encodeURIComponent(group.name)}`,
                })),
              })
            }
          />
          <SummaryCard
            label="Projecten"
            value={totals.projects}
            accent="#94b6ea"
            onClick={() =>
              setPopupState({
                title: "Alle projecten",
                items: filteredGroups.flatMap((group) =>
                  group.projects.map((item) => ({
                    id: item.project.id,
                    title: item.project.name,
                    subtitle: `${group.name} · ${item.project.status || "Concept"}`,
                    href: `/projects/${item.project.id}`,
                  }))
                ),
              })
            }
          />
          <SummaryCard
            label="Lopend"
            value={totals.active}
            accent="#7ea89d"
            onClick={() =>
              setPopupState({
                title: "Lopende projecten",
                items: filteredGroups.flatMap((group) =>
                  group.projects
                    .filter((item) => isProjectActive(item.project))
                    .map((item) => ({
                      id: item.project.id,
                      title: item.project.name,
                      subtitle: group.name,
                      href: `/projects/${item.project.id}`,
                    }))
                ),
              })
            }
          />
          <SummaryCard
            label="Containers"
            value={totals.containers}
            accent="#8d6ccf"
            onClick={() =>
              setPopupState({
                title: "Containers",
                items: filteredGroups.flatMap((group) =>
                  group.projects.flatMap((item) =>
                    item.containers.map((container) => ({
                      id: container.id,
                      title: `${container.waste_type || "-"} · ${container.container_size || "-"}`,
                      subtitle: `${group.name} · ${item.project.name}`,
                      href: `/containers?projectId=${item.project.id}#container-${container.id}`,
                    }))
                  )
                ),
              })
            }
          />
          <SummaryCard
            label="Open taken"
            value={totals.openTasks}
            accent="#df8783"
            onClick={() =>
              setPopupState({
                title: "Projecten met open taken",
                items: filteredGroups.flatMap((group) =>
                  group.projects
                    .filter((item) =>
                      item.tasks.some((task) => {
                        const dynamicTask = task as {
                          is_checked?: boolean | null;
                          is_done?: boolean | null;
                        };
                        return !Boolean(dynamicTask.is_checked ?? dynamicTask.is_done ?? false);
                      })
                    )
                    .map((item) => ({
                      id: item.project.id,
                      title: item.project.name,
                      subtitle: group.name,
                      href: `/projects/${item.project.id}`,
                    }))
                ),
              })
            }
          />
          <SummaryCard
            label="m² totaal"
            value={totals.area}
            accent="#e39d6b"
            onClick={() =>
              setPopupState({
                title: "Projecten met m²",
                items: filteredGroups.flatMap((group) =>
                  group.projects.map((item) => ({
                    id: item.project.id,
                    title: item.project.name,
                    subtitle: `${group.name} · ${item.project.area_m2 || 0} m²`,
                    href: `/projects/${item.project.id}`,
                  }))
                ),
              })
            }
          />
        </section>

        <section style={filterPanelStyle}>
          <div style={filterHeaderStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Filteren en zoeken</h2>
              <p style={sectionSubtitleStyle}>
                Zoek op opdrachtgever of project en sorteer direct op activiteit.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("Alles");
                setSortBy("projectsDesc");
              }}
              style={secondaryButtonStyle}
            >
              Reset
            </button>
          </div>

          <div style={filterGridStyle}>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Zoek opdrachtgever of project..."
              style={inputStyle}
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={inputStyle}
            >
              <option value="Alles">Alle opdrachtgevers</option>
              <option value="Met lopende projecten">Met lopende projecten</option>
              <option value="Met geplande projecten">Met geplande projecten</option>
              <option value="Met afgeronde projecten">Met afgeronde projecten</option>
              <option value="Met open taken">Met open taken</option>
              <option value="Met containers">Met containers</option>
              <option value="Met foto's">Met foto's</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={inputStyle}
            >
              <option value="projectsDesc">Meeste projecten</option>
              <option value="latestDesc">Laatste activiteit</option>
              <option value="containersDesc">Meeste containers</option>
              <option value="photosDesc">Meeste foto's</option>
              <option value="openTasksDesc">Meeste open taken</option>
              <option value="nameAsc">Naam A-Z</option>
              <option value="nameDesc">Naam Z-A</option>
            </select>
          </div>
        </section>

        <section style={contentGridStyle}>
          <div style={customersPanelStyle}>
            <div style={panelHeaderStyle}>
              <h2 style={sectionTitleStyle}>Opdrachtgeversoverzicht</h2>
              <span style={smallMutedStyle}>{filteredGroups.length} gevonden</span>
            </div>

            <div style={groupListStyle}>
              {filteredGroups.length === 0 ? (
                <EmptyState text="Geen opdrachtgevers gevonden." />
              ) : (
                filteredGroups.map((group) => (
                  <article key={group.name} style={groupCardStyle}>
                    <div style={groupTopStyle}>
                      <div>
                        <Link
                          href={`/opdrachtgevers/${encodeURIComponent(group.name)}`}
                          style={groupTitleLinkStyle}
                        >
                          {group.name}
                        </Link>
                        <div style={groupMetaStyle}>
                          Laatste activiteit: {formatDate(group.latestDate)}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => openGroupProjects(group)}
                        style={projectPillButtonStyle}
                      >
                        {group.totalProjects} project(en)
                      </button>
                    </div>

                    <div style={customerStatsGridStyle}>
                      <MiniMetric label="Lopend" value={group.activeProjects} />
                      <MiniMetric label="Gepland" value={group.plannedProjects} />
                      <MiniMetric label="Afgerond" value={group.completedProjects} />
                      <MiniMetric label="Containers" value={group.totalContainers} />
                      <MiniMetric label="Foto's" value={group.totalPhotos} />
                      <MiniMetric label="Open taken" value={group.openTasks} />
                      <MiniMetric label="m² totaal" value={group.totalArea} />
                      <MiniMetric label="Werkdagen" value={group.totalWorkDays} />
                    </div>

                    <div style={groupActionsStyle}>
                      <Link
                        href={`/opdrachtgevers/${encodeURIComponent(group.name)}`}
                        style={primaryActionLinkStyle}
                      >
                        Open opdrachtgever →
                      </Link>

                      <button
                        type="button"
                        onClick={() => openGroupProjects(group)}
                        style={secondaryActionButtonStyle}
                      >
                        Projecten bekijken
                      </button>

                      <button
                        type="button"
                        onClick={() => openGroupContainers(group)}
                        style={secondaryActionButtonStyle}
                      >
                        Containers bekijken
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <aside style={sidePanelStyle}>
            <h2 style={sectionTitleStyle}>Top opdrachtgevers</h2>
            <p style={sectionSubtitleStyle}>Snel inzicht in de grootste opdrachtgevers.</p>

            <div style={rankingListStyle}>
              {[...filteredGroups]
                .sort((a, b) => b.totalProjects - a.totalProjects)
                .slice(0, 8)
                .map((group, index) => (
                  <Link
                    key={group.name}
                    href={`/opdrachtgevers/${encodeURIComponent(group.name)}`}
                    style={rankingItemStyle}
                  >
                    <span style={rankingNumberStyle}>{index + 1}</span>
                    <span style={rankingTextStyle}>
                      <strong>{group.name}</strong>
                      <small>
                        {group.totalProjects} project(en) · {group.totalContainers} containers
                      </small>
                    </span>
                  </Link>
                ))}
            </div>
          </aside>
        </section>
      </div>

      {popupState ? (
        <div style={modalBackdropStyle} onClick={() => setPopupState(null)}>
          <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <h3 style={modalTitleStyle}>{popupState.title}</h3>
              <button
                type="button"
                onClick={() => setPopupState(null)}
                style={modalCloseStyle}
              >
                ×
              </button>
            </div>

            <div style={modalListStyle}>
              {popupState.items.length === 0 ? (
                <EmptyState text="Geen items gevonden." />
              ) : (
                popupState.items.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    style={modalItemLinkStyle}
                    onClick={() => setPopupState(null)}
                  >
                    <div style={modalItemTitleStyle}>{item.title}</div>
                    <div style={modalItemMetaStyle}>{item.subtitle}</div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function SummaryCard({
  label,
  value,
  accent,
  onClick,
}: {
  label: string;
  value: string | number;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ ...summaryCardStyle, borderTop: `6px solid ${accent}` }}
    >
      <div style={summaryLabelStyle}>{label}</div>
      <div style={{ ...summaryValueStyle, color: accent }}>{value}</div>
    </button>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={miniMetricStyle}>
      <div style={miniMetricLabelStyle}>{label}</div>
      <div style={miniMetricValueStyle}>{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div style={emptyStateStyle}>{text}</div>;
}

function safeTime(value?: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  padding: 24,
  background: "#f6f2ed",
  fontFamily: "Arial, sans-serif",
};

const pageInnerStyle: CSSProperties = {
  maxWidth: 1440,
  margin: "0 auto",
};

const headerStyle: CSSProperties = {
  background: "#fffaf6",
  borderRadius: 32,
  padding: 24,
  border: "1px solid #ece3da",
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  flexWrap: "wrap",
  boxShadow: "0 14px 28px rgba(0,0,0,0.04)",
};

const pageTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 42,
  lineHeight: 1,
  color: "#171717",
};

const pageSubtitleStyle: CSSProperties = {
  margin: "10px 0 0 0",
  color: "#6b675f",
  fontSize: 16,
};

const backLinkStyle: CSSProperties = {
  textDecoration: "none",
  color: "#ef6b1f",
  fontWeight: 800,
};

const summaryGridStyle: CSSProperties = {
  marginTop: 18,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 14,
};

const summaryCardStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #eadfd4",
  borderRadius: 22,
  padding: 18,
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "0 10px 22px rgba(0,0,0,0.035)",
};

const summaryLabelStyle: CSSProperties = {
  fontSize: 12,
  color: "#6b675f",
  fontWeight: 900,
  textTransform: "uppercase",
};

const summaryValueStyle: CSSProperties = {
  marginTop: 12,
  fontSize: 34,
  fontWeight: 900,
  lineHeight: 1,
};

const filterPanelStyle: CSSProperties = {
  marginTop: 18,
  background: "#f5f9ff",
  borderRadius: 28,
  border: "1px solid #dbe8f8",
  padding: 18,
};

const filterHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  flexWrap: "wrap",
  alignItems: "flex-start",
  marginBottom: 14,
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 24,
  color: "#171717",
};

const sectionSubtitleStyle: CSSProperties = {
  margin: "8px 0 0 0",
  color: "#6b675f",
  fontSize: 14,
  lineHeight: 1.45,
};

const secondaryButtonStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #d8d0c7",
  borderRadius: 14,
  padding: "12px 16px",
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
  color: "#171717",
};

const filterGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.4fr 1fr 1fr",
  gap: 12,
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "15px 16px",
  borderRadius: 16,
  border: "1px solid #d8d0c7",
  background: "#ffffff",
  fontSize: 15,
  color: "#171717",
};

const contentGridStyle: CSSProperties = {
  marginTop: 18,
  display: "grid",
  gridTemplateColumns: "1.8fr 0.8fr",
  gap: 18,
  alignItems: "start",
};

const customersPanelStyle: CSSProperties = {
  background: "#fff7f1",
  border: "1px solid #f1ddcd",
  borderRadius: 28,
  padding: 18,
};

const sidePanelStyle: CSSProperties = {
  background: "#faf7ff",
  border: "1px solid #e5daf7",
  borderRadius: 28,
  padding: 18,
  position: "sticky",
  top: 18,
};

const panelHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
  marginBottom: 16,
};

const smallMutedStyle: CSSProperties = {
  color: "#6b675f",
  fontSize: 14,
  fontWeight: 700,
};

const groupListStyle: CSSProperties = {
  display: "grid",
  gap: 16,
};

const groupCardStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 24,
  padding: 20,
  border: "1px solid #ebe2d8",
  boxShadow: "0 10px 20px rgba(0,0,0,0.04)",
};

const groupTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
  alignItems: "flex-start",
};

const groupTitleLinkStyle: CSSProperties = {
  color: "#171717",
  textDecoration: "none",
  fontSize: 28,
  fontWeight: 900,
};

const groupMetaStyle: CSSProperties = {
  color: "#6b675f",
  marginTop: 8,
  fontSize: 14,
};

const projectPillButtonStyle: CSSProperties = {
  background: "#ef6b1f",
  color: "#ffffff",
  borderRadius: 999,
  border: "none",
  padding: "11px 16px",
  fontWeight: 800,
  height: "fit-content",
  cursor: "pointer",
};

const customerStatsGridStyle: CSSProperties = {
  marginTop: 16,
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 10,
};

const miniMetricStyle: CSSProperties = {
  background: "#fbf8f4",
  border: "1px solid #eee3d8",
  borderRadius: 16,
  padding: 12,
};

const miniMetricLabelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 900,
  color: "#7b746c",
  textTransform: "uppercase",
};

const miniMetricValueStyle: CSSProperties = {
  marginTop: 8,
  fontSize: 18,
  fontWeight: 900,
  color: "#171717",
};

const groupActionsStyle: CSSProperties = {
  marginTop: 16,
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const primaryActionLinkStyle: CSSProperties = {
  background: "#ef6b1f",
  color: "#ffffff",
  textDecoration: "none",
  borderRadius: 14,
  padding: "12px 14px",
  fontSize: 14,
  fontWeight: 800,
};

const secondaryActionButtonStyle: CSSProperties = {
  background: "#ffffff",
  color: "#171717",
  border: "1px solid #d8d0c7",
  borderRadius: 14,
  padding: "12px 14px",
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
};

const rankingListStyle: CSSProperties = {
  marginTop: 16,
  display: "grid",
  gap: 10,
};

const rankingItemStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "34px 1fr",
  gap: 10,
  alignItems: "center",
  background: "#ffffff",
  border: "1px solid #eadfd4",
  borderRadius: 16,
  padding: 12,
  textDecoration: "none",
  color: "inherit",
};

const rankingNumberStyle: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: "50%",
  background: "#fff4e8",
  color: "#ef6b1f",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 900,
};

const rankingTextStyle: CSSProperties = {
  display: "grid",
  gap: 4,
  color: "#171717",
};

const emptyStateStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #eadfd4",
  borderRadius: 16,
  padding: 16,
  color: "#6b675f",
};

const modalBackdropStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(23,23,23,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  zIndex: 200,
};

const modalCardStyle: CSSProperties = {
  width: "100%",
  maxWidth: 680,
  maxHeight: "82vh",
  overflow: "auto",
  background: "#ffffff",
  borderRadius: 24,
  padding: 18,
  border: "1px solid #eadfd4",
  boxShadow: "0 24px 48px rgba(0,0,0,0.16)",
};

const modalHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
};

const modalTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 22,
  color: "#171717",
};

const modalCloseStyle: CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: "50%",
  border: "1px solid #ddd1c4",
  background: "#ffffff",
  fontSize: 24,
  lineHeight: 1,
  cursor: "pointer",
};

const modalListStyle: CSSProperties = {
  marginTop: 14,
  display: "grid",
  gap: 10,
};

const modalItemLinkStyle: CSSProperties = {
  textDecoration: "none",
  color: "inherit",
  background: "#fbf8f4",
  border: "1px solid #eadfd4",
  borderRadius: 16,
  padding: 14,
};

const modalItemTitleStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: 900,
  color: "#171717",
};

const modalItemMetaStyle: CSSProperties = {
  marginTop: 5,
  fontSize: 13,
  color: "#6b675f",
};