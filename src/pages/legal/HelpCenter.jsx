import React from "react";
import "../../css/pricing.css";

export default function HelpCenter() {
  return (
    <section className="pricing-section">
      <div className="pricing-card">
        <h1>Help Center</h1>
        <p>
          Need assistance? Email us at{" "}
          <a href="mailto:help@sunsetuploader.com">help@sunsetuploader.com</a>.
          Our team is here to assist you with any questions or issues.
        </p>
      </div>
    </section>
  );
}
