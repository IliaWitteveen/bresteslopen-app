"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  formatDate,
  getProjectStatusColor,
  isProjectActive,
  isProjectCompleted,
  loadProjectBundlesForCurrentUser,
  type ProjectBundle,
} from "@/lib/overview";

type CustomerDetailPageProps = {
  params: Promise<{
    name: string;
  }>;
};

export default function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState("");
  const [bundles, setBundles] = useState<ProjectBundle[]>([]);

  useEffect(() => {
    async function init() {
      const resolved = await params;
      const targetName = decodeURIComponent(resolved.name);
      setCustomerName(targetName);

      const overview = await loadProjectBundlesForCurrentUser();

      if (!overview) {
        window.location.href = "/login";
        return;
      }

      const filtered = overview.bundles.filter(
        (bundle) => (bundle.project.opdrachtgever?.trim() || "Onbekend") === targetName
      );

      setBundles(filtered);
      setLoading(false);
    }

    init();
  }, [params]);

  const stats = useMemo(() => {
    return {
      totalProjects: bundles.length,
      activeProjects: bundles.filter((bundle) => isProjectActive(bundle.project)).length,
      completedProjects: bundles.filter((bundle) => isProjectCompleted(bundle.project)).length,
      totalContainers: bundles.reduce((sum, bundle) => sum + bundle.containers.length, 0),
      totalPhotos: bundles.reduce((sum, bundle) => sum + bundle.photos.length, 0),
      totalTasks: bundles.reduce((sum, bundle) => sum + bundle.tasks.length, 0),
    };
  }, [bundles]);

  if (loading) {
    return (
      <main style={pageStyle}>
        <p>Laden...</p>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div>
            <h1 style={{ margin: 0, fontSize: 38 }}>{customerName || "Opdrachtgever"}</h1>
            <p style={{ margin: "8px 0 0 0", color: "#6b675f" }}>
              Projecthistorie, verbruik en simpele klantanalyse.
            </p>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/opdrachtgevers" style={backLinkStyle}>
              ← Opdrachtgevers
            </Link>
            <Link href="/" style={backLinkStyle}>
              Dashboard
            </Link>
          </div>
        </div>

        <div style={statsGridStyle}>
          <StatCard title="Projecten" value={stats.totalProjects} color="#f39b5d" />
          <StatCard title="Lopend" value={stats.activeProjects} color="#7ea3e6" />
          <StatCard title="Afgerond" value={stats.completedProjects} color="#5ca67a" />
          <StatCard title="Containers" value={stats.totalContainers} color="#89b4a9" />
          <StatCard title="Foto's" value={stats.totalPhotos} color="#c79ad0" />
          <StatCard title="Taken" value={stats.totalTasks} color="#e79a9a" />
        </div>

        <div style={sectionCardStyle}>
          <h2 style={{ marginTop: 0 }}>Klantanalyse</h2>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={noteStyle}>
              Deze opdrachtgever heeft <strong>{stats.totalProjects}</strong> project(en) in het systeem.
            </div>
            <div style={noteStyle}>
              Lopende drukte: <strong>{stats.activeProjects}</strong> actief, afgerond:{" "}
              <strong>{stats.completedProjects}</strong>.
            </div>
            <div style={noteStyle}>
              Operationele registratie: <strong>{stats.totalContainers}</strong> containers en{" "}
              <strong>{stats.totalPhotos}</strong> foto's vastgelegd.
            </div>
          </div>
        </div>

        <div style={sectionCardStyle}>
          <h2 style={{ marginTop: 0 }}>Projecten van deze opdrachtgever</h2>

          <div style={{ display: "grid", gap: 14 }}>
            {bundles.length === 0 && <div style={noteStyle}>Geen projecten gevonden.</div>}

            {bundles.map((bundle) => (
              <Link
                key={bundle.project.id}
                href={`/projects/${bundle.project.id}`}
                style={{
                  ...projectCardStyle,
                  textDecoration: "none",
                  color: "#171717",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 13, color: "#6b675f" }}>
                      {bundle.project.project_number}
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>
                      {bundle.project.name}
                    </div>
                  </div>

                  <span
                    style={{
                      background: getProjectStatusColor(bundle.project.status),
                      color: "#fff",
                      borderRadius: 999,
                      padding: "8px 14px",
                      fontSize: 13,
                      fontWeight: 700,
                      height: "fit-content",
                    }}
                  >
                    {bundle.project.status}
                  </span>
                </div>

                <div style={metaGridStyle}>
                  <div>Adres: {bundle.project.address}</div>
                  <div>
                    Periode: {formatDate(bundle.project.start_date)} - {formatDate(bundle.project.end_date)}
                  </div>
                  <div>Containers: {bundle.containers.length}</div>
                  <div>Foto's: {bundle.photos.length}</div>
                  <div>Taken: {bundle.tasks.length}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: string;
}) {
  return (
    <div
      style={{
        background: color,
        color: "#fff",
        borderRadius: 22,
        padding: 20,
      }}
    >
      <div style={{ fontSize: 14 }}>{title}</div>
      <div style={{ fontSize: 36, fontWeight: 700, marginTop: 10 }}>{value}</div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  padding: 24,
  background: "#f6f2ed",
  fontFamily: "Arial, sans-serif",
};

const cardStyle: React.CSSProperties = {
  background: "#fffaf6",
  borderRadius: 32,
  padding: 24,
  border: "1px solid #ece3da",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const backLinkStyle: React.CSSProperties = {
  textDecoration: "none",
  color: "#ef6b1f",
  fontWeight: 700,
};

const statsGridStyle: React.CSSProperties = {
  marginTop: 22,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 16,
};

const sectionCardStyle: React.CSSProperties = {
  marginTop: 22,
  background: "#ffffff",
  borderRadius: 24,
  padding: 22,
  border: "1px solid #ebe2d8",
};

const noteStyle: React.CSSProperties = {
  background: "#fff7ef",
  borderRadius: 18,
  padding: 16,
  border: "1px solid #f0dfcf",
};

const projectCardStyle: React.CSSProperties = {
  background: "#fffaf6",
  borderRadius: 22,
  padding: 18,
  border: "1px solid #ebe2d8",
};

const metaGridStyle: React.CSSProperties = {
  marginTop: 14,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
  color: "#5e5a54",
};