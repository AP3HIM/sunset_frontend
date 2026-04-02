// src/components/Features.jsx
import "../css/home.css";

const features = [
  {
    number: "01",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
    title: "One upload, four platforms",
    desc: "Drop your video once. It goes live on YouTube, Instagram, X, and TikTok simultaneously. No tab switching, no copy-paste, no wasted afternoon.",
  },
  {
    number: "02",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    title: "AI captions that don't sound like AI",
    desc: "Our ML model reads your content and suggests captions tuned for each platform. Sharp for X, hashtag-ready for Instagram, hook-first for TikTok.",
  },
  {
    number: "03",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
    title: "Metadata in one place",
    desc: "Titles, descriptions, tags, thumbnails — templated and ready. Stop rewriting the same paragraph for five different upload forms.",
  },
  {
    number: "04",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
    title: "Native desktop app",
    desc: "Not a browser extension. Not a web dashboard that logs you out. A real Electron app that runs fast, stays out of your way, and uploads reliably.",
  },
];

export default function Features() {
  return (
    <section className="features-section">
      <div className="features-intro">
        <span className="section-label">What it does</span>
        <h2 className="features-headline">
          Built for people who create,<br />not people who manage.
        </h2>
      </div>

      <div className="features-list">
        {features.map((f) => (
          <div className="feature-row" key={f.number}>
            <div className="feature-row-left">
              <span className="feature-row-number">{f.number}</span>
              <div className="feature-row-icon">{f.icon}</div>
            </div>
            <div className="feature-row-body">
              <h3 className="feature-row-title">{f.title}</h3>
              <p className="feature-row-desc">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}