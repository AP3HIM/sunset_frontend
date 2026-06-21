// src/pages/Home.jsx
import Hero from "../components/Hero";
import ElectronHero from "../components/ElectronHero";
import Features from "../components/Features";
import HowItWorks from "../components/HowItWorks";
import Stats from "../components/Stats";
import Testimonials from "../components/Testimonials";
import Footer from "../components/Footer";

export default function HomePage() {
  const isElectron = !!window.electronEnv?.isElectron;

  return (
    <div className="home-root">
      {isElectron ? <ElectronHero /> : <Hero />}
      {!isElectron && <Features />}
      {!isElectron && <HowItWorks />}
      {!isElectron && <Stats />}
      {!isElectron && <Testimonials />}
      <Footer />
    </div>
  );
}