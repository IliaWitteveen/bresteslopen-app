import type { Metadata } from "next";
import "./globals.css";
import AppHeader from "@/components/app-header";

export const metadata: Metadata = {
  title: "BreSteSlopen App",
  description: "Interne projectapp voor BreSteSlopen",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl">
      <body>
        <div className="app-root">
          <div className="app-bg app-bg-1" />
          <div className="app-bg app-bg-2" />

          <div className="page-shell">
            <AppHeader />
            <div style={{ marginTop: 20 }}>{children}</div>
          </div>
        </div>
      </body>
    </html>
  );
}