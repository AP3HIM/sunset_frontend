// src/pages/legal/Contact.jsx
import React from "react";
import "../../css/pricing.css";

export default function Contact() {
  return (
    <section className="pricing-section">
      <div className="pricing-card">
        <h1>Contact Us</h1>
        <p>
          Have questions or need support? Reach out to us anytime at{" "}
          <a href="mailto:sales@sunsetuploader.com">sales@sunsetuploader.com</a>.
        </p>
        <p>
          We’re here to help creators make the most of Sunset Uploader. Whether it’s
          troubleshooting, feedback, or enterprise inquiries, contact us and we’ll
          respond as quickly as possible.
        </p>
      </div>
    </section>
  );
}
