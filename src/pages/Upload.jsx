// src/pages/Upload.jsx
import React, { useState, useEffect } from "react";
import Dropzone from "../components/Dropzone";
import CaptionBox from "../components/CaptionBox";
import PlatformSelector from "../components/PlatformSelector";
import Terminal from "../components/Terminal";
import UploadButton from "../components/UploadButton";
import SagePanel from "../components/SagePanel";
import CalibrationWizard from "../components/Calibrationwizard";
import { motion } from "framer-motion";
import { Download, Settings2 } from "lucide-react";
import "../css/Upload.css";
import "../css/hero.css"; // for popup styling

// Steps shown in the "Tailor to your screen" wizard. Only TikTok's "Select
// video" click still uses a recorded spot. Instagram's file picker is handled
// by the extension plus a keypress, so it needs nothing from the user.
const CALIBRATION_STEPS = {
  tiktok: [
    {
      action: "select_video",
      label: "Select video button",
      prep: [
        "Go to tiktok.com/upload in Chrome.",
        "Hover over the \"Select video\" button — don't click it.",
        "Hit Ready below, then press F9 while still hovering.",
      ],
    },
  ],
};

// Chrome Web Store page for the SunsetUploader Companion extension (unlisted).
// Paste the link from the developer dashboard:
// https://chromewebstore.google.com/detail/<extension-id>
const EXTENSION_STORE_URL = "https://chromewebstore.google.com/detail/kfbhijfogikjkomlpoglpebolopbllip";

const Upload = () => {
  const [isElectron, setIsElectron] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  const [video, setVideo] = useState(null);
  const [caption, setCaption] = useState('');
  const [platforms, setPlatforms] = useState([]);
  const [logs, setLogs] = useState([]);

  const [showCalibration, setShowCalibration] = useState(false);

  useEffect(() => {
    // Detect Electron (basic method)
    const userAgent = navigator.userAgent.toLowerCase();
    setIsElectron(userAgent.includes("electron"));

    const token = localStorage.getItem("authToken");
    setIsLoggedIn(!!token);
  }, []);

  const handleDownloadClick = () => {
    if (!isLoggedIn) {
      setShowPopup(true);
    } else {
      window.location.href =
        "https://cdn.sunsetuploader.com/SunsetUploader%20Setup%201.0.2.exe";
    }
  };

  // If NOT in Electron, show download prompt
  if (!isElectron) {
    return (
      <section className="hero-bg">
        <motion.h1
          className="hero-title"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          Desktop App Required
        </motion.h1>

        <motion.p
          className="hero-bg-subtitle"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
        >
          Please download the Windows app to upload videos. You must be logged in.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
          style={{ maxWidth: 520, margin: "0 auto 8px", textAlign: "left", color: "#fff", lineHeight: 1.6 }}
        >
          <strong>Setup takes three steps:</strong>
          <ol style={{ margin: "8px 0 0 20px" }}>
            <li>Download and install the Windows app.</li>
            <li>
              Add the free{" "}
              {EXTENSION_STORE_URL ? (
                <a href={EXTENSION_STORE_URL} target="_blank" rel="noopener noreferrer" style={{ color: "#feb47b" }}>
                  SunsetUploader Companion
                </a>
              ) : (
                "SunsetUploader Companion"
              )}{" "}
              extension to Chrome. The app can't click Post for you without it.
            </li>
            <li>Log in to TikTok and Instagram in Chrome.</li>
          </ol>
        </motion.div>

        <motion.div
          className="cta-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.8 }}
        >
          <button className="cta-button" onClick={handleDownloadClick}>
            <Download className="icon" />
            {isLoggedIn ? "Download Now" : "Sign Up to Download"}
          </button>
        </motion.div>

        {showPopup && (
          <div className="popup-overlay">
            <div className="popup">
              <h2>Login or Sign Up</h2>
              <p>
                Already have an account? Log in to proceed. If not, register and return to download.
              </p>
              <div className="popup-actions">
                <a href="/login" className="popup-btn">Login</a>
                <a href="/register" className="popup-btn">Sign Up</a>
                <button
                  className="popup-btn cancel"
                  onClick={() => setShowPopup(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    );
  }

  // If Electron, show your original uploader components
  return (
    <div className="upload-container">
      <div className="failsafe-banner">
        <strong>PyAutoGUI Failsafe:</strong> if automation ever clicks the wrong thing,
        slam your mouse into the <strong>top-left corner</strong> of the screen to instantly abort.
      </div>

      <div className="failsafe-banner">
        <strong>First time?</strong> SunsetUploader needs its free Chrome extension. If an upload
        says the extension wasn't detected, the app opens its Chrome Web Store page for you: click
        "Add to Chrome", then upload again.
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "14px 16px" }}>
        <button
          onClick={() => setShowCalibration(true)}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "16px 32px", borderRadius: 999, border: "none",
            background: "linear-gradient(90deg, #ff7e5f, #feb47b)",
            color: "#1a1425", fontSize: 16, fontWeight: 800, cursor: "pointer",
            boxShadow: "0 8px 24px rgba(255,126,95,0.35)",
          }}
        >
          <Settings2 size={20} />
          Tailor to your screen
        </button>
        <span style={{ fontSize: 13, opacity: 0.75, color: "#fff" }}>
          Tailored to fit your machine. You choose exactly where it clicks.
        </span>
      </div>

      <div className="upload-main">
        <Dropzone video={video} setVideo={setVideo} caption={caption} />
        <div className="upload-controls">
          <CaptionBox caption={caption} setCaption={setCaption} />
          <SagePanel currentCaption={caption} onInject={(text) => setCaption(text)} />
          <PlatformSelector platforms={platforms} setPlatforms={setPlatforms} />
          <UploadButton
            video={video}
            caption={caption}
            platforms={platforms}
            setLogs={setLogs}
          />
        </div>
      </div>
      <Terminal logs={logs} />

      {showCalibration && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(2px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCalibration(false); }}
        >
          <CalibrationWizard
            platforms={CALIBRATION_STEPS}
            onComplete={() => setShowCalibration(false)}
          />
        </div>
      )}
    </div>
  );
};

export default Upload;