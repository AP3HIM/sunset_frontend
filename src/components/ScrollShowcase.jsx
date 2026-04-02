import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "../css/hero.css";

gsap.registerPlugin(ScrollTrigger);

export default function ScrollShowcase() {

  const container = useRef();

  useEffect(() => {

    gsap.to(".demo-image", {
      y: -200,
      scrollTrigger: {
        trigger: container.current,
        start: "top center",
        end: "bottom center",
        scrub: true
      }
    });

  }, []);

  return (
    <section className="scroll-showcase" ref={container}>

      <h2>Upload Once. Everywhere.</h2>

      <img
        src="/demo/frame1.png"
        className="demo-image"
      />

    </section>
  );
}