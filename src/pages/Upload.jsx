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

// All platforms' calibration steps live here. TikTok and Instagram are
// real (matched to the actual DOM/PAG code). YouTube and Twitter are
// placeholders until we've been through their upload scripts the same way
// — swap these out once we have, don't calibrate against guessed labels.
const CALIBRATION_STEPS = {
  tiktok: [
    {
      action: "select_video",
      label: "Select Video button (usually not needed — image match handles this on most screens)",
      prep: [
        "Go to tiktok.com/upload in Chrome.",
        "Hover over the \"Select video\" button — don't click it.",
        "Once you're sitting on it, hit Ready below and press F9 while still hovering.",
      ],
    },
  ],
  
  instagram: [
    {
      action: "select_file",
      label: "Select File button (the one PAG/calibration step Instagram actually needs)",
      prep: [
        "Get to Instagram's upload flow until 'Select from computer' is on screen.",
        "Hover directly over that button — don't click it.",
        "Once you're sitting on it, hit Ready below and press F9 while still hovering.",
      ],
    },
  ],

  // Backup only — DOM handles all of these now. Only worth touching if
  // Instagram changes its layout and DOM automation breaks.
  instagram_advanced: [
    { action: "create", label: "Create button", prep: [
      "Go to instagram.com.", "Hover over the '+' / Create icon in the sidebar — don't click it.",
      "Hit Ready below, then press F9 while still hovering." ] },
    { action: "post", label: "Post option (after Create)", prep: [
      "Click Create for real so the menu opens.", "Hover over the 'Post' option.",
      "Hit Ready below, then press F9 while still hovering." ] },
    { action: "crop_button", label: "Crop button", prep: [
      "Get to the crop screen after picking a video.", "Hover over the crop-select icon.",
      "Hit Ready below, then press F9 while still hovering." ] },
    { action: "nine_sixteen", label: "9:16 crop option", prep: [
      "From the crop menu, hover over the 9:16 option.",
      "Hit Ready below, then press F9 while still hovering." ] },
    { action: "next1", label: "First Next button", prep: [
      "Get to the first Next after cropping.", "Hover over it.",
      "Hit Ready below, then press F9 while still hovering." ] },
    { action: "next2", label: "Second Next button", prep: [
      "Click through to the filters/second Next screen.", "Hover over it.",
      "Hit Ready below, then press F9 while still hovering." ] },
    { action: "caption", label: "Caption box", prep: [
      "Get to the caption/share screen.", "Hover over the caption box.",
      "Hit Ready below, then press F9 while still hovering." ] },
    { action: "share", label: "Share button", prep: [
      "Get to the final screen.", "Hover over Share — don't click it.",
      "Hit Ready below, then press F9 while still hovering." ] },
  ],

  youtube: [
    {
      action: "create",
      label: "Create button (usually not needed — image match handles this on most screens)",
      prep: [
        "Go to studio.youtube.com in Chrome.",
        "Hover over the Create button, top-right of the page — don't click it.",
        "Once you're sitting on it, hit Ready below and press F9 while still hovering.",
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
            platforms={CALIBRATION_STEPS}
            onComplete={() => setShowCalibration(false)}
          />
        </div>
      )}
    </div>
  );
};

export default Upload;