import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PDOK_LOCATIESERVER_BASE = "https://api.pdok.nl/bzk/locatieserver/search/v3_1";
const BAG_WFS_BASE = "https://service.pdok.nl/lv/bag/wfs/v2_0";

const BAG_API_KEY = process.env.BAG_API_KEY ?? "";

type BagAutofillRequestBody = {
  postcode?: string;
  huisnummer?: string | number;
  huisletter?: string;
  huisnummertoevoeging?: string;
  sourceAddress?: string;
};

type LocatieDoc = Record<string, unknown>;

type NormalizedAddressInput = {
  postcode: string;
  huisnummer: string;
  huisletter?: string;
  huisnummertoevoeging?: string;
};

type BagAutofillMappedResponse = {
  bag_build_year: number | null;
  bag_surface_m2: number | null;
  bag_pand_id: string | null;
  bag_verblijfsobject_id: string | null;
  bag_status: string | null;
  bag_payload_json: {
    freeDoc: LocatieDoc;
    lookupDoc: LocatieDoc | null;
    verblijfsobjectXml: string | null;
    pandXml: string | null;
    gebruiksdoelen: string[];
    provider: "pdok-wfs";
    bagApiKeyConfigured: boolean;
  };
};

function normalizePostcode(value?: string) {
  return (value ?? "").replace(/\s+/g, "").toUpperCase().trim();
}

function normalizeOptional(value?: string) {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseHouseNumber(value?: string | number) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? String(parsed) : null;
}

function parseFromSourceAddress(sourceAddress?: string) {
  const raw = (sourceAddress ?? "").trim();
  if (!raw) {
    return {};
  }

  const compact = raw.replace(/\s+/g, " ").trim();

  const postcodeMatch = compact.match(/\b([1-9][0-9]{3})\s*([A-Za-z]{2})\b/);
  const postcode = postcodeMatch
    ? `${postcodeMatch[1]}${postcodeMatch[2]}`.toUpperCase()
    : undefined;

  const houseMatch = compact.match(/\b(\d+)\s*([A-Za-z])?\s*(?:[-\/]?\s*([A-Za-z0-9]+))?\b/);

  let huisnummer: string | undefined;
  let huisletter: string | undefined;
  let huisnummertoevoeging: string | undefined;

  if (houseMatch) {
    const parsed = Number.parseInt(houseMatch[1], 10);

    if (Number.isFinite(parsed)) {
      huisnummer = String(parsed);
    }

    const maybeLetter = normalizeOptional(houseMatch[2]);
    const maybeAddition = normalizeOptional(houseMatch[3]);

    if (maybeLetter && /^[A-Za-z]$/.test(maybeLetter)) {
      huisletter = maybeLetter.toUpperCase();
    }

    if (maybeAddition) {
      huisnummertoevoeging = maybeAddition;
    }
  }

  return {
    postcode,
    huisnummer,
    huisletter,
    huisnummertoevoeging,
  };
}

function resolveAddressInput(body: BagAutofillRequestBody): NormalizedAddressInput | null {
  const parsedFromSource = parseFromSourceAddress(body.sourceAddress);

  const postcode = normalizePostcode(body.postcode || parsedFromSource.postcode);
  const huisnummer = parseHouseNumber(body.huisnummer ?? parsedFromSource.huisnummer);
  const huisletter = normalizeOptional(body.huisletter || parsedFromSource.huisletter)?.toUpperCase();
  const huisnummertoevoeging = normalizeOptional(
    body.huisnummertoevoeging || parsedFromSource.huisnummertoevoeging
  );

  if (!postcode || !huisnummer) {
    return null;
  }

  return {
    postcode,
    huisnummer,
    huisletter,
    huisnummertoevoeging,
  };
}

