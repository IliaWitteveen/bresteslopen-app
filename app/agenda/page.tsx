"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import {
  formatDate,
  getProjectStatusColor,
  loadProjectBundlesForCurrentUser,
  type ProjectBundle,
} from "@/lib/overview";
import { createContainer, deleteContainer, updateContainer } from "@/lib/containers";
import { createTask } from "@/lib/tasks";
import { getExecutors } from "@/lib/executors";
import { supabase } from "@/lib/supabase";
import { Project } from "@/types/project";
import { ProjectTask } from "@/types/task";
import { ProjectContainer } from "@/types/container";
import { Executor } from "@/types/executor";

type CalendarProject = {
  type: "project";
  id: string;
  projectId: string;
  title: string;
  subtitle: string;
  color: string;
};

type CalendarContainer = {
  type: "container";
  id: string;
  projectId: string;
  title: string;
  subtitle: string;
  color: string;
  raw: ProjectContainer;
};

type CalendarPickup = {
  type: "pickup";
  id: string;
  projectId: string;
  title: string;
  subtitle: string;
  color: string;
  raw: ProjectTask;
  pickup: PickupPayload;
};

type CalendarItem = CalendarProject | CalendarContainer | CalendarPickup;

type DayData = {
  key: string;
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  items: CalendarItem[];
};

type PopupState =
  | { type: "day"; day: DayData }
  | { type: "add"; dateKey: string }
  | { type: "container"; item: CalendarContainer }
  | { type: "pickup"; item: CalendarPickup }
  | null;

type PickupPayload = {
  date: string;
  executorId: string;
  executorName: string;
  what: string;
  where: string;
  company: string;
  category: string;
  notes: string;
};

type PickupForm = {
  project_id: string;
  date: string;
  executor_id: string;
  what: string;
  where: string;
  company: string;
  category: string;
  notes: string;
};

type ContainerForm = {
  project_id: string;
  waste_type: string;
  container_size: string;
  planned_delivery_date: string;
  planned_pickup_date: string;
  notes: string;
};

const initialPickupForm: PickupForm = {
  project_id: "",
  date: "",
  executor_id: "",
  what: "",
  where: "",
  company: "",
  category: "Huur",
  notes: "",
};

const initialContainerForm: ContainerForm = {
  project_id: "",
  waste_type: "Bouw- en sloop",
  container_size: "10 m³",
  planned_delivery_date: "",
  planned_pickup_date: "",
  notes: "",
};

