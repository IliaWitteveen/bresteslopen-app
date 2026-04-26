"use client";

import { useState } from "react";
import { signInWithEmail } from "@/lib/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    try {
      setLoading(true);
      await signInWithEmail(email, password);
      window.location.href = "/";
    } catch (error: any) {
      console.error(error);
      setMessage(error?.message || "Inloggen mislukt.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f3f3f1",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          border: "1px solid #ddd",
          borderRadius: 20,
          padding: 24,
        }}
      >
        <h1 style={{ fontSize: 32, marginBottom: 8 }}>
          <span style={{ color: "#171717" }}>BreSte</span>
          <span style={{ color: "#ef6b1f" }}>Slopen</span>
        </h1>
        <p style={{ color: "#666", marginBottom: 24 }}>Log in om verder te gaan</p>

        <form onSubmit={handleLogin}>
          <div style={{ display: "grid", gap: 12 }}>
            <input
              type="email"
              placeholder="E-mailadres"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />

            <input
              type="password"
              placeholder="Wachtwoord"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />

            <button type="submit" disabled={loading} style={buttonStyle}>
              {loading ? "Inloggen..." : "Inloggen"}
            </button>

            {message && <p style={{ margin: 0, color: "#b91c1c" }}>{message}</p>}
          </div>
        </form>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "16px",
  borderRadius: 14,
  border: "1px solid #ccc",
  fontSize: 16,
  background: "#fff",
};

const buttonStyle: React.CSSProperties = {
  background: "#ef6b1f",
  color: "#fff",
  border: "none",
  borderRadius: 14,
  padding: "16px",
  fontSize: 16,
  fontWeight: 600,
  cursor: "pointer",
};