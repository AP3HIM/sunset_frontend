// src/components/Navbar.jsx
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "../css/navbar.css";
import sunsetLogo from "../assets/sunset-logo.png";

function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    setIsLoggedIn(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    setIsLoggedIn(false);
    navigate("/");
  };

  return (
    <nav className="navbar">
      <Link to="/" className="title-link">
        SunsetUploader
      </Link>
      <ul className="nav-links">
        <li><Link to="/">Home</Link></li>
        <li><Link to="/upload">Upload</Link></li>

        {isLoggedIn ? (
          <li>
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </li>
        ) : (
          <>
            <li><Link to="/login">Login</Link></li>
          </>
        )}
      </ul>
    </nav>
  );
}

export default Navbar;
