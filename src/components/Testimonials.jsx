// src/components/Testimonials.jsx
import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import "../css/testimonials.css";

const testimonials = [
  {
    name: "Paper Tiger Media",
    text: "Over 100K+ views on X alone from countless sports clips uploaded through Sunset Uploader.",
    company: "papertigersmedia.com",
  },
  {
    name: "Adi Patel",
    text: "As a creator, this tool saved me hours every week. I only had to click one button to get my videos uploaded, and I stopped wasting time uploading.",
    company: "Content Creator",
  },
  {
    name: "Paper Tiger Cinema",
    text: "700+ clips uploaded so far with over 100K views. Our entire team uses it daily for marketing.",
    company: "papertigercinema.com",
  },
];

export default function Testimonials() {
  return (
    <section className="testimonials">
      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="testimonials-heading"
      >
        What Creators Are Saying
      </motion.h2>
      <div className="testimonial-grid">
        {testimonials.map((t, idx) => (
          <motion.div
            key={idx}
            className="testimonial-card"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.2, duration: 0.6 }}
          >
            <Quote className="quote-icon" />
            <p className="testimonial-text">"{t.text}"</p>
            <div className="testimonial-meta">
              <span className="testimonial-name">— {t.name}</span>
              {t.company && (
                <span className="testimonial-company">{t.company}</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
