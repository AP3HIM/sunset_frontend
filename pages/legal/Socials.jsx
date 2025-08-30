import React from "react";
import { FaTwitter, FaInstagram, FaYoutube } from "react-icons/fa";
import "../../css/pricing.css";

export default function Socials() {
  return (
    <section className="pricing-section">
      <div className="pricing-card">
        <h1>Socials</h1>
        <p>Follow us for updates, tips, and new feature releases:</p>
        <div className="social-links">
          <a href="https://twitter.com/YOUR_HANDLE" target="_blank" rel="noopener noreferrer">
            <FaTwitter size={24} />
          </a>
          <a href="https://instagram.com/YOUR_HANDLE" target="_blank" rel="noopener noreferrer">
            <FaInstagram size={24} />
          </a>
          <a href="https://youtube.com/YOUR_CHANNEL" target="_blank" rel="noopener noreferrer">
            <FaYoutube size={24} />
          </a>
        </div>
      </div>
    </section>
  );
}
