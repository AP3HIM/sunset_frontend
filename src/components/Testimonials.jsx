// src/components/Testimonials.jsx
// Replace placeholder content with real quotes as you collect them
import "../css/home.css";

const testimonials = [
  {
    quote:
      "I used to spend 45 minutes every upload day copying descriptions between tabs. Sunset cut that down to literally nothing.",
    name: "PaperTigerMedia",
    handle: "@papertigrmedia · YouTube",
  },
  {
    quote:
      "The AI caption suggestions are crazy good. I've tried it on 10 posts and 8 of them outperformed my own captions.",
    name: "PaperTigerCinema",
    handle: "@papertigercinema · Instagram & TikTok",
  },
  {
    quote:
      "Finally a tool built for creators, not social media managers at agencies. Clean, fast, and it does exactly what it says.",
    name: "WentzUponATime",
    handle: "@wentzuponatime · X & YouTube",
  },
];

export default function Testimonials() {
  return (
    <section className="testimonials-section">
      <div className="testimonials-header">
        <span className="section-label">Testimonials</span>
        <h2 className="testimonials-headline">
          Creators are saving<br />hours every week.
        </h2>
      </div>

      <div className="testimonials-grid">
        {testimonials.map((t, i) => (
          <div className="testimonial-card" key={i}>
            <p className="testimonial-quote">{t.quote}</p>
            <div className="testimonial-author">
              <div className="testimonial-avatar" />
              <div>
                <div className="testimonial-name">{t.name}</div>
                <div className="testimonial-handle">{t.handle}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}