import CountUp from "react-countup";
import { useInView } from "react-intersection-observer";
import "../css/stats.css";

export default function Stats() {
  const { ref, inView } = useInView({ triggerOnce: true });

  return (
    <section ref={ref} className="stats-wrapper">
      <div className="glass-card">
        
        {/* Left Side - Highlight Stat */}
        <div className="highlight-stat">
          <h2 className="glow-number">
            {inView && <CountUp end={100000} duration={3.5} separator="," decimals={2} />}+
          </h2>
          <p className="subtext">Total Views on Our Platform</p>
          <p className="secondary">Trusted by creators worldwide</p>
        </div>

        {/* Right Side - Stats List */}
        <div className="stat-grid">
          <div className="mini-card">
            <p className="number">{inView && <CountUp end={2500} duration={2.5} separator="," />}+</p>
            <p className="label">Videos Auto Uploaded</p>
          </div>
          <div className="mini-card">
            <p className="number">{inView && <CountUp end={850} duration={2.5} separator="," />}+</p>
            <p className="label">Happy Creators</p>
          </div>
          <div className="mini-card">
            <p className="number">{inView && <CountUp end={99.99} decimals={2} duration={2.5} />}%</p>
            <p className="label">Upload Success Rate</p>
          </div>
          <div className="mini-card">
            <p className="number">{inView && <CountUp end={175000} duration={3.5} separator="," decimals={2} />}+</p>
            <p className="label">Combined Audience Reach</p>
          </div>
        </div>
      </div>
    </section>
  );
}
