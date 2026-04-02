// src/components/HowItWorks.jsx
import "../css/home.css";

const steps = [
  {
    number: "01",
    title: "Download the app",
    desc: "Install Sunset Uploader on Windows in under a minute. Get creating and uploading right away.",
  },
  {
    number: "02",
    title: "Drop your video",
    desc: "Drag your file into the app. Add a title, pick your platforms, and let our AI suggest a caption, or write your own.",
  },
  {
    number: "03",
    title: "Hit upload",
    desc: "Sunset handles the rest. Your content goes live across every platform, with zero manual work.",
  },
];

export default function HowItWorks() {
  return (
    <section className="hiw-section">
      <div className="hiw-inner">
        <div className="hiw-header">
          <span className="section-label">How it works</span>
          <h2 className="hiw-headline">
            From file to all platforms<br />in three steps.
          </h2>
          <p className="hiw-subline">
            We removed every friction point between you and your audience.
          </p>
        </div>

        <div className="hiw-steps">
          {steps.map((s) => (
            <div className="hiw-step" key={s.number}>
              <div className="hiw-step-number">{s.number}</div>
              <div className="hiw-step-title">{s.title}</div>
              <p className="hiw-step-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}