// components/Terminal.jsx
import "../css/Terminal.css";

export default function Terminal({ logs }) {
  return (
    <div className="terminal-feed">
      {logs.map((log, i) => (
        <div key={i} className="terminal-line">{log}</div>
      ))}
    </div>
  );
}
