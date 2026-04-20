import { useState } from "react";
import "../css/SagePanel.css";

export default function SagePanel({ currentCaption, onInject }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generated, setGenerated] = useState(false);

  async function handleGenerate() {
    if (!currentCaption.trim()) {
      setError("Type a base caption first — SAGE uses it as a seed.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_BASE_URL}/sage/generate/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base_caption: currentCaption,
          platform: "youtube",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setSuggestions(data.captions);
      setGenerated(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sage-panel">
      <div className="sage-header">
        <span className="sage-badge">SAGE</span>
        <span className="sage-subtitle">ML Caption Generator</span>
      </div>

      <button
        className="sage-generate-btn"
        onClick={handleGenerate}
        disabled={loading}
      >
        {loading ? "Generating..." : generated ? "Regenerate" : "Generate Captions"}
      </button>

      {error && <p className="sage-error">{error}</p>}

      {suggestions.length > 0 && (
        <ul className="sage-results">
          {suggestions.map((s, i) => (
            <li key={i} className="sage-result-item">
              <p className="sage-caption-text">{s.caption}</p>
              <button
                className="sage-inject-btn"
                onClick={() => onInject(s.caption)}
              >
                Use this
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}