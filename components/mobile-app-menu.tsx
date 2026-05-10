"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type MenuLink = {
  label: string;
  href: string;
  icon?: string;
};

type MobileAppMenuProps = {
  userName: string;
  userRole?: string | null;
  onLogout: () => void | Promise<void>;
  links?: MenuLink[];
  quickLinks?: MenuLink[];
};

const defaultLinks: MenuLink[] = [
  { label: "Dashboard", href: "/", icon: "🏠" },
  { label: "Projecten", href: "/projecten", icon: "🏗️" },
  { label: "Agenda", href: "/agenda", icon: "🗓️" },
  { label: "Containers", href: "/containers", icon: "🧱" },
  { label: "Analyse", href: "/analyse", icon: "📊" },
  { label: "Opdrachtgevers", href: "/opdrachtgevers", icon: "👥" },
];

const defaultQuickLinks: MenuLink[] = [
  { label: "Nieuw project", href: "/nieuw-project", icon: "➕" },
  { label: "Foto's", href: "/projecten", icon: "📷" },
];

export default function MobileAppMenu({
  userName,
  userRole,
  onLogout,
  links = defaultLinks,
  quickLinks = defaultQuickLinks,
}: MobileAppMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className="menu-wrap" ref={wrapRef}>
      <button
        type="button"
        className="menu-trigger"
        onClick={() => setOpen((current) => !current)}
        aria-label="Open menu"
      >
        ☰
      </button>

      {open ? (
        <div className="menu-popover">
          <div className="menu-profile">
            <div className="menu-avatar">{userName?.charAt(0)?.toUpperCase() || "U"}</div>
            <div>
              <div className="menu-name">{userName || "Gebruiker"}</div>
              <div className="menu-role">{userRole || "gebruiker"}</div>
            </div>
          </div>

          <div className="menu-section">
            <div className="menu-section-title">Pagina's</div>
            <div className="menu-grid">
              {links.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="menu-link"
                  onClick={() => setOpen(false)}
                >
                  <span className="menu-link-icon">{item.icon || "•"}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="menu-section">
            <div className="menu-section-title">Snelkoppelingen</div>
            <div className="menu-grid">
              {quickLinks.map((item) => (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  className="menu-link"
                  onClick={() => setOpen(false)}
                >
                  <span className="menu-link-icon">{item.icon || "•"}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="menu-footer">
            <Link href="/settings" className="menu-secondary" onClick={() => setOpen(false)}>
              ⚙️ Settings
            </Link>

            <button
              type="button"
              className="menu-danger"
              onClick={async () => {
                setOpen(false);
                await onLogout();
              }}
            >
              Uitloggen
            </button>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .menu-wrap {
          position: relative;
        }

        .menu-trigger {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          border: 1px solid #ded3c8;
          background: #fffdfb;
          color: #171717;
          font-size: 20px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 10px 20px rgba(50, 35, 25, 0.08);
        }

        .menu-popover {
          position: absolute;
          top: calc(100% + 10px);
          left: 0;
          width: min(320px, calc(100vw - 24px));
          background: #fffdfb;
          border: 1px solid #e8ddd3;
          border-radius: 20px;
          padding: 14px;
          box-shadow: 0 24px 42px rgba(17, 17, 17, 0.18);
          z-index: 200;
        }

        .menu-profile {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid #f0e7de;
        }

        .menu-avatar {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ef6b1f;
          color: #ffffff;
          font-weight: 900;
          font-size: 16px;
          flex-shrink: 0;
        }

        .menu-name {
          font-size: 15px;
          font-weight: 900;
          color: #171717;
        }

        .menu-role {
          margin-top: 2px;
          font-size: 12px;
          color: #6b675f;
          text-transform: uppercase;
          font-weight: 800;
        }

        .menu-section {
          padding-top: 12px;
        }

        .menu-section-title {
          font-size: 12px;
          text-transform: uppercase;
          color: #8a8178;
          font-weight: 900;
          margin-bottom: 10px;
        }

        .menu-grid {
          display: grid;
          gap: 8px;
        }

        .menu-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 14px;
          text-decoration: none;
          color: #171717;
          background: #fbf8f4;
          border: 1px solid #eee3d8;
          font-size: 14px;
          font-weight: 700;
        }

        .menu-link-icon {
          width: 22px;
          display: inline-flex;
          justify-content: center;
          flex-shrink: 0;
        }

        .menu-footer {
          display: grid;
          gap: 10px;
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid #f0e7de;
        }

        .menu-secondary,
        .menu-danger {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 14px;
          border-radius: 14px;
          font-weight: 900;
          font-size: 14px;
          text-decoration: none;
        }

        .menu-secondary {
          background: #ffffff;
          border: 1px solid #ded3c8;
          color: #171717;
        }

        .menu-danger {
          border: none;
          background: #171717;
          color: #ffffff;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}