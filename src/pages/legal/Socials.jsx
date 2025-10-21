import React from "react";
import { FaTwitter, FaInstagram, FaTikTok } from "react-icons/fa";
import "../../css/pricing.css";

export default function Socials() {
  return (
    <section className="pricing-section">
      <div className="pricing-card">
        <h1>Socials</h1>
        <p>Follow us for updates, tips, and new feature releases:</p>
        <div className="social-links">
          <a href="https://x.com/MarketXPulse" target="_blank" rel="noopener noreferrer">
            <FaTwitter size={24} />
          </a>
          <a href="https://www.instagram.com/sunsetuploader" target="_blank" rel="noopener noreferrer">
            <FaInstagram size={24} />
          </a>
          <a href="https://www.tiktok.com/@sunset_uploader23" target="_blank" rel="noopener noreferrer">
            <FaTikTok size={24} />
          </a>
        </div>
      </div>
    </section>
  );
}
