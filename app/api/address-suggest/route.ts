import { NextResponse } from "next/server";

type PdokDoc = {
  id?: string;
  weergavenaam?: string;
  straatnaam?: string;
  huis_nlt?: string;
  postcode?: string;
  woonplaatsnaam?: string;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  if (!q || q.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const endpoint = new URL("https://api.pdok.nl/bzk/locatieserver/search/v3_1/free");
    endpoint.searchParams.set("q", q);
    endpoint.searchParams.set("rows", "8");
    endpoint.searchParams.set("fq", "type:adres");

    const response = await fetch(endpoint.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { suggestions: [], error: "Adres suggesties ophalen mislukt." },
        { status: 500 }
      );
    }

    const json = await response.json();

    const docs: PdokDoc[] = json?.response?.docs ?? [];

    const suggestions = docs.map((doc) => {
      const addressLine = [
        doc.straatnaam,
        doc.huis_nlt,
        doc.postcode,
        doc.woonplaatsnaam,
      ]
        .filter(Boolean)
        .join(" ");

      return {
        id: doc.id || doc.weergavenaam || addressLine,
        label: doc.weergavenaam || addressLine,
        address: addressLine,
        street: doc.straatnaam || "",
        houseNumber: doc.huis_nlt || "",
        postcode: doc.postcode || "",
        city: doc.woonplaatsnaam || "",
      };
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Fout in /api/address-suggest:", error);
    return NextResponse.json(
      { suggestions: [], error: "Onverwachte fout bij adres suggesties." },
      { status: 500 }
    );
  }
}