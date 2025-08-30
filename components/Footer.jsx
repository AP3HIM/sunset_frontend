// src/components/Footer.jsx
import React from "react";
import { Link } from "react-router-dom";
import "../css/footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-scroll-section">
        <div className="footer-links">
          <h3>Explore</h3>
          <Link to="/about">About Us</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/contact">Contact Us</Link>
        </div>

        <div className="footer-links">
          <h3>Support</h3>
          <Link to="/help">Help Center</Link>
          <Link to="/report">Report Issue</Link>
          <Link to="/enterprise">Enterprise Inquiry</Link>
        </div>

        <div className="footer-links">
          <h3>Community</h3>
          <Link to="/blog">Blog</Link>
          <Link to="/socials">Socials</Link>
          <Link to="/news">News</Link>
        </div>
      </div>

      <div className="footer-right">
        <p>&copy; {new Date().getFullYear()} Sunset Uploader</p>
      </div>
    </footer>
  );
};

export default Footer;