function getString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function getNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function fetchJson(url: string) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json, */*;q=0.8",
    },
    cache: "no-store",
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Request mislukt (${res.status} ${res.statusText}) ${text}`.trim());
  }

  return JSON.parse(text);
}

async function fetchTextAllow404(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    cache: "no-store",
    ...options,
  });

  const text = await res.text();

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`Request mislukt (${res.status} ${res.statusText}) ${text}`.trim());
  }

  return text;
}

function buildSearchQuery(sourceAddress?: string, fallback?: NormalizedAddressInput | null) {
  if (sourceAddress?.trim()) {
    return sourceAddress.trim();
  }

  if (!fallback) {
    return "";
  }

  return [
    fallback.postcode,
    `${fallback.huisnummer}${fallback.huisletter ?? ""}${fallback.huisnummertoevoeging ?? ""}`,
  ]
    .filter(Boolean)
    .join(" ");
}

async function searchAddressDoc(
  sourceAddress: string,
  fallbackInput: NormalizedAddressInput | null
): Promise<LocatieDoc | null> {
  const q = buildSearchQuery(sourceAddress, fallbackInput);

  if (!q) {
    return null;
  }

  const params = new URLSearchParams({
    q,
    rows: "1",
    fl: "*",
  });

  const url = `${PDOK_LOCATIESERVER_BASE}/free?${params.toString()}`;
  const json = await fetchJson(url);

  const docs = (json as { response?: { docs?: LocatieDoc[] } })?.response?.docs;

  if (!Array.isArray(docs) || docs.length === 0) {
    return null;
  }

  return docs[0] ?? null;
}

async function lookupAddressDoc(id: string): Promise<LocatieDoc | null> {
  const params = new URLSearchParams({
    id,
    fl: "*",
  });

  const url = `${PDOK_LOCATIESERVER_BASE}/lookup?${params.toString()}`;
  const json = await fetchJson(url);

  const docs = (json as { response?: { docs?: LocatieDoc[] } })?.response?.docs;

  if (!Array.isArray(docs) || docs.length === 0) {
    return null;
  }

  return docs[0] ?? null;
}

function parseXmlTag(xml: string, tagNames: string[]) {
  for (const tag of tagNames) {
    const regex = new RegExp(`<[^>]*:?${tag}[^>]*>([\\s\\S]*?)<\\/[^>]*:?${tag}>`, "i");
    const match = xml.match(regex);

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function parseAllXmlTagValues(xml: string, tagNames: string[]) {
  const values: string[] = [];

  for (const tag of tagNames) {
    const regex = new RegExp(`<[^>]*:?${tag}[^>]*>([\\s\\S]*?)<\\/[^>]*:?${tag}>`, "gi");
    let match: RegExpExecArray | null;

    while ((match = regex.exec(xml)) !== null) {
      const value = match[1]?.trim();
      if (value) {
        values.push(value);
      }
    }
  }

  return Array.from(new Set(values));
}

async function postWfsGetFeature(typeNames: string, filterXml: string) {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<wfs:GetFeature
  service="WFS"
  version="2.0.0"
  outputFormat="application/gml+xml; version=3.2"
  xmlns:wfs="http://www.opengis.net/wfs/2.0"
  xmlns:fes="http://www.opengis.net/fes/2.0"
  xmlns:gml="http://www.opengis.net/gml/3.2"
  xmlns:bag="http://bag.geonovum.nl"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="
    http://www.opengis.net/wfs/2.0
    http://schemas.opengis.net/wfs/2.0/wfs.xsd
    http://www.opengis.net/fes/2.0
    http://schemas.opengis.net/filter/2.0/filterAll.xsd">
  <wfs:Query typeNames="${typeNames}">
    ${filterXml}
  </wfs:Query>
</wfs:GetFeature>`;

  return fetchTextAllow404(BAG_WFS_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=UTF-8",
      Accept: "application/gml+xml, text/xml;q=0.9, */*;q=0.8",
    },
    body,
  });
}

async function fetchVerblijfsobjectXmlById(id: string) {
  const safeId = escapeXml(id);

  const filterXml = `
    <fes:Filter>
      <fes:PropertyIsEqualTo>
        <fes:ValueReference>bag:identificatie</fes:ValueReference>
        <fes:Literal>${safeId}</fes:Literal>
      </fes:PropertyIsEqualTo>
    </fes:Filter>
  `;

  return postWfsGetFeature("bag:verblijfsobject", filterXml);
}

