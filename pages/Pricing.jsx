// src/pages/Pricing.jsx
import "../css/pricing.css";

function PricingPage() {
  return (
    <section id="pricing" className="pricing-section">
      <h2>Pricing Plans</h2>
      <div className="pricing-container">

        {/* Free Tier */}
        <div className="pricing-card highlighted">
          <h3>Free Tier</h3>
          <p className="price">Free</p>
          <ul>
            <li>10 uploads per day</li>
            <li>All the essentials to get started</li>
            <li>Make your dreams come true today</li>
          </ul>
          <button>Get Started</button>
        </div>

        {/* Enterprise */}
        <div className="pricing-card">
          <h3>Enterprise</h3>
          <p className="price">Contact Us</p>
          <ul>
            <li>Unlimited uploads</li>
            <li>Priority access & premium support</li>
            <li>Tailored solutions for your organization</li>
            <li>Scale without limits</li>
          </ul>

          {/* Note: sales@sunsetuploader.com does not exist yet. The button does not work either fix this later.*/}
          <a
            href="mailto:sales@sunsetuploader.com"
            className="contact-button"
          >
            Contact Sales
          </a>
        </div>

      </div>
    </section>
  );
}

export default PricingPage;
