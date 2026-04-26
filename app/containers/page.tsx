"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import { createContainer, deleteContainer, updateContainer } from "@/lib/containers";
import {
  formatDate,
  getContainerStatus,
  loadProjectBundlesForCurrentUser,
  type ProjectBundle,
} from "@/lib/overview";
import { Project } from "@/types/project";

type ContainerRow = {
  id: string;
  projectId: string;
  projectName: string;
  projectNumber: string;
  wasteType: string;
  containerSize: string;
  plannedQuantity: number;
  actualQuantity: number;
  plannedDeliveryDate: string;
  actualDeliveryDate: string;
  plannedPickupDate: string;
  actualPickupDate: string;
  changeReason: string;
  notes: string;
  statusLabel: string;
  statusColor: string;
};

type FormState = {
  project_id: string;
  waste_type: string;
  container_size: string;
  planned_delivery_date: string;
  planned_pickup_date: string;
  notes: string;
};

type PopupItem = {
  id: string;
  projectName: string;
  wasteType: string;
  containerSize: string;
  start: string;
  end: string;
};

type PopupState = {
  title: string;
  items: PopupItem[];
} | null;

type PlannerDay = {
  key: string;
  shortDay: string;
  shortDate: string;
  items: PopupItem[];
  deliveryCount: number;
  pickupCount: number;
  hasActivity: boolean;
  isToday: boolean;
};

const initialForm: FormState = {
  project_id: "",
  waste_type: "Bouw- en sloop",
  container_size: "10 m³",
  planned_delivery_date: "",
  planned_pickup_date: "",
  notes: "",
};

function getHashContainerId() {
  if (typeof window === "undefined") return "";
  return window.location.hash.replace("#container-", "").trim();
}

