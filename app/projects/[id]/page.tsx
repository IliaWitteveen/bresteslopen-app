"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { deleteProjectById, getProjectById } from "@/lib/projects";
import { createTask, getTasksByProjectId, toggleTaskChecked } from "@/lib/tasks";
import { createContainer, getContainersByProjectId } from "@/lib/containers";
import { createPhoto, getPhotosByProjectId, uploadPhotoFile } from "@/lib/photos";
import {
  addExecutorToProject,
  getExecutors,
  getExecutorsByProjectId,
  removeExecutorFromProject,
} from "@/lib/executors";
import { getCurrentAppUser, type AppRole } from "@/lib/auth";
import { Project } from "@/types/project";
import { ProjectTask } from "@/types/task";
import { ProjectContainer } from "@/types/container";
import { ProjectPhoto } from "@/types/photo";
import { Executor } from "@/types/executor";

type ProjectDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type TaskFormState = {
  task_type: string;
  title: string;
  location: string;
  priority: string;
  notes: string;
};

type ContainerFormState = {
  waste_type: string;
  container_size: string;
  planned_delivery_date: string;
  planned_pickup_date: string;
  notes: string;
};

type PhotoFormState = {
  category: string;
  label: string;
  title: string;
  notes: string;
};

type ProjectEditFormState = {
  name: string;
  address: string;
  demolition_type: string;
  building_type: string;
  area_m2: string;
  bag_build_year: string;
  opdrachtgever: string;
  start_date: string;
  end_date: string;
  work_days: string;
  status: string;
  overviewNotes: string;
};

type TimelineItem = {
  id: string;
  title: string;
  subtitle: string;
  dateLabel: string;
  sortValue: number;
  tone: "green" | "red" | "blue" | "purple" | "orange";
};

type PlannerContainerItem = {
  id: string;
  wasteType: string;
  containerSize: string;
};

type PlannerDayItem = {
  key: string;
  shortDay: string;
  shortDate: string;
  isToday: boolean;
  isActive: boolean;
  deliveries: PlannerContainerItem[];
  pickups: PlannerContainerItem[];
  note: string;
};

type DialogState = {
  title: string;
  items: PlannerContainerItem[];
} | null;

type PlannerNoteMap = Record<string, string>;

type NotesPayload = {
  overviewNotes: string;
  plannerNotes: PlannerNoteMap;
};

type PlannerContainerModalState = {
  deliveryDate: string;
  pickupDate: string;
} | null;

const initialTaskForm: TaskFormState = {
  task_type: "Wel slopen",
  title: "",
  location: "",
  priority: "Middel",
  notes: "",
};

const initialContainerForm: ContainerFormState = {
  waste_type: "Bouw- en sloop",
  container_size: "10 m³",
  planned_delivery_date: "",
  planned_pickup_date: "",
  notes: "",
};

const initialPhotoForm: PhotoFormState = {
  category: "Vooraf",
  label: "Opletpunt",
  title: "",
  notes: "",
};

