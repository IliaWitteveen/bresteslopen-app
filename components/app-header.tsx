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

      <style jsx global>{`
        .mobile-app-header {
          display: none;
        }

        @media (max-width: 760px) {
          .desktop-app-header {
            display: none !important;
          }

          .mobile-app-header {
            display: grid !important;
            grid-template-columns: 42px minmax(0, 1fr) 42px !important;
            align-items: center !important;
            gap: 10px !important;
            width: calc(100% - 32px) !important;
            max-width: 760px !important;
            margin: 0 auto !important;
            padding: 10px 12px !important;
            border-radius: 22px !important;
            background: rgba(255, 250, 246, 0.97) !important;
            border: 1px solid #eadfd4 !important;
            box-shadow: 0 10px 24px rgba(72, 52, 38, 0.08) !important;
            position: fixed !important;
            top: max(12px, env(safe-area-inset-top)) !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            z-index: 80 !important;
            backdrop-filter: blur(14px) !important;
          }

          .mobile-menu-button,
          .mobile-header-ai-button {
            width: 42px !important;
            height: 42px !important;
            min-width: 42px !important;
            min-height: 42px !important;
            max-width: 42px !important;
            max-height: 42px !important;
            border-radius: 14px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            cursor: pointer !important;
            box-shadow: 0 8px 18px rgba(72, 52, 38, 0.08) !important;
            padding: 0 !important;
            flex: 0 0 42px !important;
          }

          .mobile-menu-button {
            border: 1px solid #ded3c8 !important;
            background: #ffffff !important;
            flex-direction: column !important;
            gap: 4px !important;
          }

          .mobile-menu-button span {
            width: 18px !important;
            height: 2px !important;
            border-radius: 999px !important;
            background: #171717 !important;
            display: block !important;
          }

          .mobile-header-ai-button {
            border: 1px solid #ef6b1f !important;
            background: #ef6b1f !important;
            color: #ffffff !important;
            font-size: 20px !important;
            font-weight: 950 !important;
            line-height: 1 !important;
          }

          .mobile-header-logo {
            min-width: 0 !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            text-decoration: none !important;
            overflow: hidden !important;
          }

          .mobile-header-logo img {
            height: 42px !important;
            width: auto !important;
            max-width: 205px !important;
            object-fit: contain !important;
            display: block !important;
          }

          .mobile-menu-backdrop {
            position: fixed !important;
            inset: 0 !important;
            z-index: 9999 !important;
            background: rgba(23, 23, 23, 0.32) !important;
            display: flex !important;
            align-items: stretch !important;
            justify-content: flex-start !important;
          }

          .mobile-menu-panel {
            width: min(86vw, 340px) !important;
            min-height: 100dvh !important;
            background: #fffaf6 !important;
            border-right: 1px solid #e4d7ca !important;
            box-shadow: 18px 0 40px rgba(0, 0, 0, 0.14) !important;
            padding: 18px !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 18px !important;
            animation: mobileMenuIn 160ms ease-out !important;
            overflow-y: auto !important;
          }

          @keyframes mobileMenuIn {
            from {
              transform: translateX(-18px);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }

          .mobile-menu-top {
            display: flex !important;
            align-items: flex-start !important;
            justify-content: space-between !important;
            gap: 14px !important;
            padding-bottom: 16px !important;
            border-bottom: 1px solid #eadfd4 !important;
          }

          .mobile-menu-name {
            font-size: 22px !important;
            line-height: 1.1 !important;
            font-weight: 950 !important;
            color: #171717 !important;
          }

          .mobile-menu-role {
            margin-top: 4px !important;
            font-size: 13px !important;
            font-weight: 800 !important;
            color: #7a7068 !important;
          }

          .mobile-menu-close {
            width: 40px !important;
            height: 40px !important;
            border-radius: 14px !important;
            border: 1px solid #ded3c8 !important;
            background: #ffffff !important;
            font-size: 26px !important;
            line-height: 1 !important;
            color: #171717 !important;
            cursor: pointer !important;
          }

          .mobile-menu-section {
            display: grid !important;
            gap: 10px !important;
          }

          .mobile-menu-section-title {
            font-size: 11px !important;
            font-weight: 950 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.08em !important;
            color: #8a8178 !important;
          }

          .mobile-menu-links {
            display: grid !important;
            gap: 8px !important;
          }

          .mobile-menu-link {
            min-height: 46px !important;
            border-radius: 16px !important;
            border: 1px solid #eadfd4 !important;
            background: #ffffff !important;
            color: #171717 !important;
            text-decoration: none !important;
            display: flex !important;
            align-items: center !important;
            gap: 12px !important;
            padding: 10px 12px !important;
            font-size: 15px !important;
            font-weight: 850 !important;
          }

          .mobile-menu-link-active {
            background: #fff3ea !important;
            border-color: rgba(239, 107, 31, 0.38) !important;
            color: #ef6b1f !important;
          }

          .mobile-menu-link-icon {
            width: 30px !important;
            height: 30px !important;
            border-radius: 11px !important;
            background: #f5eee8 !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-size: 14px !important;
            color: #4c4640 !important;
            flex-shrink: 0 !important;
          }

          .mobile-menu-link-active .mobile-menu-link-icon {
            background: #ef6b1f !important;
            color: #ffffff !important;
          }

          .mobile-menu-quicklinks {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
          }

          .mobile-menu-quicklink {
            min-height: 52px !important;
            border-radius: 16px !important;
            border: 1px solid #eadfd4 !important;
            background: #ffffff !important;
            color: #171717 !important;
            text-decoration: none !important;
            padding: 11px !important;
            display: flex !important;
            align-items: center !important;
            font-size: 13px !important;
            line-height: 1.25 !important;
            font-weight: 850 !important;
          }

          .mobile-menu-footer {
            margin-top: auto !important;
            padding-top: 14px !important;
            border-top: 1px solid #eadfd4 !important;
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 10px !important;
          }

          .mobile-menu-settings,
          .mobile-menu-logout {
            min-height: 46px !important;
            border-radius: 16px !important;
            font-size: 14px !important;
            font-weight: 900 !important;
            cursor: pointer !important;
          }

          .mobile-menu-settings {
            background: #ffffff !important;
            color: #171717 !important;
            border: 1px solid #ded3c8 !important;
          }

          .mobile-menu-logout {
            background: #171717 !important;
            color: #ffffff !important;
            border: 1px solid #171717 !important;
          }
        }
      `}</style>
    </>
  );
}