export default function ContainersOverviewPage() {
  const searchParams = useSearchParams();
  const linkedProjectId = searchParams.get("projectId") || "";

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [rows, setRows] = useState<ContainerRow[]>([]);

  const [form, setForm] = useState<FormState>(initialForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<FormState | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Alles");
  const [projectFilter, setProjectFilter] = useState("Alles");
  const [sortBy, setSortBy] = useState("smart");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [popupState, setPopupState] = useState<PopupState>(null);
  const [highlightedContainerId, setHighlightedContainerId] = useState("");

  async function loadPage() {
    const overview = await loadProjectBundlesForCurrentUser();

    if (!overview) {
      window.location.href = "/login";
      return;
    }

    setProjects(overview.projects);

    const mappedRows = overview.bundles.flatMap((bundle: ProjectBundle) =>
      bundle.containers.map((container) => {
        const status = getContainerStatus(container);

        return {
          id: container.id,
          projectId: bundle.project.id,
          projectName: bundle.project.name || "Onbekend project",
          projectNumber: bundle.project.project_number || "-",
          wasteType: container.waste_type || "-",
          containerSize: container.container_size || "-",
          plannedQuantity: Number(container.planned_quantity || 0),
          actualQuantity: Number(container.actual_quantity || 0),
          plannedDeliveryDate: container.planned_delivery_date || "",
          actualDeliveryDate: container.actual_delivery_date || "",
          plannedPickupDate: container.planned_pickup_date || "",
          actualPickupDate: container.actual_pickup_date || "",
          changeReason: container.change_reason || "",
          notes: container.notes || "",
          statusLabel: status.label,
          statusColor: status.color,
        };
      })
    );

    setRows(mappedRows);

    const firstProjectId = overview.projects[0]?.id || "";

    setForm((prev) => ({
      ...prev,
      project_id: prev.project_id || linkedProjectId || firstProjectId,
    }));
  }

  useEffect(() => {
    async function init() {
      try {
        await loadPage();
      } catch (error) {
        console.error(error);
        window.location.href = "/login";
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  useEffect(() => {
    if (linkedProjectId) {
      setProjectFilter(linkedProjectId);
    }
  }, [linkedProjectId]);

  useEffect(() => {
    if (loading || rows.length === 0) return;

    const targetId = getHashContainerId();
    if (!targetId) return;

    const targetRow = rows.find((row) => row.id === targetId);
    if (!targetRow) return;

    setProjectFilter(targetRow.projectId);
    setStatusFilter("Alles");
    setHighlightedContainerId(targetId);

    const scrollTimer = window.setTimeout(() => {
      const element = document.getElementById(`container-${targetId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 120);

    const clearTimer = window.setTimeout(() => {
      setHighlightedContainerId("");
    }, 2600);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [loading, rows]);

  const selectedProject = useMemo(() => {
    return projects.find((project) => project.id === projectFilter) || null;
  }, [projects, projectFilter]);

  const normalizedRows = useMemo(() => {
    return rows.map((row) => ({
      ...row,
      effectiveStart: row.actualDeliveryDate || row.plannedDeliveryDate || "",
      effectiveEnd: row.actualPickupDate || row.plannedPickupDate || "",
      completedAt:
        row.actualPickupDate ||
        row.plannedPickupDate ||
        row.actualDeliveryDate ||
        row.plannedDeliveryDate ||
        "",
    }));
  }, [rows]);

  const stats = useMemo(() => {
    return {
      total: normalizedRows.length,
      planned: normalizedRows.filter((row) => row.statusLabel === "Gepland").length,
      active: normalizedRows.filter((row) => row.statusLabel === "Lopend").length,
      completed: normalizedRows.filter((row) => row.statusLabel === "Afgerond").length,
    };
  }, [normalizedRows]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const result = normalizedRows.filter((row) => {
      const matchesSearch =
        !query ||
        row.projectName.toLowerCase().includes(query) ||
        row.projectNumber.toLowerCase().includes(query) ||
        row.wasteType.toLowerCase().includes(query) ||
        row.containerSize.toLowerCase().includes(query) ||
        row.notes.toLowerCase().includes(query);

      const matchesStatus = statusFilter === "Alles" || row.statusLabel === statusFilter;
      const matchesProject = projectFilter === "Alles" || row.projectId === projectFilter;

      return matchesSearch && matchesStatus && matchesProject;
    });

    result.sort((a, b) => {
      const aCompleted = a.statusLabel === "Afgerond";
      const bCompleted = b.statusLabel === "Afgerond";

      if (aCompleted !== bCompleted) {
        return aCompleted ? 1 : -1;
      }

      if (aCompleted && bCompleted) {
        return safeTime(b.completedAt) - safeTime(a.completedAt);
      }

      switch (sortBy) {
        case "projectAsc":
          return a.projectName.localeCompare(b.projectName, "nl");
        case "projectDesc":
          return b.projectName.localeCompare(a.projectName, "nl");
        case "deliveryDesc":
          return safeTime(b.effectiveStart) - safeTime(a.effectiveStart);
        case "pickupAsc":
          return safeTime(a.effectiveEnd) - safeTime(b.effectiveEnd);
        case "pickupDesc":
          return safeTime(b.effectiveEnd) - safeTime(a.effectiveEnd);
        case "smart":
        case "deliveryAsc":
        default:
          return safeTime(a.effectiveStart) - safeTime(b.effectiveStart);
      }
    });

    return result;
  }, [normalizedRows, searchTerm, statusFilter, projectFilter, sortBy]);

  const summaryPopupData = useMemo(() => {
    return {
      total: toPopupItems(normalizedRows),
      planned: toPopupItems(normalizedRows.filter((row) => row.statusLabel === "Gepland")),
      active: toPopupItems(normalizedRows.filter((row) => row.statusLabel === "Lopend")),
      completed: toPopupItems(normalizedRows.filter((row) => row.statusLabel === "Afgerond")),
    };
  }, [normalizedRows]);

  const plannerDays = useMemo<PlannerDay[]>(() => {
    const dates = buildWorkDays(new Date(), 20);
    const todayKey = getDateKey(new Date());

    return dates.map((date) => {
      const key = getDateKey(date);

      const items = normalizedRows
        .filter((row) => {
          const deliveryKey = getDateKey(row.actualDeliveryDate || row.plannedDeliveryDate);
          const pickupKey = getDateKey(row.actualPickupDate || row.plannedPickupDate);
          return deliveryKey === key || pickupKey === key;
        })
        .map((row) => ({
          id: row.id,
          projectName: row.projectName,
          wasteType: row.wasteType,
          containerSize: row.containerSize,
          start: formatDate(row.actualDeliveryDate || row.plannedDeliveryDate),
          end: formatDate(row.actualPickupDate || row.plannedPickupDate),
        }));

      const deliveryCount = normalizedRows.filter((row) => {
        const deliveryKey = getDateKey(row.actualDeliveryDate || row.plannedDeliveryDate);
        return deliveryKey === key;
      }).length;

      const pickupCount = normalizedRows.filter((row) => {
        const pickupKey = getDateKey(row.actualPickupDate || row.plannedPickupDate);
        return pickupKey === key;
      }).length;

      return {
        key,
        shortDay: new Intl.DateTimeFormat("nl-NL", { weekday: "short" })
          .format(date)
          .replace(".", "")
          .toUpperCase(),
        shortDate: new Intl.DateTimeFormat("nl-NL", {
          day: "2-digit",
          month: "short",
        }).format(date),
        items,
        deliveryCount,
        pickupCount,
        hasActivity: items.length > 0,
        isToday: key === todayKey,
      };
    });
  }, [normalizedRows]);

  const upcomingDeliveries = useMemo(() => {
    const today = getDateKey(new Date());

    return normalizedRows
      .filter((row) => {
        const dateKey = getDateKey(row.actualDeliveryDate || row.plannedDeliveryDate);
        return dateKey >= today && row.statusLabel !== "Afgerond";
      })
      .sort(
        (a, b) =>
          safeTime(a.actualDeliveryDate || a.plannedDeliveryDate) -
          safeTime(b.actualDeliveryDate || b.plannedDeliveryDate)
      )
      .slice(0, 6);
  }, [normalizedRows]);

  const upcomingPickups = useMemo(() => {
    const today = getDateKey(new Date());

    return normalizedRows
      .filter((row) => {
        const dateKey = getDateKey(row.actualPickupDate || row.plannedPickupDate);
        return dateKey >= today && row.statusLabel !== "Afgerond";
      })
      .sort(
        (a, b) =>
          safeTime(a.actualPickupDate || a.plannedPickupDate) -
          safeTime(b.actualPickupDate || b.plannedPickupDate)
      )
      .slice(0, 6);
  }, [normalizedRows]);

  function startEdit(row: ContainerRow) {
    setEditingId(row.id);
    setEditingForm({
      project_id: row.projectId,
      waste_type: row.wasteType,
      container_size: row.containerSize,
      planned_delivery_date: row.plannedDeliveryDate,
      planned_pickup_date: row.plannedPickupDate,
      notes: row.notes,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingForm(null);
  }

  async function handleInlineEditSave() {
    if (!editingId || !editingForm) return;

    try {
      setSavingEdit(true);
      setMessage("");

      await updateContainer(editingId, {
        waste_type: editingForm.waste_type,
        container_size: editingForm.container_size,
        planned_quantity: 1,
        actual_quantity: 1,
        planned_delivery_date: editingForm.planned_delivery_date || null,
        actual_delivery_date: null,
        planned_pickup_date: editingForm.planned_pickup_date || null,
        actual_pickup_date: null,
        change_reason: "",
        notes: editingForm.notes,
      });

      setEditingId(null);
      setEditingForm(null);
      setMessage("Container bijgewerkt.");
      await loadPage();
    } catch (error) {
      console.error(error);
      setMessage("Bijwerken container mislukt.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(containerId: string) {
    const confirmed = window.confirm("Weet je zeker dat je deze container wilt verwijderen?");
    if (!confirmed) return;

    try {
      setDeletingId(containerId);
      setMessage("");

      await deleteContainer(containerId);

      if (editingId === containerId) {
        setEditingId(null);
        setEditingForm(null);
      }

      setMessage("Container verwijderd.");
      await loadPage();
    } catch (error) {
      console.error(error);
      setMessage("Verwijderen container mislukt.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!form.project_id) {
      setMessage("Kies eerst een project.");
      return;
    }

    try {
      setSaving(true);

      await createContainer({
        project_id: form.project_id,
        waste_type: form.waste_type,
        container_size: form.container_size,
        planned_quantity: 1,
        actual_quantity: 1,
        planned_delivery_date: form.planned_delivery_date || null,
        actual_delivery_date: null,
        planned_pickup_date: form.planned_pickup_date || null,
        actual_pickup_date: null,
        change_reason: "",
        notes: form.notes,
      });

      setForm((prev) => ({
        ...initialForm,
        project_id: prev.project_id,
      }));

      setShowCreateForm(false);
      setMessage("Container toegevoegd.");
      await loadPage();
    } catch (error) {
      console.error(error);
      setMessage("Opslaan container mislukt.");
    } finally {
      setSaving(false);
    }
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
        <div style={pageHeaderStyle}>
          <div>
            <h1 style={pageTitleStyle}>Containers</h1>
            <p style={pageSubtitleStyle}>Plan, filter en beheer alle containers per project.</p>
          </div>

          <div style={topNavStyle}>
            <Link href="/" style={breadcrumbLinkStyle}>
              ← Dashboard
            </Link>
            <Link href="/projecten" style={breadcrumbSecondaryStyle}>
              Naar projecten
            </Link>
          </div>
        </div>

        {message ? <div style={messageBannerStyle}>{message}</div> : null}

        <section style={{ ...sectionShellStyle, background: sectionBgPlanner }}>
          <div style={sectionHeaderStyle}>
            <h2 style={sectionTitleStyle}>Werkdagenplanner</h2>
          </div>

          <div style={plannerScrollWrapStyle}>
            <div style={plannerGridStyle}>
              {plannerDays.map((day) => (
                <div
                  key={day.key}
                  style={{
                    ...plannerDayCardStyle,
                    background: day.hasActivity ? "#edf7ee" : "#ffffff",
                    border: day.hasActivity ? "1px solid #cfe3d1" : "1px solid #e6ddd4",
                  }}
                >
                  <div style={plannerTopRowStyle}>
                    <div style={plannerTopLeftStyle}>
                      <span style={plannerDayStyle}>{day.shortDay}</span>
                      <span style={plannerDateStyle}>{day.shortDate}</span>
                    </div>

                    {day.isToday ? <span style={todayBadgeStyle}>Vandaag</span> : null}
                  </div>

                  <div style={plannerCountsWrapStyle}>
                    <button
                      type="button"
                      onClick={() =>
                        day.items.length > 0
                          ? setPopupState({
                              title: `Containers ${day.shortDay} ${day.shortDate}`,
                              items: day.items,
                            })
                          : undefined
                      }
                      style={{
                        ...plannerCountButtonStyle,
                        cursor: day.items.length > 0 ? "pointer" : "default",
                      }}
                    >
                      <span style={plannerCountLabelStyle}>Activiteit</span>

                      {day.hasActivity ? (
                        <div style={plannerActivityListStyle}>
                          <div style={plannerActivityRowStyle}>
                            <span>Levering</span>
                            <strong>{day.deliveryCount}</strong>
                          </div>
                          <div style={plannerActivityRowStyle}>
                            <span>Ophalen</span>
                            <strong>{day.pickupCount}</strong>
                          </div>
                        </div>
                      ) : (
                        <span style={plannerCountValueStyle}>0</span>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ ...sectionShellStyle, background: sectionBgSummary }}>
          <div style={sectionHeaderStyle}>
            <h2 style={sectionTitleStyle}>Overzicht</h2>
          </div>

          <div style={summaryGridStyle}>
            <SummaryCard
              label="Totaal"
              value={stats.total}
              color="#ef6b1f"
              onClick={() =>
                setPopupState({
                  title: "Alle containers",
                  items: summaryPopupData.total,
                })
              }
            />
            <SummaryCard
              label="Gepland"
              value={stats.planned}
              color="#b7bcc7"
              onClick={() =>
                setPopupState({
                  title: "Geplande containers",
                  items: summaryPopupData.planned,
                })
              }
            />
            <SummaryCard
              label="Lopend"
              value={stats.active}
              color="#7ea3e6"
              onClick={() =>
                setPopupState({
                  title: "Lopende containers",
                  items: summaryPopupData.active,
                })
              }
            />
            <SummaryCard
              label="Afgerond"
              value={stats.completed}
              color="#5ca67a"
              onClick={() =>
                setPopupState({
                  title: "Afgeronde containers",
                  items: summaryPopupData.completed,
                })
              }
            />
          </div>
        </section>

        <section style={{ ...sectionShellStyle, background: sectionBgFilters }}>
          <div style={sectionHeaderStyle}>
            <h2 style={sectionTitleStyle}>Filteren en zoeken</h2>

            <button
              type="button"
              onClick={() => setShowCreateForm((current) => !current)}
              style={primarySmallButtonStyle}
            >
              {showCreateForm ? "Sluiten" : "Nieuwe container toevoegen"}
            </button>
          </div>

          <div style={filterGridStyle}>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Zoek op project, nummer, soort, maat of notitie"
              style={inputStyle}
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={inputStyle}
            >
              <option value="Alles">Alle statussen</option>
              <option value="Gepland">Gepland</option>
              <option value="Lopend">Lopend</option>
              <option value="Afgerond">Afgerond</option>
            </select>

            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              style={inputStyle}
            >
              <option value="Alles">Alle projecten</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={inputStyle}>
              <option value="smart">Slimme volgorde</option>
              <option value="deliveryAsc">Levering oud → nieuw</option>
              <option value="deliveryDesc">Levering nieuw → oud</option>
              <option value="pickupAsc">Ophalen oud → nieuw</option>
              <option value="pickupDesc">Ophalen nieuw → oud</option>
              <option value="projectAsc">Project A-Z</option>
              <option value="projectDesc">Project Z-A</option>
            </select>
          </div>

          {linkedProjectId && selectedProject ? (
            <div style={linkedProjectBannerStyle}>
              <span style={linkedProjectTextStyle}>
                Gefilterd op project: <strong>{selectedProject.name}</strong>
              </span>

              <button
                type="button"
                onClick={() => setProjectFilter("Alles")}
                style={clearFilterButtonStyle}
              >
                Filter wissen
              </button>
            </div>
          ) : null}

          {showCreateForm ? (
            <div style={createWrapStyle}>
              <form onSubmit={handleSubmit} style={formGridStyle}>
                <select
                  value={form.project_id}
                  onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">Kies project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name} · {project.project_number}
                    </option>
                  ))}
                </select>

                <div style={twoColStyle}>
                  <select
                    value={form.waste_type}
                    onChange={(e) => setForm({ ...form, waste_type: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="Bouw- en sloop">Bouw- en sloop</option>
                    <option value="B-hout">B-hout</option>
                    <option value="Puin">Puin</option>
                    <option value="Gemengd">Gemengd</option>
                    <option value="Grofvuil">Grofvuil</option>
                    <option value="IJzer">IJzer</option>
                    <option value="Glas">Glas</option>
                    <option value="Karton">Karton</option>
                  </select>

                  <select
                    value={form.container_size}
                    onChange={(e) => setForm({ ...form, container_size: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="3 m³">3 m³</option>
                    <option value="6 m³">6 m³</option>
                    <option value="10 m³">10 m³</option>
                    <option value="20 m³">20 m³</option>
                    <option value="40 m³">40 m³</option>
                  </select>
                </div>

                <div style={twoColStyle}>
                  <input
                    type="date"
                    value={form.planned_delivery_date}
                    onChange={(e) => setForm({ ...form, planned_delivery_date: e.target.value })}
                    style={inputStyle}
                  />

                  <input
                    type="date"
                    value={form.planned_pickup_date}
                    onChange={(e) => setForm({ ...form, planned_pickup_date: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <textarea
                  placeholder="Notitie"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  style={textareaStyle}
                />

                <button type="submit" disabled={saving} style={buttonStyle}>
                  {saving ? "Opslaan..." : "Container toevoegen"}
                </button>
              </form>
            </div>
          ) : null}
        </section>

        <section style={{ ...sectionShellStyle, background: sectionBgUpcoming }}>
          <div style={sectionHeaderStyle}>
            <h2 style={sectionTitleStyle}>Komende leveringen</h2>
          </div>

          <div style={upcomingListStyle}>
            {upcomingDeliveries.length === 0 ? (
              <div style={emptyStateStyle}>Geen komende leveringen.</div>
            ) : (
              upcomingDeliveries.map((row) => (
                <CompactRow
                  key={`delivery-${row.id}`}
                  title={`${row.projectName} · ${row.wasteType} · ${row.containerSize}`}
                  meta={`Start: ${formatDate(
                    row.actualDeliveryDate || row.plannedDeliveryDate
                  )} · Einde: ${formatDate(row.actualPickupDate || row.plannedPickupDate)}`}
                />
              ))
            )}
          </div>
        </section>

        <section style={{ ...sectionShellStyle, background: sectionBgPickup }}>
          <div style={sectionHeaderStyle}>
            <h2 style={sectionTitleStyle}>Komende ophalingen</h2>
          </div>

          <div style={upcomingListStyle}>
            {upcomingPickups.length === 0 ? (
              <div style={emptyStateStyle}>Geen komende ophalingen.</div>
            ) : (
              upcomingPickups.map((row) => (
                <CompactRow
                  key={`pickup-${row.id}`}
                  title={`${row.projectName} · ${row.wasteType} · ${row.containerSize}`}
                  meta={`Start: ${formatDate(
                    row.actualDeliveryDate || row.plannedDeliveryDate
                  )} · Einde: ${formatDate(row.actualPickupDate || row.plannedPickupDate)}`}
                />
              ))
            )}
          </div>
        </section>

        <section style={{ ...sectionShellStyle, background: sectionBgList }}>
          <div style={sectionHeaderStyle}>
            <h2 style={sectionTitleStyle}>Containerlijst</h2>
          </div>

          <div style={rowsWrapStyle}>
            {filteredRows.length === 0 ? (
              <div style={emptyStateStyle}>Geen containers gevonden voor deze filters.</div>
            ) : (
              filteredRows.map((row) => (
                <div
                  key={row.id}
                  id={`container-${row.id}`}
                  style={{
                    ...rowCardStyle,
                    border:
                      highlightedContainerId === row.id
                        ? "2px solid #ef6b1f"
                        : rowCardStyle.border,
                    boxShadow:
                      highlightedContainerId === row.id
                        ? "0 0 0 4px rgba(239,107,31,0.14), 0 12px 26px rgba(0,0,0,0.06)"
                        : rowCardStyle.boxShadow,
                    background: highlightedContainerId === row.id ? "#fff8f2" : "#ffffff",
                  }}
                >
                  {editingId === row.id && editingForm ? (
                    <div style={editWrapStyle}>
                      <div style={editTopStyle}>
                        <div>
                          <div style={rowProjectTitleStyle}>{row.projectName}</div>
                          <div style={rowProjectNumberStyle}>{row.projectNumber}</div>
                        </div>

                        <span style={editingBadgeStyle}>Bewerken</span>
                      </div>

                      <div style={twoColStyle}>
                        <select
                          value={editingForm.waste_type}
                          onChange={(e) =>
                            setEditingForm({ ...editingForm, waste_type: e.target.value })
                          }
                          style={inputStyle}
                        >
                          <option value="Bouw- en sloop">Bouw- en sloop</option>
                          <option value="B-hout">B-hout</option>
                          <option value="Puin">Puin</option>
                          <option value="Gemengd">Gemengd</option>
                          <option value="Grofvuil">Grofvuil</option>
                          <option value="IJzer">IJzer</option>
                          <option value="Glas">Glas</option>
                          <option value="Karton">Karton</option>
                        </select>

                        <select
                          value={editingForm.container_size}
                          onChange={(e) =>
                            setEditingForm({
                              ...editingForm,
                              container_size: e.target.value,
                            })
                          }
                          style={inputStyle}
                        >
                          <option value="3 m³">3 m³</option>
                          <option value="6 m³">6 m³</option>
                          <option value="10 m³">10 m³</option>
                          <option value="20 m³">20 m³</option>
                          <option value="40 m³">40 m³</option>
                        </select>
                      </div>

                      <div style={twoColStyle}>
                        <input
                          type="date"
                          value={editingForm.planned_delivery_date}
                          onChange={(e) =>
                            setEditingForm({
                              ...editingForm,
                              planned_delivery_date: e.target.value,
                            })
                          }
                          style={inputStyle}
                        />
                        <input
                          type="date"
                          value={editingForm.planned_pickup_date}
                          onChange={(e) =>
                            setEditingForm({
                              ...editingForm,
                              planned_pickup_date: e.target.value,
                            })
                          }
                          style={inputStyle}
                        />
                      </div>

                      <textarea
                        value={editingForm.notes}
                        onChange={(e) => setEditingForm({ ...editingForm, notes: e.target.value })}
                        placeholder="Notitie"
                        style={textareaStyle}
                      />

                      <div style={editActionsStyle}>
                        <button
                          type="button"
                          onClick={handleInlineEditSave}
                          disabled={savingEdit}
                          style={buttonStyle}
                        >
                          {savingEdit ? "Opslaan..." : "Opslaan"}
                        </button>

                        <button type="button" onClick={cancelEdit} style={secondaryButtonStyle}>
                          Annuleren
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={rowTopStyle}>
                        <div>
                          <Link href={`/projects/${row.projectId}`} style={rowProjectLinkStyle}>
                            {row.projectName}
                          </Link>
                          <div style={rowProjectNumberStyle}>{row.projectNumber}</div>
                          <div style={rowContainerTitleStyle}>
                            {row.wasteType} · {row.containerSize}
                          </div>
                        </div>

                        <div style={rowActionsWrapStyle}>
                          <span
                            style={{
                              ...statusPillStyle,
                              background: row.statusColor,
                            }}
                          >
                            {row.statusLabel}
                          </span>

                          <button
                            type="button"
                            onClick={() => startEdit(row)}
                            style={secondarySmallButtonStyle}
                          >
                            Bewerken
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(row.id)}
                            disabled={deletingId === row.id}
                            style={dangerSmallButtonStyle}
                          >
                            {deletingId === row.id ? "Verwijderen..." : "Verwijderen"}
                          </button>
                        </div>
                      </div>

                      <div style={metaGridStyle}>
                        <MetaBlock
                          label="Levering"
                          value={formatDate(row.actualDeliveryDate || row.plannedDeliveryDate)}
                        />
                        <MetaBlock
                          label="Ophalen"
                          value={formatDate(row.actualPickupDate || row.plannedPickupDate)}
                        />
                        <MetaBlock label="Soort" value={row.wasteType} />
                        <MetaBlock label="Maat" value={row.containerSize} />
                      </div>

                      {row.notes ? (
                        <div style={notesWrapStyle}>
                          <div style={noteItemStyle}>
                            <strong>Notitie:</strong> {row.notes}
                          </div>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {popupState ? (
        <div style={modalBackdropStyle} onClick={() => setPopupState(null)}>
          <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <h3 style={modalTitleStyle}>{popupState.title}</h3>

              <button type="button" onClick={() => setPopupState(null)} style={modalCloseStyle}>
                ×
              </button>
            </div>

            <div style={modalListStyle}>
              {popupState.items.length === 0 ? (
                <div style={emptyStateStyle}>Geen containers gevonden.</div>
              ) : (
                popupState.items.map((item) => (
                  <a
                    key={item.id}
                    href={`#container-${item.id}`}
                    style={modalItemLinkStyle}
                    onClick={() => setPopupState(null)}
                  >
                    <div style={modalItemTitleStyle}>{item.projectName}</div>
                    <div style={modalItemMetaStyle}>
                      {item.wasteType} • {item.containerSize}
                    </div>
                    <div style={modalItemDateStyle}>
                      Start: {item.start} • Einde: {item.end}
                    </div>
                  </a>
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
  color,
  onClick,
}: {
  label: string;
  value: number;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ ...summaryCardButtonStyle, borderTop: `5px solid ${color}` }}
    >
      <div style={statLabelStyle}>{label}</div>
      <div style={statValueStyle}>{value}</div>
    </button>
  );
}

function MetaBlock({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div style={metaBlockStyle}>
      <div style={metaBlockLabelStyle}>{label}</div>
      <div style={metaBlockValueStyle}>{value || "-"}</div>
    </div>
  );
}

function CompactRow({
  title,
  meta,
}: {
  title: string;
  meta: string;
}) {
  return (
    <div style={compactRowStyle}>
      <div style={compactRowTitleStyle}>{title}</div>
      <div style={compactRowMetaStyle}>{meta}</div>
    </div>
  );
}

function toPopupItems(
  rows: Array<{
    id: string;
    projectName: string;
    wasteType: string;
    containerSize: string;
    actualDeliveryDate: string;
    plannedDeliveryDate: string;
    actualPickupDate: string;
    plannedPickupDate: string;
  }>
) {
  return rows.map((row) => ({
    id: row.id,
    projectName: row.projectName,
    wasteType: row.wasteType,
    containerSize: row.containerSize,
    start: formatDate(row.actualDeliveryDate || row.plannedDeliveryDate),
    end: formatDate(row.actualPickupDate || row.plannedPickupDate),
  }));
}

function buildWorkDays(base: Date, amount: number) {
  const result: Date[] = [];
  let cursor = new Date(base);

  while (!isWeekday(cursor)) {
    cursor = addDays(cursor, 1);
  }

  result.push(new Date(cursor));

  while (result.length < amount) {
    cursor = addDays(cursor, 1);
    if (isWeekday(cursor)) {
      result.push(new Date(cursor));
    }
  }

  return result;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function isWeekday(date: Date) {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

function getDateKey(value?: string | Date | null) {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function safeTime(value?: string | null) {
  if (!value) return 0;
  const date = new Date(value);
  const time = date.getTime();
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

const pageHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 18,
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

const topNavStyle: CSSProperties = {
  display: "flex",
  gap: 16,
  flexWrap: "wrap",
  alignItems: "center",
};

const breadcrumbLinkStyle: CSSProperties = {
  color: "#ef6b1f",
  textDecoration: "none",
  fontWeight: 800,
};

const breadcrumbSecondaryStyle: CSSProperties = {
  color: "#6b675f",
  textDecoration: "none",
  fontWeight: 700,
};

const messageBannerStyle: CSSProperties = {
  background: "#fff1e8",
  border: "1px solid #f6c6a4",
  color: "#8a4b1e",
  borderRadius: 16,
  padding: 14,
  marginBottom: 18,
};

const sectionShellStyle: CSSProperties = {
  borderRadius: 28,
  border: "1px solid #e8ddd2",
  padding: 18,
  marginBottom: 18,
};

const sectionHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 16,
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 22,
  color: "#171717",
};

const sectionBgPlanner = "#f4f8fc";
const sectionBgSummary = "#fff7f1";
const sectionBgFilters = "#f5f9ff";
const sectionBgUpcoming = "#f6fbf5";
const sectionBgPickup = "#faf7ff";
const sectionBgList = "#f9f6f2";

const plannerScrollWrapStyle: CSSProperties = {
  overflowX: "auto",
  paddingBottom: 4,
};

const plannerGridStyle: CSSProperties = {
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "180px",
  gap: 12,
  minWidth: "max-content",
};

const plannerDayCardStyle: CSSProperties = {
  borderRadius: 18,
  padding: 12,
  minHeight: 112,
};

const plannerTopRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
};

const plannerTopLeftStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
};

const plannerDayStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 900,
  color: "#5f5a54",
};

const plannerDateStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: "#171717",
};

const todayBadgeStyle: CSSProperties = {
  borderRadius: 999,
  background: "#ef6b1f",
  color: "#ffffff",
  padding: "4px 8px",
  fontSize: 11,
  fontWeight: 800,
};

const plannerCountsWrapStyle: CSSProperties = {
  marginTop: 12,
  display: "grid",
  gap: 8,
};

const plannerCountButtonStyle: CSSProperties = {
  background: "rgba(255,255,255,0.9)",
  border: "1px solid #e8ddd2",
  borderRadius: 14,
  padding: 14,
  textAlign: "left",
  minHeight: 116,
};

const plannerCountLabelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  color: "#6b675f",
  display: "block",
  textTransform: "uppercase",
};

const plannerCountValueStyle: CSSProperties = {
  marginTop: 4,
  fontSize: 18,
  fontWeight: 900,
  color: "#171717",
  display: "block",
};

const plannerActivityListStyle: CSSProperties = {
  marginTop: 8,
  display: "grid",
  gap: 8,
};

const plannerActivityRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  fontSize: 14,
  color: "#171717",
};

const summaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 14,
};

const summaryCardButtonStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  padding: 16,
  border: "1px solid #eadfd4",
  textAlign: "left",
  cursor: "pointer",
};

const statLabelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  color: "#6b675f",
  textTransform: "uppercase",
};

const statValueStyle: CSSProperties = {
  marginTop: 10,
  fontSize: 30,
  fontWeight: 900,
  color: "#171717",
  lineHeight: 1,
};

const filterGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.5fr 0.9fr 1fr 1fr",
  gap: 12,
};