async function fetchVerblijfsobjectXmlByAddress(input: NormalizedAddressInput) {
  const postcode = escapeXml(input.postcode);
  const huisnummer = escapeXml(input.huisnummer);
  const huisletter = input.huisletter ? escapeXml(input.huisletter) : null;

  const optionalFilters = [
    huisletter
      ? `
        <fes:PropertyIsEqualTo>
          <fes:ValueReference>bag:huisletter</fes:ValueReference>
          <fes:Literal>${huisletter}</fes:Literal>
        </fes:PropertyIsEqualTo>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  const filterXml = `
    <fes:Filter>
      <fes:And>
        <fes:PropertyIsEqualTo>
          <fes:ValueReference>bag:postcode</fes:ValueReference>
          <fes:Literal>${postcode}</fes:Literal>
        </fes:PropertyIsEqualTo>
        <fes:PropertyIsEqualTo>
          <fes:ValueReference>bag:huisnummer</fes:ValueReference>
          <fes:Literal>${huisnummer}</fes:Literal>
        </fes:PropertyIsEqualTo>
        ${optionalFilters}
      </fes:And>
    </fes:Filter>
  `;

  return postWfsGetFeature("bag:verblijfsobject", filterXml);
}

async function fetchPandXmlById(id: string) {
  const safeId = escapeXml(id);

  const filterXml = `
    <fes:Filter>
      <fes:PropertyIsEqualTo>
        <fes:ValueReference>bag:identificatie</fes:ValueReference>
        <fes:Literal>${safeId}</fes:Literal>
      </fes:PropertyIsEqualTo>
    </fes:Filter>
  `;

  return postWfsGetFeature("bag:pand", filterXml);
}

function extractPandIdFromVerblijfsobjectXml(xml: string | null) {
  if (!xml) {
    return null;
  }

  return (
    parseXmlTag(xml, ["maaktDeelUitVan"]) ||
    parseXmlTag(xml, ["hoofdpand"]) ||
    parseXmlTag(xml, ["pandidentificatie"]) ||
    null
  );
}

function getVerblijfsobjectIdFromDocs(
  freeDoc: LocatieDoc,
  lookupDoc: LocatieDoc | null
) {
  return (
    getString(lookupDoc?.adresseerbaarobject_id) ||
    getString(lookupDoc?.adresseerbaar_object_id) ||
    getString(lookupDoc?.verblijfsobject_id) ||
    getString(freeDoc.adresseerbaarobject_id) ||
    getString(freeDoc.adresseerbaar_object_id) ||
    getString(freeDoc.verblijfsobject_id) ||
    null
  );
}

function mapBagResponse(
  freeDoc: LocatieDoc,
  lookupDoc: LocatieDoc | null,
  verblijfsobjectXml: string | null,
  pandXml: string | null
): BagAutofillMappedResponse {
  const bagSurfaceM2 =
    getNumber(parseXmlTag(verblijfsobjectXml ?? "", ["oppervlakte"])) ??
    getNumber(lookupDoc?.oppervlakte) ??
    getNumber(freeDoc.oppervlakte) ??
    null;

  const bagBuildYear =
    getNumber(parseXmlTag(pandXml ?? "", ["oorspronkelijkBouwjaar", "bouwjaar"])) ??
    getNumber(lookupDoc?.bouwjaar) ??
    getNumber(freeDoc.bouwjaar) ??
    null;

  const bagVerblijfsobjectId =
    parseXmlTag(verblijfsobjectXml ?? "", ["identificatie"]) ??
    getVerblijfsobjectIdFromDocs(freeDoc, lookupDoc);

  const bagPandId =
    parseXmlTag(pandXml ?? "", ["identificatie"]) ??
    extractPandIdFromVerblijfsobjectXml(verblijfsobjectXml) ??
    null;

  const bagStatus =
    parseXmlTag(verblijfsobjectXml ?? "", ["status"]) ??
    parseXmlTag(pandXml ?? "", ["status"]) ??
    getString(lookupDoc?.status) ??
    getString(freeDoc.status) ??
    null;

  const gebruiksdoelen = parseAllXmlTagValues(verblijfsobjectXml ?? "", ["gebruiksdoel"]);

  return {
    bag_build_year: bagBuildYear,
    bag_surface_m2: bagSurfaceM2,
    bag_pand_id: bagPandId,
    bag_verblijfsobject_id: bagVerblijfsobjectId,
    bag_status: bagStatus,
    bag_payload_json: {
      freeDoc,
      lookupDoc,
      verblijfsobjectXml,
      pandXml,
      gebruiksdoelen,
      provider: "pdok-wfs",
      bagApiKeyConfigured: Boolean(BAG_API_KEY),
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BagAutofillRequestBody;
    const input = resolveAddressInput(body);
    const sourceAddress = (body.sourceAddress ?? "").trim();

    if (!input && !sourceAddress) {
      return NextResponse.json(
        {
          ok: false,
          error: "Postcode en huisnummer of een bruikbaar adres zijn nodig voor BAG-autofill.",
        },
        { status: 400 }
      );
    }

    const freeDoc = await searchAddressDoc(sourceAddress, input);

    if (!freeDoc) {
      return NextResponse.json({
        ok: true,
        found: false,
        input,
        data: null,
      });
    }

    const lookupId = getString(freeDoc.id);
    const lookupDoc = lookupId ? await lookupAddressDoc(lookupId) : null;

    let verblijfsobjectXml: string | null = null;
    let pandXml: string | null = null;

    try {
      const verblijfsobjectId = getVerblijfsobjectIdFromDocs(freeDoc, lookupDoc);

      if (verblijfsobjectId) {
        verblijfsobjectXml = await fetchVerblijfsobjectXmlById(verblijfsobjectId);
      }

      if (!verblijfsobjectXml && input) {
        verblijfsobjectXml = await fetchVerblijfsobjectXmlByAddress(input);
      }

      const pandId = extractPandIdFromVerblijfsobjectXml(verblijfsobjectXml);
      if (pandId) {
        pandXml = await fetchPandXmlById(pandId);
      }
    } catch (detailError) {
      console.error("BAG WFS detailstap mislukt:", detailError);
    }

    return NextResponse.json({
      ok: true,
      found: true,
      input,
      data: mapBagResponse(freeDoc, lookupDoc, verblijfsobjectXml, pandXml),
    });
  } catch (error) {
    console.error("bag-autofill error", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Onbekende fout bij BAG-autofill.",
      },
      { status: 500 }
    );
  }
}