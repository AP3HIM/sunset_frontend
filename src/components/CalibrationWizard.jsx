// CalibrationWizard.jsx
//
// Flow:
//   'intro'     — explains auto-detect vs calibration (both matter — auto-
//                 detect tries first, calibration is the guaranteed backup
//                 you set up once). Single "Start calibration" CTA.
//   'stepIntro' — per-step written instructions, nothing starts until the
//                 user clicks "I'm ready" — no surprise timers.
//   'holding'   — the actual hover-and-hold capture (3s).
//   'confirmed' — per-step success screen. User clicks "Next step"
//                 themselves — never auto-advances.
//   'allDone'   — finished.
//
// Usage same as before:
//   <CalibrationWizard platform="tiktok" steps={[...]} onComplete={...} />

import { useState, useEffect, useCallback } from "react";

const HOLD_MS = 3000;

export default function CalibrationWizard({ platform, steps, onComplete }) {
  const [mode, setMode] = useState("intro");
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const currentStep = steps[stepIndex];

  const handleProgress = useCallback((data) => {
    setProgress(data.reset ? 0 : Math.min(1, data.elapsed / data.holdMs));
  }, []);

  const handleCaptured = useCallback(() => {
    setProgress(0);
    setMode("confirmed");
  }, []);

  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.onCalibrationProgress(handleProgress);
    window.electronAPI.onCalibrationCaptured(handleCaptured);
  }, [handleProgress, handleCaptured]);

  const beginHold = () => {
    setMode("holding");
    window.electronAPI?.startCalibrationCapture?.(platform, currentStep.action, { holdMs: HOLD_MS });
  };

  useEffect(() => {
    return () => window.electronAPI?.cancelCalibrationCapture?.();
  }, []);

  const goToNextStep = () => {
    if (stepIndex + 1 < steps.length) {
      setStepIndex((i) => i + 1);
      setMode("stepIntro");
    } else {
      setMode("allDone");
    }
  };

  return (
    <div style={styles.card}>
      <button style={styles.closeBtn} onClick={onComplete} aria-label="Close">
        <CloseIcon />
      </button>

      {mode === "intro" && <IntroScreen onStart={() => setMode("stepIntro")} />}

      {mode === "stepIntro" && currentStep && (
        <StepIntroScreen
          index={stepIndex}
          total={steps.length}
          step={currentStep}
          onReady={beginHold}
        />
      )}

      {mode === "holding" && currentStep && (
        <HoldingScreen step={currentStep} progress={progress} />
      )}

      {mode === "confirmed" && currentStep && (
        <ConfirmedScreen step={currentStep} onNext={goToNextStep} isLast={stepIndex + 1 >= steps.length} />
      )}

      {mode === "allDone" && <AllDoneScreen platform={platform} onFinish={onComplete} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------

function IntroScreen({ onStart }) {
  return (
    <>
      <h2 style={styles.title}>Two ways SunsetUploader finds the right spot</h2>
      <div style={styles.infoRow}>
        <div style={styles.infoCard}>
          <BoltIcon />
          <div style={styles.infoTitle}>Auto-detect</div>
          <div style={styles.infoDesc}>
            Every time you upload, we try to find the button ourselves first —
            no setup, no waiting.
          </div>
        </div>
        <div style={styles.infoCard}>
          <TargetIcon />
          <div style={styles.infoTitle}>Your calibration</div>
          <div style={styles.infoDesc}>
            The guaranteed backup, built by you, for your exact screen. When
            auto-detect can't be 100% sure, this is what makes the click land
            anyway — every time.
          </div>
        </div>
      </div>
      <p style={styles.introNote}>
        Auto-detect does the heavy lifting where it can. But nobody knows
        your screen like you do — two minutes now means this app is
        <em> permanently </em> tuned to your setup. That's not a fallback,
        that's you making the call instead of leaving it to a guess.
      </p>
      <button style={styles.primaryBtnBig} onClick={onStart}>
        Start calibration
      </button>
    </>
  );
}

function StepIntroScreen({ index, total, step, onReady }) {
  return (
    <>
      <div style={styles.stepCounter}>Step {index + 1} of {total}</div>
      <h2 style={styles.title}>{step.label}</h2>
      <div style={styles.instructionList}>
        {step.prep.map((line, i) => (
          <div key={i} style={styles.instructionRow}>
            <div style={styles.instructionNum}>{i + 1}</div>
            <div style={styles.instructionText}>{line}</div>
          </div>
        ))}
      </div>
      <p style={styles.holdHint}>
        Take your time on all of that — nothing starts until you click below.
      </p>
      <button style={styles.primaryBtnBig} onClick={onReady}>
        I'm ready, start the hold
      </button>
    </>
  );
}

function HoldingScreen({ step, progress }) {
  return (
    <>
      <h2 style={styles.title}>Hold steady...</h2>
      <p style={styles.subtitle}>
        Keep your mouse right where it is over <strong>{step.label}</strong>.
      </p>
      <ProgressRing progress={progress} />
      <p style={styles.holdHint}>Don't click anything — just hold still.</p>
    </>
  );
}

function ConfirmedScreen({ step, onNext, isLast }) {
  return (
    <>
      <CheckCircleIcon />
      <h2 style={styles.title}>{step.label} — locked in</h2>
      <p style={styles.subtitle}>
        That exact spot is saved to this machine. It'll be right every time
        from now on.
      </p>
      <button style={styles.primaryBtnBig} onClick={onNext}>
        {isLast ? "Finish up" : "Next step"}
      </button>
    </>
  );
}

function AllDoneScreen({ platform, onFinish }) {
  return (
    <>
      <SparkleIcon />
      <h2 style={styles.title}>{platform} is dialed in</h2>
      <p style={styles.subtitle}>
        This machine now knows exactly where everything is. You won't need
        to do this again unless {platform} changes its layout.
      </p>
      <button style={styles.primaryBtnBig} onClick={onFinish}>
        Done
      </button>
    </>
  );
}

function ProgressRing({ progress }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - progress);
  return (
    <svg width="120" height="120" viewBox="0 0 100 100" style={{ margin: "16px auto", display: "block" }}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#3a2a4d" strokeWidth="7" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke="url(#sunsetGradient)" strokeWidth="7"
        strokeDasharray={c} strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ transition: "stroke-dashoffset 0.1s linear" }}
      />
      <defs>
        <linearGradient id="sunsetGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff7e5f" />
          <stop offset="100%" stopColor="#feb47b" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// SVG icons — no emoji, simple line-art, inherits currentColor
// ---------------------------------------------------------------------------

function TargetIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" style={styles.icon}>
      <circle cx="12" cy="12" r="9" stroke="#feb47b" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="5" stroke="#feb47b" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="1.4" fill="#feb47b" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" style={styles.icon}>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" stroke="#feb47b" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="42" height="42" viewBox="0 0 24 24" fill="none" style={{ margin: "0 auto 8px", display: "block" }}>
      <circle cx="12" cy="12" r="9.5" stroke="#feb47b" strokeWidth="1.6" />
      <path d="m7.5 12.5 3 3 6-6.5" stroke="#feb47b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="42" height="42" viewBox="0 0 24 24" fill="none" style={{ margin: "0 auto 8px", display: "block" }}>
      <path d="M12 2 14 9 21 12 14 15 12 22 10 15 3 12 10 9Z" stroke="#feb47b" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M5 5l14 14M19 5 5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const styles = {
  card: {
    position: "relative",
    width: 480,
    maxWidth: "92vw",
    padding: "32px 28px",
    borderRadius: 20,
    background: "linear-gradient(160deg, #241b33 0%, #1a1425 100%)",
    color: "#fff",
    textAlign: "center",
    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
    border: "1px solid rgba(255,255,255,0.06)",
  },
  closeBtn: {
    position: "absolute", top: 16, right: 16,
    background: "transparent", border: "none", color: "#aaa", cursor: "pointer",
    padding: 6, borderRadius: 8,
  },
  icon: { margin: "0 auto 6px", display: "block" },
  title: { fontSize: 21, fontWeight: 700, margin: "6px 0 14px" },
  subtitle: { fontSize: 14, opacity: 0.8, lineHeight: 1.6, marginBottom: 12 },
  holdHint: { fontSize: 13, opacity: 0.6, marginTop: 10 },
  stepCounter: { fontSize: 12, opacity: 0.5, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 },

  infoRow: { display: "flex", gap: 14, marginTop: 8, marginBottom: 16 },
  infoCard: {
    flex: 1, padding: "18px 14px", borderRadius: 14,
    border: "1px solid #3a2a4d", background: "rgba(255,255,255,0.03)",
  },
  infoTitle: { fontWeight: 700, fontSize: 14, margin: "6px 0 6px" },
  infoDesc: { fontSize: 12.5, opacity: 0.7, lineHeight: 1.5 },
  introNote: { fontSize: 13, opacity: 0.75, lineHeight: 1.6, marginBottom: 20 },

  instructionList: { textAlign: "left", margin: "16px 0" },
  instructionRow: { display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14 },
  instructionNum: {
    flexShrink: 0, width: 24, height: 24, borderRadius: "50%",
    background: "linear-gradient(90deg, #ff7e5f, #feb47b)", color: "#1a1425",
    fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center",
  },
  instructionText: { fontSize: 14, lineHeight: 1.5, paddingTop: 2 },

  primaryBtnBig: {
    marginTop: 8, padding: "14px 30px", borderRadius: 999, border: "none",
    background: "linear-gradient(90deg, #ff7e5f, #feb47b)", color: "#1a1425",
    fontWeight: 800, cursor: "pointer", fontSize: 15,
    width: "100%",
  },
};