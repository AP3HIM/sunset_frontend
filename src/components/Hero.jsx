// src/components/Hero.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../css/home.css";

const DOWNLOAD_URL = "https://cdn.sunsetuploader.com/SunsetUploader%20Setup%201.0.0.exe";

const YoutubeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
    <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z"/>
  </svg>
);
const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
  </svg>
);
const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
  </svg>
);
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.2 8.2 0 0 0 4.79 1.53V6.77a4.85 4.85 0 0 1-1.02-.08z"/>
  </svg>
);

export default function Hero() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkLogin = () => {
      const token = localStorage.getItem("authToken");
      setIsLoggedIn(!!token);
    };
    checkLogin();
    window.addEventListener("storage", checkLogin);
    return () => window.removeEventListener("storage", checkLogin);
  }, []);

  const handleDownloadClick = (e) => {
    if (!isLoggedIn) {
      e.preventDefault();
      navigate("/login");
    }
    // if logged in, the href takes over naturally
  };

  return (
    <section className="hero-section">
      <div className="hero-gradient-bg" />
      <div className="hero-orb hero-orb--1" />
      <div className="hero-orb hero-orb--2" />

      <div className="hero-body">

        <div className="hero-left">
          <h1 className="hero-headline">
            Stop<br />
            posting<br />
            like it's<br />
            <em>2019.</em>
          </h1>
        </div>

        <div className="hero-right">
          <div className="hero-glass-card">
            <p className="hero-subline">
              One upload. Four platforms. AI captions that don't sound like AI.
              Sunset Uploader is what your workflow has been missing.
            </p>
            <div className="hero-actions">
              <a
                href={DOWNLOAD_URL}
                className="btn-download"
                onClick={handleDownloadClick}
              >
                {isLoggedIn ? "Download Now" : "Sign up to Download"}
              </a>
              <a href="/demo" className="btn-ghost">See a demo →</a>
            </div>
          </div>
        </div>

      </div>

      <div className="hero-footer">
        <span className="hero-platforms-label">Works with</span>
        <div className="hero-platform-pills">
          <span className="platform-pill"><YoutubeIcon /> YouTube</span>
          <span className="platform-pill"><InstagramIcon /> Instagram</span>
          <span className="platform-pill"><XIcon /> X</span>
          <span className="platform-pill"><TikTokIcon /> TikTok</span>
        </div>
      </div>

    </section>
  );
}