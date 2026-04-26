import { Project } from "@/lib/types";

export const mockProjects: Project[] = [
  {
    id: "p1",
    projectNumber: "BS-2025-001",
    name: "Abcoude",
    address: "Laan van Binnenrust 4, Abcoude",
    opdrachtgever: "Michiel en Rob",
    demolitionType: "Casco",
    buildingType: "Vrijstaande woning",
    areaM2: 220,
    customerContact: "Rob, 06-23429654",
    startDate: "2025-12-15",
    endDate: "2026-01-16",
    workDays: 7,
    status: "Gepland",
    notes: "Schoorsteen van het dak.",
    executors: ["Ilia", "Ruslan", "Catalin"],
    tasks: [
      { id: "t1", taskType: "Wel slopen", title: "Keuken volledig demonteren", location: "Begane grond", priority: "Hoog", isChecked: true },
      { id: "t2", taskType: "Wel slopen", title: "Badkamer strippen tot casco", location: "1e verdieping", priority: "Hoog", isChecked: false },
      { id: "t3", taskType: "Niet slopen", title: "Trap behouden", location: "Hal", priority: "Hoog", isChecked: false }
    ],
    containers: [
      { id: "c1", wasteType: "Bouw- en sloop", containerSize: "10 m³", plannedQuantity: 4, actualQuantity: 4, plannedDeliveryDate: "2025-12-15", actualDeliveryDate: "2025-12-15", plannedPickupDate: "2026-01-16", actualPickupDate: "2026-01-16", notes: "Volgens offerte" },
      { id: "c2", wasteType: "B-hout", containerSize: "10 m³", plannedQuantity: 4, actualQuantity: 5, changeReason: "Extra houtstroom", notes: "1 extra bijgeplaatst" }
    ],
    photos: [
      { id: "ph1", category: "Vooraf", label: "Niet slopen", title: "Kozijnen woonkamer", uploadedBy: "Ilia", date: "2025-12-14" },
      { id: "ph2", category: "Achteraf", label: "Oplevering", title: "Casco opgeleverd", uploadedBy: "Jeroen", date: "2026-01-16" }
    ],
    history: [
      { id: "h1", date: "2025-09-02 09:12", user: "Ilia", action: "Project aangemaakt", entityType: "project" },
      { id: "h2", date: "2025-12-18 14:30", user: "Sander", action: "1 extra B-hout container toegevoegd", entityType: "container" }
    ]
  },
  {
    id: "p2",
    projectNumber: "BS-2025-002",
    name: "Willemspark",
    address: "Willemsparkweg, Amsterdam",
    opdrachtgever: "Pedram",
    demolitionType: "Casco",
    buildingType: "Herenpand",
    areaM2: 600,
    customerContact: "Pedram, 06-234271625",
    startDate: "2025-08-04",
    endDate: "2025-08-20",
    workDays: 12,
    status: "Afgerond",
    notes: "Veel containers.",
    executors: ["Ilia", "Ruslan", "Catalin"],
    tasks: [
      { id: "t4", taskType: "Wel slopen", title: "Binnenzijde strippen", location: "Alle verdiepingen", priority: "Hoog", isChecked: true },
      { id: "t5", taskType: "Niet slopen", title: "Monumentale trap behouden", location: "Middenzone", priority: "Hoog", isChecked: true }
    ],
    containers: [
      { id: "c3", wasteType: "Bouw- en sloop", containerSize: "10 m³", plannedQuantity: 10, actualQuantity: 12, changeReason: "Meer puin dan verwacht", notes: "+2 extra" },
      { id: "c4", wasteType: "B-hout", containerSize: "10 m³", plannedQuantity: 7, actualQuantity: 7, notes: "Conform planning" }
    ],
    photos: [
      { id: "ph3", category: "Vooraf", label: "Opletpunt", title: "Monumentale trap", uploadedBy: "Ilia", date: "2025-08-03" },
      { id: "ph4", category: "Achteraf", label: "Oplevering", title: "Volledig casco", uploadedBy: "Dennis", date: "2025-08-20" }
    ],
    history: [
      { id: "h3", date: "2025-07-20 08:10", user: "Martijn", action: "Project aangemaakt", entityType: "project" }
    ]
  },
  {
    id: "p3",
    projectNumber: "BS-2026-003",
    name: "Renewi",
    address: "Flight Forum, Eindhoven",
    opdrachtgever: "Corum",
    demolitionType: "Casco + Egaliseren",
    buildingType: "Kantoorpand",
    areaM2: 1000,
    customerContact: "Corum, 06-234331625",
    startDate: "2026-02-23",
    endDate: "2026-03-11",
    workDays: 9,
    status: "Gepland",
    notes: "Schuren en egaliseren.",
    executors: ["Ilia", "Jeroen", "Ruslan", "Catalin"],
    tasks: [
      { id: "t6", taskType: "Wel slopen", title: "Systeemplafonds verwijderen", location: "Verdieping 1", priority: "Hoog", isChecked: false },
      { id: "t7", taskType: "Wel slopen", title: "Vloer schuren en egaliseren", location: "Alle kantoren", priority: "Middel", isChecked: false },
      { id: "t8", taskType: "Niet slopen", title: "Technische ruimte behouden", location: "Technische ruimte", priority: "Hoog", isChecked: false }
    ],
    containers: [
      { id: "c5", wasteType: "B-hout", containerSize: "40 m³", plannedQuantity: 1, actualQuantity: 1 },
      { id: "c6", wasteType: "Bouw- en sloop", containerSize: "10 m³", plannedQuantity: 1, actualQuantity: 1 }
    ],
    photos: [
      { id: "ph5", category: "Vooraf", label: "Schade", title: "Kantoorvloer opname", uploadedBy: "Ilia", date: "2026-02-21" }
    ],
    history: [
      { id: "h4", date: "2025-09-04 22:10", user: "Ilia", action: "Project aangemaakt", entityType: "project" }
    ]
  }
];
