"use client";

import { useEffect, useState } from "react";
import { getCurrentAppUser, signOut } from "@/lib/auth";

export default function AppHeader() {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");

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

  async function handleLogout() {
    try {
      await signOut();
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  return (
    <header
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
  );
}