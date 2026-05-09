"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { deleteProjectById } from "@/lib/projects";
import {
  formatDate,
  loadProjectBundlesForCurrentUser,
  type ProjectBundle,
} from "@/lib/overview";

type ProjectRow = {
  id: string;
  name: string;
  projectNumber: string;
  opdrachtgever: string;
  address: string;
  status: string;
  demolitionType: string;
  buildingType: string;
  areaM2: number;
  workDays: number;
  startDate: string | null;
  endDate: string | null;
  openTasks: number;
  checkedTasks: number;
  totalTasks: number;
  progress: number;
  containerCount: number;
  photoCount: number;
  executors: string[];
  hasContainers: boolean;
  hasPhotos: boolean;
};

const STATUS_OPTIONS = ["Alles", "Concept", "Gepland", "Bezig", "Afgerond"];
const YES_NO_OPTIONS = ["Alles", "Ja", "Nee"];

export default function ProjectenPage() {
  const [loading, setLoading] = useState(true);
  const [bundles, setBundles] = useState<ProjectBundle[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Alles");
  const [opdrachtgeverFilter, setOpdrachtgeverFilter] = useState("Alles");
  const [executorFilter, setExecutorFilter] = useState("Alles");
  const [demolitionTypeFilter, setDemolitionTypeFilter] = useState("Alles");
  const [buildingTypeFilter, setBuildingTypeFilter] = useState("Alles");
  const [containerFilter, setContainerFilter] = useState("Alles");
  const [photoFilter, setPhotoFilter] = useState("Alles");

  const [minArea, setMinArea] = useState("");
  const [maxArea, setMaxArea] = useState("");
  const [minOpenTasks, setMinOpenTasks] = useState("");
  const [maxOpenTasks, setMaxOpenTasks] = useState("");
  const [minProgress, setMinProgress] = useState("");
  const [maxProgress, setMaxProgress] = useState("");

  const [sortBy, setSortBy] = useState("openTasksDesc");
const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
const [deletingProjects, setDeletingProjects] = useState(false);

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

  const projects = useMemo<ProjectRow[]>(() => {
    return bundles.map((bundle) => {
      const totalTasks = bundle.tasks.length;
      const checkedTasks = bundle.tasks.filter((task) =>
        Boolean(
          (task as { is_checked?: boolean | null; is_done?: boolean | null })
            .is_checked ??
            (task as { is_checked?: boolean | null; is_done?: boolean | null })
              .is_done ??
            false
        )
      ).length;

      const openTasks = totalTasks - checkedTasks;
      const progress =
        totalTasks > 0 ? Math.round((checkedTasks / totalTasks) * 100) : 0;

      return {
        id: bundle.project.id,
        name: bundle.project.name || "Zonder naam",
        projectNumber: bundle.project.project_number || "-",
        opdrachtgever: bundle.project.opdrachtgever || "Onbekend",
        address: bundle.project.address || "-",
        status: bundle.project.status || "Concept",
        demolitionType: bundle.project.demolition_type || "Onbekend",
        buildingType: bundle.project.building_type || "Onbekend",
        areaM2: Number(bundle.project.area_m2 || 0),
        workDays: Number(bundle.project.work_days || 0),
        startDate: bundle.project.start_date || null,
        endDate: bundle.project.end_date || null,
        openTasks,
        checkedTasks,
        totalTasks,
        progress,
        containerCount: bundle.containers.length,
        photoCount: bundle.photos.length,
        executors: bundle.executors.map((executor) => executor.name).filter(Boolean),
        hasContainers: bundle.containers.length > 0,
        hasPhotos: bundle.photos.length > 0,
      };
    });
  }, [bundles]);

async function handleDeleteSelectedProjects() {
  if (selectedProjectIds.length === 0) return;

  const confirmed = window.confirm(
    `Weet je zeker dat je ${selectedProjectIds.length} project(en) wilt verwijderen?`
  );

  if (!confirmed) return;

  try {
    setDeletingProjects(true);

    await Promise.all(
      selectedProjectIds.map((id) => deleteProjectById(id))
    );

    setBundles((current) =>
      current.filter(
        (bundle) => !selectedProjectIds.includes(bundle.project.id)
      )
    );

    setSelectedProjectIds([]);
  } catch (error) {
    console.error(error);
    alert("Projecten verwijderen mislukt.");
  } finally {
    setDeletingProjects(false);
  }
}

  const opdrachtgeverOptions = useMemo(
    () => ["Alles", ...uniqueSorted(projects.map((item) => item.opdrachtgever))],
    [projects]
  );

  const executorOptions = useMemo(
    () => ["Alles", ...uniqueSorted(projects.flatMap((item) => item.executors))],
    [projects]
  );

  const demolitionTypeOptions = useMemo(
    () => ["Alles", ...uniqueSorted(projects.map((item) => item.demolitionType))],
    [projects]
  );

  const buildingTypeOptions = useMemo(
    () => ["Alles", ...uniqueSorted(projects.map((item) => item.buildingType))],
    [projects]
  );

  const filteredProjects = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const minAreaNumber = minArea ? Number(minArea) : null;
    const maxAreaNumber = maxArea ? Number(maxArea) : null;
    const minOpenTasksNumber = minOpenTasks ? Number(minOpenTasks) : null;
    const maxOpenTasksNumber = maxOpenTasks ? Number(maxOpenTasks) : null;
    const minProgressNumber = minProgress ? Number(minProgress) : null;
    const maxProgressNumber = maxProgress ? Number(maxProgress) : null;

    const result = projects.filter((project) => {
      const matchesSearch =
        !query ||
        project.name.toLowerCase().includes(query) ||
        project.projectNumber.toLowerCase().includes(query) ||
        project.opdrachtgever.toLowerCase().includes(query) ||
        project.address.toLowerCase().includes(query) ||
        project.status.toLowerCase().includes(query) ||
        project.demolitionType.toLowerCase().includes(query) ||
        project.buildingType.toLowerCase().includes(query) ||
        project.executors.some((name) => name.toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === "Alles" ||
        project.status.toLowerCase() === statusFilter.toLowerCase();

      const matchesOpdrachtgever =
        opdrachtgeverFilter === "Alles" ||
        project.opdrachtgever === opdrachtgeverFilter;

      const matchesExecutor =
        executorFilter === "Alles" || project.executors.includes(executorFilter);

      const matchesDemolition =
        demolitionTypeFilter === "Alles" ||
        project.demolitionType === demolitionTypeFilter;

      const matchesBuilding =
        buildingTypeFilter === "Alles" ||
        project.buildingType === buildingTypeFilter;

      const matchesContainers =
        containerFilter === "Alles" ||
        (containerFilter === "Ja" && project.hasContainers) ||
        (containerFilter === "Nee" && !project.hasContainers);

      const matchesPhotos =
        photoFilter === "Alles" ||
        (photoFilter === "Ja" && project.hasPhotos) ||
        (photoFilter === "Nee" && !project.hasPhotos);

      const matchesAreaMin = minAreaNumber === null || project.areaM2 >= minAreaNumber;
      const matchesAreaMax = maxAreaNumber === null || project.areaM2 <= maxAreaNumber;

      const matchesOpenTasksMin =
        minOpenTasksNumber === null || project.openTasks >= minOpenTasksNumber;

      const matchesOpenTasksMax =
        maxOpenTasksNumber === null || project.openTasks <= maxOpenTasksNumber;

      const matchesProgressMin =
        minProgressNumber === null || project.progress >= minProgressNumber;

      const matchesProgressMax =
        maxProgressNumber === null || project.progress <= maxProgressNumber;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesOpdrachtgever &&
        matchesExecutor &&
        matchesDemolition &&
        matchesBuilding &&
        matchesContainers &&
        matchesPhotos &&
        matchesAreaMin &&
        matchesAreaMax &&
        matchesOpenTasksMin &&
        matchesOpenTasksMax &&
        matchesProgressMin &&
        matchesProgressMax
      );
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case "nameAsc":
          return a.name.localeCompare(b.name, "nl");
        case "nameDesc":
          return b.name.localeCompare(a.name, "nl");
        case "progressDesc":
          return b.progress - a.progress;
        case "progressAsc":
          return a.progress - b.progress;
        case "areaDesc":
          return b.areaM2 - a.areaM2;
        case "areaAsc":
          return a.areaM2 - b.areaM2;
        case "containersDesc":
          return b.containerCount - a.containerCount;
        case "photosDesc":
          return b.photoCount - a.photoCount;
        case "startDateAsc":
          return safeTime(a.startDate) - safeTime(b.startDate);
        case "startDateDesc":
          return safeTime(b.startDate) - safeTime(a.startDate);
        case "openTasksAsc":
          return a.openTasks - b.openTasks;
        case "openTasksDesc":
        default:
          return b.openTasks - a.openTasks;
      }
    });

    return result;
  }, [
    projects,
    searchTerm,
    statusFilter,
    opdrachtgeverFilter,
    executorFilter,
    demolitionTypeFilter,
    buildingTypeFilter,
    containerFilter,
    photoFilter,
    minArea,
    maxArea,
    minOpenTasks,
    maxOpenTasks,
    minProgress,
    maxProgress,
    sortBy,
  ]);

  const metrics = useMemo(() => {
    return {
      projects: filteredProjects.length,
      openTasks: filteredProjects.reduce((sum, item) => sum + item.openTasks, 0),
      containers: filteredProjects.reduce((sum, item) => sum + item.containerCount, 0),
      photos: filteredProjects.reduce((sum, item) => sum + item.photoCount, 0),
      totalArea: filteredProjects.reduce((sum, item) => sum + item.areaM2, 0),
      avgProgress:
        filteredProjects.length > 0
          ? Math.round(
              filteredProjects.reduce((sum, item) => sum + item.progress, 0) /
                filteredProjects.length
            )
          : 0,
    };
  }, [filteredProjects]);

  function resetFilters() {
    setSearchTerm("");
    setStatusFilter("Alles");
    setOpdrachtgeverFilter("Alles");
    setExecutorFilter("Alles");
    setDemolitionTypeFilter("Alles");
    setBuildingTypeFilter("Alles");
    setContainerFilter("Alles");
    setPhotoFilter("Alles");
    setMinArea("");
    setMaxArea("");
    setMinOpenTasks("");
    setMaxOpenTasks("");
    setMinProgress("");
    setMaxProgress("");
    setSortBy("openTasksDesc");
  }

  if (loading) {
    return (
      <main style={pageStyle}>
        <p>Projecten laden...</p>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={pageInnerStyle}>
        <section style={headerStyle}>
          <div>
            <Link href="/" style={backLinkStyle}>
              ← Dashboard
            </Link>
            <h1 style={titleStyle}>Projecten</h1>
            <p style={subtitleStyle}>
              Filter, vergelijk en open alle projecten vanuit één professioneel overzicht.
            </p>
          </div>

          <Link href="/nieuw-project" style={newProjectButtonStyle}>
            Nieuw project
          </Link>
        </section>

        {selectedProjectIds.length > 0 ? (
  <button
    type="button"
    onClick={handleDeleteSelectedProjects}
    disabled={deletingProjects}
    style={bulkDeleteButtonStyle}
  >
    {deletingProjects
      ? "Verwijderen..."
      : `${selectedProjectIds.length} verwijderen`}
  </button>
) : null}

        <section style={filterPanelStyle}>
          <div style={filterHeaderStyle}>
            <div>
              <h2 style={filterTitleStyle}>Filters</h2>
              <p style={filterSubtitleStyle}>
                Zoek op project, opdrachtgever, persoon, planning, containers en voortgang.
              </p>
            </div>

            <button type="button" onClick={resetFilters} style={resetButtonStyle}>
              Filters resetten
            </button>
          </div>

          <div style={filterSectionTitleStyle}>Hoofdfilters</div>
          <div style={filterGridStyle}>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Zoek project, nummer, opdrachtgever, adres..."
              style={inputStyle}
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={inputStyle}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === "Alles" ? "Alle statussen" : option}
                </option>
              ))}
            </select>

            <select
              value={opdrachtgeverFilter}
              onChange={(e) => setOpdrachtgeverFilter(e.target.value)}
              style={inputStyle}
            >
              {opdrachtgeverOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "Alles" ? "Alle opdrachtgevers" : option}
                </option>
              ))}
            </select>

            <select
              value={executorFilter}
              onChange={(e) => setExecutorFilter(e.target.value)}
              style={inputStyle}
            >
              {executorOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "Alles" ? "Alle uitvoerders" : option}
                </option>
              ))}
            </select>

            <select
              value={demolitionTypeFilter}
              onChange={(e) => setDemolitionTypeFilter(e.target.value)}
              style={inputStyle}
            >
              {demolitionTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "Alles" ? "Alle slooptypes" : option}
                </option>
              ))}
            </select>

            <select
              value={buildingTypeFilter}
              onChange={(e) => setBuildingTypeFilter(e.target.value)}
              style={inputStyle}
            >
              {buildingTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "Alles" ? "Alle pandtypes" : option}
                </option>
              ))}
            </select>

            <select
              value={containerFilter}
              onChange={(e) => setContainerFilter(e.target.value)}
              style={inputStyle}
            >
              {YES_NO_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === "Alles" ? "Containers: alles" : `Containers: ${option}`}
                </option>
              ))}
            </select>

            <select
              value={photoFilter}
              onChange={(e) => setPhotoFilter(e.target.value)}
              style={inputStyle}
            >
              {YES_NO_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === "Alles" ? "Foto's: alles" : `Foto's: ${option}`}
                </option>
              ))}
            </select>

            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={inputStyle}>
              <option value="openTasksDesc">Sorteer: meeste open taken</option>
              <option value="openTasksAsc">Sorteer: minste open taken</option>
              <option value="progressDesc">Sorteer: hoogste voortgang</option>
              <option value="progressAsc">Sorteer: laagste voortgang</option>
              <option value="areaDesc">Sorteer: grootste m²</option>
              <option value="areaAsc">Sorteer: kleinste m²</option>
              <option value="containersDesc">Sorteer: meeste containers</option>
              <option value="photosDesc">Sorteer: meeste foto's</option>
              <option value="startDateAsc">Sorteer: oudste startdatum</option>
              <option value="startDateDesc">Sorteer: nieuwste startdatum</option>
              <option value="nameAsc">Sorteer: naam A-Z</option>
              <option value="nameDesc">Sorteer: naam Z-A</option>
            </select>
          </div>

          <div style={filterSectionTitleStyle}>Bereiken</div>
          <div style={rangeGridStyle}>
            <input value={minArea} onChange={(e) => setMinArea(e.target.value)} placeholder="Min m²" inputMode="numeric" style={inputStyle} />
            <input value={maxArea} onChange={(e) => setMaxArea(e.target.value)} placeholder="Max m²" inputMode="numeric" style={inputStyle} />
            <input value={minOpenTasks} onChange={(e) => setMinOpenTasks(e.target.value)} placeholder="Min open taken" inputMode="numeric" style={inputStyle} />
            <input value={maxOpenTasks} onChange={(e) => setMaxOpenTasks(e.target.value)} placeholder="Max open taken" inputMode="numeric" style={inputStyle} />
            <input value={minProgress} onChange={(e) => setMinProgress(e.target.value)} placeholder="Min voortgang %" inputMode="numeric" style={inputStyle} />
            <input value={maxProgress} onChange={(e) => setMaxProgress(e.target.value)} placeholder="Max voortgang %" inputMode="numeric" style={inputStyle} />
          </div>
        </section>

        <section style={summaryGridStyle}>
          <SummaryCard label="Projecten" value={metrics.projects} accent="#ef6b1f" />
          <SummaryCard label="Open taken" value={metrics.openTasks} accent="#c39aca" />
          <SummaryCard label="Containers" value={metrics.containers} accent="#7ea89d" />
          <SummaryCard label="Foto's" value={metrics.photos} accent="#94b6ea" />
          <SummaryCard label="m² totaal" value={metrics.totalArea} accent="#e39d6b" />
          <SummaryCard label="Gem. voortgang" value={`${metrics.avgProgress}%`} accent="#8d6ccf" />
        </section>

        {selectedProjectIds.length > 0 ? (
  <div style={bulkDeleteBarStyle}>
    <span>{selectedProjectIds.length} project(en) geselecteerd</span>
    <button
      type="button"
      onClick={handleDeleteSelectedProjects}
      disabled={deletingProjects}
      style={bulkDeleteButtonStyle}
    >
      {deletingProjects ? "Verwijderen..." : "Geselecteerde projecten verwijderen"}
    </button>
  </div>
) : null}


        <section style={projectGridStyle}>
          {filteredProjects.length === 0 ? (
            <div style={emptyStateStyle}>Geen projecten gevonden.</div>
          ) : (
            filteredProjects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`} style={projectCardLinkStyle}>
                <article style={{ ...projectCardStyle, position: "relative" }}>
  <input
    type="checkbox"
    checked={selectedProjectIds.includes(project.id)}
    onClick={(e) => e.stopPropagation()}
    onChange={(e) => {
      e.stopPropagation();

      setSelectedProjectIds((current) =>
        current.includes(project.id)
          ? current.filter((id) => id !== project.id)
          : [...current, project.id]
      );
    }}
    style={projectSelectCheckboxStyle}
  />

                  <div style={projectCardHeaderStyle}>
                    <div>
                      <h2 style={projectTitleStyle}>{project.name}</h2>
                      <div style={projectNumberStyle}>{project.projectNumber}</div>
                    </div>

                    <StatusBadge label={project.status} />
                  </div>

                  <div style={projectMetaLineStyle}>
                    {project.demolitionType} · {project.buildingType}
                  </div>

                  <div style={metaGridStyle}>
                    <InfoBox label="Opdrachtgever" value={project.opdrachtgever} />
                    <InfoBox label="Adres" value={project.address} />
                    <InfoBox
                      label="Uitvoerder(s)"
                      value={project.executors.length > 0 ? project.executors.join(", ") : "Geen"}
                    />
                    <InfoBox label="Planning" value={`${formatDate(project.startDate)} – ${formatDate(project.endDate)}`} />
                  </div>

                  <div style={statGridStyle}>
                    <MiniStat label="m²" value={project.areaM2} />
                    <MiniStat label="Dagen" value={project.workDays} />
                    <MiniStat label="Open" value={project.openTasks} />
                    <MiniStat label="Cont." value={project.containerCount} />
                    <MiniStat label="Foto's" value={project.photoCount} />
                  </div>

                  <div style={progressBlockStyle}>
                    <div style={progressTopStyle}>
                      <span>Voortgang</span>
                      <strong>{project.progress}%</strong>
                    </div>

                    <div style={progressTrackStyle}>
                      <div style={{ ...progressFillStyle, width: `${project.progress}%` }} />
                    </div>
                  </div>

                  <div style={openProjectStyle}>Open project →</div>
                </article>
              </Link>
            ))
          )}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div style={{ ...summaryCardStyle, borderTop: `5px solid ${accent}` }}>
      <div style={summaryLabelStyle}>{label}</div>
      <div style={summaryValueStyle}>{value}</div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={infoBoxStyle}>
      <div style={infoLabelStyle}>{label}</div>
      <div style={infoValueStyle}>{value || "-"}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={miniStatStyle}>
      <div style={miniStatLabelStyle}>{label}</div>
      <div style={miniStatValueStyle}>{value}</div>
    </div>
  );
}

function StatusBadge({ label }: { label: string }) {
  const value = label.toLowerCase();

  if (value === "afgerond") {
    return <span style={{ ...statusBadgeStyle, background: "#eaf6ec", color: "#2f7b4d" }}>{label}</span>;
  }

  if (value === "bezig") {
    return <span style={{ ...statusBadgeStyle, background: "#fff4e8", color: "#b95f18" }}>{label}</span>;
  }

  if (value === "gepland") {
    return <span style={{ ...statusBadgeStyle, background: "#eef5ff", color: "#5d83c7" }}>{label}</span>;
  }

  return <span style={{ ...statusBadgeStyle, background: "#f1ece7", color: "#7b746c" }}>{label}</span>;
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "nl")
  );
}

function safeTime(value?: string | null) {
  if (!value) return 0;
  const date = new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background: "#f6f2ed",
  padding: 24,
  fontFamily: "Arial, sans-serif",
};

const pageInnerStyle: CSSProperties = {
  maxWidth: 1440,
  margin: "0 auto",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 18,
  alignItems: "flex-start",
  flexWrap: "wrap",
  marginBottom: 22,
};

const backLinkStyle: CSSProperties = {
  display: "inline-flex",
  marginBottom: 12,
  color: "#ef6b1f",
  textDecoration: "none",
  fontWeight: 900,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 46,
  lineHeight: 1,
  color: "#171717",
};

const subtitleStyle: CSSProperties = {
  margin: "10px 0 0 0",
  color: "#6b675f",
  fontSize: 16,
  lineHeight: 1.5,
};

const newProjectButtonStyle: CSSProperties = {
  background: "#ef6b1f",
  color: "#ffffff",
  textDecoration: "none",
  borderRadius: 18,
  padding: "16px 20px",
  fontWeight: 900,
  boxShadow: "0 12px 24px rgba(239,107,31,0.18)",
};

const filterPanelStyle: CSSProperties = {
  background: "#fffaf6",
  border: "1px solid #eadfd4",
  borderRadius: 30,
  padding: 22,
  boxShadow: "0 14px 28px rgba(23,23,23,0.045)",
  marginBottom: 20,
};

const filterHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 18,
};

const filterTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 26,
  color: "#171717",
};

const filterSubtitleStyle: CSSProperties = {
  margin: "8px 0 0 0",
  color: "#6b675f",
  fontSize: 14,
};

const resetButtonStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #d8d0c7",
  borderRadius: 16,
  padding: "12px 16px",
  fontWeight: 900,
  cursor: "pointer",
};

const filterSectionTitleStyle: CSSProperties = {
  margin: "16px 0 10px 0",
  fontSize: 12,
  color: "#6b675f",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: 0.4,
};

const filterGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: 12,
};

const rangeGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
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

const summaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 14,
  marginBottom: 22,
};

const summaryCardStyle: CSSProperties = {
  background: "#fffdfb",
  border: "1px solid #eadfd4",
  borderRadius: 22,
  padding: 18,
  boxShadow: "0 10px 20px rgba(0,0,0,0.035)",
};

const summaryLabelStyle: CSSProperties = {
  fontSize: 12,
  color: "#6b675f",
  fontWeight: 900,
};

const summaryValueStyle: CSSProperties = {
  marginTop: 10,
  fontSize: 34,
  lineHeight: 1,
  fontWeight: 900,
  color: "#171717",
};

const projectGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
  gap: 18,
};

const projectCardLinkStyle: CSSProperties = {
  textDecoration: "none",
  color: "inherit",
  display: "block",
};

const projectCardStyle: CSSProperties = {
  height: "100%",
  background: "#fffdfb",
  border: "1px solid #ebe2d8",
  borderRadius: 28,
  padding: 20,
  boxShadow: "0 14px 28px rgba(23,23,23,0.045)",
};

const projectCardHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  alignItems: "flex-start",
};

const projectTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 26,
  lineHeight: 1.1,
  color: "#171717",
};

const projectNumberStyle: CSSProperties = {
  marginTop: 7,
  fontSize: 13,
  fontWeight: 800,
  color: "#6b675f",
};

const projectMetaLineStyle: CSSProperties = {
  marginTop: 12,
  color: "#6b675f",
  fontSize: 14,
  fontWeight: 700,
};

const statusBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 900,
};

const metaGridStyle: CSSProperties = {
  marginTop: 16,
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
};

const infoBoxStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #eee3d8",
  borderRadius: 16,
  padding: 13,
};

const infoLabelStyle: CSSProperties = {
  fontSize: 11,
  color: "#7b746c",
  fontWeight: 900,
  textTransform: "uppercase",
};

const infoValueStyle: CSSProperties = {
  marginTop: 7,
  color: "#171717",
  fontWeight: 800,
  lineHeight: 1.4,
  fontSize: 14,
};

const statGridStyle: CSSProperties = {
  marginTop: 14,
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: 9,
};

const miniStatStyle: CSSProperties = {
  background: "#fbf8f4",
  border: "1px solid #eee3d8",
  borderRadius: 15,
  padding: 12,
};

const miniStatLabelStyle: CSSProperties = {
  fontSize: 10,
  color: "#7b746c",
  fontWeight: 900,
  textTransform: "uppercase",
};

const miniStatValueStyle: CSSProperties = {
  marginTop: 7,
  color: "#171717",
  fontWeight: 900,
  fontSize: 20,
};

const progressBlockStyle: CSSProperties = {
  marginTop: 16,
};

const progressTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  color: "#6b675f",
  fontWeight: 900,
  fontSize: 13,
};

const progressTrackStyle: CSSProperties = {
  marginTop: 10,
  height: 12,
  background: "#ece7e1",
  borderRadius: 999,
  overflow: "hidden",
};

const progressFillStyle: CSSProperties = {
  height: "100%",
  background: "#ef6b1f",
  borderRadius: 999,
};

const openProjectStyle: CSSProperties = {
  marginTop: 16,
  paddingTop: 14,
  borderTop: "1px solid #efe6dd",
  color: "#ef6b1f",
  fontWeight: 900,
  textAlign: "right",
};

const emptyStateStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  padding: 18,
  border: "1px solid #eadfd4",
  color: "#6b675f",
};

const bulkDeleteButtonStyle: CSSProperties = {
  background: "#fffaf6",
  color: "#8a4438",
  border: "1px solid #ead0c8",
  borderRadius: 14,
  padding: "12px 16px",
  fontSize: 14,
  fontWeight: 900,
  cursor: "pointer",
};

const projectSelectCheckboxStyle: CSSProperties = {
  width: 18,
  height: 18,
  accentColor: "#ef6b1f",
  cursor: "pointer",
};


const bulkDeleteBarStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 18,
  padding: "14px 18px",
  borderRadius: 18,
  background: "#fff7f2",
  border: "1px solid #f0d3c3",
  color: "#171717",
  fontWeight: 800,
};
