import React from "react";
import "../css/pricing.css"; // reuse gradient + glass design
import linkedinImg from "../assets/linkedin-img.jpg";
import { Link } from "react-router-dom";

export default function Demo() {
  return (
    <section className="pricing-section">
      <div className="pricing-card">
        <h1>SunsetUploader Demo</h1>
        <p>
          Welcome to the official demo of <strong>SunsetUploader</strong>. This
          page walks you through how easy it is to share your content across
          platforms in just a few clicks.
        </p>

        <div className="glass-section">
          <h2>🎥 Product Demo Video</h2>
          <p>
            Watch the full walkthrough of how to upload content automatically to
            multiple platforms using our AI-powered uploader. The demo video
            will be embedded here once it’s ready.
          </p>

          <div className="demo-video-box">
            <iframe
              src="https://www.youtube.com/embed/dQw4w9WgXcQ"
              title="SunsetUploader Demo Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>

        <div className="glass-section about-creator">
          <h2>👋 Meet the Creator</h2>
          <div className="creator-info">
            <img
              src={linkedinImg}
              alt="Creator portrait"
              className="creator-photo"
            />
            <div className="creator-text">
              <p>
                Hey there — I’m <strong>Adi</strong>, the developer behind{" "}
                <em>SunsetUploader</em>. I built this platform to simplify the
                multi-platform uploading process for creators. I’ve had too many
                late nights uploading the same video again and again across
                sites. <strong>SunsetUploader</strong> fixes that — saving hours
                of time every week.
              </p>
              <p>
                My background combines programming, design, and automation — all
                focused on empowering creators to spend less time managing
                uploads and more time creating.
              </p>
              <p>
                Connect with me on{" "}
                <a
                  href="https://www.linkedin.com/in/adi-patel-3456aa386/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  LinkedIn
                </a>{" "}
                for updates, feedback, or collaborations.
              </p>
            </div>
          </div>
        </div>

        <div className="glass-section">
          <h2>🚀 What's Next</h2>
          <p>
            We’re constantly improving. Expect smarter upload recognition, AI
            caption suggestions, and adaptive workflows soon.
          </p>
          <p>
            Check out our <Link to="/upload">Upload page</Link> to start your
            first test run, or read more about our mission on the{" "}
            <Link to="/about">About page</Link>.
          </p>
        </div>
      </div>
    </section>
  );
}