const initialProjectEditForm: ProjectEditFormState = {
  name: "",
  address: "",
  demolition_type: "",
  building_type: "",
  area_m2: "",
  bag_build_year: "",
  opdrachtgever: "",
  start_date: "",
  end_date: "",
  work_days: "",
  status: "",
  overviewNotes: "",
};

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const [kpiModal, setKpiModal] = useState<{
  title: string;
  items: {
    label: string;
    value: string;
    href?: string;
  }[];
} | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [projectId, setProjectId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [userRole, setUserRole] = useState<AppRole>(null);
  const [currentUserId, setCurrentUserId] = useState("");

  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [taskForm, setTaskForm] = useState<TaskFormState>(initialTaskForm);
  const [savingTask, setSavingTask] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);

  const [containers, setContainers] = useState<ProjectContainer[]>([]);
  const [containerForm, setContainerForm] =
    useState<ContainerFormState>(initialContainerForm);
  const [savingContainer, setSavingContainer] = useState(false);

  const [photos, setPhotos] = useState<ProjectPhoto[]>([]);
  const [photoForm, setPhotoForm] = useState<PhotoFormState>(initialPhotoForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);

  const [allExecutors, setAllExecutors] = useState<Executor[]>([]);
  const [projectExecutors, setProjectExecutors] = useState<Executor[]>([]);
  const [selectedExecutorId, setSelectedExecutorId] = useState("");
  const [savingExecutor, setSavingExecutor] = useState(false);

  const [message, setMessage] = useState("");
  const [plannerDialog, setPlannerDialog] = useState<DialogState>(null);

  const [showProjectEdit, setShowProjectEdit] = useState(false);
  const [projectEditForm, setProjectEditForm] =
    useState<ProjectEditFormState>(initialProjectEditForm);
  const [savingProject, setSavingProject] = useState(false);

  const [plannerNotes, setPlannerNotes] = useState<PlannerNoteMap>({});
  const [plannerNoteDrafts, setPlannerNoteDrafts] = useState<PlannerNoteMap>({});
  const [plannerContainerModal, setPlannerContainerModal] =
    useState<PlannerContainerModalState>(null);
  const [plannerContainerForm, setPlannerContainerForm] =
    useState<ContainerFormState>(initialContainerForm);

  const [savingInfoAttachment, setSavingInfoAttachment] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState<ProjectPhoto | null>(null);

  const infoAttachmentInputRef = useRef<HTMLInputElement | null>(null);

  const canManageProjectSetup = userRole === "admin" || userRole === "office";
  const canToggleTasks =
    userRole === "admin" || userRole === "office" || userRole === "uitvoerder";
  const canUploadPhotos =
    userRole === "admin" || userRole === "office" || userRole === "uitvoerder";

  useEffect(() => {
    async function unwrapParams() {
      const resolvedParams = await params;
      setProjectId(resolvedParams.id);
    }

    unwrapParams();
  }, [params]);

  useEffect(() => {
    if (!projectId) return;

    async function loadPage() {
      try {
        const appUser = await getCurrentAppUser();

        if (!appUser) {
          window.location.href = "/login";
          return;
        }

        setCurrentUserId(appUser.authUserId);
        setUserRole(appUser.role);

        const projectData = await getProjectById(projectId);
        setProject(projectData);

        const parsedNotes = parseProjectNotes(projectData?.notes);
        setPlannerNotes(parsedNotes.plannerNotes);
        setPlannerNoteDrafts(parsedNotes.plannerNotes);
        setProjectEditForm(buildProjectEditForm(projectData, parsedNotes.overviewNotes));

        await Promise.all([
          loadTasks(projectId),
          loadContainers(projectId),
          loadPhotos(projectId),
          loadExecutorsData(projectId),
        ]);
      } catch (error) {
        console.error("Load project detail error:", error);
        setMessage("Project laden mislukt.");
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, [projectId]);

  async function loadTasks(id: string) {
    const taskData = await getTasksByProjectId(id);
    setTasks(taskData);
  }

  async function loadContainers(id: string) {
    const containerData = await getContainersByProjectId(id);
    setContainers(containerData);
  }

  async function loadPhotos(id: string) {
    const photoData = await getPhotosByProjectId(id);
    setPhotos(photoData);
  }

  async function loadExecutorsData(id: string) {
    const [available, linked] = await Promise.all([
      getExecutors(),
      getExecutorsByProjectId(id),
    ]);

    setAllExecutors(available);
    setProjectExecutors(linked);
  }

  async function handleTaskSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!canManageProjectSetup) {
      setMessage("Je hebt geen rechten om taken toe te voegen.");
      return;
    }

    if (!projectId || !taskForm.title.trim()) {
      setMessage("Vul minimaal een taakomschrijving in.");
      return;
    }

    try {
      setSavingTask(true);

      await createTask({
        project_id: projectId,
        task_type: taskForm.task_type,
        title: taskForm.title,
        location: taskForm.location,
        priority: taskForm.priority,
        status: "Open",
        is_checked: false,
        notes: taskForm.notes,
      });

      setTaskForm(initialTaskForm);
      setShowTaskForm(false);
      setMessage("Taak opgeslagen.");
      await loadTasks(projectId);
    } catch (error) {
      console.error(error);
      setMessage("Opslaan taak mislukt.");
    } finally {
      setSavingTask(false);
    }
  }

  async function handleContainerSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!canManageProjectSetup) {
      setMessage("Je hebt geen rechten om containers toe te voegen.");
      return;
    }

    if (!projectId) {
      setMessage("Project niet gevonden.");
      return;
    }

    try {
      setSavingContainer(true);

      await createContainer({
        project_id: projectId,
        waste_type: containerForm.waste_type,
        container_size: containerForm.container_size,
        planned_quantity: 1,
        actual_quantity: 1,
        planned_delivery_date: containerForm.planned_delivery_date || null,
        actual_delivery_date: "",
        planned_pickup_date: containerForm.planned_pickup_date || null,
        actual_pickup_date: "",
        change_reason: "",
        notes: containerForm.notes,
      });

      setContainerForm(initialContainerForm);
      setMessage("Container opgeslagen.");
      await loadContainers(projectId);
    } catch (error) {
      console.error(error);
      setMessage("Opslaan container mislukt.");
    } finally {
      setSavingContainer(false);
    }
  }

  async function handlePlannerContainerSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!canManageProjectSetup) {
      setMessage("Je hebt geen rechten om containers toe te voegen.");
      return;
    }

    if (!projectId) {
      setMessage("Project niet gevonden.");
      return;
    }

    try {
      setSavingContainer(true);

      await createContainer({
        project_id: projectId,
        waste_type: plannerContainerForm.waste_type,
        container_size: plannerContainerForm.container_size,
        planned_quantity: 1,
        actual_quantity: 1,
        planned_delivery_date: plannerContainerForm.planned_delivery_date || null,
        actual_delivery_date: "",
        planned_pickup_date: plannerContainerForm.planned_pickup_date || null,
        actual_pickup_date: "",
        change_reason: "",
        notes: plannerContainerForm.notes,
      });

      setPlannerContainerModal(null);
      setPlannerContainerForm(initialContainerForm);
      setMessage("Container opgeslagen.");
      await loadContainers(projectId);
    } catch (error) {
      console.error(error);
      setMessage("Opslaan container mislukt.");
    } finally {
      setSavingContainer(false);
    }
  }

  async function handlePhotoSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!canUploadPhotos) {
      setMessage("Je hebt geen rechten om foto's te uploaden.");
      return;
    }

    if (!projectId) {
      setMessage("Project niet gevonden.");
      return;
    }

    if (!photoForm.title.trim()) {
      setMessage("Vul een titel voor de foto in.");
      return;
    }

    if (!photoFile) {
      setMessage("Kies eerst een foto.");
      return;
    }

    try {
      setSavingPhoto(true);

      const publicUrl = await uploadPhotoFile(photoFile, projectId);

      await createPhoto({
        project_id: projectId,
        task_id: null,
        category: photoForm.category,
        label: photoForm.label,
        title: photoForm.title,
        notes: photoForm.notes,
        file_url: publicUrl,
        uploaded_by_user_id: currentUserId || null,
      });

      setPhotoForm(initialPhotoForm);
      setPhotoFile(null);
      setMessage("Foto opgeslagen.");
      await loadPhotos(projectId);
    } catch (error) {
      console.error(error);
      setMessage("Opslaan foto mislukt.");
    } finally {
      setSavingPhoto(false);
    }
  }

  async function handleInfoAttachmentUpload(file: File) {
    if (!canUploadPhotos) {
      setMessage("Je hebt geen rechten om een bijlage toe te voegen.");
      return;
    }

    if (!projectId) {
      setMessage("Project niet gevonden.");
      return;
    }

    try {
      setSavingInfoAttachment(true);
      setMessage("");

      const publicUrl = await uploadPhotoFile(file, projectId);

      await createPhoto({
        project_id: projectId,
        task_id: null,
        category: "Bijlage",
        label: "Info",
        title: file.name,
        notes: "",
        file_url: publicUrl,
        uploaded_by_user_id: currentUserId || null,
      });

      setMessage("Bijlage toegevoegd.");
      await loadPhotos(projectId);
    } catch (error) {
      console.error(error);
      setMessage("Toevoegen bijlage mislukt.");
    } finally {
      setSavingInfoAttachment(false);
      if (infoAttachmentInputRef.current) {
        infoAttachmentInputRef.current.value = "";
      }
    }
  }

  async function handleToggleTask(taskId: string, currentValue: boolean) {
    if (!canToggleTasks) {
      setMessage("Je hebt geen rechten om taken af te vinken.");
      return;
    }

    try {
      await toggleTaskChecked(taskId, currentValue);
      await loadTasks(projectId);
    } catch (error) {
      console.error(error);
      setMessage("Wijzigen taak mislukt.");
    }
  }

  async function handleAddExecutor(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!canManageProjectSetup) {
      setMessage("Je hebt geen rechten om uitvoerders te koppelen.");
      return;
    }

    if (!projectId || !selectedExecutorId) {
      setMessage("Kies eerst een uitvoerder.");
      return;
    }

    const alreadyLinked = projectExecutors.some((item) => item.id === selectedExecutorId);
    if (alreadyLinked) {
      setMessage("Deze uitvoerder is al gekoppeld.");
      return;
    }

    try {
      setSavingExecutor(true);
      await addExecutorToProject(projectId, selectedExecutorId);
      setSelectedExecutorId("");
      setMessage("Uitvoerder gekoppeld.");
      await loadExecutorsData(projectId);
    } catch (error) {
      console.error(error);
      setMessage("Koppelen uitvoerder mislukt.");
    } finally {
      setSavingExecutor(false);
    }
  }

  async function handleRemoveExecutor(executorId: string) {
    if (!canManageProjectSetup) {
      setMessage("Je hebt geen rechten om uitvoerders te verwijderen.");
      return;
    }

    try {
      await removeExecutorFromProject(projectId, executorId);
      setMessage("Uitvoerder verwijderd.");
      await loadExecutorsData(projectId);
    } catch (error) {
      console.error(error);
      setMessage("Verwijderen uitvoerder mislukt.");
    }
  }

  async function handleSaveProjectEdit() {
    if (!projectId || !project) return;

    try {
      setSavingProject(true);
      setMessage("");

      const parsedCurrentNotes = parseProjectNotes(project.notes);
      const combinedNotes = serializeProjectNotes({
        overviewNotes: projectEditForm.overviewNotes.trim(),
        plannerNotes: parsedCurrentNotes.plannerNotes,
      });

      const payload = {
        name: projectEditForm.name.trim(),
        address: projectEditForm.address.trim(),
        demolition_type: projectEditForm.demolition_type.trim(),
        building_type: projectEditForm.building_type.trim(),
        area_m2: projectEditForm.area_m2 ? Number(projectEditForm.area_m2) : null,
        bag_build_year: projectEditForm.bag_build_year
          ? Number(projectEditForm.bag_build_year)
          : null,
        opdrachtgever: projectEditForm.opdrachtgever.trim(),
        start_date: projectEditForm.start_date || null,
        end_date: projectEditForm.end_date || null,
        work_days: projectEditForm.work_days ? Number(projectEditForm.work_days) : null,
        status: projectEditForm.status.trim(),
        notes: combinedNotes,
      };

      const { data, error } = await supabase
        .from("projects")
        .update(payload)
        .eq("id", projectId)
        .select()
        .single();

      if (error) throw error;

      setProject(data as Project);
      setShowProjectEdit(false);
      setMessage("Project bijgewerkt.");
    } catch (error) {
      console.error(error);
      setMessage("Bijwerken project mislukt.");
    } finally {
      setSavingProject(false);
    }
  }

  async function handleSavePlannerNote(dateKey: string) {
    if (!projectId || !project) return;

    try {
      setMessage("");

      const nextPlannerNotes = {
        ...plannerNotes,
        [dateKey]: (plannerNoteDrafts[dateKey] || "").trim(),
      };

      if (!nextPlannerNotes[dateKey]) {
        delete nextPlannerNotes[dateKey];
      }

      const parsedCurrentNotes = parseProjectNotes(project.notes);
      const combinedNotes = serializeProjectNotes({
        overviewNotes: parsedCurrentNotes.overviewNotes,
        plannerNotes: nextPlannerNotes,
      });

      const { data, error } = await supabase
        .from("projects")
        .update({ notes: combinedNotes })
        .eq("id", projectId)
        .select()
        .single();

      if (error) throw error;

      setProject(data as Project);
      setPlannerNotes(nextPlannerNotes);
      setPlannerNoteDrafts(nextPlannerNotes);
      setMessage("Notitie opgeslagen.");
    } catch (error) {
      console.error(error);
      setMessage("Opslaan notitie mislukt.");
    }
  }

  function openPlannerContainerModal(defaultDeliveryDate: string) {
    setPlannerContainerForm({
      ...initialContainerForm,
      planned_delivery_date: defaultDeliveryDate,
      planned_pickup_date: "",
    });
    setPlannerContainerModal({
      deliveryDate: defaultDeliveryDate,
      pickupDate: "",
    });
  }

  function getTaskTitle(task: ProjectTask) {
    const dynamicTask = task as ProjectTask & {
      description?: string | null;
      title?: string | null;
    };

    return (
      dynamicTask.title?.trim() ||
      dynamicTask.description?.trim() ||
      "Taak zonder omschrijving"
    );
  }

  function getTaskNotes(task: ProjectTask) {
    const dynamicTask = task as ProjectTask & {
      notes?: string | null;
    };

    return dynamicTask.notes?.trim() || "";
  }

  function getTaskMeta(task: ProjectTask) {
    const dynamicTask = task as ProjectTask & {
      location?: string | null;
      priority?: string | null;
      status?: string | null;
      responsible_person?: string | null;
    };

    const parts = [
      dynamicTask.location?.trim(),
      dynamicTask.priority?.trim(),
      dynamicTask.status?.trim(),
      dynamicTask.responsible_person?.trim(),
    ].filter(Boolean);

    return parts.join(" • ");
  }

  function isTaskDone(task: ProjectTask) {
    const dynamicTask = task as ProjectTask & {
      is_checked?: boolean | null;
      is_done?: boolean | null;
    };

    return Boolean(dynamicTask.is_checked ?? dynamicTask.is_done ?? false);
  }

  function isRemoveTask(task: ProjectTask) {
    const dynamicTask = task as ProjectTask & {
      task_type?: string | null;
      is_removed?: boolean | null;
    };

    if (dynamicTask.task_type === "Wel slopen") return true;
    if (dynamicTask.task_type === "Niet slopen") return false;
    if (typeof dynamicTask.is_removed === "boolean") return dynamicTask.is_removed;

    return false;
  }

  const doTasks = useMemo(() => tasks.filter((task) => isRemoveTask(task)), [tasks]);
  const dontTasks = useMemo(() => tasks.filter((task) => !isRemoveTask(task)), [tasks]);

  const todayKey = useMemo(() => getDateKey(new Date()), []);

  const plannerDays = useMemo<PlannerDayItem[]>(() => {
    if (!project) return [];

    return buildPlannerDays(project, plannerNotes).map((date) => {
      const key = getDateKey(date);

      const deliveries = containers
        .filter(
          (container) =>
            getDateKey(container.actual_delivery_date || container.planned_delivery_date) === key
        )
        .map((container) => ({
          id: container.id,
          wasteType: container.waste_type || "-",
          containerSize: container.container_size || "-",
        }));

      const pickups = containers
        .filter(
          (container) =>
            getDateKey(container.actual_pickup_date || container.planned_pickup_date) === key
        )
        .map((container) => ({
          id: container.id,
          wasteType: container.waste_type || "-",
          containerSize: container.container_size || "-",
        }));

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
        isToday: key === todayKey,
        isActive: isProjectActiveOnDate(project, key),
        deliveries,
        pickups,
        note: plannerNoteDrafts[key] ?? plannerNotes[key] ?? "",
      };
    });
  }, [containers, plannerNoteDrafts, plannerNotes, project, todayKey]);

  const timelineItems = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];

    tasks.forEach((task) => {
      const dynamicTask = task as ProjectTask & {
        created_at?: string | null;
        updated_at?: string | null;
      };

      const candidateDate = dynamicTask.updated_at || dynamicTask.created_at;
      if (!candidateDate) return;

      items.push({
        id: `task-${task.id}`,
        title: getTaskTitle(task),
        subtitle: isTaskDone(task) ? "Taak afgerond" : "Taak open",
        dateLabel: formatDate(candidateDate),
        sortValue: toTime(candidateDate),
        tone: isTaskDone(task) ? "green" : isRemoveTask(task) ? "green" : "red",
      });
    });

    containers.forEach((container) => {
      const candidateDate =
        container.actual_delivery_date ||
        container.planned_delivery_date ||
        container.actual_pickup_date ||
        container.planned_pickup_date;

      if (!candidateDate) return;

      items.push({
        id: `container-${container.id}`,
        title: `${container.waste_type || "-"} • ${container.container_size || "-"}`,
        subtitle: "Container",
        dateLabel: formatDate(candidateDate),
        sortValue: toTime(candidateDate),
        tone: "purple",
      });
    });

    photos.forEach((photo) => {
      if (!photo.created_at) return;

      items.push({
        id: `photo-${photo.id}`,
        title: photo.title || "Foto",
        subtitle: photo.category || "Foto",
        dateLabel: formatDate(photo.created_at),
        sortValue: toTime(photo.created_at),
        tone: "blue",
      });
    });

    return items.sort((a, b) => b.sortValue - a.sortValue).slice(0, 12);
  }, [tasks, containers, photos]);

  const todayActions = useMemo(() => {
    const items: {
      id: string;
      title: string;
      subtitle: string;
      tone: "orange" | "green" | "red" | "blue" | "purple";
    }[] = [];

    const todayPlanner = plannerDays.find((day) => day.isToday);

    todayPlanner?.deliveries.forEach((item) => {
      items.push({
        id: `today-delivery-${item.id}`,
        title: `${item.wasteType} • ${item.containerSize}`,
        subtitle: "Levering vandaag",
        tone: "purple",
      });
    });

    todayPlanner?.pickups.forEach((item) => {
      items.push({
        id: `today-pickup-${item.id}`,
        title: `${item.wasteType} • ${item.containerSize}`,
        subtitle: "Ophalen vandaag",
        tone: "purple",
      });
    });

    [...tasks]
      .filter((task) => !isTaskDone(task) && priorityWeight(task) >= 2)
      .sort((a, b) => priorityWeight(b) - priorityWeight(a))
      .slice(0, 3)
      .forEach((task) => {
        items.push({
          id: `today-task-${task.id}`,
          title: getTaskTitle(task),
          subtitle: getTaskMeta(task) || "Open taak",
          tone: isRemoveTask(task) ? "green" : "red",
        });
      });

    return items.slice(0, 6);
  }, [plannerDays, tasks]);

  const priorityItems = useMemo(() => {
    const items: {
      id: string;
      title: string;
      subtitle: string;
      tone: "orange" | "green" | "red" | "blue" | "purple";
    }[] = [];

    const openDoTasks = doTasks.filter((task) => !isTaskDone(task)).length;
    const openDontTasks = dontTasks.filter((task) => !isTaskDone(task)).length;
    const highPriorityOpenTasks = tasks.filter(
      (task) => !isTaskDone(task) && priorityWeight(task) === 3
    ).length;

    if (highPriorityOpenTasks > 0) {
      items.push({
        id: "priority-high",
        title: `${highPriorityOpenTasks} hoge prioriteit open`,
        subtitle: "Direct aandacht nodig",
        tone: "orange",
      });
    }

    if (openDoTasks > 0) {
      items.push({
        id: "priority-do",
        title: `${openDoTasks} open bij wel weg`,
        subtitle: "Nog uit te voeren",
        tone: "green",
      });
    }

    if (openDontTasks > 0) {
      items.push({
        id: "priority-dont",
        title: `${openDontTasks} open bij niet weg`,
        subtitle: "Extra bewaken",
        tone: "red",
      });
    }

    if (photos.length === 0) {
      items.push({
        id: "priority-photos",
        title: "Nog geen foto's toegevoegd",
        subtitle: "Visuele documentatie ontbreekt",
        tone: "blue",
      });
    }

    return items.slice(0, 5);
  }, [doTasks, dontTasks, tasks, photos.length]);

  const parsedProjectNotes = useMemo(
    () => parseProjectNotes(project?.notes),
    [project?.notes]
  );

  const infoAttachments = useMemo(
    () => photos.filter((photo) => (photo.category || "").toLowerCase() === "bijlage"),
    [photos]
  );

  const displayPhotos = useMemo(
    () => photos.filter((photo) => (photo.category || "").toLowerCase() !== "bijlage"),
    [photos]
  );

  const projectStats = useMemo(() => {
    const checkedTasks = tasks.filter((task) => isTaskDone(task)).length;
    const openTasks = tasks.length - checkedTasks;
    const progress = tasks.length > 0 ? Math.round((checkedTasks / tasks.length) * 100) : 0;

    const deliveries = containers.filter(
      (container) => container.planned_delivery_date || container.actual_delivery_date
    ).length;

    const pickups = containers.filter(
      (container) => container.planned_pickup_date || container.actual_pickup_date
    ).length;

    return {
      totalTasks: tasks.length,
      checkedTasks,
      openTasks,
      progress,
      containers: containers.length,
      deliveries,
      pickups,
      photos: displayPhotos.length,
      attachments: infoAttachments.length,
      executors: projectExecutors.length,
    };
  }, [tasks, containers, displayPhotos.length, infoAttachments.length, projectExecutors.length]);

  if (loading) {
    return (
      <main style={pageStyle}>
        <p>Project laden...</p>
      </main>
    );
  }

  if (!project) {
    return (
      <main style={pageStyle}>
        <p>Project niet gevonden.</p>
      </main>
    );
  }

  return (
    <main style={pageStyle}>

      <div style={pageInnerStyle}>
        <section style={heroSectionStyle}>
          <div style={heroTopRowStyle}>
            <div style={projectTitleWrapStyle}>
              <div style={projectTitleLogoStyle}>🏢</div>
              <div>
                <h1 style={pageTitleStyle}>{project.name}</h1>
                <div style={heroMetaStyle}>
                  {project.address || "Geen adres"} · {project.opdrachtgever || "Geen opdrachtgever"}
                </div>
              </div>
            </div>

 <div style={topNavStyle}>
  <button
    type="button"
    onClick={() => setShowProjectEdit((current) => !current)}
    style={headerEditButtonStyle}
  >
    {showProjectEdit ? "Sluiten" : "Bewerken"}
  </button>

<button
  type="button"
  onClick={async () => {
    const confirmed = window.confirm(
      "Weet je zeker dat je dit project wilt verwijderen? Dit kan niet ongedaan worden gemaakt."
    );

    if (!confirmed) return;

    try {
      await deleteProjectById(projectId);
      window.location.href = "/projecten";
    } catch (error) {
      console.error(error);
      setMessage("Project verwijderen mislukt.");
    }
  }}
  style={deleteProjectButtonStyle}
>
  Verwijderen
</button>

  <Link href="/projecten" style={breadcrumbSecondaryStyle}>
    Projecten
  </Link>

  <Link href="/" style={dashboardHomeButtonStyle} title="Dashboard">
    🏠
  </Link>
</div>
          </div>

          <div style={heroStatsGridStyle}>
            <KpiCard
  label="Voortgang"
  value={`${projectStats.progress}%`}
  detail={`${projectStats.checkedTasks}/${projectStats.totalTasks} afgerond`}
  accent="#ef6b1f"
  onClick={() =>
    setKpiModal({
      title: "Voortgang taken",
      items: [
        { label: "Totaal taken", value: `${projectStats.totalTasks}` },
        { label: "Afgerond", value: `${projectStats.checkedTasks}` },
        { label: "Open", value: `${projectStats.openTasks}` },
        { label: "Voortgang", value: `${projectStats.progress}%` },
      ],
    })
  }
/>

<KpiCard
  label="Open taken"
  value={projectStats.openTasks}
  detail="Nog te behandelen"
  accent="#b8754f"
  onClick={() =>
    setKpiModal({
      title: "Open taken",
      items: tasks
        .filter((task) => !isTaskDone(task))
        .map((task) => ({
          label: getTaskTitle(task),
          value: getTaskMeta(task) || "Open taak",
        })),
    })
  }
/>

<KpiCard
  label="Containers"
  value={projectStats.containers}
  detail={`${projectStats.deliveries} leveringen · ${projectStats.pickups} ophalingen`}
  accent="#6f927d"
  onClick={() =>
    setKpiModal({
      title: "Containers",
      items: containers.map((container) => ({
        label: `${container.waste_type || "-"} · ${container.container_size || "-"}`,
        value: `Levering: ${formatDate(
          container.actual_delivery_date || container.planned_delivery_date
        )} · Ophalen: ${formatDate(
          container.actual_pickup_date || container.planned_pickup_date
        )}`,
        href: `/containers?projectId=${projectId}#container-${container.id}`,
      })),
    })
  }
/>

<KpiCard
  label="Foto's & bijlagen"
  value={projectStats.photos + projectStats.attachments}
  detail={`${projectStats.photos} foto's · ${projectStats.attachments} bijlagen`}
  accent="#8aa0a8"
  onClick={() =>
    setKpiModal({
      title: "Foto's & bijlagen",
      items: photos.map((photo) => ({
        label: photo.title || "Foto / bijlage",
        value: `${photo.category || "-"} · ${photo.label || "-"}`,
        href: photo.file_url || undefined,
      })),
    })
  }
/>

<KpiCard
  label="Team"
  value={projectStats.executors}
  detail="Gekoppelde uitvoerders"
  accent="#c97862"
  onClick={() =>
    setKpiModal({
      title: "Team",
      items: projectExecutors.map((executor) => ({
        label: executor.name,
        value: executor.is_app_user ? "App-gebruiker" : "Uitvoerder",
      })),
    })
  }
/>

{kpiModal ? (
  <div style={modalBackdropStyle} onClick={() => setKpiModal(null)}>
    <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
      <div style={modalHeaderStyle}>
        <h3 style={modalTitleStyle}>{kpiModal.title}</h3>
        <button type="button" onClick={() => setKpiModal(null)} style={modalCloseStyle}>
          ×
        </button>
      </div>

      <div style={modalListStyle}>
        {kpiModal.items.length === 0 ? (
          <EmptyState text="Geen gegevens gevonden." />
        ) : (
          kpiModal.items.map((item, index) =>
            item.href ? (
              <Link key={index} href={item.href} style={modalItemLinkStyle}>
                <div style={modalItemTitleStyle}>{item.label}</div>
                <div style={modalItemMetaStyle}>{item.value}</div>
              </Link>
            ) : (
              <div key={index} style={modalItemLinkStyle}>
                <div style={modalItemTitleStyle}>{item.label}</div>
                <div style={modalItemMetaStyle}>{item.value}</div>
              </div>
            )
          )
        )}
      </div>
    </div>
  </div>
) : null}

          </div>
        </section>

        {message && <div style={messageStyle}>{message}</div>}

        <SectionShell title="Informatie" bg={sectionBgInfo}>
          <div style={pageAlignedContentStyle}>
            {showProjectEdit ? (
              <div style={editProjectWrapStyle}>
                <div style={editProjectGridStyle}>
                  <input value={projectEditForm.name} onChange={(e) => setProjectEditForm({ ...projectEditForm, name: e.target.value })} placeholder="Projectnaam" style={inputStyle} />
                  <input value={projectEditForm.address} onChange={(e) => setProjectEditForm({ ...projectEditForm, address: e.target.value })} placeholder="Adres" style={inputStyle} />
                  <input value={projectEditForm.demolition_type} onChange={(e) => setProjectEditForm({ ...projectEditForm, demolition_type: e.target.value })} placeholder="Soort opdracht" style={inputStyle} />
                  <input value={projectEditForm.building_type} onChange={(e) => setProjectEditForm({ ...projectEditForm, building_type: e.target.value })} placeholder="Pand / gebouw" style={inputStyle} />
                  <input value={projectEditForm.area_m2} onChange={(e) => setProjectEditForm({ ...projectEditForm, area_m2: e.target.value })} placeholder="Aantal m²" style={inputStyle} />
                  <input value={projectEditForm.bag_build_year} onChange={(e) => setProjectEditForm({ ...projectEditForm, bag_build_year: e.target.value })} placeholder="Bouwjaar" style={inputStyle} />
                  <input value={projectEditForm.opdrachtgever} onChange={(e) => setProjectEditForm({ ...projectEditForm, opdrachtgever: e.target.value })} placeholder="Opdrachtgever" style={inputStyle} />
                  <input type="date" value={projectEditForm.start_date} onChange={(e) => setProjectEditForm({ ...projectEditForm, start_date: e.target.value })} style={inputStyle} />
                  <input type="date" value={projectEditForm.end_date} onChange={(e) => setProjectEditForm({ ...projectEditForm, end_date: e.target.value })} style={inputStyle} />
                  <input value={projectEditForm.work_days} onChange={(e) => setProjectEditForm({ ...projectEditForm, work_days: e.target.value })} placeholder="Werkdagen" style={inputStyle} />
                  <input value={projectEditForm.status} onChange={(e) => setProjectEditForm({ ...projectEditForm, status: e.target.value })} placeholder="Status" style={inputStyle} />
                </div>

                <textarea
                  value={projectEditForm.overviewNotes}
                  onChange={(e) =>
                    setProjectEditForm({
                      ...projectEditForm,
                      overviewNotes: e.target.value,
                    })
                  }
                  placeholder="Notities"
                  style={textareaStyle}
                />

                <div style={editProjectActionsStyle}>
                  <button type="button" onClick={handleSaveProjectEdit} disabled={savingProject} style={buttonStyle}>
                    {savingProject ? "Opslaan..." : "Project opslaan"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setProjectEditForm(
                        buildProjectEditForm(project, parsedProjectNotes.overviewNotes)
                      );
                      setShowProjectEdit(false);
                    }}
                    style={secondaryButtonStyle}
                  >
                    Annuleren
                  </button>
                </div>
              </div>
            ) : (
              <div style={projectInfoGridStyle}>
                <InfoPill label="Adres" value={project.address || "-"} />
                <InfoPill label="Soort opdracht" value={project.demolition_type || "-"} />
                <InfoPill label="Pand / gebouw" value={project.building_type || "-"} />
                <InfoPill label="Aantal m²" value={project.area_m2 || "-"} />
                <InfoPill label="Bouwjaar" value={(project as Project & { bag_build_year?: string | number | null }).bag_build_year || "-"} />
                <InfoPill label="Opdrachtgever" value={project.opdrachtgever || "-"} />
                <InfoPill label="Begindatum" value={formatDate(project.start_date)} />
                <InfoPill label="Einddatum" value={formatDate(project.end_date)} />
                <InfoPill label="Werkdagen" value={project.work_days || "-"} />
                <InfoPill label="Status" value={project.status || "-"} />

                <div style={infoBottomGridStyle}>
                  <div style={infoNotesCardStyle}>
                    <div style={infoPillLabelStyle}>Notities</div>
                    <div style={infoPillValueStyle}>{parsedProjectNotes.overviewNotes || "-"}</div>
                  </div>

                  <div style={attachmentListCardStyle}>
                    <div style={attachmentListHeaderStyle}>
                      <button
                        type="button"
                        onClick={() => infoAttachmentInputRef.current?.click()}
                        disabled={savingInfoAttachment}
                        style={attachmentSmallPlusButtonStyle}
                        title="Bijlage toevoegen"
                      >
                        {savingInfoAttachment ? "..." : "+"}
                      </button>

                      <div>
                        <div style={attachmentListTitleStyle}>Bijlagen</div>
                        <div style={smallMutedStyle}>{infoAttachments.length} bestand(en)</div>
                      </div>
                    </div>

                    <input
                      ref={infoAttachmentInputRef}
                      type="file"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          void handleInfoAttachmentUpload(file);
                        }
                      }}
                    />

                    {infoAttachments.length === 0 ? (
                      <div style={attachmentEmptyStyle}>Nog geen bijlagen toegevoegd.</div>
                    ) : (
                      <div style={attachmentListStyle}>
                        {infoAttachments.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setAttachmentPreview(item)}
                            style={attachmentListItemButtonStyle}
                          >
                            <div style={attachmentListItemTopStyle}>
                              <span style={attachmentListItemTitleStyle}>{item.title || "Bijlage"}</span>
                            </div>
                            <div style={attachmentListItemMetaStyle}>
                              {isImageFile(item) ? "Foto" : isPdfFile(item) ? "PDF" : "Bestand"}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </SectionShell>

        <SectionShell title="Planning" bg={sectionBgPlanning}>
          <div style={pageAlignedContentStyle}>
            <div style={plannerScrollWrapStyle}>
              <div style={plannerGridStyle}>
                {plannerDays.map((day) => {
                  const totalCount = day.deliveries.length + day.pickups.length;

                  return (
                    <div
                      key={day.key}
                      style={{
                        ...plannerDayCardStyle,
                        background: day.isActive ? "#f7fbf8" : "#ffffff",
                        border: day.isToday
                          ? "2px solid #ef6b1f"
                          : day.isActive
                          ? "1px solid #d8eadc"
                          : "1px solid #e6ddd4",
                      }}
                    >
                      <div style={plannerTopRowStyle}>
                        <div style={plannerTopLeftStyle}>
                          <span style={plannerDayStyle}>{day.shortDay}</span>
                          <span style={plannerDateStyle}>{day.shortDate}</span>
                        </div>

                        <div style={plannerCardActionsStyle}>
                          {day.isToday ? <span style={todayBadgeStyle}>Vandaag</span> : null}

                          {canManageProjectSetup ? (
                            <button type="button" onClick={() => openPlannerContainerModal(day.key)} style={plannerPlusButtonStyle} title="Container toevoegen">
                              +
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          totalCount > 0
                            ? setPlannerDialog({
                                title: `Containers ${day.shortDay} ${day.shortDate}`,
                                items: [...day.deliveries, ...day.pickups],
                              })
                            : undefined
                        }
                        style={{
                          ...plannerSingleButtonStyle,
                          cursor: totalCount > 0 ? "pointer" : "default",
                        }}
                      >
                        <span style={plannerSingleLabelStyle}>Containeractiviteit</span>
                        <div style={plannerActivityMiniGridStyle}>
                          <div style={plannerActivityMiniStyle}>
                            <span>Levering</span>
                            <strong>{day.deliveries.length}</strong>
                          </div>
                          <div style={plannerActivityMiniStyle}>
                            <span>Ophalen</span>
                            <strong>{day.pickups.length}</strong>
                          </div>
                        </div>
                      </button>

                      <div style={plannerNoteWrapStyle}>
                        <textarea
                          value={plannerNoteDrafts[day.key] ?? ""}
                          onChange={(e) => {
                            const nextValue = e.target.value;

                            setPlannerNoteDrafts((current) => ({
                              ...current,
                              [day.key]: nextValue,
                            }));

                            setPlannerNotes((current) => ({
                              ...current,
                              [day.key]: nextValue,
                            }));
                          }}
                          onBlur={() => handleSavePlannerNote(day.key)}
                          placeholder="Notitie"
                          style={plannerNoteTextareaStyle}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </SectionShell>

        <SectionShell
          title="Taken"
          bg={sectionBgTasks}
          rightAction={
            canManageProjectSetup ? (
              <button type="button" onClick={() => setShowTaskForm((current) => !current)} style={primarySmallButtonStyle}>
                {showTaskForm ? "Sluiten" : "Nieuwe taak toevoegen"}
              </button>
            ) : null
          }
        >
          <div style={pageAlignedContentStyle}>
            {showTaskForm && canManageProjectSetup ? (
              <div style={compactCreateWrapStyle}>
                <form onSubmit={handleTaskSubmit}>
                  <div style={compactFormGridStyle}>
                    <select value={taskForm.task_type} onChange={(e) => setTaskForm({ ...taskForm, task_type: e.target.value })} style={inputStyle}>
                      <option value="Wel slopen">Wel weg</option>
                      <option value="Niet slopen">Niet weg</option>
                    </select>

                    <input placeholder="Taakomschrijving" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} style={inputStyle} />
                    <input placeholder="Ruimte / verdieping" value={taskForm.location} onChange={(e) => setTaskForm({ ...taskForm, location: e.target.value })} style={inputStyle} />

                    <select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })} style={inputStyle}>
                      <option value="Laag">Laag</option>
                      <option value="Middel">Middel</option>
                      <option value="Hoog">Hoog</option>
                    </select>

                    <textarea placeholder="Notities" value={taskForm.notes} onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })} style={textareaStyle} />

                    <button type="submit" disabled={savingTask} style={buttonStyle}>
                      {savingTask ? "Opslaan..." : "Taak opslaan"}
                    </button>
                  </div>
                </form>
              </div>
            ) : null}

            <div style={tasksTwoColStyle}>
              <TaskGroupCard title="Wel weg" tasks={doTasks} canToggleTasks={canToggleTasks} onToggle={handleToggleTask} getChecked={isTaskDone} getTitle={getTaskTitle} getMeta={getTaskMeta} getNotes={getTaskNotes} />
              <TaskGroupCard title="Niet weg" tasks={dontTasks} canToggleTasks={canToggleTasks} onToggle={handleToggleTask} getChecked={isTaskDone} getTitle={getTaskTitle} getMeta={getTaskMeta} getNotes={getTaskNotes} />
            </div>
          </div>
        </SectionShell>

        <SectionShell title="" bg={sectionBgAction} hideHeader>
          <div style={pageAlignedContentStyle}>
            <div style={twoColumnRowStyle}>
              <div style={innerPanelStyle}>
                {todayActions.length === 0 ? (
                  <EmptyState text="Vandaag zijn er geen directe acties." />
                ) : (
                  <div style={actionListStyle}>
                    {todayActions.map((item) => (
                      <ActionRow key={item.id} title={item.title} subtitle={item.subtitle} tone={item.tone} />
                    ))}
                  </div>
                )}
              </div>

              <div style={innerPanelStyle}>
                {priorityItems.length === 0 ? (
                  <EmptyState text="Geen prioriteiten gevonden." />
                ) : (
                  <div style={actionListStyle}>
                    {priorityItems.map((item) => (
                      <ActionRow key={item.id} title={item.title} subtitle={item.subtitle} tone={item.tone} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </SectionShell>

        <SectionShell
          title="Containers"
          bg={sectionBgContainers}
          rightAction={
            <Link href={`/containers?projectId=${projectId}`} style={primarySmallButtonLinkStyle}>
              Open containerpagina
            </Link>
          }
        >
          <div style={pageAlignedContentStyle}>
            <div style={twoColumnRowStyle}>
              <div style={innerPanelStyle}>
                <div style={innerPanelTitleStyle}>Container overzicht</div>

                {containers.length === 0 ? (
                  <EmptyState text="Nog geen containers toegevoegd." />
                ) : (
                  <div style={simpleContainerListStyle}>
                    {containers.map((container) => (
                      <div key={container.id} id={`container-${container.id}`} style={simpleContainerCardStyle}>
                        <div style={simpleContainerTopStyle}>
                          <div>
                            <div style={simpleContainerTitleStyle}>
                              {container.waste_type || "-"} • {container.container_size || "-"}
                            </div>
                            <div style={simpleContainerMetaStyle}>
                              Levering: {formatDate(container.actual_delivery_date || container.planned_delivery_date)}
                            </div>
                            <div style={simpleContainerMetaStyle}>
                              Ophalen: {formatDate(container.actual_pickup_date || container.planned_pickup_date)}
                            </div>
                          </div>
                          <span style={containerBadgeStyle}>Container</span>
                        </div>

                        {container.notes ? <div style={simpleContainerNotesStyle}>{container.notes}</div> : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={innerPanelStyle}>
                <div style={innerPanelTitleStyle}>Nieuwe container</div>

                {canManageProjectSetup ? (
                  <form onSubmit={handleContainerSubmit}>
                    <div style={compactFormGridStyle}>
                      <select value={containerForm.waste_type} onChange={(e) => setContainerForm({ ...containerForm, waste_type: e.target.value })} style={inputStyle}>
                        <option value="Bouw- en sloop">Bouw- en sloop</option>
                        <option value="B-hout">B-hout</option>
                        <option value="Puin">Puin</option>
                        <option value="Gemengd">Gemengd</option>
                        <option value="Grofvuil">Grofvuil</option>
                        <option value="IJzer">IJzer</option>
                        <option value="Glas">Glas</option>
                        <option value="Karton">Karton</option>
                      </select>

                      <select value={containerForm.container_size} onChange={(e) => setContainerForm({ ...containerForm, container_size: e.target.value })} style={inputStyle}>
                        <option value="3 m³">3 m³</option>
                        <option value="6 m³">6 m³</option>
                        <option value="10 m³">10 m³</option>
                        <option value="20 m³">20 m³</option>
                        <option value="40 m³">40 m³</option>
                      </select>

                      <input type="date" value={containerForm.planned_delivery_date} onChange={(e) => setContainerForm({ ...containerForm, planned_delivery_date: e.target.value })} style={inputStyle} />
                      <input type="date" value={containerForm.planned_pickup_date} onChange={(e) => setContainerForm({ ...containerForm, planned_pickup_date: e.target.value })} style={inputStyle} />

                      <textarea placeholder="Notitie" value={containerForm.notes} onChange={(e) => setContainerForm({ ...containerForm, notes: e.target.value })} style={textareaStyle} />

                      <button type="submit" disabled={savingContainer} style={buttonStyle}>
                        {savingContainer ? "Opslaan..." : "Container opslaan"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <EmptyState text="Alleen admin of office kan containers toevoegen." />
                )}
              </div>
            </div>
          </div>
        </SectionShell>

       <SectionShell title="" bg={sectionBgTeamTimeline} hideHeader>
          <div style={pageAlignedContentStyle}>
            <div style={twoColumnRowStyle}>
              <div style={innerPanelStyle}>
                <div style={innerPanelTitleStyle}>Team</div>

                {canManageProjectSetup ? (
                  <form onSubmit={handleAddExecutor}>
                    <div style={teamToolbarStyle}>
                      <select value={selectedExecutorId} onChange={(e) => setSelectedExecutorId(e.target.value)} style={inputStyle}>
                        <option value="">Kies uitvoerder</option>
                        {allExecutors.map((executor) => (
                          <option key={executor.id} value={executor.id}>
                            {executor.name}
                          </option>
                        ))}
                      </select>

                      <button type="submit" disabled={savingExecutor} style={buttonStyle}>
                        {savingExecutor ? "Opslaan..." : "Koppelen"}
                      </button>
                    </div>
                  </form>
                ) : null}

                <div style={teamListStyle}>
                  {projectExecutors.length === 0 ? (
                    <EmptyState text="Geen uitvoerders gekoppeld." />
                  ) : (
                    projectExecutors.map((executor) => (
                      <div key={executor.id} style={executorRowStyle}>
                        <div>
                          <div style={executorNameStyle}>{executor.name}</div>
                          <div style={executorSubStyle}>
                            {executor.is_app_user ? "App-gebruiker" : "Alleen uitvoerder"}
                          </div>
                        </div>

                        {canManageProjectSetup ? (
                          <button type="button" onClick={() => handleRemoveExecutor(executor.id)} style={secondaryButtonStyle}>
                            Verwijderen
                          </button>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div style={innerPanelStyle}>
                <div style={innerPanelTitleStyle}>Timeline</div>

                {timelineItems.length === 0 ? (
                  <EmptyState text="Nog geen timeline-items." />
                ) : (
                  <div style={timelineListStyle}>
                    {timelineItems.map((item, index) => (
                      <TimelineRow key={item.id} title={item.title} subtitle={item.subtitle} dateLabel={item.dateLabel} tone={item.tone} isLast={index === timelineItems.length - 1} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </SectionShell>

        <div id="photos-section">
          <SectionShell title="Foto's" bg={sectionBgPhotos}>
            <div style={pageAlignedContentStyle}>
              <div style={twoColumnRowStyle}>
                <div style={innerPanelStyle}>
                  <div style={innerPanelTitleStyle}>Nieuwe foto</div>

                  {canUploadPhotos ? (
                    <form onSubmit={handlePhotoSubmit}>
                      <div style={compactFormGridStyle}>
                        <select value={photoForm.category} onChange={(e) => setPhotoForm({ ...photoForm, category: e.target.value })} style={inputStyle}>
                          <option value="Vooraf">Vooraf</option>
                          <option value="Tijdens">Tijdens</option>
                          <option value="Achteraf">Achteraf</option>
                        </select>

                        <select value={photoForm.label} onChange={(e) => setPhotoForm({ ...photoForm, label: e.target.value })} style={inputStyle}>
                          <option value="Wel slopen">Wel weg</option>
                          <option value="Niet slopen">Niet weg</option>
                          <option value="Opletpunt">Opletpunt</option>
                          <option value="Schade">Schade</option>
                          <option value="Oplevering">Oplevering</option>
                        </select>

                        <input placeholder="Titel foto" value={photoForm.title} onChange={(e) => setPhotoForm({ ...photoForm, title: e.target.value })} style={inputStyle} />
                        <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} style={inputStyle} />

                        <textarea placeholder="Notities bij foto" value={photoForm.notes} onChange={(e) => setPhotoForm({ ...photoForm, notes: e.target.value })} style={textareaStyle} />

                        <button type="submit" disabled={savingPhoto} style={buttonStyle}>
                          {savingPhoto ? "Uploaden..." : "Foto uploaden"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <EmptyState text="Je hebt geen rechten om foto's te uploaden." />
                  )}
                </div>

                <div style={innerPanelStyle}>
                  <div style={innerPanelTitleStyle}>Foto lijst</div>

                  {displayPhotos.length === 0 ? (
                    <EmptyState text="Geen foto's." />
                  ) : (
                    <div style={photoListStyle}>
                      {displayPhotos.map((photo) => (
                        <button key={photo.id} type="button" onClick={() => setAttachmentPreview(photo)} style={photoRowButtonStyle}>
                          {photo.file_url ? (
                            <img src={photo.file_url} alt={photo.title} style={photoThumbStyle} />
                          ) : (
                            <div style={photoThumbFallbackStyle}>Geen foto</div>
                          )}

                          <div style={photoInfoStyle}>
                            <div style={photoTitleStyle}>{photo.title}</div>
                            <div style={photoMetaStyle}>{photo.category || "-"} • {photo.label || "-"}</div>
                            <div style={photoDateStyle}>{photo.created_at ? formatDate(photo.created_at) : "-"}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </SectionShell>
        </div>
      </div>

      {plannerDialog ? (
        <div style={modalBackdropStyle} onClick={() => setPlannerDialog(null)}>
          <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <h3 style={modalTitleStyle}>{plannerDialog.title}</h3>
              <button type="button" onClick={() => setPlannerDialog(null)} style={modalCloseStyle}>×</button>
            </div>

            <div style={modalListStyle}>
              {plannerDialog.items.map((item) => (
                <Link key={item.id} href={`/containers?projectId=${projectId}#container-${item.id}`} style={modalItemLinkStyle} onClick={() => setPlannerDialog(null)}>
                  <div style={modalItemTitleStyle}>{item.wasteType} • {item.containerSize}</div>
                  <div style={modalItemMetaStyle}>Open container op containerpagina</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {plannerContainerModal ? (
        <div style={modalBackdropStyle} onClick={() => setPlannerContainerModal(null)}>
          <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <h3 style={modalTitleStyle}>Container toevoegen</h3>
              <button type="button" onClick={() => setPlannerContainerModal(null)} style={modalCloseStyle}>×</button>
            </div>

            <form onSubmit={handlePlannerContainerSubmit} style={modalFormGridStyle}>
              <select value={plannerContainerForm.waste_type} onChange={(e) => setPlannerContainerForm({ ...plannerContainerForm, waste_type: e.target.value })} style={inputStyle}>
                <option value="Bouw- en sloop">Bouw- en sloop</option>
                <option value="B-hout">B-hout</option>
                <option value="Puin">Puin</option>
                <option value="Gemengd">Gemengd</option>
                <option value="Grofvuil">Grofvuil</option>
                <option value="IJzer">IJzer</option>
                <option value="Glas">Glas</option>
                <option value="Karton">Karton</option>
              </select>

              <select value={plannerContainerForm.container_size} onChange={(e) => setPlannerContainerForm({ ...plannerContainerForm, container_size: e.target.value })} style={inputStyle}>
                <option value="3 m³">3 m³</option>
                <option value="6 m³">6 m³</option>
                <option value="10 m³">10 m³</option>
                <option value="20 m³">20 m³</option>
                <option value="40 m³">40 m³</option>
              </select>

              <input type="date" value={plannerContainerForm.planned_delivery_date} onChange={(e) => setPlannerContainerForm({ ...plannerContainerForm, planned_delivery_date: e.target.value })} style={inputStyle} />
              <input type="date" value={plannerContainerForm.planned_pickup_date} onChange={(e) => setPlannerContainerForm({ ...plannerContainerForm, planned_pickup_date: e.target.value })} style={inputStyle} />

              <textarea value={plannerContainerForm.notes} onChange={(e) => setPlannerContainerForm({ ...plannerContainerForm, notes: e.target.value })} placeholder="Notitie" style={textareaStyle} />

              <button type="submit" disabled={savingContainer} style={buttonStyle}>
                {savingContainer ? "Opslaan..." : "Container opslaan"}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {attachmentPreview ? (
        <div style={modalBackdropStyle} onClick={() => setAttachmentPreview(null)}>
          <div style={attachmentModalCardStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <h3 style={modalTitleStyle}>{attachmentPreview.title || "Bijlage"}</h3>
              <button type="button" onClick={() => setAttachmentPreview(null)} style={modalCloseStyle}>×</button>
            </div>

            <div style={attachmentPreviewWrapStyle}>
              {attachmentPreview?.file_url ? (
                isImageFile(attachmentPreview) ? (
                  <img src={attachmentPreview.file_url} alt={attachmentPreview.title || "Bijlage"} style={attachmentPreviewImageStyle} />
                ) : (
                  <iframe src={attachmentPreview.file_url} title={attachmentPreview.title || "Bijlage"} style={attachmentPreviewFrameStyle} />
                )
              ) : (
                <div style={attachmentGenericPreviewStyle}>Geen preview beschikbaar.</div>
              )}
            </div>

            <div style={attachmentActionWrapStyle}>
              {attachmentPreview?.file_url ? (
                <a href={attachmentPreview.file_url} download={attachmentPreview.title || "bijlage"} target="_blank" rel="noreferrer" style={attachmentDownloadButtonStyle}>
                  Downloaden
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function SectionShell({
  title,
  children,
  bg,
  rightAction,
  hideHeader,
}: {
  title: string;
  children: ReactNode;
  bg: string;
  rightAction?: ReactNode;
  hideHeader?: boolean;
}) {
  return (
    <section style={{ ...sectionShellStyle, background: bg }}>
      {!hideHeader ? (
        <div style={sectionHeaderStyle}>
          <h2 style={sectionTitleStyle}>{title}</h2>
          {rightAction}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function KpiCard({
  label,
  value,
  detail,
  accent,
  onClick,
}: {
  label: string;
  value: string | number;
  detail: string;
  accent: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...kpiCardStyle,
        borderTop: `5px solid ${accent}`,
        cursor: onClick ? "pointer" : "default",
        textAlign: "left",
      }}
    >
      <div style={kpiLabelStyle}>{label}</div>
      <div style={kpiValueStyle}>{value}</div>
      <div style={kpiDetailStyle}>{detail}</div>
    </button>
  );
}

function InfoPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={infoPillStyle}>
      <div style={infoPillLabelStyle}>{label}</div>
      <div style={infoPillValueStyle}>{value}</div>
    </div>
  );
}

function TaskGroupCard({
  title,
  tasks,
  canToggleTasks,
  onToggle,
  getChecked,
  getTitle,
  getMeta,
  getNotes,
}: {
  title: string;
  tasks: ProjectTask[];
  canToggleTasks: boolean;
  onToggle: (taskId: string, currentValue: boolean) => Promise<void>;
  getChecked: (task: ProjectTask) => boolean;
  getTitle: (task: ProjectTask) => string;
  getMeta: (task: ProjectTask) => string;
  getNotes: (task: ProjectTask) => string;
}) {
  const checkedCount = tasks.filter((task) => getChecked(task)).length;
  const openCount = tasks.length - checkedCount;
  const isDoGroup = title === "Wel weg";

  const tone = isDoGroup
    ? { border: "#33b96a", dot: "#20a94c", bg: "#f4fbf6" }
    : { border: "#eb4d4d", dot: "#e33434", bg: "#fff6f6" };

  return (
    <div style={taskGroupCardStyle}>
      <div style={taskGroupHeaderStyle}>
        <div>
          <div style={taskGroupTitleStyle}>{title}</div>
          <div style={taskGroupMetaStyle}>
            {tasks.length} totaal · {openCount} open · {checkedCount} afgerond
          </div>
        </div>
      </div>

      <div style={taskItemsWrapStyle}>
        {tasks.length === 0 ? (
          <EmptyState text="Geen taken." />
        ) : (
          tasks.map((task) => {
            const checked = getChecked(task);

            return (
              <div key={task.id} style={{ ...taskItemCardStyle, border: `2px solid ${tone.border}`, background: checked ? "#ffffff" : tone.bg }}>
                <button type="button" onClick={() => onToggle(task.id, checked)} disabled={!canToggleTasks} style={taskToggleButtonStyle}>
                  <span style={{ ...taskDotStyle, border: `2px solid ${tone.dot}`, background: checked ? tone.dot : "#ffffff" }} />

                  <span style={taskTextWrapStyle}>
                    <span style={{ ...taskItemTitleStyle, textDecoration: checked ? "line-through" : "none" }}>
                      {getTitle(task)}
                    </span>

                    {getMeta(task) ? <span style={taskMetaTextStyle}>{getMeta(task)}</span> : null}
                    {getNotes(task) ? <span style={taskNoteTextStyle}>{getNotes(task)}</span> : null}
                  </span>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ActionRow({
  title,
  subtitle,
  tone,
}: {
  title: string;
  subtitle: string;
  tone: "orange" | "green" | "red" | "blue" | "purple";
}) {
  const colorMap = {
    orange: "#ef6b1f",
    green: "#20a94c",
    red: "#e33434",
    blue: "#4a86e8",
    purple: "#8a63d2",
  };

  return (
    <div style={actionRowStyle}>
      <div style={{ ...actionDotStyle, background: colorMap[tone] }} />
      <div>
        <div style={actionTitleStyle}>{title}</div>
        <div style={actionSubtitleStyle}>{subtitle}</div>
      </div>
    </div>
  );
}

function TimelineRow({
  title,
  subtitle,
  dateLabel,
  tone,
  isLast,
}: {
  title: string;
  subtitle: string;
  dateLabel: string;
  tone: "green" | "red" | "blue" | "purple" | "orange";
  isLast?: boolean;
}) {
  const colorMap = {
    orange: "#ef6b1f",
    green: "#20a94c",
    red: "#e33434",
    blue: "#4a86e8",
    purple: "#8a63d2",
  };

  return (
    <div style={timelineRowStyle}>
      <div style={timelineLineWrapStyle}>
        <div style={{ ...timelineDotStyle, background: colorMap[tone] }} />
        {!isLast ? <div style={timelineLineStyle} /> : null}
      </div>

      <div style={timelineContentStyle}>
        <div style={timelineTopStyle}>
          <div style={timelineTitleStyle}>{title}</div>
          <div style={timelineDateStyle}>{dateLabel}</div>
        </div>
        <div style={timelineSubtitleStyle}>{subtitle}</div>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div style={emptyStateStyle}>{text}</div>;
}

function buildProjectEditForm(project: Project | null, overviewNotes: string) {
  if (!project) return initialProjectEditForm;

  const dynamicProject = project as Project & {
    bag_build_year?: string | number | null;
  };

  return {
    name: project.name || "",
    address: project.address || "",
    demolition_type: project.demolition_type || "",
    building_type: project.building_type || "",
    area_m2: project.area_m2 ? String(project.area_m2) : "",
    bag_build_year: dynamicProject.bag_build_year ? String(dynamicProject.bag_build_year) : "",
    opdrachtgever: project.opdrachtgever || "",
    start_date: project.start_date || "",
    end_date: project.end_date || "",
    work_days: project.work_days ? String(project.work_days) : "",
    status: project.status || "",
    overviewNotes,
  };
}

function priorityWeight(task: ProjectTask) {
  const current = ((task as ProjectTask & { priority?: string | null }).priority || "").toLowerCase();

  if (current === "hoog") return 3;
  if (current === "middel") return 2;
  return 1;
}

function parseProjectNotes(value?: string | null): NotesPayload {
  if (!value?.trim()) {
    return {
      overviewNotes: "",
      plannerNotes: {},
    };
  }

  try {
    const parsed = JSON.parse(value) as Partial<NotesPayload>;
    return {
      overviewNotes: typeof parsed.overviewNotes === "string" ? parsed.overviewNotes : "",
      plannerNotes:
        parsed.plannerNotes && typeof parsed.plannerNotes === "object"
          ? parsed.plannerNotes
          : {},
    };
  } catch {
    const legacy = value.trim();
    const normalizedLegacy = legacy.toLowerCase().startsWith("uitvoerder:") ? "" : legacy;

    return {
      overviewNotes: normalizedLegacy,
      plannerNotes: {},
    };
  }
}

function serializeProjectNotes(payload: NotesPayload) {
  return JSON.stringify({
    overviewNotes: payload.overviewNotes || "",
    plannerNotes: payload.plannerNotes || {},
  });
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
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

function toTime(value?: string | null) {
  if (!value) return 0;
  const date = new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
}

function isProjectActiveOnDate(project: Project | null, key: string) {
  if (!project?.start_date || !project?.end_date) return false;

  const start = getDateKey(project.start_date);
  const end = getDateKey(project.end_date);

  return key >= start && key <= end;
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

function nextWeekday(date: Date) {
  let cursor = new Date(date);
  while (!isWeekday(cursor)) {
    cursor = addDays(cursor, 1);
  }
  return cursor;
}

function buildFutureWorkdays(base: Date, amount: number) {
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

function buildPlannerDays(project: Project, plannerNotes: PlannerNoteMap) {
  const today = nextWeekday(new Date());
  const projectStartRaw = project.start_date ? new Date(project.start_date) : new Date();
  const projectStart = nextWeekday(projectStartRaw);

  const futureDates = buildFutureWorkdays(today, 20);
  const lastFuture = futureDates[futureDates.length - 1];

  const result: Date[] = [];
  let cursor = projectStart < today ? new Date(projectStart) : new Date(today);

  while (cursor <= lastFuture) {
    if (isWeekday(cursor)) {
      result.push(new Date(cursor));
    }
    cursor = addDays(cursor, 1);
  }

  if (result.length === 0) {
    result.push(new Date(today));
  }

  const noteKeys = Object.keys(plannerNotes).sort();
  noteKeys.forEach((key) => {
    if (!result.some((item) => getDateKey(item) === key)) {
      const noteDate = new Date(key);
      if (!Number.isNaN(noteDate.getTime()) && isWeekday(noteDate)) {
        result.push(noteDate);
      }
    }
  });

  return result.sort((a, b) => toTime(a.toISOString()) - toTime(b.toISOString()));
}

function isImageFile(file: ProjectPhoto) {
  const target = `${file.title || ""} ${file.file_url || ""}`.toLowerCase();
  return (
    target.includes(".png") ||
    target.includes(".jpg") ||
    target.includes(".jpeg") ||
    target.includes(".gif") ||
    target.includes(".webp") ||
    target.includes(".bmp") ||
    target.includes(".svg")
  );
}

function isPdfFile(file: ProjectPhoto) {
  const target = `${file.title || ""} ${file.file_url || ""}`.toLowerCase();
  return target.includes(".pdf");
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

const dashboardHomeButtonStyle: CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: 16,
  background: "#ef6b1f",
  color: "#ffffff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  fontSize: 23,
  boxShadow: "0 12px 24px rgba(239,107,31,0.22)",
  marginLeft: 4,
};

const heroSectionStyle: CSSProperties = {
  background: "#fffaf6",
  border: "1px solid #eadfd4",
  borderRadius: 30,
  padding: 22,
  marginBottom: 18,
  boxShadow: "0 14px 28px rgba(23,23,23,0.045)",
};

const heroTopRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 18,
  flexWrap: "wrap",
};

const projectTitleWrapStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
};

const projectTitleLogoStyle: CSSProperties = {
  width: 72,
  height: 72,
  borderRadius: 0,
  background: "transparent",
  color: "#5f6f5b",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 44,
  flexShrink: 0,
};

const pageTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 36,
  lineHeight: 1.05,
  color: "#171717",
  fontWeight: 900,
  letterSpacing: "-0.6px",
};

const heroMetaStyle: CSSProperties = {
  marginTop: 8,
  color: "#6b675f",
  fontSize: 15,
  lineHeight: 1.45,
};

const heroStatsGridStyle: CSSProperties = {
  marginTop: 20,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 14,
};

const kpiCardStyle: CSSProperties = {
  background: "#fffdfb",
  border: "1px solid #e7d8c8",
  borderRadius: 22,
  padding: 17,
  minHeight: 118,
  boxShadow: "0 12px 26px rgba(72,52,38,0.07)",
  transition: "transform 160ms ease, box-shadow 160ms ease",
};

const kpiLabelStyle: CSSProperties = {
  fontSize: 12,
  color: "#6b675f",
  fontWeight: 900,
  textTransform: "uppercase",
};

const kpiValueStyle: CSSProperties = {
  marginTop: 10,
  fontSize: 34,
  lineHeight: 1,
  color: "#171717",
  fontWeight: 900,
};

const kpiDetailStyle: CSSProperties = {
  marginTop: 9,
  fontSize: 13,
  lineHeight: 1.4,
  color: "#6b675f",
};

const topNavStyle: CSSProperties = {
  display: "flex",
  gap: 14,
  flexWrap: "wrap",
  alignItems: "center",
};

const breadcrumbSecondaryStyle: CSSProperties = {
  background: "#ffffff",
  color: "#3b3733",
  textDecoration: "none",
  border: "1px solid #d9cfc4",
  borderRadius: 14,
  padding: "11px 15px",
  fontSize: 13,
  fontWeight: 900,
  boxShadow: "0 12px 24px rgba(72,52,38,0.10)",
transition: "transform 160ms ease, box-shadow 160ms ease",
};

const headerEditButtonStyle: CSSProperties = {
  background: "#171717",
  color: "#ffffff",
  border: "none",
  borderRadius: 14,
  padding: "12px 16px",
  fontSize: 13,
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 12px 24px rgba(72,52,38,0.10)",
transition: "transform 160ms ease, box-shadow 160ms ease",
};

const messageStyle: CSSProperties = {
  marginBottom: 18,
  padding: 14,
  borderRadius: 16,
  background: "#fff7ed",
  border: "1px solid #fdba74",
  color: "#9a3412",
  fontWeight: 800,
};

const sectionShellStyle: CSSProperties = {
  borderRadius: 30,
  border: "1px solid #e2d2c2",
  padding: 20,
  marginBottom: 22,
  boxShadow: "0 16px 34px rgba(72,52,38,0.075)",
};

const sectionHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 16,
  paddingLeft: 8,
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 23,
  color: "#171717",
  fontWeight: 900,
};

const sectionBgInfo = "#eaf4ff";   
const sectionBgPlanning = "#eaf4ff";    
const sectionBgTasks = "#eaf4ff";      
const sectionBgAction = "#eaf4ff";    
const sectionBgContainers = "#eaf4ff";  
const sectionBgTeamTimeline = "#eaf4ff";  
const sectionBgPhotos = "#eaf4ff";        

const pageAlignedContentStyle: CSSProperties = {
  paddingLeft: 8,
  paddingRight: 0,
};

const projectInfoGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 12,
};

const infoPillStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #eadfd4",
  borderRadius: 18,
  padding: 14,
  minHeight: 92,
  boxShadow: "0 8px 18px rgba(23,23,23,0.03)",
};

const infoPillLabelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  textTransform: "uppercase",
  color: "#6b675f",
};

const infoPillValueStyle: CSSProperties = {
  marginTop: 8,
  fontSize: 16,
  fontWeight: 800,
  color: "#171717",
  lineHeight: 1.5,
};

const infoBottomGridStyle: CSSProperties = {
  gridColumn: "1 / -1",
  display: "grid",
  gridTemplateColumns: "1.7fr 1fr",
  gap: 12,
};

const infoNotesCardStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #eadfd4",
  borderRadius: 18,
  padding: 14,
  minHeight: 116,
};

const attachmentListCardStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #eadfd4",
  borderRadius: 18,
  padding: 14,
  minHeight: 116,
};

const attachmentListHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const attachmentSmallPlusButtonStyle: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 10,
  border: "1px solid #bfe2ae",
  background: "#effbe8",
  color: "#59a52b",
  fontSize: 22,
  fontWeight: 900,
  lineHeight: 1,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  boxShadow: "0 12px 24px rgba(72,52,38,0.10)",
transition: "transform 160ms ease, box-shadow 160ms ease",
};

const attachmentListTitleStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: 900,
  color: "#171717",
};

const smallMutedStyle: CSSProperties = {
  marginTop: 3,
  fontSize: 12,
  color: "#6b675f",
  fontWeight: 700,
};

const attachmentListStyle: CSSProperties = {
  display: "grid",
  gap: 10,
  marginTop: 12,
};

const attachmentListItemButtonStyle: CSSProperties = {
  width: "100%",
  textAlign: "left",
  background: "#fffaf6",
  border: "1px solid #d8d0c7",
  borderRadius: 14,
  padding: "12px 14px",
  cursor: "pointer",
  boxShadow: "0 12px 24px rgba(72,52,38,0.10)",
transition: "transform 160ms ease, box-shadow 160ms ease",
};

const attachmentListItemTopStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const attachmentListItemTitleStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 800,
  color: "#171717",
  wordBreak: "break-word",
};

const attachmentListItemMetaStyle: CSSProperties = {
  marginTop: 6,
  fontSize: 12,
  color: "#6b675f",
};

const attachmentEmptyStyle: CSSProperties = {
  marginTop: 10,
  color: "#6b675f",
  fontSize: 14,
};

const plannerScrollWrapStyle: CSSProperties = {
  overflowX: "auto",
  paddingBottom: 6,
};

const plannerGridStyle: CSSProperties = {
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "230px",
  gap: 12,
  minWidth: "max-content",
};

const plannerDayCardStyle: CSSProperties = {
  borderRadius: 22,
  padding: 14,
  minHeight: 232,
  boxShadow: "0 8px 18px rgba(23,23,23,0.035)",
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

const plannerCardActionsStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
};

const plannerDayStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 900,
  color: "#5f5a54",
};

const plannerDateStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 900,
  color: "#171717",
};

const todayBadgeStyle: CSSProperties = {
  background: "#ef6b1f",
  color: "#ffffff",
  borderRadius: 999,
  padding: "4px 9px",
  fontSize: 11,
  fontWeight: 900,
};

const plannerPlusButtonStyle: CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: "50%",
  border: "1px solid #ef6b1f",
  background: "#fff7ef",
  color: "#ef6b1f",
  fontSize: 20,
  lineHeight: 1,
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 12px 24px rgba(72,52,38,0.10)",
transition: "transform 160ms ease, box-shadow 160ms ease",
};

const plannerSingleButtonStyle: CSSProperties = {
  marginTop: 12,
  width: "100%",
  background: "#ffffff",
  border: "1px solid #e8ddd2",
  borderRadius: 16,
  padding: 14,
  textAlign: "left",
  boxShadow: "0 12px 24px rgba(72,52,38,0.10)",
transition: "transform 160ms ease, box-shadow 160ms ease",
};

const plannerSingleLabelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  color: "#6b675f",
  display: "block",
  textTransform: "uppercase",
};

const plannerActivityMiniGridStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  marginTop: 10,
};

const plannerActivityMiniStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  fontSize: 14,
  color: "#171717",
};

const plannerNoteWrapStyle: CSSProperties = {
  marginTop: 12,
};

const plannerNoteTextareaStyle: CSSProperties = {
  width: "100%",
  minHeight: 82,
  padding: 12,
  borderRadius: 14,
  border: "1px solid #d9cfc4",
  background: "#ffffff",
  fontSize: 14,
  color: "#171717",
  resize: "vertical",
  fontFamily: "Arial, sans-serif",
};

const primarySmallButtonStyle: CSSProperties = {
  background: "#ef6b1f",
  color: "#ffffff",
  border: "none",
  borderRadius: 14,
  padding: "12px 16px",
  fontSize: 14,
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 12px 24px rgba(72,52,38,0.10)",
transition: "transform 160ms ease, box-shadow 160ms ease",
};

const primarySmallButtonLinkStyle: CSSProperties = {
  background: "#ef6b1f",
  color: "#ffffff",
  textDecoration: "none",
  borderRadius: 14,
  padding: "12px 16px",
  fontSize: 14,
  fontWeight: 900,
  display: "inline-flex",
  alignItems: "center",
};

const compactCreateWrapStyle: CSSProperties = {
  marginBottom: 16,
  background: "#ffffff",
  border: "1px solid #eadfd4",
  borderRadius: 20,
  padding: 16,
};

const compactFormGridStyle: CSSProperties = {
  display: "grid",
  gap: 12,
};

const tasksTwoColStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 16,
};

const taskGroupCardStyle: CSSProperties = {
  borderRadius: 22,
  padding: 16,
  background: "#ffffff",
  border: "1px solid #eadfd4",
};

const taskGroupHeaderStyle: CSSProperties = {
  marginBottom: 12,
};

const taskGroupTitleStyle: CSSProperties = {
  fontSize: 21,
  fontWeight: 900,
  color: "#171717",
};

const taskGroupMetaStyle: CSSProperties = {
  marginTop: 6,
  color: "#6b675f",
  fontSize: 14,
  fontWeight: 700,
};

const taskItemsWrapStyle: CSSProperties = {
  display: "grid",
  gap: 12,
};

const taskItemCardStyle: CSSProperties = {
  borderRadius: 18,
  padding: 14,
};

const taskToggleButtonStyle: CSSProperties = {
  width: "100%",
  background: "transparent",
  border: "none",
  padding: 0,
  cursor: "pointer",
  textAlign: "left",
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
  boxShadow: "0 12px 24px rgba(72,52,38,0.10)",
transition: "transform 160ms ease, box-shadow 160ms ease",
};

const taskDotStyle: CSSProperties = {
  width: 18,
  height: 18,
  minWidth: 18,
  borderRadius: "50%",
  marginTop: 3,
  boxSizing: "border-box",
};

const taskTextWrapStyle: CSSProperties = {
  display: "grid",
  gap: 6,
};

const taskItemTitleStyle: CSSProperties = {
  fontWeight: 900,
  fontSize: 16,
  color: "#171717",
};

const taskMetaTextStyle: CSSProperties = {
  fontSize: 14,
  color: "#666",
};

const taskNoteTextStyle: CSSProperties = {
  fontSize: 14,
  color: "#666",
};

const twoColumnRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
  gap: 16,
};

const innerPanelStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #eadfd4",
  borderRadius: 22,
  padding: 16,
  minHeight: 100,
  boxShadow: "0 8px 18px rgba(23,23,23,0.035)",
};

const innerPanelTitleStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 900,
  marginBottom: 12,
  color: "#171717",
};

const actionListStyle: CSSProperties = {
  display: "grid",
  gap: 10,
};

const actionRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "12px 1fr",
  gap: 12,
  padding: 12,
  background: "#fafafa",
  border: "1px solid #ece3da",
  borderRadius: 16,
};

const actionDotStyle: CSSProperties = {
  width: 12,
  height: 12,
  borderRadius: "50%",
  marginTop: 5,
};

const actionTitleStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: 900,
  color: "#171717",
};

const actionSubtitleStyle: CSSProperties = {
  marginTop: 5,
  fontSize: 13,
  color: "#6b675f",
};

const simpleContainerListStyle: CSSProperties = {
  display: "grid",
  gap: 12,
};

const simpleContainerCardStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #eadfd4",
  borderRadius: 18,
  padding: 14,
};

const simpleContainerTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
};

const simpleContainerTitleStyle: CSSProperties = {
  fontSize: 16,
  fontWeight: 900,
  color: "#171717",
};

const simpleContainerMetaStyle: CSSProperties = {
  marginTop: 8,
  fontSize: 14,
  color: "#5f5a54",
};

const simpleContainerNotesStyle: CSSProperties = {
  marginTop: 10,
  fontSize: 13,
  color: "#6b675f",
  lineHeight: 1.5,
};

const containerBadgeStyle: CSSProperties = {
  background: "#e4f1ed",
  color: "#3f7c6b",
  border: "1px solid #d8e0d3",
  borderRadius: 999,
  padding: "7px 10px",
  fontSize: 12,
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const teamToolbarStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 160px",
  gap: 12,
  marginBottom: 12,
};

const teamListStyle: CSSProperties = {
  display: "grid",
  gap: 12,
};

const executorRowStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #eadfd4",
  borderRadius: 16,
  padding: 14,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};

const executorNameStyle: CSSProperties = {
  fontSize: 16,
  fontWeight: 900,
  color: "#171717",
};

const executorSubStyle: CSSProperties = {
  marginTop: 4,
  fontSize: 13,
  color: "#6b675f",
};

const timelineListStyle: CSSProperties = {
  display: "grid",
  gap: 0,
};

const timelineRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "22px 1fr",
  gap: 14,
};

const timelineLineWrapStyle: CSSProperties = {
  display: "grid",
  justifyItems: "center",
  gridTemplateRows: "14px auto",
};

const timelineDotStyle: CSSProperties = {
  width: 14,
  height: 14,
  borderRadius: "50%",
  marginTop: 4,
};

const timelineLineStyle: CSSProperties = {
  width: 2,
  background: "#ddd6cf",
  minHeight: 52,
  marginTop: 4,
};

const timelineContentStyle: CSSProperties = {
  paddingBottom: 18,
};

const timelineTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};

const timelineTitleStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: 900,
  color: "#171717",
};

const timelineDateStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: "#6b675f",
};

const timelineSubtitleStyle: CSSProperties = {
  marginTop: 5,
  fontSize: 13,
  color: "#6b675f",
};

const photoListStyle: CSSProperties = {
  display: "grid",
  gap: 12,
};

const photoRowButtonStyle: CSSProperties = {
  width: "100%",
  background: "#ffffff",
  border: "1px solid #eadfd4",
  borderRadius: 18,
  padding: 12,
  display: "grid",
  gridTemplateColumns: "92px 1fr",
  gap: 12,
  alignItems: "center",
  cursor: "pointer",
  textAlign: "left",
  boxShadow: "0 12px 24px rgba(72,52,38,0.10)",
transition: "transform 160ms ease, box-shadow 160ms ease",
};

const photoThumbStyle: CSSProperties = {
  width: 92,
  height: 72,
  objectFit: "cover",
  borderRadius: 12,
  display: "block",
  background: "#f2ece6",
};

const photoThumbFallbackStyle: CSSProperties = {
  width: 92,
  height: 72,
  borderRadius: 12,
  background: "#f2ece6",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#6b675f",
  fontSize: 12,
  fontWeight: 800,
};

const photoInfoStyle: CSSProperties = {
  display: "grid",
  gap: 4,
};

const photoTitleStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: 900,
  color: "#171717",
};

const photoMetaStyle: CSSProperties = {
  fontSize: 13,
  color: "#6b675f",
};

const photoDateStyle: CSSProperties = {
  fontSize: 12,
  color: "#8a8178",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "15px 16px",
  borderRadius: 14,
  border: "1px solid #d9cfc4",
  background: "#ffffff",
  fontSize: 16,
  color: "#171717",
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: 100,
  resize: "vertical",
};

const buttonStyle: CSSProperties = {
  background: "#ef6b1f",
  color: "#ffffff",
  border: "none",
  borderRadius: 14,
  padding: "15px 16px",
  fontSize: 16,
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 12px 24px rgba(72,52,38,0.10)",
transition: "transform 160ms ease, box-shadow 160ms ease",
};

const secondaryButtonStyle: CSSProperties = {
  background: "#ffffff",
  color: "#171717",
  border: "1px solid #d9cfc4",
  borderRadius: 12,
  padding: "11px 14px",
  fontSize: 14,
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 12px 24px rgba(72,52,38,0.10)",
transition: "transform 160ms ease, box-shadow 160ms ease",
};

const editProjectWrapStyle: CSSProperties = {
  display: "grid",
  gap: 12,
};

const editProjectGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

const editProjectActionsStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
};

const emptyStateStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #eadfd4",
  borderRadius: 16,
  padding: 14,
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
  maxWidth: 560,
  background: "#ffffff",
  borderRadius: 24,
  padding: 18,
  border: "1px solid #eadfd4",
  boxShadow: "0 24px 48px rgba(0,0,0,0.16)",
};

const deleteProjectButtonStyle: CSSProperties = {
  background: "transparent",
  color: "#8a8178",
  border: "1px solid #e2d8cf",
  borderRadius: 14,
  padding: "12px 16px",
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
};

const attachmentModalCardStyle: CSSProperties = {
  width: "100%",
  maxWidth: 900,
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
  marginTop: 4,
  fontSize: 13,
  color: "#6b675f",
};

const modalFormGridStyle: CSSProperties = {
  marginTop: 14,
  display: "grid",
  gap: 12,
};

const attachmentPreviewWrapStyle: CSSProperties = {
  marginTop: 16,
};

const attachmentPreviewImageStyle: CSSProperties = {
  width: "100%",
  maxHeight: "70vh",
  objectFit: "contain",
  borderRadius: 16,
  background: "#f7f3ef",
};

const attachmentPreviewFrameStyle: CSSProperties = {
  width: "100%",
  height: "70vh",
  border: "1px solid #eadfd4",
  borderRadius: 16,
  background: "#ffffff",
};

const attachmentGenericPreviewStyle: CSSProperties = {
  padding: 20,
  borderRadius: 16,
  border: "1px solid #eadfd4",
  background: "#fbf8f4",
  color: "#6b675f",
};

const attachmentActionWrapStyle: CSSProperties = {
  marginTop: 16,
  display: "flex",
  justifyContent: "flex-end",
};

const attachmentDownloadButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "14px 18px",
  borderRadius: 16,
  background: "#ef6b1f",
  color: "#ffffff",
  textDecoration: "none",
  fontWeight: 900,
  border: "none",
  boxShadow: "0 12px 24px rgba(72,52,38,0.10)",
transition: "transform 160ms ease, box-shadow 160ms ease",
};

const premiumHoverStyle: CSSProperties = {
  transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
};

const premiumShadowStyle: CSSProperties = {
  boxShadow: "0 14px 30px rgba(72, 52, 38, 0.08)",
};