const primarySmallButtonStyle: CSSProperties = {
  background: "#ef6b1f",
  color: "#ffffff",
  border: "none",
  borderRadius: 14,
  padding: "12px 16px",
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
};

const linkedProjectBannerStyle: CSSProperties = {
  marginTop: 14,
  background: "#ffffff",
  border: "1px solid #d9e6fb",
  borderRadius: 16,
  padding: 14,
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
};

const linkedProjectTextStyle: CSSProperties = {
  color: "#3c4b63",
  fontSize: 14,
};

const clearFilterButtonStyle: CSSProperties = {
  background: "#ffffff",
  color: "#171717",
  border: "1px solid #d8d0c7",
  borderRadius: 12,
  padding: "10px 12px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const createWrapStyle: CSSProperties = {
  marginTop: 16,
  background: "#ffffff",
  border: "1px solid #eadfd4",
  borderRadius: 20,
  padding: 16,
};

const formGridStyle: CSSProperties = {
  display: "grid",
  gap: 12,
};

const twoColStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: 16,
  borderRadius: 16,
  border: "1px solid #d8d0c7",
  background: "#ffffff",
  fontSize: 16,
  color: "#171717",
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: 110,
  resize: "vertical",
};

const buttonStyle: CSSProperties = {
  background: "#ef6b1f",
  color: "#fff",
  border: "none",
  borderRadius: 18,
  padding: 16,
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  background: "#ffffff",
  color: "#171717",
  border: "1px solid #d8d0c7",
  borderRadius: 16,
  padding: 16,
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
};

