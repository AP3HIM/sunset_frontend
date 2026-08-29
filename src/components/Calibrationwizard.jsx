// CalibrationWizard.jsx
//
// Flow: 'platformPicker' -> 'stepPicker' (shows every step for that
// platform, marks which are already calibrated) -> pick ANY one step ->
// 'stepIntro' -> 'armed' (waiting for F9) -> 'confirmed' -> back to
// 'stepPicker', not auto-advancing — you choose what to do next, including
// just closing out after fixing the one thing that was missing.
//
// Usage unchanged:
//   <CalibrationWizard platforms={{ tiktok: [...], instagram: [...] }} onComplete={...} />

import { useState, useEffect, useCallback } from "react";

const PLATFORM_LABELS = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  twitter: "X / Twitter",
};

export default function CalibrationWizard({ platforms, onComplete }) {
  const [mode, setMode] = useState("platformPicker");
  const [platform, setPlatform] = useState(null);
  const [activeStep, setActiveStep] = useState(null);
  const [calibratedActions, setCalibratedActions] = useState(new Set());
  const [error, setError] = useState(null);

  const steps = platform ? platforms[platform] : [];

  const handleCaptured = useCallback((data) => {
    setCalibratedActions((prev) => new Set(prev).add(data.action));
    setMode("confirmed");
  }, []);

  const handleError = useCallback((data) => {
    setError(data.message);
    setMode("stepIntro");
  }, []);

  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.onCalibrationCaptured(handleCaptured);
    window.electronAPI.onCalibrationError(handleError);
  }, [handleCaptured, handleError]);

  useEffect(() => {
    return () => window.electronAPI?.cancelCalibrationCapture?.();
  }, []);

  const choosePlatform = async (key) => {
    setPlatform(key);
    const all = (await window.electronAPI?.loadCalibration?.()) || {};
    setCalibratedActions(new Set(Object.keys(all[key] || {})));
    setMode("stepPicker");
  };

  const chooseStep = (step) => {
    setActiveStep(step);
    setError(null);
    setMode("stepIntro");
  };

  const arm = () => {
    setError(null);
    setMode("armed");
    window.electronAPI?.startCalibrationCapture?.(platform, activeStep.action);
  };

  return (
    <div style={styles.card}>
      <button style={styles.closeBtn} onClick={onComplete} aria-label="Close">
        <CloseIcon />
      </button>

      {mode === "platformPicker" && (
        <PlatformPickerScreen platforms={platforms} onChoose={choosePlatform} />
      )}

      {mode === "stepPicker" && platform && (
        <StepPickerScreen
          platform={platform}
          steps={steps}
          calibratedActions={calibratedActions}
          onChooseStep={chooseStep}
          onBack={() => setMode("platformPicker")}
        />
      )}

      {mode === "stepIntro" && activeStep && (
        <StepIntroScreen step={activeStep} error={error} onReady={arm} />
      )}

      {mode === "armed" && activeStep && <ArmedScreen step={activeStep} />}

      {mode === "confirmed" && activeStep && (
        <ConfirmedScreen step={activeStep} onBackToList={() => setMode("stepPicker")} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------

function PlatformPickerScreen({ platforms, onChoose }) {
  const keys = Object.keys(platforms).filter((k) => platforms[k]?.length);
  return (
    <>
      <h2 style={styles.title}>Which platform?</h2>
      <p style={styles.subtitle}>Pick one — you'll see exactly what's calibrated and what isn't.</p>
      <div style={styles.platformGrid}>
        {keys.map((key) => (
          <button key={key} style={styles.platformBtn} onClick={() => onChoose(key)}>
            <PlatformBadge label={PLATFORM_LABELS[key] || key} />
            <div style={{ fontWeight: 700, fontSize: 14 }}>{PLATFORM_LABELS[key] || key}</div>
            <div style={{ fontSize: 11.5, opacity: 0.6 }}>{platforms[key].length} steps</div>
          </button>
        ))}
      </div>
    </>
  );
}

function StepPickerScreen({ platform, steps, calibratedActions, onChooseStep, onBack }) {
  const doneCount = steps.filter((s) => calibratedActions.has(s.action)).length;
  return (
    <>
      <h2 style={styles.title}>{PLATFORM_LABELS[platform] || platform}</h2>
      <p style={styles.subtitle}>
        {doneCount} of {steps.length} done. Click any step to (re)calibrate just that one.
      </p>
      <div style={styles.stepList}>
        {steps.map((step) => {
          const done = calibratedActions.has(step.action);
          return (
            <button key={step.action} style={styles.stepListItem} onClick={() => onChooseStep(step)}>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {done ? <SmallCheckIcon /> : <span style={styles.notDoneDot} />}
                {step.label}
              </span>
              <span style={{ fontSize: 12, opacity: 0.5 }}>{done ? "Redo" : "Set up"}</span>
            </button>
          );
        })}
      </div>
      <button style={styles.secondaryBtn} onClick={onBack}>
        Back to platforms
      </button>
    </>
  );
}

function StepIntroScreen({ step, error, onReady }) {
  return (
    <>
      <h2 style={styles.title}>{step.label}</h2>
      <div style={styles.instructionList}>
        {step.prep.map((line, i) => (
          <div key={i} style={styles.instructionRow}>
            <div style={styles.instructionNum}>{i + 1}</div>
            <div style={styles.instructionText}>{line}</div>
          </div>
        ))}
      </div>
      {error && <p style={styles.errorText}>{error}</p>}
      <button style={styles.primaryBtnBig} onClick={onReady}>
        Ready — arm it
      </button>
    </>
  );
}

function ArmedScreen({ step }) {
  return (
    <>
      <KeyIcon />
      <h2 style={styles.title}>Go find it in Chrome</h2>
      <p style={styles.subtitle}>
        Hover your mouse over <strong>{step.label}</strong>, then press{" "}
        <kbd style={styles.kbd}>F9</kbd>.
      </p>
      <p style={styles.holdHint}>
        F9 works no matter what's on screen — you don't need to switch back here first.
      </p>
    </>
  );
}

function ConfirmedScreen({ step, onBackToList }) {
  return (
    <>
      <CheckCircleIcon />
      <h2 style={styles.title}>Got it</h2>
      <p style={styles.subtitle}>
        {step.label} is saved for this machine. That's it — it'll click that exact spot from now on.
      </p>
      <button style={styles.primaryBtnBig} onClick={onBackToList}>
        Back to the list
      </button>
    </>
  );
}

// ---------------------------------------------------------------------------
// SVG icons — no emoji, simple line-art, inherits currentColor
// ---------------------------------------------------------------------------

function PlatformBadge({ label }) {
  const initial = label.trim()[0]?.toUpperCase() || "?";
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" style={{ margin: "0 auto 6px", display: "block" }}>
      <circle cx="18" cy="18" r="17" fill="none" stroke="#feb47b" strokeWidth="1.6" />
      <text x="18" y="23" textAnchor="middle" fontSize="14" fontWeight="700" fill="#feb47b" fontFamily="inherit">
        {initial}
      </text>
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg width="38" height="38" viewBox="0 0 24 24" fill="none" style={{ margin: "0 auto 10px", display: "block" }}>
      <circle cx="8" cy="15" r="4.2" stroke="#feb47b" strokeWidth="1.6" />
      <path d="M11 12 19 4M16 6l2.5 2.5M13.5 8.5 16 11" stroke="#feb47b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
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

function SmallCheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" fill="#feb47b" />
      <path d="m7.5 12.5 3 3 6-6.5" stroke="#1a1425" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
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
    maxHeight: "85vh",
    overflowY: "auto",
  },
  closeBtn: {
    position: "absolute", top: 16, right: 16,
    background: "transparent", border: "none", color: "#aaa", cursor: "pointer",
    padding: 6, borderRadius: 8,
  },
  title: { fontSize: 21, fontWeight: 700, margin: "6px 0 14px" },
  subtitle: { fontSize: 14, opacity: 0.8, lineHeight: 1.6, marginBottom: 12 },
  holdHint: { fontSize: 13, opacity: 0.6, marginTop: 10 },
  errorText: { fontSize: 13, color: "#ff8a8a", marginTop: 8, marginBottom: 4 },

  kbd: {
    background: "#3a2a4d", padding: "2px 8px", borderRadius: 6,
    fontFamily: "monospace", fontSize: 13, border: "1px solid rgba(255,255,255,0.15)",
  },

  platformGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 20,
  },
  platformBtn: {
    padding: "20px 12px", borderRadius: 14, border: "1px solid #3a2a4d",
    background: "rgba(255,255,255,0.03)", color: "#fff", cursor: "pointer",
    textAlign: "center",
  },

  stepList: { display: "flex", flexDirection: "column", gap: 8, margin: "16px 0", textAlign: "left" },
  stepListItem: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 14px", borderRadius: 12, border: "1px solid #3a2a4d",
    background: "rgba(255,255,255,0.03)", color: "#fff", cursor: "pointer",
    fontSize: 14,
  },
  notDoneDot: {
    width: 16, height: 16, borderRadius: "50%", border: "2px solid #55486b", flexShrink: 0,
  },

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
  secondaryBtn: {
    marginTop: 10, padding: "12px 30px", borderRadius: 999,
    border: "1px solid #3a2a4d", background: "transparent", color: "#fff",
    fontWeight: 600, cursor: "pointer", fontSize: 14,
    width: "100%",
  },
};