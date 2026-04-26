"use client";

import { AnalysisCharts } from "@/components/analyse/AnalysisCharts";
import ProjectCard, { type ProjectCardData } from "@/components/project-card";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  loadProjectBundlesForCurrentUser,
  type ProjectBundle,
} from "@/lib/overview";

type ProjectInsight = {
  id: string;
  name: string;
  opdrachtgever: string;
  status: string;
  statusLabel: string;
  demolitionType: string;
  buildingType: string;
  areaM2: number;
  workDays: number;
  buildYear: number | null;
  startDate: string | null;
  endDate: string | null;
  estimatedManHours: number;
  actualManHours: number;
  openTasks: number;
  checkedTasks: number;
  totalTasks: number;
  taskCompletion: number;
  photos: number;
  containers: number;
  plannedContainers: number;
  actualContainers: number;
  containerDifference: number;
  hasBagData: boolean;
  hasPhotos: boolean;
  hasContainers: boolean;
  executors: string[];
};

type BreakdownItem = {
  label: string;
  value: number;
};

type SummaryItem = {
  label: string;
  value: string | number;
};

type ActiveFilterChip = {
  label: string;
  onRemove: () => void;
};

type ChartMetric = {
  label: string;
  value: number;
};

const STATUS_OPTIONS = ["Alles", "Concept", "Gepland", "Bezig", "Afgerond"];
const BAG_OPTIONS = ["Alles", "Met BAG-data", "Zonder BAG-data"];
const PHOTO_OPTIONS = ["Alles", "Met foto's", "Zonder foto's"];
const CONTAINER_OPTIONS = ["Alles", "Met containers", "Zonder containers"];
const OPEN_TASK_OPTIONS = ["Alles", "Met open taken", "Zonder open taken"];
const CONTAINER_DELTA_OPTIONS = [
  "Alles",
  "Tekort containers",
  "Overschot containers",
  "Exact volgens planning",
];

