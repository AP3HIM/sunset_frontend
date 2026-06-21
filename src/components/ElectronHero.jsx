// src/components/ElectronHero.jsx
export default function ElectronHero() {
  return (
    <div style={{
      background: "#0a0a0a",
      color: "#fff",
      minHeight: "40vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      borderBottom: "1px solid #333",
    }}>
      <h1 style={{
        fontSize: "2.5rem",
        fontWeight: 300,
        letterSpacing: "0.05em",
        borderBottom: "1px solid #444",
        paddingBottom: "0.5rem",
      }}>
        SunsetUploader
      </h1>
      <p style={{ color: "#888", marginTop: "1rem", fontSize: "0.9rem" }}>
        Upload Console
      </p>
    </div>
  );
}