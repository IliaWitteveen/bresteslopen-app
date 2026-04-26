"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import {
  createProject,
  type CreateAttentionPointInput,
  type CreateContainerInput,
  type CreateEquipmentItemInput,
  type CreateTaskInput,
} from "@/lib/projects";
import { getCurrentAppUser } from "@/lib/auth";

type FormState = {
  project_number: string;
  name: string;
  address: string;
  opdrachtgever: string;
  demolition_type: string;
  building_type: string;
  area_m2: string;
  customer_contact: string;
  start_date: string;
  end_date: string;
  work_days: string;
  notes: string;
  status: string;

  assigned_executor: string;

  bag_source_address: string;
  bag_build_year: string;
  bag_surface_m2: string;
  bag_pand_id: string;
  bag_verblijfsobject_id: string;
  bag_status: string;

  estimated_surface_m2: string;
  estimated_man_hours: string;
  estimated_container_count: string;
  estimated_material_notes: string;
};

type AttentionPoint = {
  id: string;
  title: string;
  notes: string;
  photos: string[];
};

type EquipmentItem = {
  id: string;
  label: string;
  quantity: string;
  is_checked: boolean;
  notes: string;
  is_default_item: boolean;
};

type AddressSuggestion = {
  id: string;
  label: string;
  address: string;
  street: string;
  houseNumber: string;
  postcode: string;
  city: string;
};

type BagPayloadJson = {
  freeDoc?: Record<string, unknown>;
  lookupDoc?: Record<string, unknown>;
  gebruiksdoelen?: unknown;
  verblijfsobjectXml?: string | null;
  pandXml?: string | null;
  provider?: string;
  bagApiKeyConfigured?: boolean;
} | null;

type BagAutofillResponse = {
  ok: boolean;
  found?: boolean;
  data?: {
    bag_build_year?: number | null;
    bag_surface_m2?: number | null;
    bag_pand_id?: string | null;
    bag_verblijfsobject_id?: string | null;
    bag_status?: string | null;
    bag_payload_json?: BagPayloadJson;
  } | null;
  error?: string;
};

type TaskItem = {
  id: string;
  description: string;
  is_removed: boolean;
  is_done: boolean;
  notes: string;
  responsible_person: string;
  photoName: string;
  photoPreview: string;
};

type ContainerItem = {
  id: string;
  container_type: string;
  volume_m3: string;
};

type KnownClient = {
  label: string;
};

const DEMOLITION_OPTIONS = [
  "Casco",
  "Totaalsloop binnen",
  "Badkamer",
  "Keuken",
  "Wanden / plafonds",
  "Vloeren",
  "Puinruiming",
  "Overig",
];

const STATUS_OPTIONS = ["Concept", "Gepland", "Bezig", "Afgerond"];
const EXECUTOR_OPTIONS = ["Dennis", "Jeroen"];

const CONTAINER_TYPE_OPTIONS = [
  "Bouw en Sloop",
  "B-Hout",
  "Puin",
  "IJzer",
  "Glas",
  "Karton",
];

const CONTAINER_VOLUME_OPTIONS = ["6", "10", "20", "40"];

const TOOL_OPTIONS = [
  "Alles",
  "Trap",
  "Schep",
  "Emmers",
  "Bezem",
  "Circle zaag",
  "Beton boor",
  "Vloeren stripper",
  "Stofzuiger",
  "Schuurmachine",
  "Rolcontainer",
];

const DEFAULT_TOOLS: EquipmentItem[] = [createEquipmentItem("Alles", "1", true)];

function createAttentionPoint(): AttentionPoint {
  return {
    id: crypto.randomUUID(),
    title: "",
    notes: "",
    photos: [],
  };
}

function createEquipmentItem(
  label = "",
  quantity = "1",
  is_default_item = false
): EquipmentItem {
  return {
    id: crypto.randomUUID(),
    label,
    quantity,
    is_checked: false,
    notes: "",
    is_default_item,
  };
}

function createTaskItem(): TaskItem {
  return {
    id: crypto.randomUUID(),
    description: "",
    is_removed: true,
    is_done: false,
    notes: "",
    responsible_person: "",
    photoName: "",
    photoPreview: "",
  };
}

function createContainerItem(): ContainerItem {
  return {
    id: crypto.randomUUID(),
    container_type: "Bouw en Sloop",
    volume_m3: "6",
  };
}

const initialForm: FormState = {
  project_number: "",
  name: "",
  address: "",
  opdrachtgever: "",
  demolition_type: "Casco",
  building_type: "",
  area_m2: "",
  customer_contact: "",
  start_date: "",
  end_date: "",
  work_days: "",
  notes: "",
  status: "Concept",

  assigned_executor: "",

  bag_source_address: "",
  bag_build_year: "",
  bag_surface_m2: "",
  bag_pand_id: "",
  bag_verblijfsobject_id: "",
  bag_status: "",

  estimated_surface_m2: "",
  estimated_man_hours: "",
  estimated_container_count: "",
  estimated_material_notes: "",
};

function getStringValue(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return "";
}

function getStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => getStringValue(item))
      .filter(Boolean);
  }

  const single = getStringValue(value);
  return single ? [single] : [];
}

