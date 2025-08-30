import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download } from "lucide-react";
import "../css/hero.css";

export default function Hero() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
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

  return (
    <section className="hero">
      <motion.h1
        className="hero-title"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        Show the World Your Dream
      </motion.h1>

      <motion.p
        className="hero-subtitle"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
      >
        As the sun rises and sets, never upload manually again.
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
              Already have an account? Log in to proceed. If not, register and
              return to download.
            </p>
            <div className="popup-actions">
              <a href="/login" className="popup-btn">Login </a>
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
