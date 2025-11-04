// src/pages/Home.jsx
import { useEffect } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

import Hero from "../components/Hero";
import Features from "../components/Features";
import HowItWorks from "../components/HowItWorks";
// import Plans from "../components/Plans";
import Stats from "../components/Stats";
import Testimonials from "../components/Testimonials";
import Footer from "../components/Footer";

gsap.registerPlugin(ScrollTrigger);

export default function HomePage() {
  useEffect(() => {
    const sections = [
      {
        selector: ".hero",
        gradient: "radial-gradient(ellipse at top left, #FFD6A5, #FFB385, #FF9671)",
       // gradient:
  //  "radial-gradient(ellipse at top left, #E59F58 0%, #a27c65ff 40%, #FF6F61 75%, #D65076 100%)",
      },
      {
        selector: ".features",
       // gradient: "radial-gradient(ellipse at center, #FF9671, #D65076, #822659)",
        gradient:
    "radial-gradient(ellipse at center, #FF6F61 0%, #E15A84 40%, #D65076 70%, #822659 100%)",
      },
      {
        selector: ".how-it-works",
        gradient: "linear-gradient(135deg, #D65076, #822659, #5F0A87)",
      },
      /*
      {
        selector: ".plans",
        gradient: "linear-gradient(to bottom, #5F0A87 0%, #1B1F3B 50%, #0B1E3D 100%)",
      },
      */
      {
        selector: ".stats",
        gradient: "radial-gradient(ellipse at center, #0f2027, #203a43, #2c5364)",
      },
      {
        selector: ".testimonials",
        gradient: "radial-gradient(ellipse at bottom, #1B1F3B, #0B1E3D, #000814)",
      },
      /*
      {
        selector: ".footer",
        gradient: "linear-gradient(to bottom, #0B1E3D, #000814)",
      },
      */
    ];

    let currentTween = null;

    sections.forEach((section) => {
      ScrollTrigger.create({
        trigger: section.selector,
        start: "top center",
        end: "bottom center",
        onEnter: () => {
          if (currentTween) currentTween.kill();
          currentTween = gsap.to(".sky", {
            background: section.gradient,
            duration: 0.8,
            ease: "power1.out",
          });
        },
        onEnterBack: () => {
          if (currentTween) currentTween.kill();
          currentTween = gsap.to(".sky", {
            background: section.gradient,
            duration: 0.8,
            ease: "power1.out",
          });
        },
      });
    });

    return () => {
      ScrollTrigger.getAll().forEach((st) => st.kill());
      if (currentTween) currentTween.kill();
    };
  }, []);

  return (
    <div className="sky">
      <section className="hero">
        <Hero />
      </section>

      <section className="features"><Features /></section>
      <section className="how-it-works"><HowItWorks /></section>
      {/* <section className="plans"><Plans /></section> */}
      <section className="stats"><Stats /></section>
      <section className="testimonials"><Testimonials /></section>
      <section className="footer-section"><Footer /></section>
    </div>
  );
}