const upcomingListStyle: CSSProperties = {
  display: "grid",
  gap: 10,
};

const compactRowStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #eadfd4",
  borderRadius: 16,
  padding: 14,
};

const compactRowTitleStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: 800,
  color: "#171717",
};

const compactRowMetaStyle: CSSProperties = {
  marginTop: 6,
  fontSize: 13,
  color: "#6b675f",
};

const rowsWrapStyle: CSSProperties = {
  display: "grid",
  gap: 14,
};

const rowCardStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #ebe2d8",
  borderRadius: 24,
  padding: 20,
  boxShadow: "0 10px 24px rgba(0,0,0,0.04)",
  scrollMarginTop: 120,
};

const rowTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "flex-start",
};

const rowProjectLinkStyle: CSSProperties = {
  color: "#171717",
  textDecoration: "none",
  fontSize: 26,
  fontWeight: 900,
  lineHeight: 1.1,
};

const rowProjectTitleStyle: CSSProperties = {
  fontSize: 26,
  fontWeight: 900,
  color: "#171717",
  lineHeight: 1.1,
};

const rowProjectNumberStyle: CSSProperties = {
  marginTop: 6,
  color: "#6b675f",
  fontSize: 13,
  fontWeight: 700,
};

const rowContainerTitleStyle: CSSProperties = {
  marginTop: 10,
  color: "#171717",
  fontSize: 16,
  fontWeight: 800,
};

const rowActionsWrapStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const statusPillStyle: CSSProperties = {
  color: "#fff",
  borderRadius: 999,
  padding: "8px 14px",
  fontSize: 13,
  fontWeight: 700,
  height: "fit-content",
};

const secondarySmallButtonStyle: CSSProperties = {
  background: "#ffffff",
  color: "#171717",
  border: "1px solid #d8d0c7",
  borderRadius: 14,
  padding: "12px 14px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const dangerSmallButtonStyle: CSSProperties = {
  background: "#fff1f2",
  color: "#be123c",
  border: "1px solid #fecdd3",
  borderRadius: 14,
  padding: "12px 14px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const metaGridStyle: CSSProperties = {
  marginTop: 16,
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 10,
};

const metaBlockStyle: CSSProperties = {
  background: "#fbf8f4",
  border: "1px solid #eee3d8",
  borderRadius: 16,
  padding: 12,
};

const metaBlockLabelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  color: "#7b746c",
  textTransform: "uppercase",
};

const metaBlockValueStyle: CSSProperties = {
  marginTop: 7,
  fontSize: 15,
  color: "#171717",
  fontWeight: 700,
  lineHeight: 1.45,
};

const notesWrapStyle: CSSProperties = {
  marginTop: 16,
  display: "grid",
  gap: 8,
};

const noteItemStyle: CSSProperties = {
  color: "#5e5a54",
  fontSize: 14,
  lineHeight: 1.5,
};

const editWrapStyle: CSSProperties = {
  display: "grid",
  gap: 12,
};

const editTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
};

const editingBadgeStyle: CSSProperties = {
  background: "#fff4e8",
  color: "#b45309",
  borderRadius: 999,
  padding: "8px 14px",
  fontSize: 13,
  fontWeight: 700,
};

const editActionsStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
};

const emptyStateStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #ebe2d8",
  borderRadius: 24,
  padding: 20,
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
  maxWidth: 620,
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
  fontWeight: 800,
  color: "#171717",
};

const modalItemMetaStyle: CSSProperties = {
  marginTop: 4,
  fontSize: 13,
  color: "#6b675f",
};

const modalItemDateStyle: CSSProperties = {
  marginTop: 6,
  fontSize: 13,
  color: "#6b675f",
};