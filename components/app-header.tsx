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
  onClick={() => {
    window.dispatchEvent(new CustomEvent("open-mobile-ai"));
  }}
  aria-label="AI openen"
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
            display: grid;
            grid-template-columns: 42px 1fr auto;
            align-items: center;
            gap: 10px;
            margin: 0 0 12px 0;
            padding: 10px 12px;
            border-radius: 22px;
            background: rgba(255, 250, 246, 0.97);
            border: 1px solid #eadfd4;
            box-shadow: 0 10px 24px rgba(72, 52, 38, 0.08);
            position: sticky;
            top: 10px;
            z-index: 80;
            backdrop-filter: blur(14px);
          }

          .mobile-menu-button {
            width: 42px;
            height: 42px;
            border-radius: 14px;
            border: 1px solid #ded3c8;
            background: #ffffff;
            display: inline-flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 4px;
            cursor: pointer;
            box-shadow: 0 8px 18px rgba(72, 52, 38, 0.08);
          }

          .mobile-menu-button span {
            width: 17px;
            height: 2px;
            border-radius: 999px;
            background: #171717;
            display: block;
          }

          .mobile-header-logo {
            min-width: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            text-decoration: none;
          }

          .mobile-header-logo img {
            height: 42px;
            width: auto;
            max-width: 210px;
            object-fit: contain;
            display: block;
          }

          .mobile-user-mini {
            min-width: 54px;
            text-align: right;
            line-height: 1.05;
          }

          .mobile-user-mini strong {
            display: block;
            font-size: 14px;
            font-weight: 900;
            color: #171717;
            max-width: 72px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .mobile-user-mini span {
            display: block;
            margin-top: 3px;
            font-size: 11px;
            font-weight: 700;
            color: #7a7068;
            max-width: 72px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .mobile-menu-backdrop {
            position: fixed;
            inset: 0;
            z-index: 200;
            background: rgba(23, 23, 23, 0.32);
            display: flex;
            align-items: stretch;
            justify-content: flex-start;
          }

          .mobile-menu-panel {
            width: min(86vw, 340px);
            min-height: 100dvh;
            background: #fffaf6;
            border-right: 1px solid #e4d7ca;
            box-shadow: 18px 0 40px rgba(0, 0, 0, 0.14);
            padding: 18px;
            display: flex;
            flex-direction: column;
            gap: 18px;
            animation: mobileMenuIn 160ms ease-out;
            overflow-y: auto;
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
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 14px;
            padding-bottom: 16px;
            border-bottom: 1px solid #eadfd4;
          }

          .mobile-menu-name {
            font-size: 22px;
            line-height: 1.1;
            font-weight: 950;
            color: #171717;
          }

          .mobile-menu-role {
            margin-top: 4px;
            font-size: 13px;
            font-weight: 800;
            color: #7a7068;
          }

          .mobile-menu-close {
            width: 40px;
            height: 40px;
            border-radius: 14px;
            border: 1px solid #ded3c8;
            background: #ffffff;
            font-size: 26px;
            line-height: 1;
            color: #171717;
            cursor: pointer;
          }

          .mobile-menu-section {
            display: grid;
            gap: 10px;
          }

          .mobile-menu-section-title {
            font-size: 11px;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #8a8178;
          }

          .mobile-menu-links {
            display: grid;
            gap: 8px;
          }

          .mobile-menu-link {
            min-height: 46px;
            border-radius: 16px;
            border: 1px solid #eadfd4;
            background: #ffffff;
            color: #171717;
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 12px;
            font-size: 15px;
            font-weight: 850;
          }

          .mobile-menu-link-active {
            background: #fff3ea;
            border-color: rgba(239, 107, 31, 0.38);
            color: #ef6b1f;
          }

          .mobile-menu-link-icon {
            width: 30px;
            height: 30px;
            border-radius: 11px;
            background: #f5eee8;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            color: #4c4640;
            flex-shrink: 0;
          }

          .mobile-menu-link-active .mobile-menu-link-icon {
            background: #ef6b1f;
            color: #ffffff;
          }

          .mobile-menu-quicklinks {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }

          .mobile-menu-quicklink {
            min-height: 52px;
            border-radius: 16px;
            border: 1px solid #eadfd4;
            background: #ffffff;
            color: #171717;
            text-decoration: none;
            padding: 11px;
            display: flex;
            align-items: center;
            font-size: 13px;
            line-height: 1.25;
            font-weight: 850;
          }

          .mobile-menu-footer {
            margin-top: auto;
            padding-top: 14px;
            border-top: 1px solid #eadfd4;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          .mobile-menu-settings,
          .mobile-menu-logout {
            min-height: 46px;
            border-radius: 16px;
            font-size: 14px;
            font-weight: 900;
            cursor: pointer;
          }

          .mobile-menu-settings {
            background: #ffffff;
            color: #171717;
            border: 1px solid #ded3c8;
          }

          .mobile-menu-logout {
            background: #171717;
            color: #ffffff;
            border: 1px solid #171717;
          }
        }
      `}</style>
    </>
  );
}