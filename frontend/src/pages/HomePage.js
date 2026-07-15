import React from "react";

function HomePage({ onStart }) {
  return (
    <div className="card" style={{ textAlign: "center" }}>
      {/* Logo / Icon */}
      <div style={{ fontSize: 64, marginBottom: 12 }}>🧠</div>

      {/* Title */}
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
        AI Quiz App
      </h1>

      <p style={{ color: "var(--muted)", marginBottom: 32, lineHeight: 1.6 }}>
        An intelligent quiz that <strong style={{ color: "var(--accent)" }}>adapts to your level</strong>.
        Answer questions and the AI will automatically make them harder or easier based on your performance.
      </p>

      {/* Features */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 36, textAlign: "left" }}>
        {[
          { icon: "🎯", text: "Adaptive difficulty — gets harder as you improve" },
          { icon: "⚡", text: "Instant feedback after every question" },
          { icon: "📊", text: "Detailed results with correct answers" },
        ].map((f, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12,
            background: "var(--border)", padding: "12px 16px", borderRadius: 10
          }}>
            <span style={{ fontSize: 20 }}>{f.icon}</span>
            <span style={{ color: "var(--text)", fontSize: 14 }}>{f.text}</span>
          </div>
        ))}
      </div>

      {/* Start Button */}
      <button className="btn btn-primary" onClick={onStart} style={{ width: "100%", fontSize: 18, padding: "16px" }}>
        Start Quiz 🚀
      </button>
    </div>
  );
}

export default HomePage;
