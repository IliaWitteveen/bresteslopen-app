import { NextResponse } from "next/server";

type LookupDoc = {
  id?: string;
  weergavenaam?: string;
  straatnaam?: string;
  huis_nlt?: string;
  postcode?: string;
  woonplaatsnaam?: string;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = (searchParams.get("id") || "").trim();

  if (!id) {
    return NextResponse.json(
      { error: "Geen lookup id meegegeven." },
      { status: 400 }
    );
  }

  try {
    const endpoint = new URL("https://api.pdok.nl/bzk/locatieserver/search/v3_1/lookup");
    endpoint.searchParams.set("id", id);

    const response = await fetch(endpoint.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Adres lookup mislukt." },
        { status: 500 }
      );
    }

    const json = await response.json();
    const docs: LookupDoc[] = json?.response?.docs ?? [];
    const doc = docs[0];

    if (!doc) {
      return NextResponse.json({ result: null });
    }

    const address = [
      doc.straatnaam,
      doc.huis_nlt,
      doc.postcode,
      doc.woonplaatsnaam,
    ]
      .filter(Boolean)
      .join(" ");

    return NextResponse.json({
      result: {
        id: doc.id || "",
        label: doc.weergavenaam || address,
        address,
        street: doc.straatnaam || "",
        houseNumber: doc.huis_nlt || "",
        postcode: doc.postcode || "",
        city: doc.woonplaatsnaam || "",
      },
    });
  } catch (error) {
    console.error("Fout in /api/address-lookup:", error);
    return NextResponse.json(
      { error: "Onverwachte fout bij adres lookup." },
      { status: 500 }
    );
  }
}