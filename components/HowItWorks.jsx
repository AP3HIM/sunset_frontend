import '../css/globals.css';

export default function HowItWorks() {
  return (
    <main className="section tall how-it-works">
        <h2 className="section-title">How It Works</h2>
        <div className="standing-grid">
            <div className="standing-card tall-card">
            <h3>1. Upload Once</h3>
            <p>Drag and drop your video or click to upload it from your computer.</p>
            </div>
            <div className="standing-card wide-card">
            <h3>2. Confirm & Connect</h3>
            <p>Choose which platforms to post on and confirm your upload in one simple click.</p>
            </div>
            <div className="standing-card tall-card">
            <h3>3. Post Everywhere</h3>
            <p>One click to schedule across TikTok, Instagram, and X.</p>
            </div>
        </div>
    </main>

  );
}
