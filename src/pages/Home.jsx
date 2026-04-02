// src/pages/Home.jsx
import Hero from "../components/Hero";
import Features from "../components/Features";
import HowItWorks from "../components/HowItWorks";
import Stats from "../components/Stats";
import Testimonials from "../components/Testimonials";
import Footer from "../components/Footer";

export default function HomePage() {
  return (
    <div className="home-root">
      <Hero />
      <Features />
      <HowItWorks />
      <Stats />
      <Testimonials />
      <Footer />
    </div>
  );
}