function normalizeBuildingTypeLabel(raw: string): string {
  const cleaned = raw.trim().toLowerCase();

  if (!cleaned) return "";

  if (cleaned.includes("woonfunctie") || cleaned === "woning" || cleaned.includes("woon")) {
    return "Woning";
  }

  if (cleaned.includes("kantoorfunctie") || cleaned.includes("kantoor")) {
    return "Kantoor";
  }

  if (cleaned.includes("winkelfunctie") || cleaned.includes("winkel")) {
    return "Winkel";
  }

  if (cleaned.includes("industriefunctie") || cleaned.includes("industrie")) {
    return "Industriefunctie";
  }

  if (cleaned.includes("bijeenkomstfunctie") || cleaned.includes("bijeenkomst")) {
    return "Bijeenkomstfunctie";
  }

  if (cleaned.includes("onderwijsfunctie") || cleaned.includes("onderwijs")) {
    return "Onderwijsfunctie";
  }

  if (cleaned.includes("gezondheidszorgfunctie") || cleaned.includes("gezondheidszorg")) {
    return "Gezondheidszorgfunctie";
  }

  if (cleaned.includes("logiesfunctie") || cleaned.includes("logies")) {
    return "Logiesfunctie";
  }

  if (cleaned.includes("sportfunctie") || cleaned.includes("sport")) {
    return "Sportfunctie";
  }

  if (cleaned.includes("celfunctie") || cleaned.includes("cel")) {
    return "Celfunctie";
  }

  if (cleaned.includes("overige gebruiksfunctie") || cleaned.includes("overig")) {
    return "Overige gebruiksfunctie";
  }

  if (cleaned === "adres" || cleaned === "hoofdadres") {
    return "";
  }

  return raw.trim();
}

function mapContainerTypeToWasteType(containerType: string) {
  const cleaned = containerType.trim().toLowerCase();

  if (!cleaned) return "Bouw- en sloop";

  if (cleaned === "bouw en sloop") return "Bouw- en sloop";
  if (cleaned === "b-hout") return "B-hout";
  if (cleaned === "puin") return "Puin";
  if (cleaned === "ijzer") return "IJzer";
  if (cleaned === "glas") return "Glas";
  if (cleaned === "karton") return "Karton";

  return containerType;
}

function mapVolumeToContainerSize(volume: string) {
  const cleaned = volume.trim();
  if (!cleaned) return "10 m³";
  return `${cleaned} m³`;
}

