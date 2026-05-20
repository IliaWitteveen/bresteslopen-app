"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentAppUser, signOut } from "@/lib/auth";

const mainLinks = [
  { href: "/", label: "Dashboard", icon: "⌂" },
  { href: "/projecten", label: "Projecten", icon: "▦" },
  { href: "/nieuw-project", label: "Nieuw project", icon: "+" },
  { href: "/agenda", label: "Agenda", icon: "□" },
  { href: "/containers", label: "Containers", icon: "▤" },
  { href: "/analyse", label: "Analyse", icon: "◷" },
  { href: "/opdrachtgevers", label: "Opdrachtgevers", icon: "◫" },
];

const quickLinks = [
  { href: "/projecten", label: "Alle projecten bekijken" },
  { href: "/nieuw-project", label: "Project aanmaken" },
  { href: "/containers", label: "Containerplanning" },
  { href: "/analyse", label: "Analyse openen" },
];

export default function AppHeader() {
  const pathname = usePathname();

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const user = await getCurrentAppUser();

        if (user) {
          setName(user.name || "");
          setRole(user.role || "");
        }
      } catch (error) {
        console.error("Header load error:", error);
      }
    }

    load();
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function handleLogout() {
    try {
      await signOut();
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function openAi() {
    window.dispatchEvent(new CustomEvent("breste:open-ai"));
  }

  return (
    <>
      {/* DESKTOP HEADER - blijft bewust hetzelfde */}
      <header
        className="desktop-app-header"
        style={{
          background: "rgba(255, 250, 246, 0.96)",
          border: "1px solid #ece3da",
          borderRadius: 30,
          padding: "28px 30px",
          boxShadow: "0 10px 26px rgba(0,0,0,0.05)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
            <img
              src="/LOGO-bresteslopen-kleur.svg"
              alt="BreSteSlopen"
              style={{
                height: 96,
                width: "auto",
                objectFit: "contain",
                display: "block",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
              marginLeft: "auto",
            }}
          >
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.1 }}>
                {name || "-"}
              </div>
              <div style={{ color: "#6b675f", fontSize: 16, marginTop: 4 }}>
                {role || "-"}
              </div>
            </div>

            <button
              onClick={handleLogout}
              type="button"
              style={{
                background: "#fff",
                border: "1px solid #d9d1c7",
                borderRadius: 18,
                padding: "14px 18px",
                fontSize: 16,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Uitloggen
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE HEADER */}
      <header className="mobile-app-header">
        <button
          type="button"
          className="mobile-menu-button"
          onClick={() => setMenuOpen(true)}
          aria-label="Menu openen"
        >
          <span />
          <span />
          <span />
        </button>

        <Link href="/" className="mobile-header-logo" aria-label="Naar dashboard">
          <img src="/LOGO-bresteslopen-kleur.svg" alt="BreSteSlopen" />
        </Link>

        <button
          type="button"
          className="mobile-header-ai-button"
          aria-label="AI openen"
          onClick={openAi}
        >
          ✦
        </button>
      </header>

      {menuOpen ? (
        <div className="mobile-menu-backdrop" onClick={() => setMenuOpen(false)}>
          <aside className="mobile-menu-panel" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-top">
              <div>
                <div className="mobile-menu-name">{name || "-"}</div>
                <div className="mobile-menu-role">{role || "-"}</div>
              </div>

              <button
                type="button"
                className="mobile-menu-close"
                onClick={() => setMenuOpen(false)}
                aria-label="Menu sluiten"
              >
                ×
              </button>
            </div>

            <div className="mobile-menu-section">
              <div className="mobile-menu-section-title">Pagina’s</div>

              <div className="mobile-menu-links">
                {mainLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      isActive(item.href)
                        ? "mobile-menu-link mobile-menu-link-active"
                        : "mobile-menu-link"
                    }
                  >
                    <span className="mobile-menu-link-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="mobile-menu-section">
              <div className="mobile-menu-section-title">Snelkoppelingen</div>

              <div className="mobile-menu-quicklinks">
                {quickLinks.map((item) => (
                  <Link key={item.href} href={item.href} className="mobile-menu-quicklink">
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="mobile-menu-footer">
              <button type="button" className="mobile-menu-settings">
                Instellingen
              </button>

              <button type="button" onClick={handleLogout} className="mobile-menu-logout">
                Uitloggen
              </button>
            </div>
          </aside>
        </div>
      ) : null}


    </>
  );
}