// src/components/Features.jsx
import { Sparkles, UploadCloud, Globe } from "lucide-react";
import { motion } from "framer-motion";
import "../css/features.css";

export default function Features() {
  const featureList = [
    {
      icon: <UploadCloud size={36} />,
      title: "Auto Upload",
      description:
        "Upload once and publish across TikTok, Instagram, and X in seconds.",
    },
    {
      icon: <Sparkles size={36} />,
      title: "AI-Powered Insights",
      description:
        "Smart captions, hashtag suggestions, and optimal posting times – coming soon.",
    },
    {
      icon: <Globe size={36} />, // Import Globe from lucide-react
      title: "Instant Reach",
      description:
        "Share your dream worldwide instantly, with just one click.",
    },
  ];


  return (
    <section className="features">
      <h2 className="features-title">Powerful Features</h2>
      <div className="features-grid">
        {featureList.map((feature, index) => (
          <motion.div
            className="feature-card"
            key={index}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.2 }}
            viewport={{ once: true }}
          >
            <div className="feature-icon">{feature.icon}</div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