export default function NewProjectPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [authUserId, setAuthUserId] = useState("");
  const [userRole, setUserRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [attentionPoints, setAttentionPoints] = useState<AttentionPoint[]>([
    createAttentionPoint(),
  ]);
  const [equipmentItems, setEquipmentItems] = useState<EquipmentItem[]>(DEFAULT_TOOLS);
  const [taskItems, setTaskItems] = useState<TaskItem[]>([createTaskItem()]);
  const [containerItems, setContainerItems] = useState<ContainerItem[]>([createContainerItem()]);

  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState("");

  const [knownClients, setKnownClients] = useState<KnownClient[]>([]);
  const [clientSuggestions, setClientSuggestions] = useState<KnownClient[]>([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);

  const [bagLoading, setBagLoading] = useState(false);

  const addressRequestRef = useRef(0);
  const bagRequestRef = useRef(0);

  useEffect(() => {
    async function init() {
      try {
        const appUser = await getCurrentAppUser();

        if (!appUser) {
          window.location.href = "/login";
          return;
        }

        setAuthUserId(appUser.authUserId);
        setUserRole(appUser.role || "");

        const { data: projectRows, error } = await supabase
          .from("projects")
          .select("opdrachtgever")
          .not("opdrachtgever", "is", null)
          .order("opdrachtgever", { ascending: true });

        if (!error && projectRows) {
          const uniqueClients = Array.from(
            new Set(
              projectRows
                .map((row) => String(row.opdrachtgever ?? "").trim())
                .filter(Boolean)
            )
          ).map((label) => ({ label }));

          setKnownClients(uniqueClients);
        }
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
    const query = form.address.trim();

    if (query.length < 3) {
      setAddressSuggestions([]);
      setAddressLoading(false);
      return;
    }

    const currentRequest = addressRequestRef.current + 1;
    addressRequestRef.current = currentRequest;

    const timeout = window.setTimeout(async () => {
      try {
        setAddressLoading(true);

        const response = await fetch(`/api/address-suggest?q=${encodeURIComponent(query)}`, {
          method: "GET",
        });

        const json = await response.json();

        if (addressRequestRef.current !== currentRequest) {
          return;
        }

        setAddressSuggestions(json?.suggestions ?? []);
      } catch (error) {
        console.error("Fout bij ophalen adressuggesties:", error);
        if (addressRequestRef.current === currentRequest) {
          setAddressSuggestions([]);
        }
      } finally {
        if (addressRequestRef.current === currentRequest) {
          setAddressLoading(false);
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [form.address]);

  useEffect(() => {
    const query = form.opdrachtgever.trim().toLowerCase();

    if (!query) {
      setClientSuggestions([]);
      return;
    }

    const matches = knownClients
      .filter((item) => item.label.toLowerCase().includes(query))
      .slice(0, 8);

    setClientSuggestions(matches);
  }, [form.opdrachtgever, knownClients]);

  useEffect(() => {
    const address = form.address.trim();

    if (selectedAddressId || address.length < 10) {
      return;
    }

    const timeout = window.setTimeout(() => {
      runBagAutofill(address);
    }, 900);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [form.address, selectedAddressId]);

  const filledAttentionCount = useMemo(() => {
    return attentionPoints.filter(
      (item) => item.title.trim() || item.notes.trim() || item.photos.length > 0
    ).length;
  }, [attentionPoints]);

  const checkedEquipmentCount = useMemo(() => {
    return equipmentItems.filter((item) => item.is_checked).length;
  }, [equipmentItems]);

  const activeTaskCount = useMemo(() => {
    return taskItems.filter(
      (item) =>
        item.description.trim() ||
        item.notes.trim() ||
        item.photoName ||
        item.responsible_person.trim()
    ).length;
  }, [taskItems]);

  const activeContainerCount = useMemo(() => {
    return containerItems.filter((item) => item.container_type && item.volume_m3).length;
  }, [containerItems]);

  function updateFormField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function generateProjectNumber() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    return `BS-${yyyy}${mm}${dd}-${hh}${min}`;
  }

  function getBagBuildingType(payload?: BagAutofillResponse["data"]) {
    const freeDoc = payload?.bag_payload_json?.freeDoc;
    const lookupDoc = payload?.bag_payload_json?.lookupDoc;
    const gebruiksdoelen = getStringArray(payload?.bag_payload_json?.gebruiksdoelen);

    const preferredCandidates = [
      ...gebruiksdoelen,
      getStringValue(lookupDoc?.gebruiksdoel),
      getStringValue(lookupDoc?.gebruiksdoelen),
      getStringValue(freeDoc?.gebruiksdoel),
      getStringValue(freeDoc?.gebruiksdoelen),
      getStringValue(lookupDoc?.pandtype),
      getStringValue(freeDoc?.pandtype),
      getStringValue(lookupDoc?.objecttype),
      getStringValue(freeDoc?.objecttype),
      getStringValue(lookupDoc?.type),
      getStringValue(freeDoc?.type),
      getStringValue(lookupDoc?.adrestype),
    ].filter(Boolean);

    for (const candidate of preferredCandidates) {
      const normalized = normalizeBuildingTypeLabel(candidate);
      if (normalized) {
        return normalized;
      }
    }

    return "";
  }

  async function runBagAutofill(sourceAddress: string) {
    const trimmed = sourceAddress.trim();

    if (!trimmed) {
      return;
    }

    const currentRequest = bagRequestRef.current + 1;
    bagRequestRef.current = currentRequest;

    setBagLoading(true);

    try {
      const response = await fetch("/api/bag-autofill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceAddress: trimmed,
        }),
      });

      const json = (await response.json()) as BagAutofillResponse;

      if (bagRequestRef.current !== currentRequest) {
        return;
      }

      updateFormField("bag_source_address", trimmed);

      if (!response.ok || !json.ok) {
        console.error("BAG autofill mislukt:", json.error);
        return;
      }

      if (!json.found || !json.data) {
        return;
      }

      const bagData = json.data;
      const detectedBuildingType = getBagBuildingType(bagData);

      setForm((prev) => ({
        ...prev,
        bag_source_address: trimmed,
        bag_build_year:
          bagData.bag_build_year !== null && bagData.bag_build_year !== undefined
            ? String(bagData.bag_build_year)
            : prev.bag_build_year,
        bag_surface_m2:
          bagData.bag_surface_m2 !== null && bagData.bag_surface_m2 !== undefined
            ? String(bagData.bag_surface_m2)
            : prev.bag_surface_m2,
        bag_pand_id: bagData.bag_pand_id ?? prev.bag_pand_id,
        bag_verblijfsobject_id:
          bagData.bag_verblijfsobject_id ?? prev.bag_verblijfsobject_id,
        bag_status: bagData.bag_status ?? prev.bag_status,
        building_type: detectedBuildingType || prev.building_type,
        area_m2:
          bagData.bag_surface_m2 !== null && bagData.bag_surface_m2 !== undefined
            ? String(bagData.bag_surface_m2)
            : prev.area_m2,
        estimated_surface_m2:
          bagData.bag_surface_m2 !== null && bagData.bag_surface_m2 !== undefined
            ? String(bagData.bag_surface_m2)
            : prev.estimated_surface_m2,
      }));
    } catch (error) {
      if (bagRequestRef.current === currentRequest) {
        console.error("Fout bij automatische BAG-autofill:", error);
      }
    } finally {
      if (bagRequestRef.current === currentRequest) {
        setBagLoading(false);
      }
    }
  }

  async function selectAddressSuggestion(item: AddressSuggestion) {
    updateFormField("address", item.address);
    updateFormField("bag_source_address", item.address);
    setSelectedAddressId(item.id);
    setAddressSuggestions([]);
    setShowAddressSuggestions(false);

    try {
      const response = await fetch(`/api/address-lookup?id=${encodeURIComponent(item.id)}`);
      const json = await response.json();
      const result = json?.result;

      const finalAddress = result?.address || item.address;

      updateFormField("address", finalAddress);
      updateFormField("bag_source_address", finalAddress);

      await runBagAutofill(finalAddress);
    } catch (error) {
      console.error("Fout bij address lookup:", error);
      await runBagAutofill(item.address);
    }
  }

  function selectClientSuggestion(item: KnownClient) {
    updateFormField("opdrachtgever", item.label);
    setClientSuggestions([]);
    setShowClientSuggestions(false);
  }

  function updateAttentionPoint(id: string, patch: Partial<AttentionPoint>) {
    setAttentionPoints((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function removeAttentionPoint(id: string) {
    setAttentionPoints((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((item) => item.id !== id);
    });
  }

  function addAttentionPoint() {
    setAttentionPoints((prev) => [...prev, createAttentionPoint()]);
  }

  function addAttentionPhoto(id: string) {
    setAttentionPoints((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              photos: [...item.photos, ""],
            }
          : item
      )
    );
  }

  function updateAttentionPhoto(id: string, index: number, value: string) {
    setAttentionPoints((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const nextPhotos = [...item.photos];
        nextPhotos[index] = value;

        return {
          ...item,
          photos: nextPhotos,
        };
      })
    );
  }

  function removeAttentionPhoto(id: string, index: number) {
    setAttentionPoints((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        return {
          ...item,
          photos: item.photos.filter((_, i) => i !== index),
        };
      })
    );
  }

  function updateEquipmentItem(id: string, patch: Partial<EquipmentItem>) {
    setEquipmentItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function addEquipmentItem() {
    setEquipmentItems((prev) => [...prev, createEquipmentItem("Alles", "1")]);
  }

  function removeEquipmentItem(id: string) {
    setEquipmentItems((prev) => prev.filter((item) => item.id !== id));
  }

  function updateTaskItem(id: string, patch: Partial<TaskItem>) {
    setTaskItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function addTaskItem() {
    setTaskItems((prev) => [...prev, createTaskItem()]);
  }

  function removeTaskItem(id: string) {
    setTaskItems((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((item) => item.id !== id);
    });
  }

  async function handleTaskPhotoChange(id: string, file: File | null) {
    if (!file) {
      updateTaskItem(id, { photoName: "", photoPreview: "" });
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      updateTaskItem(id, {
        photoName: file.name,
        photoPreview: typeof reader.result === "string" ? reader.result : "",
      });
    };

    reader.readAsDataURL(file);
  }

  function updateContainerItem(id: string, patch: Partial<ContainerItem>) {
    setContainerItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function addContainerItem() {
    setContainerItems((prev) => [...prev, createContainerItem()]);
  }

  function removeContainerItem(id: string) {
    setContainerItems((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((item) => item.id !== id);
    });
  }

  function combineSections(sections: string[]) {
    return sections.filter(Boolean).join("\n\n").trim();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!(userRole === "admin" || userRole === "office")) {
      setMessage("Je hebt geen rechten om een nieuw project aan te maken.");
      return;
    }

    if (!form.name || !form.address) {
      setMessage("Vul minimaal projectnaam en adres in.");
      return;
    }

    if (!authUserId) {
      setMessage("Geen gebruiker gevonden.");
      return;
    }

    try {
      setSaving(true);

      const preparedAttentionPoints: CreateAttentionPointInput[] = attentionPoints
        .map((item) => ({
          title: item.title.trim(),
          notes: item.notes.trim(),
          photos: item.photos.map((photo) => photo.trim()).filter(Boolean),
        }))
        .filter((item) => item.title || item.notes || item.photos.length > 0);

      const preparedEquipmentItems: CreateEquipmentItemInput[] = equipmentItems
        .map((item) => ({
          label: item.label.trim(),
          quantity: Number(item.quantity || 0),
          is_checked: item.is_checked,
          notes: item.notes.trim(),
          is_default_item: item.is_default_item,
        }))
        .filter((item) => item.label);

      const preparedTasks: CreateTaskInput[] = taskItems
        .map((item) => ({
          description: item.description.trim(),
          is_removed: item.is_removed,
          is_done: item.is_done,
          notes: item.notes.trim(),
          responsible_person: item.responsible_person.trim(),
          photos: [],
        }))
        .filter((item) => item.description || item.notes || item.responsible_person);

      const preparedContainers: CreateContainerInput[] = containerItems
        .map((item) => ({
          waste_type: mapContainerTypeToWasteType(item.container_type),
          container_size: mapVolumeToContainerSize(item.volume_m3),
          planned_quantity: 1,
          actual_quantity: 1,
          planned_delivery_date: form.start_date || null,
          actual_delivery_date: null,
          planned_pickup_date: form.end_date || null,
          actual_pickup_date: null,
          change_reason: "",
          notes: "",
        }))
        .filter((item) => item.waste_type && item.container_size);

      const executorNote = form.assigned_executor
        ? `Uitvoerder: ${form.assigned_executor}`
        : "";

      const combinedNotes = combineSections([form.notes, executorNote]);

      await createProject(
        {
          project_number: form.project_number || generateProjectNumber(),
          name: form.name,
          address: form.address,
          opdrachtgever: form.opdrachtgever,
          demolition_type: form.demolition_type,
          building_type: form.building_type,
          area_m2: Number(form.area_m2 || 0),
          customer_contact: form.customer_contact,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          work_days: Number(form.work_days || 0),
          notes: combinedNotes,
          status: form.status,

          bag_source_address: form.bag_source_address || "",
          bag_build_year: form.bag_build_year ? Number(form.bag_build_year) : null,
          bag_surface_m2: form.bag_surface_m2 ? Number(form.bag_surface_m2) : null,
          bag_pand_id: form.bag_pand_id || null,
          bag_verblijfsobject_id: form.bag_verblijfsobject_id || null,
          bag_status: form.bag_status || null,

          estimated_surface_m2: form.estimated_surface_m2
            ? Number(form.estimated_surface_m2)
            : null,
          estimated_man_hours: form.estimated_man_hours
            ? Number(form.estimated_man_hours)
            : null,
          estimated_container_count: preparedContainers.length || null,
          estimated_material_notes: form.estimated_material_notes || undefined,

          attention_points: preparedAttentionPoints,
          equipment_items: preparedEquipmentItems,
          tasks: preparedTasks,
          containers: preparedContainers,
        },
        authUserId
      );

      setForm(initialForm);
      setAttentionPoints([createAttentionPoint()]);
      setEquipmentItems([createEquipmentItem("Alles", "1", true)]);
      setTaskItems([createTaskItem()]);
      setContainerItems([createContainerItem()]);
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      setSelectedAddressId("");
      setClientSuggestions([]);
      setShowClientSuggestions(false);

      setMessage(
        "Project opgeslagen. Containers worden nu direct structureel opgeslagen en zijn daarna zichtbaar op projectdetail en de containerspagina."
      );
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error && error.message
          ? `Opslaan mislukt: ${error.message}`
          : "Opslaan mislukt."
      );
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
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div>
            <h1 style={{ margin: 0, fontSize: 38 }}>Nieuw Project</h1>
            <p style={{ margin: "8px 0 0 0", color: "#6b675f" }}>
              Maak een nieuw project aan en leg direct de voorbereiding vast.
            </p>
          </div>

          <Link href="/" style={backLinkStyle}>
            ← Dashboard
          </Link>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 22 }}>
          <SectionCard
            title="Gegevens"
            subtitle="Projectnaam, adres en opdrachtgever. BAG wordt automatisch opgehaald zodra het adres duidelijk genoeg is."
            rightContent={<InfoPill text={bagLoading ? "BAG laden..." : "BAG automatisch"} />}
          >
            <div style={gridTwoStyle}>
              <Field
                label="Projectnaam"
                value={form.name}
                onChange={(value) => updateFormField("name", value)}
                placeholder="Bijv. Kantoor Amsterdam"
              />
              <Field
                label="Pandtype"
                value={form.building_type}
                onChange={(value) => updateFormField("building_type", value)}
                placeholder="Wordt indien mogelijk automatisch gevuld"
              />
            </div>

            <div style={{ position: "relative" }}>
              <Field
                label="Adres"
                value={form.address}
                onChange={(value) => {
                  updateFormField("address", value);
                  updateFormField("bag_source_address", value);
                  setSelectedAddressId("");
                  setShowAddressSuggestions(true);
                }}
                placeholder="Straat + huisnummer + postcode + plaats"
              />

              {showAddressSuggestions && (addressLoading || addressSuggestions.length > 0) ? (
                <div style={suggestionsWrapStyle}>
                  {addressLoading ? (
                    <div style={suggestionItemMutedStyle}>Zoeken...</div>
                  ) : (
                    addressSuggestions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => selectAddressSuggestion(item)}
                        style={suggestionButtonStyle}
                      >
                        <div style={{ fontWeight: 700 }}>{item.label}</div>
                        <div style={{ fontSize: 13, color: "#6b675f", marginTop: 4 }}>
                          {item.street} {item.houseNumber} · {item.postcode} {item.city}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>

            <div style={{ position: "relative" }}>
              <div style={gridTwoStyle}>
                <Field
                  label="Opdrachtgever"
                  value={form.opdrachtgever}
                  onChange={(value) => {
                    updateFormField("opdrachtgever", value);
                    setShowClientSuggestions(true);
                  }}
                  placeholder="Begin te typen voor bekende opdrachtgevers"
                />
                <Field
                  label="Contactgegevens"
                  value={form.customer_contact}
                  onChange={(value) => updateFormField("customer_contact", value)}
                  placeholder="Naam / telefoon / e-mail"
                />
              </div>

              {showClientSuggestions && clientSuggestions.length > 0 ? (
                <div style={{ ...suggestionsWrapStyle, top: 88 }}>
                  {clientSuggestions.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => selectClientSuggestion(item)}
                      style={suggestionButtonStyle}
                    >
                      <div style={{ fontWeight: 700 }}>{item.label}</div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard
            title="Project"
            subtitle="Slooptype, planning en objectgegevens. m² en bouwjaar worden automatisch ingevuld als BAG ze teruggeeft."
          >
            <div style={gridThreeStyle}>
              <Field
                label="Soort sloop"
                value={form.demolition_type}
                onChange={(value) => updateFormField("demolition_type", value)}
                as="select"
                options={DEMOLITION_OPTIONS.map((value) => ({ value, label: value }))}
              />
              <Field
                label="Aantal m²"
                value={form.area_m2}
                onChange={(value) => updateFormField("area_m2", value)}
                placeholder="Wordt indien mogelijk automatisch gevuld"
                inputMode="decimal"
              />
              <Field
                label="Bouwjaar"
                value={form.bag_build_year}
                onChange={(value) => updateFormField("bag_build_year", value)}
                placeholder="Wordt indien mogelijk automatisch gevuld"
                inputMode="numeric"
              />
            </div>

            <div style={gridTwoStyle}>
              <Field
                label="Startdatum"
                value={form.start_date}
                onChange={(value) => updateFormField("start_date", value)}
                type="date"
              />
              <Field
                label="Einddatum"
                value={form.end_date}
                onChange={(value) => updateFormField("end_date", value)}
                type="date"
              />
            </div>

            <div style={gridTwoStyle}>
              <Field
                label="Uitvoerder"
                value={form.assigned_executor}
                onChange={(value) => updateFormField("assigned_executor", value)}
                as="select"
                options={[
                  { value: "", label: "Kies uitvoerder" },
                  ...EXECUTOR_OPTIONS.map((value) => ({ value, label: value })),
                ]}
              />
              <Field
                label="Status"
                value={form.status}
                onChange={(value) => updateFormField("status", value)}
                as="select"
                options={STATUS_OPTIONS.map((value) => ({ value, label: value }))}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Taken"
            subtitle="Per taak omschrijving, weg ja/nee, notitie en foto. Deze taken worden nu echt opgeslagen."
            rightContent={<InfoPill text={`${activeTaskCount} taakregels`} />}
          >
            <div style={{ display: "grid", gap: 16 }}>
              {taskItems.map((item, index) => (
                <div key={item.id} style={nestedCardStyle}>
                  <div style={nestedHeaderStyle}>
                    <strong style={{ fontSize: 16 }}>Taak {index + 1}</strong>

                    <button
                      type="button"
                      onClick={() => removeTaskItem(item.id)}
                      style={smallGhostButtonStyle}
                    >
                      Verwijderen
                    </button>
                  </div>

                  <div style={gridTwoStyle}>
                    <Field
                      label="Omschrijving"
                      value={item.description}
                      onChange={(value) => updateTaskItem(item.id, { description: value })}
                      placeholder="Bijv. Trapgat dichtzetten"
                    />

                    <label style={{ display: "grid", gap: 8 }}>
                      <span style={fieldLabelStyle}>Weg</span>
                      <select
                        value={item.is_removed ? "ja" : "nee"}
                        onChange={(e) =>
                          updateTaskItem(item.id, { is_removed: e.target.value === "ja" })
                        }
                        style={{
                          ...inputStyle,
                          borderColor: item.is_removed ? "#9bc59f" : "#f0b5b5",
                          background: item.is_removed ? "#eff9f0" : "#fff3f3",
                        }}
                      >
                        <option value="ja">Ja</option>
                        <option value="nee">Nee</option>
                      </select>
                    </label>
                  </div>

                  <div style={gridTwoStyle}>
                    <Field
                      label="Notitie"
                      value={item.notes}
                      onChange={(value) => updateTaskItem(item.id, { notes: value })}
                      placeholder="Bijv. Voor start project uitvoeren"
                    />

                    <label style={{ display: "grid", gap: 8 }}>
                      <span style={fieldLabelStyle}>Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handleTaskPhotoChange(item.id, e.target.files?.[0] ?? null)
                        }
                        style={inputStyle}
                      />
                      {item.photoName ? (
                        <div style={helperTextStyle}>Gekozen bestand: {item.photoName}</div>
                      ) : null}
                    </label>
                  </div>

                  <div style={gridTwoStyle}>
                    <Field
                      label="Verantwoordelijke"
                      value={item.responsible_person}
                      onChange={(value) =>
                        updateTaskItem(item.id, { responsible_person: value })
                      }
                      placeholder="Bijv. Dennis"
                    />
                    <label style={{ display: "grid", gap: 8 }}>
                      <span style={fieldLabelStyle}>Afgevinkt</span>
                      <select
                        value={item.is_done ? "ja" : "nee"}
                        onChange={(e) =>
                          updateTaskItem(item.id, { is_done: e.target.value === "ja" })
                        }
                        style={inputStyle}
                      >
                        <option value="nee">Nee</option>
                        <option value="ja">Ja</option>
                      </select>
                    </label>
                  </div>

                  {item.photoPreview ? (
                    <div style={taskPhotoPreviewWrapStyle}>
                      <img
                        src={item.photoPreview}
                        alt={item.photoName || "Taakfoto"}
                        style={taskPhotoPreviewStyle}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16 }}>
              <button type="button" onClick={addTaskItem} style={accentButtonStyle}>
                + Taak
              </button>
            </div>
          </SectionCard>

          <SectionCard
            title="Calculatie"
            subtitle="Aantal dagen, manuren en containerregels. Deze worden nu direct echt opgeslagen."
            rightContent={<InfoPill text={`${activeContainerCount} containers`} />}
          >
            <div style={gridTwoStyle}>
              <Field
                label="Aantal dagen"
                value={form.work_days}
                onChange={(value) => updateFormField("work_days", value)}
                placeholder="Bijv. 5"
                inputMode="numeric"
              />
              <Field
                label="Aantal manuren"
                value={form.estimated_man_hours}
                onChange={(value) => updateFormField("estimated_man_hours", value)}
                placeholder="Bijv. 48"
                inputMode="decimal"
              />
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {containerItems.map((item, index) => (
                <div key={item.id} style={containerRowStyle}>
                  <div style={containerGridStyle}>
                    <Field
                      label={index === 0 ? "Soort container" : `Container ${index + 1}`}
                      value={item.container_type}
                      onChange={(value) =>
                        updateContainerItem(item.id, { container_type: value })
                      }
                      as="select"
                      options={CONTAINER_TYPE_OPTIONS.map((value) => ({
                        value,
                        label: value,
                      }))}
                    />
                    <Field
                      label="Aantal m3"
                      value={item.volume_m3}
                      onChange={(value) => updateContainerItem(item.id, { volume_m3: value })}
                      as="select"
                      options={CONTAINER_VOLUME_OPTIONS.map((value) => ({
                        value,
                        label: value,
                      }))}
                    />

                    <div style={{ display: "grid", gap: 8 }}>
                      <span style={fieldLabelStyle}>Status</span>
                      <div style={containerReadyPillStyle}>Wordt opgeslagen</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeContainerItem(item.id)}
                    style={smallGhostButtonStyle}
                  >
                    Verwijderen
                  </button>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16 }}>
              <button type="button" onClick={addContainerItem} style={accentButtonStyle}>
                + Container
              </button>
            </div>
          </SectionCard>

          <SectionCard
            title="Aandachtspunten"
            subtitle="Titel + optionele toelichting + meerdere foto-URL's indien nodig."
            rightContent={<InfoPill text={`${filledAttentionCount} ingevuld`} />}
          >
            <div style={{ display: "grid", gap: 16 }}>
              {attentionPoints.map((item, index) => (
                <div key={item.id} style={nestedCardStyle}>
                  <div style={nestedHeaderStyle}>
                    <strong style={{ fontSize: 16 }}>Aandachtspunt {index + 1}</strong>

                    <button
                      type="button"
                      onClick={() => removeAttentionPoint(item.id)}
                      style={smallGhostButtonStyle}
                    >
                      Verwijderen
                    </button>
                  </div>

                  <Field
                    label="Titel"
                    value={item.title}
                    onChange={(value) => updateAttentionPoint(item.id, { title: value })}
                    placeholder="Bijv. Draagmuur vermoedelijk aanwezig"
                  />

                  <Field
                    label="Toelichting"
                    value={item.notes}
                    onChange={(value) => updateAttentionPoint(item.id, { notes: value })}
                    placeholder="Bijv. Extra controle nodig vooraf / tekeningen opvragen / voorzichtig slopen"
                    as="textarea"
                  />

                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={subtleLabelStyle}>Foto-URL&apos;s (tijdelijk handmatig)</div>

                    {item.photos.length === 0 ? (
                      <div style={emptyHintStyle}>Nog geen foto&apos;s toegevoegd.</div>
                    ) : null}

                    {item.photos.map((photo, photoIndex) => (
                      <div key={`${item.id}-${photoIndex}`} style={photoRowStyle}>
                        <input
                          value={photo}
                          onChange={(e) =>
                            updateAttentionPhoto(item.id, photoIndex, e.target.value)
                          }
                          placeholder="https://..."
                          style={inputStyle}
                        />

                        <button
                          type="button"
                          onClick={() => removeAttentionPhoto(item.id, photoIndex)}
                          style={smallGhostButtonStyle}
                        >
                          Weg
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => addAttentionPhoto(item.id)}
                      style={smallSecondaryButtonStyle}
                    >
                      + Foto-URL toevoegen
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16 }}>
              <button type="button" onClick={addAttentionPoint} style={accentButtonStyle}>
                + Aandachtspunt
              </button>
            </div>
          </SectionCard>

          <SectionCard
            title="Gereedschap"
            subtitle="Voeg gereedschap toe, aantal en notitie."
            rightContent={<InfoPill text={`${checkedEquipmentCount} afgevinkt`} />}
          >
            <div style={{ display: "grid", gap: 12 }}>
              {equipmentItems.map((item, index) => (
                <div key={item.id} style={equipmentRowStyle}>
                  <div style={nestedHeaderStyle}>
                    <strong style={{ fontSize: 16 }}>Gereedschap {index + 1}</strong>

                    <button
                      type="button"
                      onClick={() => removeEquipmentItem(item.id)}
                      style={smallGhostButtonStyle}
                    >
                      Verwijderen
                    </button>
                  </div>

                  <div style={toolGridStyle}>
                    <Field
                      label="Gereedschap"
                      value={item.label}
                      onChange={(value) => updateEquipmentItem(item.id, { label: value })}
                      as="select"
                      options={TOOL_OPTIONS.map((value) => ({ value, label: value }))}
                    />
                    <Field
                      label="Aantal"
                      value={item.quantity}
                      onChange={(value) => updateEquipmentItem(item.id, { quantity: value })}
                      inputMode="decimal"
                    />
                    <Field
                      label="Notitie"
                      value={item.notes}
                      onChange={(value) => updateEquipmentItem(item.id, { notes: value })}
                      placeholder="Bijzonderheden"
                    />
                  </div>

                  <label style={checkboxWrapStyle}>
                    <input
                      type="checkbox"
                      checked={item.is_checked}
                      onChange={(e) =>
                        updateEquipmentItem(item.id, { is_checked: e.target.checked })
                      }
                    />
                    <span>Meenemen</span>
                  </label>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16 }}>
              <button type="button" onClick={addEquipmentItem} style={accentButtonStyle}>
                + Gereedschap
              </button>
            </div>
          </SectionCard>

          <Field
            label="Algemene notities"
            value={form.notes}
            onChange={(value) => updateFormField("notes", value)}
            placeholder="Extra notities voor dit project..."
            as="textarea"
          />

          <button type="submit" disabled={saving} style={buttonStyle}>
            {saving ? "Opslaan..." : "Project aanmaken"}
          </button>

          {message && <div style={messageStyle}>{message}</div>}
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  as = "input",
  options = [],
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  as?: "input" | "textarea" | "select";
  options?: { value: string; label: string }[];
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={fieldLabelStyle}>{label}</span>

      {as === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ ...inputStyle, minHeight: 120, resize: "vertical" }}
        />
      ) : as === "select" ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
          {options.map((option) => (
            <option key={`${label}-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={inputStyle}
          inputMode={inputMode}
        />
      )}
    </label>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
  rightContent,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  rightContent?: React.ReactNode;
}) {
  return (
    <section style={sectionCardStyle}>
      <div style={sectionHeaderStyle}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24 }}>{title}</h2>
          <p style={{ marginTop: 8, color: "#6b675f", lineHeight: 1.5 }}>{subtitle}</p>
        </div>

        {rightContent}
      </div>

      <div style={{ display: "grid", gap: 16, marginTop: 18 }}>{children}</div>
    </section>
  );
}

function InfoPill({ text }: { text: string }) {
  return <div style={infoPillStyle}>{text}</div>;
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  padding: 24,
  background: "#f6f2ed",
  fontFamily: "Arial, sans-serif",
};

const cardStyle: CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  background: "#fffaf6",
  borderRadius: 32,
  padding: 28,
  border: "1px solid #ece3da",
  boxShadow: "0 14px 28px rgba(0,0,0,0.04)",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  flexWrap: "wrap",
  marginBottom: 24,
};

const backLinkStyle: CSSProperties = {
  color: "#ef6b1f",
  textDecoration: "none",
  fontWeight: 700,
};

const sectionCardStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 24,
  padding: 22,
  border: "1px solid #e8dfd6",
  boxShadow: "0 10px 20px rgba(0,0,0,0.04)",
};

const sectionHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
};

const infoPillStyle: CSSProperties = {
  background: "#fff1e8",
  color: "#a35219",
  border: "1px solid #f3c5a4",
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 700,
};

const containerReadyPillStyle: CSSProperties = {
  background: "#eef8f0",
  color: "#2f7d44",
  border: "1px solid #bfe0c8",
  borderRadius: 14,
  padding: "14px 12px",
  fontSize: 14,
  fontWeight: 700,
  minHeight: 54,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const fieldLabelStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "#5f5b55",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: 16,
  borderRadius: 18,
  border: "1px solid #d8d0c7",
  background: "#ffffff",
  fontSize: 16,
};

const gridTwoStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 14,
};

const gridThreeStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 14,
};

const nestedCardStyle: CSSProperties = {
  background: "#fffaf6",
  border: "1px solid #e8dfd6",
  borderRadius: 20,
  padding: 16,
  display: "grid",
  gap: 14,
};

const nestedHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
};

const subtleLabelStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "#5f5b55",
};

const emptyHintStyle: CSSProperties = {
  background: "#f7f2ec",
  borderRadius: 14,
  padding: 12,
  color: "#7b766f",
  fontSize: 14,
};

const helperTextStyle: CSSProperties = {
  fontSize: 13,
  color: "#6b675f",
};

const photoRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 10,
  alignItems: "center",
};

const equipmentRowStyle: CSSProperties = {
  background: "#fffaf6",
  border: "1px solid #e8dfd6",
  borderRadius: 18,
  padding: 14,
  display: "grid",
  gap: 12,
};

const checkboxWrapStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  fontWeight: 700,
  color: "#3f3a35",
};

const smallSecondaryButtonStyle: CSSProperties = {
  background: "#ffffff",
  color: "#171717",
  border: "1px solid #d8d0c7",
  borderRadius: 14,
  padding: "10px 12px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  width: "fit-content",
};

const smallGhostButtonStyle: CSSProperties = {
  background: "transparent",
  color: "#8a5a36",
  border: "1px solid #ead2c2",
  borderRadius: 14,
  padding: "10px 12px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const accentButtonStyle: CSSProperties = {
  background: "#ef6b1f",
  color: "#fff",
  border: "none",
  borderRadius: 16,
  padding: "12px 16px",
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  width: "fit-content",
};

const buttonStyle: CSSProperties = {
  background: "#ef6b1f",
  color: "#fff",
  border: "none",
  borderRadius: 18,
  padding: 18,
  fontSize: 18,
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 12px 22px rgba(239,107,31,0.18)",
};

const messageStyle: CSSProperties = {
  background: "#fff1e8",
  border: "1px solid #f6c6a4",
  color: "#8a4b1e",
  borderRadius: 16,
  padding: 14,
};

const suggestionsWrapStyle: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  top: "100%",
  marginTop: 6,
  background: "#ffffff",
  border: "1px solid #e2d8ce",
  borderRadius: 18,
  boxShadow: "0 16px 28px rgba(0,0,0,0.10)",
  overflow: "hidden",
  zIndex: 20,
};

const suggestionButtonStyle: CSSProperties = {
  width: "100%",
  textAlign: "left",
  background: "#ffffff",
  border: "none",
  borderBottom: "1px solid #f0e7de",
  padding: 14,
  cursor: "pointer",
};

const suggestionItemMutedStyle: CSSProperties = {
  padding: 14,
  color: "#6b675f",
};

const taskPhotoPreviewWrapStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-start",
};

const taskPhotoPreviewStyle: CSSProperties = {
  width: 180,
  height: 140,
  objectFit: "cover",
  borderRadius: 16,
  border: "1px solid #e2d8ce",
};

const containerRowStyle: CSSProperties = {
  background: "#fffaf6",
  border: "1px solid #e8dfd6",
  borderRadius: 18,
  padding: 14,
  display: "grid",
  gap: 12,
};

const containerGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.3fr 0.7fr 0.6fr",
  gap: 12,
};

const toolGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 0.5fr 1fr",
  gap: 12,
};