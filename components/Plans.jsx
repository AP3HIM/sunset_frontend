import '../css/globals.css';

export default function Plans() {
  return (
    <main className="section tall plans">
      <h2 className="section-title">Pricing Plans</h2>
      <p className="section-text">
        Start free. Upgrade for more posts, analytics, and scheduling power.
      </p>

      <div className="standing-grid">
        <div className="standing-card new-tall-card">
          <h3>Starter</h3>
          <p>1 upload per day</p>
          <p>Basic scheduling</p>
          <button className="glass-button">Start for Free</button>
        </div>

        <div className="standing-card new-wide-card">
          <h3>Creator+</h3>
          <p>5 uploads per day</p>
          <p>Take the next step towards your dreams</p>
          <button className="glass-button">Upgrade</button>
        </div>

        <div className="standing-card new-tall-card">
          <h3>Enterprise</h3>
          <p>Team accounts and 25 uploads per day</p>
          <p>Custom solutions</p>
          <button className="glass-button">Contact Us</button>
        </div>
      </div>
    </main>
  );
}