export default function AgendaPage() {
  const [loading, setLoading] = useState(true);
  const [bundles, setBundles] = useState<ProjectBundle[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [executors, setExecutors] = useState<Executor[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [popup, setPopup] = useState<PopupState>(null);
  const [message, setMessage] = useState("");

  const [pickupForm, setPickupForm] = useState<PickupForm>(initialPickupForm);
  const [containerForm, setContainerForm] = useState<ContainerForm>(initialContainerForm);
  const [saving, setSaving] = useState(false);

  async function loadPage() {
    const overview = await loadProjectBundlesForCurrentUser();

    if (!overview) {
      window.location.href = "/login";
      return;
    }

    const executorData = await getExecutors().catch(() => []);

    setBundles(overview.bundles);
    setProjects(overview.projects);
    setExecutors(executorData);
  }

  useEffect(() => {
    async function init() {
      try {
        await loadPage();
      } catch (error) {
        console.error(error);
        setMessage("Agenda laden mislukt.");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  const flatContainers = useMemo(() => {
    return bundles.flatMap((bundle) =>
      bundle.containers.map((container) => ({
        project: bundle.project,
        container,
      }))
    );
  }, [bundles]);

  const flatTasks = useMemo(() => {
    return bundles.flatMap((bundle) =>
      bundle.tasks.map((task) => ({
        project: bundle.project,
        task,
      }))
    );
  }, [bundles]);

  const pickupTasks = useMemo(() => {
    return flatTasks
      .filter(({ task }) => task.task_type === "Ophaalactie")
      .map(({ project, task }) => ({
        project,
        task,
        pickup: parsePickupPayload(task.notes),
      }))
      .filter((item) => item.pickup.date);
  }, [flatTasks]);

  const days = useMemo<DayData[]>(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const first = new Date(year, month, 1);
    const startWeekday = (first.getDay() + 6) % 7;
    const gridStart = new Date(year, month, 1 - startWeekday);
    const todayKey = getDateKey(new Date());

    return Array.from({ length: 42 }).map((_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      const key = getDateKey(date);

      const projectItems: CalendarProject[] = projects
        .filter((project) => isProjectOnDate(project, key))
        .map((project) => ({
          type: "project",
          id: `project-${project.id}`,
          projectId: project.id,
          title: project.name,
          subtitle: `${formatDate(project.start_date)} - ${formatDate(project.end_date)}`,
          color: getProjectStatusColor(project.status),
        }));

      const containerItems: CalendarContainer[] = flatContainers
        .filter(({ container }) => {
          const deliveryKey = getDateKey(
            container.actual_delivery_date || container.planned_delivery_date
          );
          const pickupKey = getDateKey(
            container.actual_pickup_date || container.planned_pickup_date
          );
          return deliveryKey === key || pickupKey === key;
        })
        .map(({ project, container }) => {
          const pickupKey = getDateKey(
            container.actual_pickup_date || container.planned_pickup_date
          );

          const isPickup = pickupKey === key;

          return {
            type: "container",
            id: `container-${container.id}`,
            projectId: project.id,
            title: isPickup
              ? `Ophalen: ${container.waste_type}`
              : `Container: ${container.waste_type}`,
            subtitle: `${project.name} · ${container.container_size}`,
            color: isPickup ? "#8d6ccf" : "#7ea89d",
            raw: container,
          };
        });

      const pickupItems: CalendarPickup[] = pickupTasks
        .filter((item) => item.pickup.date === key)
        .map(({ project, task, pickup }) => ({
          type: "pickup",
          id: `pickup-${task.id}`,
          projectId: project.id,
          title: `Ophaalactie: ${pickup.what || task.title}`,
          subtitle: `${project.name}${pickup.executorName ? ` · ${pickup.executorName}` : ""}`,
          color: "#ef6b1f",
          raw: task,
          pickup,
        }));

      return {
        key,
        date,
        isCurrentMonth: date.getMonth() === month,
        isToday: key === todayKey,
        items: [...projectItems, ...containerItems, ...pickupItems],
      };
    });
  }, [currentMonth, projects, flatContainers, pickupTasks]);

  const monthStats = useMemo(() => {
    const currentMonthDays = days.filter((day) => day.isCurrentMonth);

    return {
      projects: currentMonthDays.reduce(
        (sum, day) => sum + day.items.filter((item) => item.type === "project").length,
        0
      ),
      containers: currentMonthDays.reduce(
        (sum, day) => sum + day.items.filter((item) => item.type === "container").length,
        0
      ),
      pickups: currentMonthDays.reduce(
        (sum, day) => sum + day.items.filter((item) => item.type === "pickup").length,
        0
      ),
      busyDays: currentMonthDays.filter((day) => day.items.length > 0).length,
    };
  }, [days]);

  function openAddPopup(dateKey: string) {
    setContainerForm({
      ...initialContainerForm,
      project_id: projects[0]?.id || "",
      planned_delivery_date: dateKey,
    });

    setPickupForm({
      ...initialPickupForm,
      project_id: projects[0]?.id || "",
      date: dateKey,
    });

    setPopup({ type: "add", dateKey });
  }

  async function handleCreateContainer(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!containerForm.project_id) {
      setMessage("Kies eerst een project.");
      return;
    }

    try {
      setSaving(true);

      await createContainer({
        project_id: containerForm.project_id,
        waste_type: containerForm.waste_type,
        container_size: containerForm.container_size,
        planned_quantity: 1,
        actual_quantity: 1,
        planned_delivery_date: containerForm.planned_delivery_date || null,
        actual_delivery_date: null,
        planned_pickup_date: containerForm.planned_pickup_date || null,
        actual_pickup_date: null,
        change_reason: "",
        notes: containerForm.notes,
      });

      setPopup(null);
      setMessage("Container ingepland.");
      await loadPage();
    } catch (error) {
      console.error(error);
      setMessage("Container opslaan mislukt.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreatePickup(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!pickupForm.project_id || !pickupForm.what.trim()) {
      setMessage("Kies een project en vul in wat opgehaald moet worden.");
      return;
    }

    const executor = executors.find((item) => item.id === pickupForm.executor_id);

    const payload: PickupPayload = {
      date: pickupForm.date,
      executorId: pickupForm.executor_id,
      executorName: executor?.name || "",
      what: pickupForm.what.trim(),
      where: pickupForm.where.trim(),
      company: pickupForm.company.trim(),
      category: pickupForm.category,
      notes: pickupForm.notes.trim(),
    };

    try {
      setSaving(true);

      await createTask({
        project_id: pickupForm.project_id,
        task_type: "Ophaalactie",
        title: `Ophalen: ${payload.what}`,
        location: payload.where,
        priority: "Middel",
        status: "Open",
        is_checked: false,
        notes: JSON.stringify(payload),
      });

      setPopup(null);
      setMessage("Ophaalactie ingepland.");
      await loadPage();
    } catch (error) {
      console.error(error);
      setMessage("Ophaalactie opslaan mislukt.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePickup(taskId: string) {
    const confirmed = window.confirm("Weet je zeker dat je deze ophaalactie wilt verwijderen?");
    if (!confirmed) return;

    try {
      setSaving(true);

      const { error } = await supabase.from("project_tasks").delete().eq("id", taskId);
      if (error) throw error;

      setPopup(null);
      setMessage("Ophaalactie verwijderd.");
      await loadPage();
    } catch (error) {
      console.error(error);
      setMessage("Verwijderen mislukt.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePickupDone(task: ProjectTask) {
    try {
      setSaving(true);

      const nextChecked = !task.is_checked;

      const { error } = await supabase
        .from("project_tasks")
        .update({
          is_checked: nextChecked,
          status: nextChecked ? "Gereed" : "Open",
          checked_at: nextChecked ? new Date().toISOString() : null,
        })
        .eq("id", task.id);

      if (error) throw error;

      setPopup(null);
      setMessage(nextChecked ? "Ophaalactie afgerond." : "Ophaalactie heropend.");
      await loadPage();
    } catch (error) {
      console.error(error);
      setMessage("Wijzigen mislukt.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteContainer(containerId: string) {
    const confirmed = window.confirm("Weet je zeker dat je deze container wilt verwijderen?");
    if (!confirmed) return;

    try {
      setSaving(true);
      await deleteContainer(containerId);
      setPopup(null);
      setMessage("Container verwijderd.");
      await loadPage();
    } catch (error) {
      console.error(error);
      setMessage("Container verwijderen mislukt.");
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkContainerPickedUp(container: ProjectContainer) {
    try {
      setSaving(true);

      await updateContainer(container.id, {
        waste_type: container.waste_type,
        container_size: container.container_size,
        planned_quantity: Number(container.planned_quantity || 1),
        actual_quantity: Number(container.actual_quantity || 1),
        planned_delivery_date: container.planned_delivery_date,
        actual_delivery_date: container.actual_delivery_date,
        planned_pickup_date: container.planned_pickup_date,
        actual_pickup_date: getDateKey(new Date()),
        change_reason: container.change_reason || "",
        notes: container.notes || "",
      });

      setPopup(null);
      setMessage("Container als opgehaald gemarkeerd.");
      await loadPage();
    } catch (error) {
      console.error(error);
      setMessage("Container bijwerken mislukt.");
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
      <section style={cardStyle}>
        <div style={headerStyle}>
          <div>
            <h1 style={titleStyle}>Agenda</h1>
            <p style={subtitleStyle}>
              Maandoverzicht van projecten, containers en ophaalacties.
            </p>
          </div>

          <div style={topActionsStyle}>
            <button
              onClick={() =>
                setCurrentMonth(
                  new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
                )
              }
              style={navButtonStyle}
            >
              ←
            </button>

            <div style={monthLabelStyle}>
              {new Intl.DateTimeFormat("nl-NL", {
                month: "long",
                year: "numeric",
              }).format(currentMonth)}
            </div>

            <button
              onClick={() =>
                setCurrentMonth(
                  new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
                )
              }
              style={navButtonStyle}
            >
              →
            </button>

            <Link href="/" style={backLinkStyle}>
              Dashboard
            </Link>
          </div>
        </div>

        {message ? <div style={messageStyle}>{message}</div> : null}

        <div style={summaryGridStyle}>
          <SummaryCard label="Projectmomenten" value={monthStats.projects} color="#b7bcc7" />
          <SummaryCard label="Containeracties" value={monthStats.containers} color="#7ea89d" />
          <SummaryCard label="Ophaalacties" value={monthStats.pickups} color="#ef6b1f" />
          <SummaryCard label="Actieve dagen" value={monthStats.busyDays} color="#8d6ccf" />
        </div>

        <div style={legendStyle}>
          <LegendDot color="#b7bcc7" label="Project" />
          <LegendDot color="#7ea89d" label="Container" />
          <LegendDot color="#8d6ccf" label="Container ophalen" />
          <LegendDot color="#ef6b1f" label="Ophaalactie" />
        </div>

        <div style={weekHeaderStyle}>
          {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((day) => (
            <div key={day} style={weekdayStyle}>
              {day}
            </div>
          ))}
        </div>

        <div style={calendarGridStyle}>
          {days.map((day) => (
            <div
              key={day.key}
              style={{
                ...dayCellStyle,
                background: day.isCurrentMonth ? "#ffffff" : "#f0ebe5",
                border: day.isToday ? "2px solid #ef6b1f" : "1px solid #e7ddd3",
              }}
            >
              <div style={dayTopStyle}>
                <button
                  type="button"
                  onClick={() => setPopup({ type: "day", day })}
                  style={dayNumberButtonStyle}
                >
                  {day.date.getDate()}
                </button>

                <button
                  type="button"
                  onClick={() => openAddPopup(day.key)}
                  style={plusButtonStyle}
                  title="Toevoegen"
                >
                  +
                </button>
              </div>

              <div style={dayItemsStyle}>
                {day.items.slice(0, 4).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.type === "project") window.location.href = `/projects/${item.projectId}`;
                      if (item.type === "container") setPopup({ type: "container", item });
                      if (item.type === "pickup") setPopup({ type: "pickup", item });
                    }}
                    title={`${item.title} · ${item.subtitle}`}
                    style={{
                      ...calendarItemStyle,
                      background: item.color,
                    }}
                  >
                    {item.title}
                  </button>
                ))}

                {day.items.length > 4 ? (
                  <button
                    type="button"
                    onClick={() => setPopup({ type: "day", day })}
                    style={moreButtonStyle}
                  >
                    +{day.items.length - 4} meer
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      {popup ? (
        <div style={modalBackdropStyle} onClick={() => setPopup(null)}>
          <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
            {popup.type === "day" ? (
              <>
                <ModalHeader
                  title={`${formatDate(popup.day.key)} · ${popup.day.items.length} item(s)`}
                  onClose={() => setPopup(null)}
                />

                <div style={modalListStyle}>
                  {popup.day.items.length === 0 ? (
                    <EmptyState text="Geen items op deze dag." />
                  ) : (
                    popup.day.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (item.type === "project") window.location.href = `/projects/${item.projectId}`;
                          if (item.type === "container") setPopup({ type: "container", item });
                          if (item.type === "pickup") setPopup({ type: "pickup", item });
                        }}
                        style={modalItemButtonStyle}
                      >
                        <span style={{ ...modalColorDotStyle, background: item.color }} />
                        <span>
                          <strong>{item.title}</strong>
                          <small>{item.subtitle}</small>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </>
            ) : null}

            {popup.type === "add" ? (
              <>
                <ModalHeader title={`Toevoegen op ${formatDate(popup.dateKey)}`} onClose={() => setPopup(null)} />

                <div style={quickActionGridStyle}>
                  <Link href="/nieuw-project" style={quickActionLinkStyle}>
                    Project toevoegen
                  </Link>
                  <button type="button" style={quickActionButtonStyle}>
                    Container plannen
                  </button>
                  <button type="button" style={quickActionButtonStyle}>
                    Ophaalactie plannen
                  </button>
                </div>

                <div style={formColumnsStyle}>
                  <form onSubmit={handleCreateContainer} style={formBoxStyle}>
                    <h3 style={formTitleStyle}>Container plannen</h3>

                    <select
                      value={containerForm.project_id}
                      onChange={(e) =>
                        setContainerForm({ ...containerForm, project_id: e.target.value })
                      }
                      style={inputStyle}
                    >
                      <option value="">Kies project</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={containerForm.waste_type}
                      onChange={(e) =>
                        setContainerForm({ ...containerForm, waste_type: e.target.value })
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
                      value={containerForm.container_size}
                      onChange={(e) =>
                        setContainerForm({ ...containerForm, container_size: e.target.value })
                      }
                      style={inputStyle}
                    >
                      <option value="3 m³">3 m³</option>
                      <option value="6 m³">6 m³</option>
                      <option value="10 m³">10 m³</option>
                      <option value="20 m³">20 m³</option>
                      <option value="40 m³">40 m³</option>
                    </select>

                    <input
                      type="date"
                      value={containerForm.planned_delivery_date}
                      onChange={(e) =>
                        setContainerForm({
                          ...containerForm,
                          planned_delivery_date: e.target.value,
                        })
                      }
                      style={inputStyle}
                    />

                    <input
                      type="date"
                      value={containerForm.planned_pickup_date}
                      onChange={(e) =>
                        setContainerForm({
                          ...containerForm,
                          planned_pickup_date: e.target.value,
                        })
                      }
                      style={inputStyle}
                    />

                    <textarea
                      value={containerForm.notes}
                      onChange={(e) =>
                        setContainerForm({ ...containerForm, notes: e.target.value })
                      }
                      placeholder="Notitie"
                      style={textareaStyle}
                    />

                    <button type="submit" disabled={saving} style={buttonStyle}>
                      {saving ? "Opslaan..." : "Container opslaan"}
                    </button>
                  </form>

                  <form onSubmit={handleCreatePickup} style={formBoxStyle}>
                    <h3 style={formTitleStyle}>Ophaalactie plannen</h3>

                    <select
                      value={pickupForm.project_id}
                      onChange={(e) =>
                        setPickupForm({ ...pickupForm, project_id: e.target.value })
                      }
                      style={inputStyle}
                    >
                      <option value="">Kies project</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>

                    <input
                      type="date"
                      value={pickupForm.date}
                      onChange={(e) => setPickupForm({ ...pickupForm, date: e.target.value })}
                      style={inputStyle}
                    />

                    <input
                      value={pickupForm.what}
                      onChange={(e) => setPickupForm({ ...pickupForm, what: e.target.value })}
                      placeholder="Wat moet opgehaald worden?"
                      style={inputStyle}
                    />

                    <select
                      value={pickupForm.executor_id}
                      onChange={(e) =>
                        setPickupForm({ ...pickupForm, executor_id: e.target.value })
                      }
                      style={inputStyle}
                    >
                      <option value="">Kies uitvoerder</option>
                      {executors.map((executor) => (
                        <option key={executor.id} value={executor.id}>
                          {executor.name}
                        </option>
                      ))}
                    </select>

                    <input
                      value={pickupForm.where}
                      onChange={(e) => setPickupForm({ ...pickupForm, where: e.target.value })}
                      placeholder="Waar ophalen?"
                      style={inputStyle}
                    />

                    <input
                      value={pickupForm.company}
                      onChange={(e) =>
                        setPickupForm({ ...pickupForm, company: e.target.value })
                      }
                      placeholder="Bedrijf / contact"
                      style={inputStyle}
                    />

                    <select
                      value={pickupForm.category}
                      onChange={(e) =>
                        setPickupForm({ ...pickupForm, category: e.target.value })
                      }
                      style={inputStyle}
                    >
                      <option value="Huur">Huur</option>
                      <option value="Kantoor">Kantoor</option>
                      <option value="Kopen">Kopen</option>
                      <option value="Retour">Retour</option>
                    </select>

                    <textarea
                      value={pickupForm.notes}
                      onChange={(e) => setPickupForm({ ...pickupForm, notes: e.target.value })}
                      placeholder="Extra notitie"
                      style={textareaStyle}
                    />

                    <button type="submit" disabled={saving} style={buttonStyle}>
                      {saving ? "Opslaan..." : "Ophaalactie opslaan"}
                    </button>
                  </form>
                </div>
              </>
            ) : null}

            {popup.type === "container" ? (
              <>
                <ModalHeader title={popup.item.title} onClose={() => setPopup(null)} />

                <DetailGrid
                  rows={[
                    ["Project", popup.item.subtitle.split(" · ")[0]],
                    ["Soort", popup.item.raw.waste_type || "-"],
                    ["Maat", popup.item.raw.container_size || "-"],
                    ["Levering", formatDate(popup.item.raw.actual_delivery_date || popup.item.raw.planned_delivery_date)],
                    ["Ophalen", formatDate(popup.item.raw.actual_pickup_date || popup.item.raw.planned_pickup_date)],
                    ["Notitie", popup.item.raw.notes || "-"],
                  ]}
                />

                <div style={modalActionsStyle}>
                  <Link href={`/projects/${popup.item.projectId}`} style={secondaryLinkStyle}>
                    Open project
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleMarkContainerPickedUp(popup.item.raw)}
                    style={buttonStyle}
                  >
                    Markeer opgehaald
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteContainer(popup.item.raw.id)}
                    style={dangerButtonStyle}
                  >
                    Verwijderen
                  </button>
                </div>
              </>
            ) : null}

            {popup.type === "pickup" ? (
              <>
                <ModalHeader title={popup.item.title} onClose={() => setPopup(null)} />

                <DetailGrid
                  rows={[
                    ["Datum", formatDate(popup.item.pickup.date)],
                    ["Project", popup.item.subtitle.split(" · ")[0]],
                    ["Wat", popup.item.pickup.what || "-"],
                    ["Uitvoerder", popup.item.pickup.executorName || "-"],
                    ["Waar", popup.item.pickup.where || "-"],
                    ["Bedrijf", popup.item.pickup.company || "-"],
                    ["Type", popup.item.pickup.category || "-"],
                    ["Status", popup.item.raw.status || "-"],
                    ["Notitie", popup.item.pickup.notes || "-"],
                  ]}
                />

                <div style={modalActionsStyle}>
                  <Link href={`/projects/${popup.item.projectId}`} style={secondaryLinkStyle}>
                    Open project
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleTogglePickupDone(popup.item.raw)}
                    style={buttonStyle}
                  >
                    {popup.item.raw.is_checked ? "Heropenen" : "Afronden"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePickup(popup.item.raw.id)}
                    style={dangerButtonStyle}
                  >
                    Verwijderen
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={modalHeaderStyle}>
      <h2 style={modalTitleStyle}>{title}</h2>
      <button type="button" onClick={onClose} style={modalCloseStyle}>
        ×
      </button>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div style={{ ...summaryCardStyle, borderTop: `5px solid ${color}` }}>
      <div style={summaryLabelStyle}>{label}</div>
      <div style={summaryValueStyle}>{value}</div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={legendDotWrapStyle}>
      <span style={{ ...legendDotStyle, background: color }} />
      <span>{label}</span>
    </div>
  );
}

function DetailGrid({ rows }: { rows: [string, string][] }) {
  return (
    <div style={detailGridStyle}>
      {rows.map(([label, value]) => (
        <div key={label} style={detailCellStyle}>
          <div style={detailLabelStyle}>{label}</div>
          <div style={detailValueStyle}>{value}</div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div style={emptyStateStyle}>{text}</div>;
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

function isProjectOnDate(project: Project, key: string) {
  if (!project.start_date || !project.end_date) return false;

  const start = getDateKey(project.start_date);
  const end = getDateKey(project.end_date);

  return key >= start && key <= end;
}

function parsePickupPayload(value?: string | null): PickupPayload {
  const fallback: PickupPayload = {
    date: "",
    executorId: "",
    executorName: "",
    what: "",
    where: "",
    company: "",
    category: "",
    notes: value || "",
  };

  if (!value) return fallback;

  try {
    const parsed = JSON.parse(value) as Partial<PickupPayload>;

    return {
      date: parsed.date || "",
      executorId: parsed.executorId || "",
      executorName: parsed.executorName || "",
      what: parsed.what || "",
      where: parsed.where || "",
      company: parsed.company || "",
      category: parsed.category || "",
      notes: parsed.notes || "",
    };
  } catch {
    return fallback;
  }
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  padding: 24,
  background: "#f6f2ed",
  fontFamily: "Arial, sans-serif",
};

const cardStyle: CSSProperties = {
  background: "#fffaf6",
  borderRadius: 32,
  padding: 24,
  border: "1px solid #ece3da",
  boxShadow: "0 18px 38px rgba(23,23,23,0.05)",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  flexWrap: "wrap",
  marginBottom: 20,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 42,
  color: "#171717",
  letterSpacing: -0.5,
};

const subtitleStyle: CSSProperties = {
  margin: "8px 0 0 0",
  color: "#6b675f",
  fontSize: 16,
};

const topActionsStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
};

const navButtonStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #d8d0c7",
  borderRadius: 14,
  padding: "11px 15px",
  cursor: "pointer",
  fontWeight: 900,
};

const monthLabelStyle: CSSProperties = {
  fontWeight: 900,
  minWidth: 180,
  textAlign: "center",
  color: "#171717",
};

const backLinkStyle: CSSProperties = {
  textDecoration: "none",
  color: "#ef6b1f",
  fontWeight: 900,
};

const messageStyle: CSSProperties = {
  marginBottom: 18,
  padding: 14,
  borderRadius: 16,
  background: "#fff1e8",
  border: "1px solid #f6c6a4",
  color: "#8a4b1e",
  fontWeight: 800,
};

const summaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 14,
  marginBottom: 18,
};

const summaryCardStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  padding: 16,
  border: "1px solid #eadfd4",
};

const summaryLabelStyle: CSSProperties = {
  fontSize: 12,
  color: "#6b675f",
  fontWeight: 900,
  textTransform: "uppercase",
};

const summaryValueStyle: CSSProperties = {
  marginTop: 10,
  fontSize: 32,
  fontWeight: 900,
  color: "#171717",
};

const legendStyle: CSSProperties = {
  display: "flex",
  gap: 18,
  flexWrap: "wrap",
  marginBottom: 16,
};

const legendDotWrapStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontWeight: 700,
};

const legendDotStyle: CSSProperties = {
  width: 14,
  height: 14,
  borderRadius: 999,
  display: "inline-block",
};

const weekHeaderStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  gap: 10,
  marginBottom: 10,
};

const weekdayStyle: CSSProperties = {
  fontWeight: 900,
  color: "#171717",
  paddingLeft: 4,
};

const calendarGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  gap: 10,
};

const dayCellStyle: CSSProperties = {
  minHeight: 158,
  borderRadius: 20,
  padding: 12,
  position: "relative",
};

const dayTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  alignItems: "center",
  marginBottom: 10,
};

const dayNumberButtonStyle: CSSProperties = {
  background: "transparent",
  border: "none",
  padding: 0,
  fontSize: 17,
  fontWeight: 900,
  color: "#171717",
  cursor: "pointer",
};

const plusButtonStyle: CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: "50%",
  background: "#eaf6ec",
  border: "1px solid #b7dec0",
  color: "#2f7b4d",
  fontSize: 19,
  fontWeight: 900,
  lineHeight: 1,
  cursor: "pointer",
};

const dayItemsStyle: CSSProperties = {
  display: "grid",
  gap: 6,
};

const calendarItemStyle: CSSProperties = {
  color: "#ffffff",
  borderRadius: 12,
  padding: "7px 8px",
  fontSize: 12,
  fontWeight: 800,
  border: "none",
  textAlign: "left",
  cursor: "pointer",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const moreButtonStyle: CSSProperties = {
  background: "#fbf8f4",
  border: "1px solid #eadfd4",
  color: "#6b675f",
  borderRadius: 12,
  padding: "7px 8px",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
  textAlign: "left",
};

const modalBackdropStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(23,23,23,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  zIndex: 300,
};

const modalCardStyle: CSSProperties = {
  width: "100%",
  maxWidth: 980,
  maxHeight: "88vh",
  overflow: "auto",
  background: "#ffffff",
  borderRadius: 28,
  padding: 20,
  border: "1px solid #eadfd4",
  boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
};

const modalHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  marginBottom: 16,
};

const modalTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 24,
  color: "#171717",
};

const modalCloseStyle: CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: "50%",
  border: "1px solid #ddd1c4",
  background: "#ffffff",
  fontSize: 24,
  lineHeight: 1,
  cursor: "pointer",
};

const modalListStyle: CSSProperties = {
  display: "grid",
  gap: 10,
};

const modalItemButtonStyle: CSSProperties = {
  width: "100%",
  background: "#fbf8f4",
  border: "1px solid #eadfd4",
  borderRadius: 16,
  padding: 14,
  display: "grid",
  gridTemplateColumns: "14px 1fr",
  gap: 12,
  textAlign: "left",
  cursor: "pointer",
};

const modalColorDotStyle: CSSProperties = {
  width: 12,
  height: 12,
  borderRadius: "50%",
  marginTop: 4,
};

const quickActionGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12,
  marginBottom: 18,
};

const quickActionButtonStyle: CSSProperties = {
  background: "#fff7ef",
  color: "#ef6b1f",
  border: "1px solid #f3c9aa",
  borderRadius: 16,
  padding: 14,
  fontWeight: 900,
};

const quickActionLinkStyle: CSSProperties = {
  ...quickActionButtonStyle,
  textDecoration: "none",
  textAlign: "center",
};

const formColumnsStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
};

const formBoxStyle: CSSProperties = {
  background: "#fbf8f4",
  border: "1px solid #eadfd4",
  borderRadius: 20,
  padding: 16,
  display: "grid",
  gap: 12,
};

const formTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 20,
  color: "#171717",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "14px 15px",
  borderRadius: 14,
  border: "1px solid #d9cfc4",
  background: "#ffffff",
  fontSize: 15,
  color: "#171717",
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: 92,
  resize: "vertical",
};

const buttonStyle: CSSProperties = {
  background: "#ef6b1f",
  color: "#ffffff",
  border: "none",
  borderRadius: 14,
  padding: "14px 16px",
  fontSize: 15,
  fontWeight: 900,
  cursor: "pointer",
  textDecoration: "none",
  textAlign: "center",
};

const dangerButtonStyle: CSSProperties = {
  background: "#fff1f2",
  color: "#be123c",
  border: "1px solid #fecdd3",
  borderRadius: 14,
  padding: "14px 16px",
  fontSize: 15,
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryLinkStyle: CSSProperties = {
  background: "#ffffff",
  color: "#171717",
  border: "1px solid #d9cfc4",
  borderRadius: 14,
  padding: "14px 16px",
  fontSize: 15,
  fontWeight: 900,
  textDecoration: "none",
  textAlign: "center",
};

const detailGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12,
};

const detailCellStyle: CSSProperties = {
  background: "#fbf8f4",
  border: "1px solid #eadfd4",
  borderRadius: 16,
  padding: 14,
};

const detailLabelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  color: "#6b675f",
  textTransform: "uppercase",
};

const detailValueStyle: CSSProperties = {
  marginTop: 7,
  fontSize: 15,
  fontWeight: 800,
  color: "#171717",
};

const modalActionsStyle: CSSProperties = {
  marginTop: 16,
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
};

const emptyStateStyle: CSSProperties = {
  background: "#fbf8f4",
  border: "1px solid #eadfd4",
  borderRadius: 16,
  padding: 14,
  color: "#6b675f",
};