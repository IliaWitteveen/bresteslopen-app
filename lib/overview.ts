import { getCurrentAppUser, type CurrentAppUser } from "@/lib/auth";
import { getProjects } from "@/lib/projects";
import { getContainersByProjectId } from "@/lib/containers";
import { getPhotosByProjectId } from "@/lib/photos";
import { getTasksByProjectId } from "@/lib/tasks";
import { getExecutorsByProjectId } from "@/lib/executors";
import { Project } from "@/types/project";
import { ProjectContainer } from "@/types/container";
import { ProjectPhoto } from "@/types/photo";
import { ProjectTask } from "@/types/task";
import { Executor } from "@/types/executor";

export type ProjectBundle = {
  project: Project;
  containers: ProjectContainer[];
  photos: ProjectPhoto[];
  tasks: ProjectTask[];
  executors: Executor[];
};

export type LoadedOverview = {
  appUser: CurrentAppUser;
  projects: Project[];
  bundles: ProjectBundle[];
};

type ContainerStatusResult = {
  label: "Gepland" | "Lopend" | "Afgerond" | "Geannuleerd" | "Onderweg" | "Geplaatst" | "Opgehaald";
  color: string;
  value: string;
};

export async function loadProjectBundlesForCurrentUser(): Promise<LoadedOverview | null> {
  const appUser = await getCurrentAppUser();

  if (!appUser) {
    return null;
  }

  let projects: Project[] = [];

  if (appUser.profileId) {
    try {
      projects = await getProjects(appUser.profileId);
    } catch (error) {
      console.error("Get projects with profileId failed:", error);
    }
  }

  if (projects.length === 0) {
    try {
      projects = await getProjects(appUser.authUserId);
    } catch (error) {
      console.error("Get projects with authUserId failed:", error);
      throw error;
    }
  }

  const bundles = await Promise.all(
    projects.map(async (project) => {
      const [containers, photos, tasks, executors] = await Promise.all([
        getContainersByProjectId(project.id).catch((error) => {
          console.error("Containers load error:", error);
          return [];
        }),
        getPhotosByProjectId(project.id).catch((error) => {
          console.error("Photos load error:", error);
          return [];
        }),
        getTasksByProjectId(project.id).catch((error) => {
          console.error("Tasks load error:", error);
          return [];
        }),
        getExecutorsByProjectId(project.id).catch((error) => {
          console.error("Executors load error:", error);
          return [];
        }),
      ]);

      return {
        project,
        containers,
        photos,
        tasks,
        executors,
      };
    })
  );

  return {
    appUser,
    projects,
    bundles,
  };
}

export function getProjectStatusColor(status: string) {
  const value = (status || "").toLowerCase();

  if (value === "afgerond") return "#5ca67a";
  if (value === "bezig") return "#7ea3e6";
  if (value === "gepland") return "#b7bcc7";
  return "#f1a15a";
}

export function getProjectStatusLabel(status: string) {
  return status || "Concept";
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getContainerStatus(container: ProjectContainer): ContainerStatusResult {
  const dynamicContainer = container as ProjectContainer & {
    status?: string | null;
    delivery_time?: string | null;
    pickup_time?: string | null;
  };

  const explicit = (dynamicContainer.status || "").trim().toLowerCase();

  if (explicit === "geannuleerd") {
    return {
      label: "Geannuleerd",
      color: "#a1a1aa",
      value: "Geannuleerd",
    };
  }

  if (explicit === "opgehaald") {
    return {
      label: "Opgehaald",
      color: "#5ca67a",
      value: "Opgehaald",
    };
  }

  if (explicit === "geplaatst") {
    return {
      label: "Geplaatst",
      color: "#7ea3e6",
      value: "Geplaatst",
    };
  }

  if (explicit === "onderweg") {
    return {
      label: "Onderweg",
      color: "#ef6b1f",
      value: "Onderweg",
    };
  }

  if (explicit === "gepland") {
    return {
      label: "Gepland",
      color: "#b7bcc7",
      value: "Gepland",
    };
  }

  const today = startOfDay(new Date());

  const actualPickup = parseDate(container.actual_pickup_date);
  const plannedPickup = parseDate(container.planned_pickup_date);
  const actualDelivery = parseDate(container.actual_delivery_date);
  const plannedDelivery = parseDate(container.planned_delivery_date);

  if (actualPickup && startOfDay(actualPickup) < today) {
    return {
      label: "Afgerond",
      color: "#5ca67a",
      value: "Afgerond",
    };
  }

  if (actualPickup && startOfDay(actualPickup).getTime() === today.getTime()) {
    return {
      label: "Lopend",
      color: "#7ea3e6",
      value: "Lopend",
    };
  }

  if (actualDelivery && startOfDay(actualDelivery) <= today) {
    return {
      label: "Lopend",
      color: "#7ea3e6",
      value: "Lopend",
    };
  }

  if (
    plannedDelivery &&
    startOfDay(plannedDelivery) <= today &&
    (!plannedPickup || startOfDay(plannedPickup) >= today)
  ) {
    return {
      label: "Lopend",
      color: "#7ea3e6",
      value: "Lopend",
    };
  }

  return {
    label: "Gepland",
    color: "#b7bcc7",
    value: "Gepland",
  };
}

export function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatTime(value?: string | null) {
  if (!value) return "-";
  return value.slice(0, 5);
}

export function formatDateTime(date?: string | null, time?: string | null) {
  const dateLabel = formatDate(date);
  const timeLabel = formatTime(time);

  if (dateLabel === "-" && timeLabel === "-") return "-";
  if (dateLabel === "-") return timeLabel;
  if (timeLabel === "-") return dateLabel;

  return `${dateLabel} • ${timeLabel}`;
}

export function isProjectActive(project: Project) {
  return (project.status || "").toLowerCase() === "bezig";
}

export function isProjectPlanned(project: Project) {
  return (project.status || "").toLowerCase() === "gepland";
}

export function isProjectCompleted(project: Project) {
  return (project.status || "").toLowerCase() === "afgerond";
}

export function getProjectsForDate(projects: Project[], date: Date) {
  return projects.filter((project) => {
    if (!project.start_date || !project.end_date) return false;

    const start = new Date(project.start_date);
    const end = new Date(project.end_date);

    const currentOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const startOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    return currentOnly >= startOnly && currentOnly <= endOnly;
  });
}