import React from "react";
import "../../css/pricing.css";

export default function Privacy() {
  return (
    <section className="pricing-section">
      <div className="pricing-card">
        <h1>SunsetUploader Companion: Privacy Policy</h1>
        <p>Last updated: October 13, 2026</p>

        <div className="glass-section">
          <h2>Overview</h2>
          <p>SunsetUploader Companion (“the extension”) is a Chrome extension that works together with the SunsetUploader desktop app. This policy explains what the extension does with data. In short: it does not collect your data.</p>
        </div>

        <div className="glass-section">
          <h2>What the extension does</h2>
          <p>When you start an upload in the SunsetUploader desktop app, the app opens TikTok or Instagram in Chrome. The extension then performs the on-page steps for you, such as clicking buttons, choosing a crop, and posting once your caption has been entered, so the video you chose is published to your own account.</p>
          <p>The extension only acts while the desktop app is running. If the app is not running, the extension does nothing.</p>
        </div>

        <div className="glass-section">
          <h2>Information we collect</h2>
          <p>None. The extension does not collect, store, sell, share, or transmit personal information, browsing history, account content, or any other user data. It contains no analytics, tracking, or advertising.</p>
        </div>

        <div className="glass-section">
          <h2>What the extension reads on the page</h2>
          <p>On tiktok.com and instagram.com, the extension looks at the page to find the buttons it needs to click and reads the text of the caption box to detect when typing has finished. This happens locally in your browser. The text is not saved and is not sent anywhere.</p>
        </div>

        <div className="glass-section">
          <h2>Communication with your own computer</h2>
          <p>The extension sends short status messages (for example, “Post button clicked”) to the SunsetUploader desktop app through a local address on your own computer (127.0.0.1, port 8765). These messages never leave your computer. The extension also uses this local address to check whether the desktop app is running before it does anything.</p>
        </div>

        <div className="glass-section">
          <h2>Storage</h2>
          <p>The extension keeps a temporary list of browser tab IDs it has already handled, so an upload is not started twice in the same tab. This is stored in the browser’s session storage and is cleared when you close the browser.</p>
        </div>

        <div className="glass-section">
          <h2>Remote code</h2>
          <p>The extension does not download or run any remote code. All of its code is included in the package you install from the Chrome Web Store.</p>
        </div>

        <div className="glass-section">
          <h2>Third-party sites</h2>
          <p>The extension interacts with TikTok and Instagram on your behalf, inside your own logged-in browser session. It does not see or store your passwords. TikTok’s and Instagram’s own terms and privacy policies apply to your use of those services. SunsetUploader is not affiliated with or endorsed by TikTok or Instagram.</p>
        </div>

        <div className="glass-section">
          <h2>Website and desktop app</h2>
          <p>If you create an account on sunsetuploader.com, we store the account details you provide (for example, your email address) to run your account and to send you service emails. We use an email delivery provider (Brevo) to send those emails. This website section is separate from the extension, which collects no data.</p>
        </div>

        <div className="glass-section">
          <h2>Changes to this policy</h2>
          <p>If this policy changes, the updated version will be posted on this page with a new date.</p>
        </div>

        <div className="glass-section">
          <h2>Contact</h2>
          <p>Questions about this policy: adi@sunsetuploader.com</p>
        </div>
      </div>
    </section>
  );
}