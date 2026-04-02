// src/components/Stats.jsx
import "../css/home.css";

const stats = [
  {
    number: "4",
    unit: "platforms",
    desc: "YouTube, Instagram, X, and TikTok.",
    color: "var(--stat-c1)",
  },
  {
    number: "1",
    unit: "upload",
    desc: "One file. One click. Done.",
    color: "var(--stat-c2)",
  },
  {
    number: "<60",
    unit: "s",
    desc: "From download to your first upload. Less than a minute guaranteed.",
    color: "var(--stat-c3)",
  },
  {
    number: "∞",
    unit: "uploads",
    desc: "No monthly cap. No throttle. Upload as much as you make.",
    color: "var(--stat-c4)",
  },
];

export default function Stats() {
  return (
    <section className="stats-section">
      <div className="stats-inner">
        <div className="stats-header">
          <span className="section-label">By the numbers</span>
          <h2 className="stats-headline">Numbers that actually matter.</h2>
        </div>

        <div className="stats-grid">
          {stats.map((s, i) => (
            <div className="stat-card" key={i} style={{ "--card-accent": s.color }}>
              <div className="stat-card-top">
                <span className="stat-big">{s.number}</span>
                <span className="stat-unit">{s.unit}</span>
              </div>
              <p className="stat-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}