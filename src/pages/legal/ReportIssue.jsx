import React from "react";
import "../../css/pricing.css";

export default function ReportIssue() {
  return (
    <section className="pricing-section">
      <div className="pricing-card">
        <h1>Report an Issue</h1>
        <p>
          Found a bug or having trouble? Please email{" "}
          <a href="mailto:help@sunsetuploader.com">help@sunsetuploader.com</a>{" "}
          with details so we can assist you as quickly as possible.
        </p>
      </div>
    </section>
  );
}
