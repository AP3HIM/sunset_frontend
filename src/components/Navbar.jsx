// src/components/Navbar.jsx
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "../css/navbar.css";
import sunsetLogo from "../assets/sunset-logo.png";

function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  useEffect(() => {
    const checkLogin = () => {
      const token = localStorage.getItem("authToken");
      setIsLoggedIn(!!token);
    };
    checkLogin();
    window.addEventListener("storage", checkLogin);
    return () => window.removeEventListener("storage", checkLogin);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    setIsLoggedIn(false);
    navigate("/");
  };

  return (
    <nav className="navbar">
      <div className="nav-container">

        <Link to="/" className="nav-logo" onClick={closeMenu}>
          Sunset Uploader
        </Link>

        <button
          className={`hamburger ${isOpen ? "hamburger--open" : ""}`}
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <span className="bar" />
          <span className="bar" />
          <span className="bar" />
        </button>

        <ul className={`nav-links ${isOpen ? "open" : ""}`}>
          <li><Link to="/" onClick={closeMenu}>Home</Link></li>
          <li><Link to="/upload" onClick={closeMenu}>Upload</Link></li>
          <li><Link to="/demo" onClick={closeMenu}>Demo</Link></li>

          {/* Auth — identical logic to original */}
          {isLoggedIn ? (
            <li>
              <button
                className="nav-link-button"
                onClick={() => { handleLogout(); closeMenu(); }}
              >
                Logout
              </button>
            </li>
          ) : (
            <li><Link to="/login" onClick={closeMenu}>Login</Link></li>
          )}

          {/* Download only shows when logged in — same as original intent */}
          {isLoggedIn && (
            <li>
              <a
                href="https://cdn.sunsetuploader.com/SunsetUploader%20Setup%201.0.0.exe"
                className="nav-cta"
                onClick={closeMenu}
              >
                Download
              </a>
            </li>
          )}
        </ul>

      </div>
    </nav>
  );
}

export default Navbar;