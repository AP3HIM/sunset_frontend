// src/components/Footer.jsx
import "../css/home.css";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer-section">
      <div className="footer-inner">
        <div className="footer-top">
          <div>
            <div className="footer-brand-name">Sunset Uploader</div>
            <p className="footer-brand-desc">
              Post everywhere. Grow faster. Built for creators who
              have content to share and no time to waste.
            </p>
          </div>

          <div className="footer-links">
            <div className="footer-col">
              <div className="footer-col-title">Product</div>
              <a href="/download">Download</a>
              <a href="/demo">Demo</a>
              <a href="/pricing">Pricing</a>
            </div>
            <div className="footer-col">
              <div className="footer-col-title">Company</div>
              <a href="/about">About</a>
              <a href="/contact">Contact</a>
            </div>
            <div className="footer-col">
              <div className="footer-col-title">Legal</div>
              <a href="/legal/privacy">Privacy</a>
              <a href="/legal/terms">Terms</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span className="footer-copy">© {year} Sunset Uploader. All rights reserved.</span>
          <div className="footer-legal">
            <a href="/legal/privacy">Privacy Policy</a>
            <a href="/legal/terms">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}