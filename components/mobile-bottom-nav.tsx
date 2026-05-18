"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type SearchResult = {
  title: string;
  subtitle: string;
  href: string;
  type: "Pagina" | "Project" | "Actie";
};

const items = [
  { href: "/", label: "Home", icon: "⌂", type: "link" as const },
  { href: "/projecten", label: "Projecten", icon: "▦", type: "link" as const },
  { href: "/agenda", label: "Agenda", icon: "□", type: "link" as const },
  { href: "/containers", label: "Containers", icon: "▤", type: "link" as const },
  { href: "#ai", label: "AI", icon: "✦", type: "ai" as const },
];

const staticResults: SearchResult[] = [
  {
    title: "Nieuw project",
    subtitle: "Maak direct een nieuw project aan",
    href: "/nieuw-project",
    type: "Actie",
  },
  {
    title: "Projecten",
    subtitle: "Alle projecten bekijken",
    href: "/projecten",
    type: "Pagina",
  },
  {
    title: "Agenda",
    subtitle: "Planning en werkdagen bekijken",
    href: "/agenda",
    type: "Pagina",
  },
  {
    title: "Containers",
    subtitle: "Containerplanning en afvalstromen",
    href: "/containers",
    type: "Pagina",
  },
  {
    title: "Analyse",
    subtitle: "Taken, voortgang en inzichten",
    href: "/analyse",
    type: "Pagina",
  },
  {
    title: "Opdrachtgevers",
    subtitle: "Klanten en opdrachtgevers",
    href: "/opdrachtgevers",
    type: "Pagina",
  },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const [aiOpen, setAiOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("Waar wil je naartoe of wat wil je vinden?");
  const [results, setResults] = useState<SearchResult[]>(staticResults.slice(0, 4));
  const [searching, setSearching] = useState(false);

  const filteredStaticResults = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return staticResults.slice(0, 4);

    return staticResults.filter((item) => {
      return (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q)
      );
    });
  }, [query]);

  async function runAiSearch(event?: FormEvent) {
    event?.preventDefault();

    const q = query.trim();

    if (!q) {
      setAnswer("Typ bijvoorbeeld: Van Eeghen, containers, open taken, agenda of nieuw project.");
      setResults(staticResults.slice(0, 4));
      return;
    }

    setSearching(true);

    try {
      const localMatches = filteredStaticResults;

      const { data: projectMatches, error } = await supabase
        .from("projects")
        .select("id, name, address, opdrachtgever, status, start_date, end_date")
        .or(`name.ilike.%${q}%,address.ilike.%${q}%,opdrachtgever.ilike.%${q}%,status.ilike.%${q}%`)
        .limit(8);

      if (error) {
        console.error("AI search project error:", error);
      }

      const projectResults: SearchResult[] =
        projectMatches?.map((project) => ({
          title: project.name || "Project",
          subtitle:
            project.opdrachtgever ||
            project.address ||
            project.status ||
            "Project openen",
          href: `/projects/${project.id}`,
          type: "Project",
        })) || [];

      const combined = [...projectResults, ...localMatches].slice(0, 10);

      setResults(combined);

      if (combined.length === 0) {
        setAnswer(`Ik vind nog niets op "${q}". Probeer een projectnaam, opdrachtgever, adres of pagina.`);
      } else {
        setAnswer(`Ik heb ${combined.length} mogelijke resultaten gevonden voor "${q}".`);
      }
    } catch (error) {
      console.error("AI search error:", error);
      setAnswer("Zoeken lukt nu niet. Probeer het opnieuw of open de juiste pagina via het menu.");
    } finally {
      setSearching(false);
    }
  }

  function openResult(href: string) {
    setAiOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <>
      <nav className="mobile-bottom-nav" aria-label="Mobiele navigatie">
        {items.map((item) => {
          const isActive =
            item.type === "link" &&
            (item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`));

          if (item.type === "ai") {
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => setAiOpen(true)}
                className="mobile-bottom-nav__item"
                aria-label="AI zoeken"
              >
                <span className="mobile-bottom-nav__icon">{item.icon}</span>
                <span className="mobile-bottom-nav__label">{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                isActive
                  ? "mobile-bottom-nav__item mobile-bottom-nav__item--active"
                  : "mobile-bottom-nav__item"
              }
            >
              <span className="mobile-bottom-nav__icon">{item.icon}</span>
              <span className="mobile-bottom-nav__label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {aiOpen ? (
        <div className="mobile-ai-backdrop" onClick={() => setAiOpen(false)}>
          <section className="mobile-ai-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="mobile-ai-head">
              <div>
                <span>BreSte AI</span>
                <h2>Zoeken in de app</h2>
              </div>

              <button type="button" onClick={() => setAiOpen(false)}>
                ×
              </button>
            </div>

            <div className="mobile-ai-message">
              <strong>AI assistent</strong>
              <p>{answer}</p>
            </div>

            <form onSubmit={runAiSearch} className="mobile-ai-search">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Zoek project, klant, adres, container, taak..."
                autoFocus
              />

              <button type="submit" disabled={searching}>
                {searching ? "..." : "Zoek"}
              </button>
            </form>

            <div className="mobile-ai-results">
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.href}-${result.title}`}
                  type="button"
                  onClick={() => openResult(result.href)}
                >
                  <div>
                    <strong>{result.title}</strong>
                    <span>{result.subtitle}</span>
                  </div>

                  <em>{result.type}</em>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}