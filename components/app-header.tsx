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

      <header className="mobile-app-header" aria-label="Mobiele navigatie">
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

      <style jsx global>{`
        .mobile-app-header {
          display: none;
        }

        @media (max-width: 760px) {
          .desktop-app-header {
            display: none !important;
          }

          .mobile-app-header {
            position: fixed !important;
            top: calc(env(safe-area-inset-top, 0px) + 12px) !important;
            left: 10px !important;
            right: 10px !important;
            z-index: 700 !important;
            width: calc(100vw - 20px) !important;
            height: 68px !important;
            min-height: 68px !important;
            max-height: 68px !important;
            margin: 0 !important;
            padding: 8px 10px !important;
            box-sizing: border-box !important;
            display: grid !important;
            grid-template-columns: 50px minmax(0, 1fr) 50px !important;
            align-items: center !important;
            gap: 8px !important;
            border-radius: 24px !important;
            border: 1px solid #eadfd4 !important;
            background: rgba(255, 250, 246, 0.97) !important;
            box-shadow: 0 12px 28px rgba(72, 52, 38, 0.1) !important;
            backdrop-filter: blur(16px) !important;
            -webkit-backdrop-filter: blur(16px) !important;
            overflow: hidden !important;
            transform: none !important;
          }

          .mobile-menu-button,
          .mobile-header-ai-button {
            width: 48px !important;
            height: 48px !important;
            min-width: 48px !important;
            min-height: 48px !important;
            max-width: 48px !important;
            max-height: 48px !important;
            border-radius: 16px !important;
            box-sizing: border-box !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 0 !important;
            margin: 0 !important;
            cursor: pointer !important;
            flex: 0 0 48px !important;
          }

          .mobile-menu-button {
            border: 1px solid #ded3c8 !important;
            background: #ffffff !important;
            box-shadow: 0 8px 18px rgba(72, 52, 38, 0.08) !important;
            flex-direction: column !important;
            gap: 5px !important;
          }

          .mobile-menu-button span {
            width: 20px !important;
            height: 2.5px !important;
            border-radius: 999px !important;
            background: #171717 !important;
            display: block !important;
          }

          .mobile-header-logo {
            min-width: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: 52px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            overflow: hidden !important;
            text-decoration: none !important;
          }

          .mobile-header-logo img {
            height: 43px !important;
            width: auto !important;
            max-width: 100% !important;
            object-fit: contain !important;
            display: block !important;
          }

          .mobile-header-ai-button {
            border: none !important;
            background: #ef6b1f !important;
            color: #ffffff !important;
            font-size: 22px !important;
            line-height: 1 !important;
            font-weight: 950 !important;
            box-shadow: 0 8px 18px rgba(239, 107, 31, 0.24) !important;
          }

          .mobile-menu-backdrop {
            position: fixed !important;
            inset: 0 !important;
            z-index: 1200 !important;
            background: rgba(23, 23, 23, 0.32) !important;
            display: flex !important;
            align-items: stretch !important;
            justify-content: flex-start !important;
          }

          .mobile-menu-panel {
            position: relative !important;
            z-index: 1201 !important;
            width: min(86vw, 340px) !important;
            min-height: 100dvh !important;
            background: #fffaf6 !important;
            border-right: 1px solid #e4d7ca !important;
            box-shadow: 18px 0 40px rgba(0, 0, 0, 0.14) !important;
            padding: 18px !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 18px !important;
            overflow-y: auto !important;
          }
        }
      `}</style>
    </>
  );
}
