export type ProjectStatus = "Concept" | "Gepland" | "Bezig" | "Afgerond";

export type ProjectTask = {
  id: string;
  taskType: "Wel slopen" | "Niet slopen";
  title: string;
  location: string;
  priority: "Laag" | "Middel" | "Hoog";
  isChecked: boolean;
  notes?: string;
};

export type ProjectContainer = {
  id: string;
  wasteType: string;
  containerSize: string;
  plannedQuantity: number;
  actualQuantity: number;
  plannedDeliveryDate?: string;
  actualDeliveryDate?: string;
  plannedPickupDate?: string;
  actualPickupDate?: string;
  changeReason?: string;
  notes?: string;
};

export type ProjectPhoto = {
  id: string;
  category: "Vooraf" | "Tijdens" | "Achteraf";
  label: "Wel slopen" | "Niet slopen" | "Opletpunt" | "Schade" | "Oplevering";
  title: string;
  notes?: string;
  uploadedBy: string;
  date: string;
};

export type ProjectHistory = {
  id: string;
  date: string;
  user: string;
  action: string;
  entityType: string;
};

export type Project = {
  id: string;
  projectNumber: string;
  name: string;
  address: string;
  opdrachtgever: string;
  demolitionType: string;
  buildingType: string;
  areaM2: number;
  customerContact: string;
  startDate: string;
  endDate: string;
  workDays: number;
  status: ProjectStatus;
  notes?: string;
  executors: string[];
  tasks: ProjectTask[];
  containers: ProjectContainer[];
  photos: ProjectPhoto[];
  history: ProjectHistory[];
};
