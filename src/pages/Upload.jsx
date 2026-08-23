// src/pages/Upload.jsx
import React, { useState, useEffect } from "react";
import Dropzone from "../components/Dropzone";
import CaptionBox from "../components/CaptionBox";
import PlatformSelector from "../components/PlatformSelector";
import Terminal from "../components/Terminal";
import UploadButton from "../components/UploadButton";
import SagePanel from "../components/SagePanel";
import CalibrationWizard from "../components/CalibrationWizard";
import { motion } from "framer-motion";
import { Download, Settings2 } from "lucide-react";
import "../css/Upload.css";
import "../css/hero.css"; // for popup styling

// TikTok calibration steps. Post is DOM's job now, not calibration — only
// the two things auto-detect can't guarantee live here. `prep` lines are
// shown before the hold starts, so the user has real time to get in
// position before anything begins.
const CALIBRATION_STEPS = {
  tiktok: [
    {
      action: "select_video",
      label: "Select Video button",
      prep: [
        "Open Chrome and go to tiktok.com/upload (about 15 seconds — take your time).",
        "Hover your mouse directly over the \"Select video\" button. Don't click it.",
        "When your mouse is sitting still on the button, come back here and hit the button below.",
      ],
    },
    {
      action: "caption",
      label: "Caption box",
      prep: [
        "Back in Chrome, pick any video to select it (about 10 seconds).",
        "Hover your mouse over the MIDDLE of the caption text box.",
        "When you're steady there, come back here and hit the button below.",
      ],
    },
  ],
};

const Upload = () => {
  const [isElectron, setIsElectron] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  const [video, setVideo] = useState(null);
  const [caption, setCaption] = useState('');
  const [platforms, setPlatforms] = useState([]);
  const [logs, setLogs] = useState([]);

  const [showCalibration, setShowCalibration] = useState(false);
  const [calibrationPlatform, setCalibrationPlatform] = useState("tiktok");

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
        "https://cdn.sunsetuploader.com/SunsetUploader%20Setup%201.0.0.exe";
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

      <div style={{ display: "flex", justifyContent: "center", padding: "14px 16px" }}>
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
          Calibrate platforms
        </button>
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
            platform={calibrationPlatform}
            steps={CALIBRATION_STEPS[calibrationPlatform]}
            onComplete={() => setShowCalibration(false)}
          />
        </div>
      )}
    </div>
  );
};

export default Upload;