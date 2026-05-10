"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/projecten", label: "Projecten", icon: "▦" },
  { href: "/agenda", label: "Agenda", icon: "□" },
  { href: "/containers", label: "Containers", icon: "▤" },
  { href: "/analyse", label: "Analyse", icon: "◷" },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <>
      <nav className="mobile-bottom-nav" aria-label="Mobiele navigatie">
        {items.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

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

      <style jsx global>{`
        .mobile-bottom-nav {
          display: none;
        }

        @media (max-width: 760px) {
          .mobile-bottom-nav {
            position: fixed;
            left: 10px;
            right: 10px;
            bottom: 10px;
            z-index: 90;
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 4px;
            padding: 8px;
            border-radius: 24px;
            background: rgba(255, 250, 246, 0.94);
            border: 1px solid rgba(226, 211, 196, 0.9);
            box-shadow: 0 18px 42px rgba(72, 52, 38, 0.16);
            backdrop-filter: blur(16px);
          }

          .mobile-bottom-nav__item {
            min-width: 0;
            min-height: 54px;
            border-radius: 18px;
            color: #6b675f;
            text-decoration: none;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            font-size: 11px;
            font-weight: 850;
            line-height: 1;
          }

          .mobile-bottom-nav__icon {
            width: 28px;
            height: 28px;
            border-radius: 12px;
            background: #f3ece6;
            color: #5f5a54;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: 950;
          }

          .mobile-bottom-nav__label {
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .mobile-bottom-nav__item--active {
            color: #ef6b1f;
          }

          .mobile-bottom-nav__item--active .mobile-bottom-nav__icon {
            background: #ef6b1f;
            color: #ffffff;
            box-shadow: 0 8px 18px rgba(239, 107, 31, 0.22);
          }
        }

        @media (max-width: 390px) {
          .mobile-bottom-nav {
            left: 8px;
            right: 8px;
            bottom: 8px;
            border-radius: 22px;
          }

          .mobile-bottom-nav__item {
            min-height: 50px;
            font-size: 10px;
          }

          .mobile-bottom-nav__icon {
            width: 26px;
            height: 26px;
            font-size: 13px;
          }
        }
      `}</style>
    </>
  );
}