export default function AnalysePage() {
  const [loading, setLoading] = useState(true);
  const [bundles, setBundles] = useState<ProjectBundle[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Alles");
  const [projectFilter, setProjectFilter] = useState("Alles");
  const [opdrachtgeverFilter, setOpdrachtgeverFilter] = useState("Alles");
  const [executorFilter, setExecutorFilter] = useState("Alles");
  const [demolitionTypeFilter, setDemolitionTypeFilter] = useState("Alles");
  const [buildingTypeFilter, setBuildingTypeFilter] = useState("Alles");
  const [bagFilter, setBagFilter] = useState("Alles");
  const [photoFilter, setPhotoFilter] = useState("Alles");
  const [containerFilter, setContainerFilter] = useState("Alles");
  const [openTaskFilter, setOpenTaskFilter] = useState("Alles");
  const [containerDeltaFilter, setContainerDeltaFilter] = useState("Alles");

  const [minAreaFilter, setMinAreaFilter] = useState("");
  const [maxAreaFilter, setMaxAreaFilter] = useState("");
  const [minBuildYearFilter, setMinBuildYearFilter] = useState("");
  const [maxBuildYearFilter, setMaxBuildYearFilter] = useState("");
  const [minContainersFilter, setMinContainersFilter] = useState("");
  const [maxContainersFilter, setMaxContainersFilter] = useState("");
  const [minWorkDaysFilter, setMinWorkDaysFilter] = useState("");
  const [maxWorkDaysFilter, setMaxWorkDaysFilter] = useState("");
  const [minOpenTasksFilter, setMinOpenTasksFilter] = useState("");
  const [maxOpenTasksFilter, setMaxOpenTasksFilter] = useState("");
  const [minProgressFilter, setMinProgressFilter] = useState("");
  const [maxProgressFilter, setMaxProgressFilter] = useState("");
  const [minStartDateFilter, setMinStartDateFilter] = useState("");
  const [maxEndDateFilter, setMaxEndDateFilter] = useState("");

  const [sortBy, setSortBy] = useState("openTasksDesc");
  const [projectCardLimit, setProjectCardLimit] = useState("10");

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

  const allProjectInsights = useMemo<ProjectInsight[]>(() => {
    return bundles.map((bundle) => {
      const totalTasks = bundle.tasks.length;

      const checkedTasks = bundle.tasks.filter((task) =>
        Boolean(
          (task as { is_checked?: boolean | null; is_done?: boolean | null }).is_checked ??
            (task as { is_checked?: boolean | null; is_done?: boolean | null }).is_done ??
            false
        )
      ).length;

      const openTasks = totalTasks - checkedTasks;

      const plannedContainers = bundle.containers.reduce(
        (sum, container) => sum + Number(container.planned_quantity || 0),
        0
      );

      const actualContainers = bundle.containers.reduce(
        (sum, container) => sum + Number(container.actual_quantity || 0),
        0
      );

      const taskCompletion =
        totalTasks > 0 ? Math.round((checkedTasks / totalTasks) * 100) : 0;

      const areaM2 = Number(bundle.project.area_m2 || 0);
      const workDays = Number(bundle.project.work_days || 0);
      const estimatedManHours = Number(bundle.project.estimated_man_hours || 0);
      const actualManHours = Number(bundle.project.actual_man_hours || 0);

      return {
        id: bundle.project.id,
        name: bundle.project.name || "-",
        opdrachtgever: bundle.project.opdrachtgever || "Onbekend",
        status: (bundle.project.status || "Concept").toLowerCase(),
        statusLabel: bundle.project.status || "Concept",
        demolitionType: bundle.project.demolition_type || "Onbekend",
        buildingType: bundle.project.building_type || "Onbekend",
        areaM2,
        workDays,
        buildYear: bundle.project.bag_build_year ?? null,
        startDate: bundle.project.start_date || null,
        endDate: bundle.project.end_date || null,
        estimatedManHours,
        actualManHours,
        openTasks,
        checkedTasks,
        totalTasks,
        taskCompletion,
        photos: bundle.photos.length,
        containers: bundle.containers.length,
        plannedContainers,
        actualContainers,
        containerDifference: actualContainers - plannedContainers,
        hasBagData: Boolean(
          bundle.project.bag_build_year ||
            bundle.project.bag_surface_m2 ||
            bundle.project.bag_pand_id ||
            bundle.project.bag_verblijfsobject_id
        ),
        hasPhotos: bundle.photos.length > 0,
        hasContainers: bundle.containers.length > 0,
        executors: bundle.executors.map((executor) => executor.name).filter(Boolean),
      };
    });
  }, [bundles]);

  const projectOptions = useMemo(
    () => ["Alles", ...uniqueSorted(allProjectInsights.map((item) => item.name))],
    [allProjectInsights]
  );

  const opdrachtgeverOptions = useMemo(
    () => ["Alles", ...uniqueSorted(allProjectInsights.map((item) => item.opdrachtgever))],
    [allProjectInsights]
  );

  const executorOptions = useMemo(
    () => ["Alles", ...uniqueSorted(allProjectInsights.flatMap((item) => item.executors))],
    [allProjectInsights]
  );

  const demolitionTypeOptions = useMemo(
    () => ["Alles", ...uniqueSorted(allProjectInsights.map((item) => item.demolitionType))],
    [allProjectInsights]
  );

  const buildingTypeOptions = useMemo(
    () => ["Alles", ...uniqueSorted(allProjectInsights.map((item) => item.buildingType))],
    [allProjectInsights]
  );

  const filteredInsights = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const minArea = minAreaFilter ? Number(minAreaFilter) : null;
    const maxArea = maxAreaFilter ? Number(maxAreaFilter) : null;
    const minBuildYear = minBuildYearFilter ? Number(minBuildYearFilter) : null;
    const maxBuildYear = maxBuildYearFilter ? Number(maxBuildYearFilter) : null;
    const minContainers = minContainersFilter ? Number(minContainersFilter) : null;
    const maxContainers = maxContainersFilter ? Number(maxContainersFilter) : null;
    const minWorkDays = minWorkDaysFilter ? Number(minWorkDaysFilter) : null;
    const maxWorkDays = maxWorkDaysFilter ? Number(maxWorkDaysFilter) : null;
    const minOpenTasks = minOpenTasksFilter ? Number(minOpenTasksFilter) : null;
    const maxOpenTasks = maxOpenTasksFilter ? Number(maxOpenTasksFilter) : null;
    const minProgress = minProgressFilter ? Number(minProgressFilter) : null;
    const maxProgress = maxProgressFilter ? Number(maxProgressFilter) : null;
    const minStartDate = minStartDateFilter || null;
    const maxEndDate = maxEndDateFilter || null;

    return allProjectInsights.filter((item) => {
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.statusLabel.toLowerCase().includes(query) ||
        item.demolitionType.toLowerCase().includes(query) ||
        item.buildingType.toLowerCase().includes(query) ||
        item.opdrachtgever.toLowerCase().includes(query) ||
        item.executors.some((executor) => executor.toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === "Alles" ||
        item.statusLabel.toLowerCase() === statusFilter.toLowerCase();

      const matchesProject = projectFilter === "Alles" || item.name === projectFilter;

      const matchesOpdrachtgever =
        opdrachtgeverFilter === "Alles" || item.opdrachtgever === opdrachtgeverFilter;

      const matchesExecutor =
        executorFilter === "Alles" || item.executors.includes(executorFilter);

      const matchesDemolitionType =
        demolitionTypeFilter === "Alles" || item.demolitionType === demolitionTypeFilter;

      const matchesBuildingType =
        buildingTypeFilter === "Alles" || item.buildingType === buildingTypeFilter;

      const matchesBag =
        bagFilter === "Alles" ||
        (bagFilter === "Met BAG-data" && item.hasBagData) ||
        (bagFilter === "Zonder BAG-data" && !item.hasBagData);

      const matchesPhotos =
        photoFilter === "Alles" ||
        (photoFilter === "Met foto's" && item.hasPhotos) ||
        (photoFilter === "Zonder foto's" && !item.hasPhotos);

      const matchesContainers =
        containerFilter === "Alles" ||
        (containerFilter === "Met containers" && item.hasContainers) ||
        (containerFilter === "Zonder containers" && !item.hasContainers);

      const matchesOpenTasks =
        openTaskFilter === "Alles" ||
        (openTaskFilter === "Met open taken" && item.openTasks > 0) ||
        (openTaskFilter === "Zonder open taken" && item.openTasks === 0);

      const matchesContainerDelta =
        containerDeltaFilter === "Alles" ||
        (containerDeltaFilter === "Tekort containers" && item.containerDifference < 0) ||
        (containerDeltaFilter === "Overschot containers" && item.containerDifference > 0) ||
        (containerDeltaFilter === "Exact volgens planning" &&
          item.containerDifference === 0);

      const matchesMinArea = minArea === null || item.areaM2 >= minArea;
      const matchesMaxArea = maxArea === null || item.areaM2 <= maxArea;

      const matchesMinBuildYear =
        minBuildYear === null || (item.buildYear !== null && item.buildYear >= minBuildYear);

      const matchesMaxBuildYear =
        maxBuildYear === null || (item.buildYear !== null && item.buildYear <= maxBuildYear);

      const matchesMinContainers =
        minContainers === null || item.actualContainers >= minContainers;

      const matchesMaxContainers =
        maxContainers === null || item.actualContainers <= maxContainers;

      const matchesMinWorkDays = minWorkDays === null || item.workDays >= minWorkDays;
      const matchesMaxWorkDays = maxWorkDays === null || item.workDays <= maxWorkDays;

      const matchesMinOpenTasks =
        minOpenTasks === null || item.openTasks >= minOpenTasks;

      const matchesMaxOpenTasks =
        maxOpenTasks === null || item.openTasks <= maxOpenTasks;

      const matchesMinProgress =
        minProgress === null || item.taskCompletion >= minProgress;

      const matchesMaxProgress =
        maxProgress === null || item.taskCompletion <= maxProgress;

      const matchesMinStartDate =
        minStartDate === null ||
        (item.startDate !== null && item.startDate >= minStartDate);

      const matchesMaxEndDate =
        maxEndDate === null || (item.endDate !== null && item.endDate <= maxEndDate);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesProject &&
        matchesOpdrachtgever &&
        matchesExecutor &&
        matchesDemolitionType &&
        matchesBuildingType &&
        matchesBag &&
        matchesPhotos &&
        matchesContainers &&
        matchesOpenTasks &&
        matchesContainerDelta &&
        matchesMinArea &&
        matchesMaxArea &&
        matchesMinBuildYear &&
        matchesMaxBuildYear &&
        matchesMinContainers &&
        matchesMaxContainers &&
        matchesMinWorkDays &&
        matchesMaxWorkDays &&
        matchesMinOpenTasks &&
        matchesMaxOpenTasks &&
        matchesMinProgress &&
        matchesMaxProgress &&
        matchesMinStartDate &&
        matchesMaxEndDate
      );
    });
  }, [
    allProjectInsights,
    searchTerm,
    statusFilter,
    projectFilter,
    opdrachtgeverFilter,
    executorFilter,
    demolitionTypeFilter,
    buildingTypeFilter,
    bagFilter,
    photoFilter,
    containerFilter,
    openTaskFilter,
    containerDeltaFilter,
    minAreaFilter,
    maxAreaFilter,
    minBuildYearFilter,
    maxBuildYearFilter,
    minContainersFilter,
    maxContainersFilter,
    minWorkDaysFilter,
    maxWorkDaysFilter,
    minOpenTasksFilter,
    maxOpenTasksFilter,
    minProgressFilter,
    maxProgressFilter,
    minStartDateFilter,
    maxEndDateFilter,
  ]);

  const metrics = useMemo(() => {
    const totalTasks = filteredInsights.reduce((sum, item) => sum + item.totalTasks, 0);
    const checkedTasks = filteredInsights.reduce((sum, item) => sum + item.checkedTasks, 0);
    const openTasks = totalTasks - checkedTasks;

    const totalPhotos = filteredInsights.reduce((sum, item) => sum + item.photos, 0);
    const totalContainerRows = filteredInsights.reduce((sum, item) => sum + item.containers, 0);
    const plannedContainers = filteredInsights.reduce(
      (sum, item) => sum + item.plannedContainers,
      0
    );
    const actualContainers = filteredInsights.reduce(
      (sum, item) => sum + item.actualContainers,
      0
    );
    const totalArea = filteredInsights.reduce((sum, item) => sum + item.areaM2, 0);
    const totalWorkDays = filteredInsights.reduce((sum, item) => sum + item.workDays, 0);
    const totalEstimatedHours = filteredInsights.reduce(
      (sum, item) => sum + item.estimatedManHours,
      0
    );
    const totalActualHours = filteredInsights.reduce(
      (sum, item) => sum + item.actualManHours,
      0
    );

    const conceptCount = filteredInsights.filter((item) => item.status === "concept").length;
    const plannedCount = filteredInsights.filter((item) => item.status === "gepland").length;
    const activeCount = filteredInsights.filter((item) => item.status === "bezig").length;
    const completedCount = filteredInsights.filter((item) => item.status === "afgerond").length;

    const taskCompletion =
      totalTasks > 0 ? Math.round((checkedTasks / totalTasks) * 100) : 0;

    const avgAreaPerProject =
      filteredInsights.length > 0 ? Math.round(totalArea / filteredInsights.length) : 0;

    const avgWorkDaysPerProject =
      filteredInsights.length > 0
        ? Number((totalWorkDays / filteredInsights.length).toFixed(1))
        : 0;

    const areaPerWorkDay =
      totalWorkDays > 0 ? Number((totalArea / totalWorkDays).toFixed(1)) : 0;

    const areaPerHour =
      totalActualHours > 0 ? Number((totalArea / totalActualHours).toFixed(1)) : 0;

    const projectsWithoutPhotos = filteredInsights.filter((item) => item.photos === 0).length;
    const projectsWithoutContainers = filteredInsights.filter((item) => item.containers === 0).length;
    const projectsWithOpenTasks = filteredInsights.filter((item) => item.openTasks > 0).length;
    const projectsWithBagData = filteredInsights.filter((item) => item.hasBagData).length;

    return {
      projectCount: filteredInsights.length,
      conceptCount,
      plannedCount,
      activeCount,
      completedCount,
      totalTasks,
      checkedTasks,
      openTasks,
      totalPhotos,
      totalContainerRows,
      plannedContainers,
      actualContainers,
      containerDifference: actualContainers - plannedContainers,
      taskCompletion,
      totalArea,
      totalWorkDays,
      totalEstimatedHours,
      totalActualHours,
      avgAreaPerProject,
      avgWorkDaysPerProject,
      areaPerWorkDay,
      areaPerHour,
      projectsWithoutPhotos,
      projectsWithoutContainers,
      projectsWithOpenTasks,
      projectsWithBagData,
    };
  }, [filteredInsights]);

  const statusChartData = useMemo<ChartMetric[]>(() => {
    return [
      { label: "Concept", value: metrics.conceptCount },
      { label: "Gepland", value: metrics.plannedCount },
      { label: "Lopend", value: metrics.activeCount },
      { label: "Afgerond", value: metrics.completedCount },
    ].filter((item) => item.value > 0);
  }, [metrics]);

  const openTasksChartData = useMemo<ChartMetric[]>(() => {
    return [...filteredInsights]
      .map((item) => ({
        label: item.name,
        value: item.openTasks,
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredInsights]);

  const containerChartData = useMemo<ChartMetric[]>(() => {
    return [...filteredInsights]
      .map((item) => ({
        label: item.name,
        value: item.actualContainers,
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredInsights]);

  const areaChartData = useMemo<ChartMetric[]>(() => {
    return [...filteredInsights]
      .map((item) => ({
        label: item.name,
        value: item.areaM2,
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredInsights]);

  const photoChartData = useMemo<ChartMetric[]>(() => {
    return [...filteredInsights]
      .map((item) => ({
        label: item.name,
        value: item.photos,
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredInsights]);

  const progressChartData = useMemo<ChartMetric[]>(() => {
  return [...filteredInsights]
    .filter((item) => item.totalTasks > 0)
    .map((item) => ({
      label: item.name,
      value: item.taskCompletion,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}, [filteredInsights]);

  const opdrachtgeverChartData = useMemo<ChartMetric[]>(() => {
    return buildBreakdown(filteredInsights.map((item) => item.opdrachtgever))
      .slice(0, 8)
      .map((item) => ({
        label: item.label,
        value: item.value,
      }));
  }, [filteredInsights]);

  const demolitionBreakdown = useMemo<BreakdownItem[]>(() => {
    return buildBreakdown(filteredInsights.map((item) => item.demolitionType)).slice(0, 6);
  }, [filteredInsights]);

  const buildingBreakdown = useMemo<BreakdownItem[]>(() => {
    return buildBreakdown(filteredInsights.map((item) => item.buildingType)).slice(0, 6);
  }, [filteredInsights]);

  const opdrachtgeverBreakdown = useMemo<BreakdownItem[]>(() => {
    return buildBreakdown(filteredInsights.map((item) => item.opdrachtgever)).slice(0, 6);
  }, [filteredInsights]);

  const executorBreakdown = useMemo<BreakdownItem[]>(() => {
    return buildBreakdown(
      filteredInsights.flatMap((item) =>
        item.executors.length > 0 ? item.executors : ["Geen uitvoerder"]
      )
    ).slice(0, 8);
  }, [filteredInsights]);

  const topOpenTasks = useMemo(() => {
    return [...filteredInsights].sort((a, b) => b.openTasks - a.openTasks).slice(0, 6);
  }, [filteredInsights]);

  const mostContainerDifference = useMemo(() => {
    return [...filteredInsights]
      .filter((item) => item.containerDifference !== 0)
      .sort((a, b) => Math.abs(b.containerDifference) - Math.abs(a.containerDifference))
      .slice(0, 6);
  }, [filteredInsights]);

  const sortedProjectRows = useMemo(() => {
    const rows = [...filteredInsights];

    rows.sort((a, b) => {
      switch (sortBy) {
        case "nameAsc":
          return a.name.localeCompare(b.name);
        case "nameDesc":
          return b.name.localeCompare(a.name);
        case "progressDesc":
          return b.taskCompletion - a.taskCompletion;
        case "progressAsc":
          return a.taskCompletion - b.taskCompletion;
        case "areaDesc":
          return b.areaM2 - a.areaM2;
        case "areaAsc":
          return a.areaM2 - b.areaM2;
        case "photosDesc":
          return b.photos - a.photos;
        case "photosAsc":
          return a.photos - b.photos;
        case "containersDesc":
          return b.actualContainers - a.actualContainers;
        case "containersAsc":
          return a.actualContainers - b.actualContainers;
        case "openTasksAsc":
          return a.openTasks - b.openTasks;
        case "openTasksDesc":
        default:
          return b.openTasks - a.openTasks;
      }
    });

    return rows;
  }, [filteredInsights, sortBy]);

  const visibleProjectCards = useMemo<ProjectCardData[]>(() => {
    return sortedProjectRows.slice(0, Number(projectCardLimit)).map((item) => ({
      id: item.id,
      name: item.name,
      status: item.statusLabel,
      demolitionType: item.demolitionType,
      buildingType: item.buildingType,
      opdrachtgever: item.opdrachtgever,
      executors: item.executors,
      areaM2: item.areaM2,
      workDays: item.workDays,
      openTasks: item.openTasks,
      checkedTasks: item.checkedTasks,
      plannedContainers: item.plannedContainers,
      actualContainers: item.actualContainers,
      taskCompletion: item.taskCompletion,
    }));
  }, [sortedProjectRows, projectCardLimit]);

  const maxBreakdownValue = useMemo(() => {
    return Math.max(
      1,
      ...demolitionBreakdown.map((item) => item.value),
      ...buildingBreakdown.map((item) => item.value),
      ...opdrachtgeverBreakdown.map((item) => item.value),
      ...executorBreakdown.map((item) => item.value)
    );
  }, [
    demolitionBreakdown,
    buildingBreakdown,
    opdrachtgeverBreakdown,
    executorBreakdown,
  ]);

  const planningAccuracy = useMemo(() => {
    if (metrics.plannedContainers === 0) {
      return 0;
    }

    const diff = Math.abs(metrics.actualContainers - metrics.plannedContainers);
    return Math.max(0, 100 - Math.round((diff / metrics.plannedContainers) * 100));
  }, [metrics]);

  const activeFilterChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];

    if (searchTerm.trim()) {
      chips.push({
        label: `Zoek: ${searchTerm.trim()}`,
        onRemove: () => setSearchTerm(""),
      });
    }

    if (statusFilter !== "Alles") {
      chips.push({
        label: `Status: ${statusFilter}`,
        onRemove: () => setStatusFilter("Alles"),
      });
    }

    if (projectFilter !== "Alles") {
      chips.push({
        label: `Project: ${projectFilter}`,
        onRemove: () => setProjectFilter("Alles"),
      });
    }

    if (opdrachtgeverFilter !== "Alles") {
      chips.push({
        label: `Opdrachtgever: ${opdrachtgeverFilter}`,
        onRemove: () => setOpdrachtgeverFilter("Alles"),
      });
    }

    if (executorFilter !== "Alles") {
      chips.push({
        label: `Persoon: ${executorFilter}`,
        onRemove: () => setExecutorFilter("Alles"),
      });
    }

    if (demolitionTypeFilter !== "Alles") {
      chips.push({
        label: `Slooptype: ${demolitionTypeFilter}`,
        onRemove: () => setDemolitionTypeFilter("Alles"),
      });
    }

    if (buildingTypeFilter !== "Alles") {
      chips.push({
        label: `Pandtype: ${buildingTypeFilter}`,
        onRemove: () => setBuildingTypeFilter("Alles"),
      });
    }

    if (bagFilter !== "Alles") {
      chips.push({
        label: bagFilter,
        onRemove: () => setBagFilter("Alles"),
      });
    }

    if (photoFilter !== "Alles") {
      chips.push({
        label: photoFilter,
        onRemove: () => setPhotoFilter("Alles"),
      });
    }

    if (containerFilter !== "Alles") {
      chips.push({
        label: containerFilter,
        onRemove: () => setContainerFilter("Alles"),
      });
    }

    if (openTaskFilter !== "Alles") {
      chips.push({
        label: openTaskFilter,
        onRemove: () => setOpenTaskFilter("Alles"),
      });
    }

    if (containerDeltaFilter !== "Alles") {
      chips.push({
        label: containerDeltaFilter,
        onRemove: () => setContainerDeltaFilter("Alles"),
      });
    }

    if (minAreaFilter) {
      chips.push({
        label: `Min m²: ${minAreaFilter}`,
        onRemove: () => setMinAreaFilter(""),
      });
    }

    if (maxAreaFilter) {
      chips.push({
        label: `Max m²: ${maxAreaFilter}`,
        onRemove: () => setMaxAreaFilter(""),
      });
    }

    if (minBuildYearFilter) {
      chips.push({
        label: `Min bouwjaar: ${minBuildYearFilter}`,
        onRemove: () => setMinBuildYearFilter(""),
      });
    }

    if (maxBuildYearFilter) {
      chips.push({
        label: `Max bouwjaar: ${maxBuildYearFilter}`,
        onRemove: () => setMaxBuildYearFilter(""),
      });
    }

    if (minContainersFilter) {
      chips.push({
        label: `Min containers: ${minContainersFilter}`,
        onRemove: () => setMinContainersFilter(""),
      });
    }

    if (maxContainersFilter) {
      chips.push({
        label: `Max containers: ${maxContainersFilter}`,
        onRemove: () => setMaxContainersFilter(""),
      });
    }

    if (minWorkDaysFilter) {
      chips.push({
        label: `Min werkdagen: ${minWorkDaysFilter}`,
        onRemove: () => setMinWorkDaysFilter(""),
      });
    }

    if (maxWorkDaysFilter) {
      chips.push({
        label: `Max werkdagen: ${maxWorkDaysFilter}`,
        onRemove: () => setMaxWorkDaysFilter(""),
      });
    }

    if (minOpenTasksFilter) {
      chips.push({
        label: `Min open taken: ${minOpenTasksFilter}`,
        onRemove: () => setMinOpenTasksFilter(""),
      });
    }

    if (maxOpenTasksFilter) {
      chips.push({
        label: `Max open taken: ${maxOpenTasksFilter}`,
        onRemove: () => setMaxOpenTasksFilter(""),
      });
    }

    if (minProgressFilter) {
      chips.push({
        label: `Min voortgang: ${minProgressFilter}%`,
        onRemove: () => setMinProgressFilter(""),
      });
    }

    if (maxProgressFilter) {
      chips.push({
        label: `Max voortgang: ${maxProgressFilter}%`,
        onRemove: () => setMaxProgressFilter(""),
      });
    }

    if (minStartDateFilter) {
      chips.push({
        label: `Vanaf: ${minStartDateFilter}`,
        onRemove: () => setMinStartDateFilter(""),
      });
    }

    if (maxEndDateFilter) {
      chips.push({
        label: `Tot: ${maxEndDateFilter}`,
        onRemove: () => setMaxEndDateFilter(""),
      });
    }

    return chips;
  }, [
    searchTerm,
    statusFilter,
    projectFilter,
    opdrachtgeverFilter,
    executorFilter,
    demolitionTypeFilter,
    buildingTypeFilter,
    bagFilter,
    photoFilter,
    containerFilter,
    openTaskFilter,
    containerDeltaFilter,
    minAreaFilter,
    maxAreaFilter,
    minBuildYearFilter,
    maxBuildYearFilter,
    minContainersFilter,
    maxContainersFilter,
    minWorkDaysFilter,
    maxWorkDaysFilter,
    minOpenTasksFilter,
    maxOpenTasksFilter,
    minProgressFilter,
    maxProgressFilter,
    minStartDateFilter,
    maxEndDateFilter,
  ]);

  const summaryItems = useMemo<SummaryItem[]>(() => {
    const uniqueOpdrachtgevers = new Set(filteredInsights.map((item) => item.opdrachtgever)).size;
    const uniqueExecutors = new Set(filteredInsights.flatMap((item) => item.executors)).size;

    return [
      { label: "Projecten", value: metrics.projectCount },
      { label: "Opdrachtgevers", value: uniqueOpdrachtgevers },
      { label: "Uitvoerders", value: uniqueExecutors },
      { label: "Open taken", value: metrics.openTasks },
      { label: "Werkelijke containers", value: metrics.actualContainers },
      { label: "Foto's", value: metrics.totalPhotos },
    ];
  }, [filteredInsights, metrics]);

  function resetFilters() {
    setSearchTerm("");
    setStatusFilter("Alles");
    setProjectFilter("Alles");
    setOpdrachtgeverFilter("Alles");
    setExecutorFilter("Alles");
    setDemolitionTypeFilter("Alles");
    setBuildingTypeFilter("Alles");
    setBagFilter("Alles");
    setPhotoFilter("Alles");
    setContainerFilter("Alles");
    setOpenTaskFilter("Alles");
    setContainerDeltaFilter("Alles");
    setMinAreaFilter("");
    setMaxAreaFilter("");
    setMinBuildYearFilter("");
    setMaxBuildYearFilter("");
    setMinContainersFilter("");
    setMaxContainersFilter("");
    setMinWorkDaysFilter("");
    setMaxWorkDaysFilter("");
    setMinOpenTasksFilter("");
    setMaxOpenTasksFilter("");
    setMinProgressFilter("");
    setMaxProgressFilter("");
    setMinStartDateFilter("");
    setMaxEndDateFilter("");
    setSortBy("openTasksDesc");
    setProjectCardLimit("10");
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
      <section style={headerWrapStyle}>
        <div>
          <h1 style={pageTitleStyle}>Analyse</h1>
          <p style={pageSubtitleStyle}>
            Filter, vergelijk en analyseer projecten, containers, personen,
            opdrachtgevers en voortgang.
          </p>
        </div>

        <Link href="/" style={backLinkStyle}>
          ← Dashboard
        </Link>
      </section>

      <section style={filterPanelStyle}>
        <div style={filterPanelHeaderStyle}>
          <div>
            <h2 style={filterTitleStyle}>Filters</h2>
            <p style={filterSubtitleStyle}>
              Alle analyseblokken, tabellen en grafieken reageren direct op deze filters.
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
            placeholder="Zoek op project, opdrachtgever, persoon, status..."
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
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            style={inputStyle}
          >
            {projectOptions.map((option) => (
              <option key={option} value={option}>
                {option === "Alles" ? "Alle projecten" : option}
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
                {option === "Alles" ? "Alle personen" : option}
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
            value={bagFilter}
            onChange={(e) => setBagFilter(e.target.value)}
            style={inputStyle}
          >
            {BAG_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            value={photoFilter}
            onChange={(e) => setPhotoFilter(e.target.value)}
            style={inputStyle}
          >
            {PHOTO_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            value={containerFilter}
            onChange={(e) => setContainerFilter(e.target.value)}
            style={inputStyle}
          >
            {CONTAINER_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            value={openTaskFilter}
            onChange={(e) => setOpenTaskFilter(e.target.value)}
            style={inputStyle}
          >
            {OPEN_TASK_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            value={containerDeltaFilter}
            onChange={(e) => setContainerDeltaFilter(e.target.value)}
            style={inputStyle}
          >
            {CONTAINER_DELTA_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div style={filterSectionTitleStyle}>Bereiken en datums</div>
        <div style={filterGridStyle}>
          <input
            value={minAreaFilter}
            onChange={(e) => setMinAreaFilter(e.target.value)}
            placeholder="Min m²"
            inputMode="numeric"
            style={inputStyle}
          />

          <input
            value={maxAreaFilter}
            onChange={(e) => setMaxAreaFilter(e.target.value)}
            placeholder="Max m²"
            inputMode="numeric"
            style={inputStyle}
          />

          <input
            value={minBuildYearFilter}
            onChange={(e) => setMinBuildYearFilter(e.target.value)}
            placeholder="Min bouwjaar"
            inputMode="numeric"
            style={inputStyle}
          />

          <input
            value={maxBuildYearFilter}
            onChange={(e) => setMaxBuildYearFilter(e.target.value)}
            placeholder="Max bouwjaar"
            inputMode="numeric"
            style={inputStyle}
          />

          <input
            value={minContainersFilter}
            onChange={(e) => setMinContainersFilter(e.target.value)}
            placeholder="Min containers werkelijk"
            inputMode="numeric"
            style={inputStyle}
          />

          <input
            value={maxContainersFilter}
            onChange={(e) => setMaxContainersFilter(e.target.value)}
            placeholder="Max containers werkelijk"
            inputMode="numeric"
            style={inputStyle}
          />

          <input
            value={minWorkDaysFilter}
            onChange={(e) => setMinWorkDaysFilter(e.target.value)}
            placeholder="Min werkdagen"
            inputMode="numeric"
            style={inputStyle}
          />

          <input
            value={maxWorkDaysFilter}
            onChange={(e) => setMaxWorkDaysFilter(e.target.value)}
            placeholder="Max werkdagen"
            inputMode="numeric"
            style={inputStyle}
          />

          <input
            value={minOpenTasksFilter}
            onChange={(e) => setMinOpenTasksFilter(e.target.value)}
            placeholder="Min open taken"
            inputMode="numeric"
            style={inputStyle}
          />

          <input
            value={maxOpenTasksFilter}
            onChange={(e) => setMaxOpenTasksFilter(e.target.value)}
            placeholder="Max open taken"
            inputMode="numeric"
            style={inputStyle}
          />

          <input
            value={minProgressFilter}
            onChange={(e) => setMinProgressFilter(e.target.value)}
            placeholder="Min voortgang %"
            inputMode="numeric"
            style={inputStyle}
          />

          <input
            value={maxProgressFilter}
            onChange={(e) => setMaxProgressFilter(e.target.value)}
            placeholder="Max voortgang %"
            inputMode="numeric"
            style={inputStyle}
          />

          <input
            type="date"
            value={minStartDateFilter}
            onChange={(e) => setMinStartDateFilter(e.target.value)}
            style={inputStyle}
          />

          <input
            type="date"
            value={maxEndDateFilter}
            onChange={(e) => setMaxEndDateFilter(e.target.value)}
            style={inputStyle}
          />
        </div>
      </section>

      {activeFilterChips.length > 0 && (
        <section style={activeFiltersWrapStyle}>
          <div style={activeFiltersHeaderStyle}>
            <div style={activeFiltersTitleStyle}>Actieve filters</div>
            <div style={activeFiltersCountStyle}>{activeFilterChips.length} actief</div>
          </div>

          <div style={chipWrapStyle}>
            {activeFilterChips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={chip.onRemove}
                style={chipButtonStyle}
              >
                <span>{chip.label}</span>
                <span style={chipCloseStyle}>×</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section style={summaryStripStyle}>
        {summaryItems.map((item) => (
          <div key={item.label} style={summaryCardStyle}>
            <div style={summaryLabelStyle}>{item.label}</div>
            <div style={summaryValueStyle}>{item.value}</div>
          </div>
        ))}
      </section>

      <section style={chartSectionHeaderStyle}>
        <div>
          <h2 style={chartSectionTitleStyle}>Grafieken</h2>
          <p style={chartSectionSubtitleStyle}>
            Visuele vergelijking van status, voortgang, omvang, containers en opdrachtgevers.
          </p>
        </div>
      </section>

      <AnalysisCharts
        statusData={statusChartData}
        openTasksData={openTasksChartData}
        containerData={containerChartData}
        areaData={areaChartData}
        photoData={photoChartData}
        progressData={progressChartData}
        opdrachtgeverData={opdrachtgeverChartData}
      />

      <section style={heroStatsGridStyle}>
        <TopKpiCard
          label="Projecten"
          value={metrics.projectCount}
          sublabel={`${metrics.activeCount} lopend · ${metrics.completedCount} afgerond`}
          accent="#ef6b1f"
        />
        <TopKpiCard
          label="Taakvoortgang"
          value={`${metrics.taskCompletion}%`}
          sublabel={`${metrics.checkedTasks}/${metrics.totalTasks} afgerond`}
          accent="#7ea89d"
        />
        <TopKpiCard
          label="m² totaal"
          value={metrics.totalArea}
          sublabel={`${metrics.avgAreaPerProject} gemiddeld / project`}
          accent="#94b6ea"
        />
        <TopKpiCard
          label="Containers"
          value={metrics.actualContainers}
          sublabel={`gepland ${metrics.plannedContainers} · verschil ${metrics.containerDifference}`}
          accent="#8d6ccf"
        />
      </section>

      <section style={secondaryKpiGridStyle}>
        <MiniKpi title="Concept" value={metrics.conceptCount} />
        <MiniKpi title="Gepland" value={metrics.plannedCount} />
        <MiniKpi title="Lopend" value={metrics.activeCount} />
        <MiniKpi title="Afgerond" value={metrics.completedCount} />
        <MiniKpi title="Taken open" value={metrics.openTasks} />
        <MiniKpi title="Planning nauwkeurig" value={`${planningAccuracy}%`} />
      </section>

      <section style={advancedInsightsGridStyle}>
        <Panel
          title="Vooraf vs werkelijk"
          subtitle="Vergelijking tussen planning en realisatie."
          style={warmPanelStyle}
        >
          <div style={advancedGridStyle}>
            <AdvancedMetric label="Containers gepland" value={metrics.plannedContainers} />
            <AdvancedMetric label="Containers werkelijk" value={metrics.actualContainers} />
            <AdvancedMetric label="Verschil" value={metrics.containerDifference} highlight />
            <AdvancedMetric label="Geschatte uren" value={metrics.totalEstimatedHours || 0} />
            <AdvancedMetric label="Werkelijke uren" value={metrics.totalActualHours || 0} />
            <AdvancedMetric label="Werkdagen totaal" value={metrics.totalWorkDays} />
          </div>
        </Panel>

        <Panel
          title="Afwijkingen"
          subtitle="Waar planning en uitvoering het meest uiteen lopen."
          style={softPanelStyle}
        >
          <div style={advancedGridStyle}>
            <AdvancedMetric label="Planning nauwkeurigheid" value={`${planningAccuracy}%`} highlight />
            <AdvancedMetric
              label="Grootste container afwijking"
              value={
                mostContainerDifference.length > 0
                  ? mostContainerDifference[0].containerDifference
                  : 0
              }
            />
            <AdvancedMetric
              label="Projecten met afwijking"
              value={filteredInsights.filter((p) => p.containerDifference !== 0).length}
            />
          </div>
        </Panel>

        <Panel
          title="Efficiëntie"
          subtitle="Productiviteit en performance indicatoren."
          style={coolPanelStyle}
        >
          <div style={advancedGridStyle}>
            <AdvancedMetric label="m² per werkdag" value={metrics.areaPerWorkDay} />
            <AdvancedMetric label="m² per project" value={metrics.avgAreaPerProject} />
            <AdvancedMetric label="m² per uur" value={metrics.areaPerHour} />
            <AdvancedMetric
              label="Open taken per project"
              value={metrics.projectCount > 0 ? Math.round(metrics.openTasks / metrics.projectCount) : 0}
            />
            <AdvancedMetric
              label="Foto's per project"
              value={metrics.projectCount > 0 ? Math.round(metrics.totalPhotos / metrics.projectCount) : 0}
            />
          </div>
        </Panel>

        <Panel
          title="Aandacht nodig"
          subtitle="Projecten die directe actie vereisen."
          style={warmPanelStyle}
        >
          <div style={advancedGridStyle}>
            <AdvancedMetric label="Zonder foto's" value={metrics.projectsWithoutPhotos} danger />
            <AdvancedMetric label="Zonder containers" value={metrics.projectsWithoutContainers} danger />
            <AdvancedMetric label="Met open taken" value={metrics.projectsWithOpenTasks} highlight />
          </div>
        </Panel>
      </section>

      <section style={insightStripGridStyle}>
        <InsightStripCard
          title="Werkdagen totaal"
          value={metrics.totalWorkDays}
          subtitle={`${metrics.avgWorkDaysPerProject} gemiddeld / project`}
        />
        <InsightStripCard
          title="m² per werkdag"
          value={metrics.areaPerWorkDay}
          subtitle="Indicatie productiesnelheid"
        />
        <InsightStripCard
          title="Projecten met BAG-data"
          value={metrics.projectsWithBagData}
          subtitle={`${metrics.projectCount > 0 ? Math.round((metrics.projectsWithBagData / metrics.projectCount) * 100) : 0}% van selectie`}
        />
        <InsightStripCard
          title="Projecten met open taken"
          value={metrics.projectsWithOpenTasks}
          subtitle="Direct operationeel aandachtspunt"
        />
      </section>

      <section style={signalGridStyle}>
        <SignalCard
          title="Projecten met open taken"
          value={metrics.projectsWithOpenTasks}
          subtitle="Projecten waar nog operationeel werk openstaat."
          tone="orange"
        />
        <SignalCard
          title="Projecten zonder foto's"
          value={metrics.projectsWithoutPhotos}
          subtitle="Documentatie ontbreekt of is nog niet toegevoegd."
          tone="purple"
        />
        <SignalCard
          title="Projecten zonder containers"
          value={metrics.projectsWithoutContainers}
          subtitle="Controleer of containerplanning nog ingevuld moet worden."
          tone="blue"
        />
      </section>

      <section style={compactPanelGridStyle}>
        <Panel
          title="Verdeling opdrachtgevers"
          subtitle="Welke opdrachtgevers het zwaarst vertegenwoordigd zijn in de selectie."
          style={mintPanelStyle}
        >
          <BreakdownBars
            items={opdrachtgeverBreakdown}
            maxValue={maxBreakdownValue}
            color="#7ea89d"
          />
        </Panel>

        <Panel
          title="Verdeling uitvoerders"
          subtitle="Welke personen het meest voorkomen binnen de huidige selectie."
          style={lavenderPanelStyle}
        >
          <BreakdownBars
            items={executorBreakdown}
            maxValue={maxBreakdownValue}
            color="#8d6ccf"
          />
        </Panel>
      </section>

      <section style={compactPanelGridStyle}>
        <Panel
          title="Portefeuille samenstelling"
          subtitle="Snelle inhoudelijke verdeling van slooptype en pandtype."
          style={softPanelStyle}
        >
          <div style={{ display: "grid", gap: 18 }}>
            <div>
              <div style={subBlockTitleStyle}>Slooptypes</div>
              <BreakdownBars
                items={demolitionBreakdown}
                maxValue={maxBreakdownValue}
                color="#ef6b1f"
              />
            </div>

            <div>
              <div style={subBlockTitleStyle}>Pandtypes</div>
              <BreakdownBars
                items={buildingBreakdown}
                maxValue={maxBreakdownValue}
                color="#94b6ea"
              />
            </div>
          </div>
        </Panel>

        <Panel
          title="Top open taken"
          subtitle="Projecten die nu het meeste aandacht nodig hebben."
          style={warmPanelStyle}
        >
          <div style={panelListStyle}>
            {topOpenTasks.length === 0 ? (
              <EmptyState text="Geen projecten gevonden." />
            ) : (
              topOpenTasks.map((item) => (
                <Link key={item.id} href={`/projects/${item.id}`} style={listItemLinkStyle}>
                  <div>
                    <div style={listTitleStyle}>{item.name}</div>
                    <div style={listSubtleStyle}>
                      Status: {item.statusLabel} · Uitvoerder(s):{" "}
                      {item.executors.length > 0 ? item.executors.join(", ") : "Geen"}
                    </div>
                  </div>
                  <div style={listValueBadgeStyle}>{item.openTasks} open</div>
                </Link>
              ))
            )}
          </div>
        </Panel>
      </section>

      <section style={fullWidthPanelStyle}>
        <Panel
          title="Operationele projectkaarten"
          subtitle="Per project een compact overzicht van voortgang, omvang, containers en personen."
          style={softPanelStyle}
        >
          <div style={panelToolbarStyle}>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={inputStyle}>
              <option value="openTasksDesc">Sorteer: meeste open taken</option>
              <option value="openTasksAsc">Sorteer: minste open taken</option>
              <option value="progressDesc">Sorteer: hoogste voortgang</option>
              <option value="progressAsc">Sorteer: laagste voortgang</option>
              <option value="areaDesc">Sorteer: grootste m²</option>
              <option value="areaAsc">Sorteer: kleinste m²</option>
              <option value="photosDesc">Sorteer: meeste foto's</option>
              <option value="photosAsc">Sorteer: minste foto's</option>
              <option value="containersDesc">Sorteer: meeste containers</option>
              <option value="containersAsc">Sorteer: minste containers</option>
              <option value="nameAsc">Sorteer: naam A-Z</option>
              <option value="nameDesc">Sorteer: naam Z-A</option>
            </select>

            <select
              value={projectCardLimit}
              onChange={(e) => setProjectCardLimit(e.target.value)}
              style={inputStyle}
            >
              <option value="6">Toon 6 kaarten</option>
              <option value="8">Toon 8 kaarten</option>
              <option value="10">Toon 10 kaarten</option>
              <option value="12">Toon 12 kaarten</option>
            </select>
          </div>

          <div style={projectCardsGridStyle}>
            {visibleProjectCards.length === 0 ? (
              <EmptyState text="Geen projectdata gevonden." />
            ) : (
              visibleProjectCards.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))
            )}
          </div>
        </Panel>
      </section>

      <section style={fullWidthPanelStyle}>
        <Panel
          title="Projecttabel"
          subtitle="Volledig overzicht van alle geselecteerde projecten voor analyse en vergelijking."
          style={coolPanelStyle}
        >
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Project</th>
                  <th style={thStyle}>Opdrachtgever</th>
                  <th style={thStyle}>Persoon</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Slooptype</th>
                  <th style={thStyle}>Pandtype</th>
                  <th style={thStyle}>m²</th>
                  <th style={thStyle}>Werkdagen</th>
                  <th style={thStyle}>Taken</th>
                  <th style={thStyle}>Open</th>
                  <th style={thStyle}>Voortgang</th>
                  <th style={thStyle}>Cont. G</th>
                  <th style={thStyle}>Cont. W</th>
                  <th style={thStyle}>Foto's</th>
                  <th style={thStyle}>BAG</th>
                </tr>
              </thead>
              <tbody>
                {sortedProjectRows.length === 0 ? (
                  <tr>
                    <td colSpan={15} style={tdEmptyStyle}>
                      Geen projectdata gevonden.
                    </td>
                  </tr>
                ) : (
                  sortedProjectRows.map((item) => (
                    <tr key={item.id}>
                      <td style={tdTitleStyle}>
                        <Link href={`/projects/${item.id}`} style={tableLinkStyle}>
                          {item.name}
                        </Link>
                      </td>
                      <td style={tdStyle}>{item.opdrachtgever}</td>
                      <td style={tdStyle}>
                        {item.executors.length > 0 ? item.executors.join(", ") : "-"}
                      </td>
                      <td style={tdStyle}>
                        <StatusBadge label={item.statusLabel} />
                      </td>
                      <td style={tdStyle}>{item.demolitionType}</td>
                      <td style={tdStyle}>{item.buildingType}</td>
                      <td style={tdStyle}>{item.areaM2}</td>
                      <td style={tdStyle}>{item.workDays}</td>
                      <td style={tdStyle}>{item.totalTasks}</td>
                      <td style={tdStyle}>{item.openTasks}</td>
                      <td style={tdProgressStyle}>
                        <div style={tableProgressWrapStyle}>
                          <span style={tableProgressValueStyle}>{item.taskCompletion}%</span>
                          <div style={tableProgressTrackStyle}>
                            <div
                              style={{
                                ...tableProgressFillStyle,
                                width: `${item.taskCompletion}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td style={tdStyle}>{item.plannedContainers}</td>
                      <td style={tdStyle}>{item.actualContainers}</td>
                      <td style={tdStyle}>{item.photos}</td>
                      <td style={tdStyle}>{item.hasBagData ? "Ja" : "Nee"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>
    </main>
  );
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "nl")
  );
}

function buildBreakdown(values: string[]): BreakdownItem[] {
  const counts = new Map<string, number>();

  for (const value of values) {
    const label = value?.trim() || "Onbekend";
    counts.set(label, (counts.get(label) || 0) + 1);
  }

  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function TopKpiCard({
  label,
  value,
  sublabel,
  accent,
}: {
  label: string;
  value: string | number;
  sublabel: string;
  accent: string;
}) {
  return (
    <div style={{ ...topKpiCardStyle, borderTop: `6px solid ${accent}` }}>
      <div style={topKpiLabelStyle}>{label}</div>
      <div style={topKpiValueStyle}>{value}</div>
      <div style={topKpiSubLabelStyle}>{sublabel}</div>
    </div>
  );
}

function MiniKpi({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div style={miniKpiCardStyle}>
      <div style={miniKpiTitleStyle}>{title}</div>
      <div style={miniKpiValueStyle}>{value}</div>
    </div>
  );
}

function InsightStripCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle: string;
}) {
  return (
    <div style={insightStripCardStyle}>
      <div style={insightStripTitleStyle}>{title}</div>
      <div style={insightStripValueStyle}>{value}</div>
      <div style={insightStripSubtitleStyle}>{subtitle}</div>
    </div>
  );
}

function BreakdownBars({
  items,
  maxValue,
  color,
}: {
  items: BreakdownItem[];
  maxValue: number;
  color: string;
}) {
  if (items.length === 0) {
    return <EmptyState text="Geen verdelingsdata gevonden." />;
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {items.map((item) => (
        <div key={item.label} style={breakdownRowStyle}>
          <div style={breakdownHeaderStyle}>
            <span style={breakdownLabelStyle}>{item.label}</span>
            <span style={breakdownValueStyle}>{item.value}</span>
          </div>

          <div style={breakdownTrackStyle}>
            <div
              style={{
                ...breakdownFillStyle,
                width: `${(item.value / maxValue) * 100}%`,
                background: color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function SignalCard({
  title,
  value,
  subtitle,
  tone,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  tone: "orange" | "purple" | "blue";
}) {
  const toneMap = {
    orange: { bg: "#fff4e8", border: "#f3ddc8", value: "#ef6b1f" },
    purple: { bg: "#f8f0fb", border: "#e6cfee", value: "#b07ac0" },
    blue: { bg: "#eef5ff", border: "#d7e6ff", value: "#6f9fe8" },
  };

  const currentTone = toneMap[tone];

  return (
    <div
      style={{
        background: currentTone.bg,
        border: `1px solid ${currentTone.border}`,
        borderRadius: 22,
        padding: 18,
      }}
    >
      <div style={signalTitleStyle}>{title}</div>
      <div style={{ ...signalValueStyle, color: currentTone.value }}>{value}</div>
      <div style={signalSubtitleStyle}>{subtitle}</div>
    </div>
  );
}

function StatusBadge({ label }: { label: string }) {
  const value = label.toLowerCase();

  if (value === "afgerond") {
    return (
      <span style={{ ...statusBadgeStyle, background: "#eaf6ec", color: "#2f7b4d" }}>
        {label}
      </span>
    );
  }

  if (value === "bezig") {
    return (
      <span style={{ ...statusBadgeStyle, background: "#fff4e8", color: "#b95f18" }}>
        {label}
      </span>
    );
  }

  if (value === "gepland") {
    return (
      <span style={{ ...statusBadgeStyle, background: "#eef5ff", color: "#5d83c7" }}>
        {label}
      </span>
    );
  }

  return (
    <span style={{ ...statusBadgeStyle, background: "#f1ece7", color: "#7b746c" }}>
      {label}
    </span>
  );
}

function Panel({
  title,
  subtitle,
  children,
  style,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <section style={{ ...panelStyle, ...style }}>
      <div style={panelHeaderStyle}>
        <h2 style={panelTitleStyle}>{title}</h2>
        <p style={panelSubtitleStyle}>{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function AdvancedMetric({
  label,
  value,
  highlight,
  danger,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
  danger?: boolean;
}) {
  let color = "#171717";

  if (highlight) color = "#ef6b1f";
  if (danger) color = "#c0392b";

  return (
    <div style={advancedMetricStyle}>
      <div style={advancedMetricLabelStyle}>{label}</div>
      <div style={{ ...advancedMetricValueStyle, color }}>{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div style={emptyStateStyle}>{text}</div>;
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  padding: 24,
  background: "#f6f2ed",
  fontFamily: "Arial, sans-serif",
};

const headerWrapStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
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
  alignSelf: "center",
};

const filterPanelStyle: CSSProperties = {
  marginTop: 22,
  background: "#fbf8f4",
  borderRadius: 28,
  padding: 18,
  border: "1px solid #e9ded3",
  boxShadow: "0 8px 18px rgba(23,23,23,0.035)",
};

const filterPanelHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  flexWrap: "wrap",
  marginBottom: 18,
};

const filterTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 24,
  color: "#171717",
};

const filterSubtitleStyle: CSSProperties = {
  margin: "8px 0 0 0",
  color: "#6b675f",
  fontSize: 14,
};

const filterSectionTitleStyle: CSSProperties = {
  marginTop: 8,
  marginBottom: 12,
  fontSize: 13,
  fontWeight: 800,
  color: "#6b675f",
  textTransform: "uppercase",
  letterSpacing: 0.3,
};

const resetButtonStyle: CSSProperties = {
  background: "#ffffff",
  color: "#171717",
  border: "1px solid #d8d0c7",
  borderRadius: 16,
  padding: "12px 16px",
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
};

const filterGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
  marginBottom: 16,
};

const inputStyle: CSSProperties = {
  width: "100%",
  height: 52,
  padding: "0 14px",
  borderRadius: 16,
  border: "1px solid #d9cfc4",
  background: "#ffffff",
  fontSize: 15,
  color: "#171717",
};

const activeFiltersWrapStyle: CSSProperties = {
  marginTop: 18,
  background: "#fffaf6",
  borderRadius: 24,
  padding: 18,
  border: "1px solid #ebe2d8",
};

const activeFiltersHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
};

const activeFiltersTitleStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: 800,
  color: "#171717",
};

const activeFiltersCountStyle: CSSProperties = {
  fontSize: 13,
  color: "#6b675f",
  fontWeight: 700,
};

const chipWrapStyle: CSSProperties = {
  marginTop: 14,
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
};

const chipButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "9px 12px",
  borderRadius: 999,
  background: "#ffffff",
  border: "1px solid #e6ddd4",
  color: "#4d4944",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const chipCloseStyle: CSSProperties = {
  fontSize: 16,
  lineHeight: 1,
  fontWeight: 900,
  color: "#8a8178",
};

const summaryStripStyle: CSSProperties = {
  marginTop: 18,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 14,
};

const summaryCardStyle: CSSProperties = {
  background: "#fffaf6",
  borderRadius: 20,
  padding: 16,
  border: "1px solid #eadfd4",
};

const summaryLabelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  color: "#6b675f",
};

const summaryValueStyle: CSSProperties = {
  marginTop: 10,
  fontSize: 28,
  fontWeight: 900,
  lineHeight: 1,
  color: "#171717",
};

const chartSectionHeaderStyle: CSSProperties = {
  marginTop: 26,
  background: "#fffaf6",
  borderRadius: 24,
  border: "1px solid #ebe2d8",
  padding: 18,
};

const chartSectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 26,
  color: "#171717",
};

const chartSectionSubtitleStyle: CSSProperties = {
  margin: "8px 0 0 0",
  color: "#6b675f",
  fontSize: 14,
  lineHeight: 1.5,
};

const heroStatsGridStyle: CSSProperties = {
  marginTop: 26,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 20,
  alignItems: "stretch",
};

const topKpiCardStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 30,
  padding: 26,
  border: "1px solid #eadfd4",
  boxShadow: "0 14px 28px rgba(23,23,23,0.045)",
  minHeight: 165,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
};

const topKpiLabelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  color: "#7a746d",
  letterSpacing: 0.2,
  textTransform: "uppercase",
};

const topKpiValueStyle: CSSProperties = {
  marginTop: 14,
  fontSize: 48,
  fontWeight: 900,
  lineHeight: 0.95,
  color: "#171717",
  letterSpacing: -1,
};

const topKpiSubLabelStyle: CSSProperties = {
  marginTop: 14,
  fontSize: 13,
  color: "#7b746c",
  lineHeight: 1.45,
};

const secondaryKpiGridStyle: CSSProperties = {
  marginTop: 18,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 14,
  alignItems: "stretch",
};

const miniKpiCardStyle: CSSProperties = {
  background: "#fdfaf7",
  borderRadius: 18,
  padding: 14,
  border: "1px solid #eee3d8",
  minHeight: 96,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
};

const miniKpiTitleStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  color: "#7b746c",
  textTransform: "uppercase",
  letterSpacing: 0.25,
};

const miniKpiValueStyle: CSSProperties = {
  marginTop: 10,
  fontSize: 24,
  fontWeight: 900,
  color: "#171717",
  lineHeight: 1,
};

const advancedInsightsGridStyle: CSSProperties = {
  marginTop: 24,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
  gap: 20,
};

const advancedGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 16,
};

const advancedMetricStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 16,
  padding: 14,
  border: "1px solid #eee3d8",
};

const advancedMetricLabelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  color: "#6b675f",
  lineHeight: 1.35,
};

const advancedMetricValueStyle: CSSProperties = {
  marginTop: 8,
  fontSize: 20,
  fontWeight: 900,
};

const insightStripGridStyle: CSSProperties = {
  marginTop: 18,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};

const insightStripCardStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  padding: 18,
  border: "1px solid #ebe2d8",
};

const insightStripTitleStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  color: "#6b675f",
};

const insightStripValueStyle: CSSProperties = {
  marginTop: 10,
  fontSize: 30,
  fontWeight: 900,
  color: "#171717",
  lineHeight: 1,
};

const insightStripSubtitleStyle: CSSProperties = {
  marginTop: 8,
  fontSize: 13,
  color: "#6b675f",
  lineHeight: 1.4,
};

const signalGridStyle: CSSProperties = {
  marginTop: 18,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 14,
};

const signalTitleStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: "#5f5a54",
};

const signalValueStyle: CSSProperties = {
  marginTop: 12,
  fontSize: 34,
  fontWeight: 900,
  lineHeight: 1,
};

const signalSubtitleStyle: CSSProperties = {
  marginTop: 8,
  fontSize: 13,
  color: "#6b675f",
  lineHeight: 1.4,
};

const compactPanelGridStyle: CSSProperties = {
  marginTop: 24,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
  gap: 20,
};

const fullWidthPanelStyle: CSSProperties = {
  marginTop: 24,
};

const panelStyle: CSSProperties = {
  background: "#fffdfb",
  borderRadius: 30,
  padding: 24,
  border: "1px solid #ebe2d8",
  boxShadow: "0 12px 24px rgba(23,23,23,0.04)",
};

const warmPanelStyle: CSSProperties = {
  background: "#fff7f1",
  border: "1px solid #f1ddcd",
};

const coolPanelStyle: CSSProperties = {
  background: "#f8fbff",
  border: "1px solid #dbe8f8",
};

const softPanelStyle: CSSProperties = {
  background: "#fbfaf8",
  border: "1px solid #ece3da",
};

const mintPanelStyle: CSSProperties = {
  background: "#f7fcfa",
  border: "1px solid #ddeadf",
};

const lavenderPanelStyle: CSSProperties = {
  background: "#faf7ff",
  border: "1px solid #e5daf7",
};

const panelHeaderStyle: CSSProperties = {
  marginBottom: 18,
};

const panelTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 24,
  color: "#171717",
};

const panelSubtitleStyle: CSSProperties = {
  margin: "8px 0 0 0",
  color: "#6b675f",
  lineHeight: 1.5,
  fontSize: 14,
};

const subBlockTitleStyle: CSSProperties = {
  marginBottom: 10,
  fontSize: 13,
  fontWeight: 800,
  color: "#6b675f",
  textTransform: "uppercase",
  letterSpacing: 0.4,
};

const breakdownRowStyle: CSSProperties = {
  display: "grid",
  gap: 10,
};

const breakdownHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
};

const breakdownLabelStyle: CSSProperties = {
  fontWeight: 700,
  color: "#171717",
};

const breakdownValueStyle: CSSProperties = {
  fontWeight: 900,
  color: "#171717",
};

const breakdownTrackStyle: CSSProperties = {
  height: 14,
  background: "#ece7e1",
  borderRadius: 999,
  overflow: "hidden",
};

const breakdownFillStyle: CSSProperties = {
  height: "100%",
  borderRadius: 999,
};

const panelListStyle: CSSProperties = {
  display: "grid",
  gap: 12,
};

const listItemLinkStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 16,
  padding: 14,
  border: "1px solid #eee3d8",
  textDecoration: "none",
  color: "inherit",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
};

const listTitleStyle: CSSProperties = {
  fontWeight: 800,
  color: "#171717",
  fontSize: 14,
};

const listSubtleStyle: CSSProperties = {
  marginTop: 4,
  fontSize: 12,
  color: "#6b675f",
  lineHeight: 1.4,
};

const listValueBadgeStyle: CSSProperties = {
  fontWeight: 900,
  color: "#171717",
  whiteSpace: "nowrap",
  background: "#fff4e8",
  border: "1px solid #f3ddc8",
  borderRadius: 999,
  padding: "8px 12px",
};

const panelToolbarStyle: CSSProperties = {
  marginBottom: 16,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

const projectCardsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 16,
};

const tableWrapStyle: CSSProperties = {
  overflowX: "auto",
  borderRadius: 20,
  border: "1px solid #eee3d8",
  background: "#ffffff",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 1600,
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "14px 16px",
  background: "#fbf6f1",
  color: "#6b675f",
  fontSize: 12,
  fontWeight: 800,
  borderBottom: "1px solid #eee3d8",
};

const tdStyle: CSSProperties = {
  padding: "14px 16px",
  borderBottom: "1px solid #f2e9df",
  color: "#3b3733",
  fontSize: 14,
};

const tdTitleStyle: CSSProperties = {
  padding: "14px 16px",
  borderBottom: "1px solid #f2e9df",
  color: "#171717",
  fontSize: 14,
  fontWeight: 800,
};

const tdProgressStyle: CSSProperties = {
  padding: "14px 16px",
  borderBottom: "1px solid #f2e9df",
  minWidth: 180,
};

const tableProgressWrapStyle: CSSProperties = {
  display: "grid",
  gap: 8,
};

const tableProgressValueStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: "#171717",
};

const tableProgressTrackStyle: CSSProperties = {
  height: 10,
  background: "#ece7e1",
  borderRadius: 999,
  overflow: "hidden",
};

const tableProgressFillStyle: CSSProperties = {
  height: "100%",
  background: "#ef6b1f",
  borderRadius: 999,
};

const tableLinkStyle: CSSProperties = {
  color: "#171717",
  textDecoration: "none",
  fontWeight: 800,
};

const tdEmptyStyle: CSSProperties = {
  padding: "20px 16px",
  color: "#6b675f",
};

const emptyStateStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 16,
  padding: 16,
  border: "1px solid #eee3d8",
  color: "#6b675f",
};

const statusBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "7px 11px",
  fontSize: 12,
  fontWeight: 800,
};