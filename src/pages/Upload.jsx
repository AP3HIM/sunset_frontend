// src/pages/Upload.jsx
import React, { useState, useEffect } from "react";
import Dropzone from "../components/Dropzone";
import CaptionBox from "../components/CaptionBox";
import PlatformSelector from "../components/PlatformSelector";
import Terminal from "../components/Terminal";
import UploadButton from "../components/UploadButton";
import { motion } from "framer-motion";
import { Download } from "lucide-react";
import "../css/Upload.css";
import "../css/hero.css"; // for popup styling

const Upload = () => {
  const [isElectron, setIsElectron] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  const [video, setVideo] = useState(null);
  const [caption, setCaption] = useState('');
  const [platforms, setPlatforms] = useState([]);
  const [logs, setLogs] = useState([]);

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
      <div className="upload-main">
        <Dropzone video={video} setVideo={setVideo} caption={caption} />
        <div className="upload-controls">
          <CaptionBox caption={caption} setCaption={setCaption} />
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
    </div>
  );
};

export default Upload;