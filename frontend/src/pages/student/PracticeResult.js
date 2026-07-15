import React from "react";

const sc = p => p >= 70 ? "var(--success)" : p >= 40 ? "var(--warning)" : "var(--error)";

export default function PracticeResult({ result, onPracticeAgain, onHome }) {
  const { topic, difficulty, correct, total, score_percentage, feedback, ai_generated } = result;

  const emoji   = score_percentage >= 80 ? "🏆" : score_percentage >= 50 ? "👍" : "💪";
  const message = score_percentage >= 80 ? "Excellent practice session!"
                : score_percentage >= 50 ? "Good effort! Keep practicing."
                : "Keep going — practice makes perfect!";

  return (
    <div className="card">

      {/* ── Score header ── */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>{emoji}</div>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Practice Complete!</h1>

        {/* Topic + difficulty tags */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8, flexWrap: "wrap" }}>
          <span style={{
            background: "var(--border)", color: "var(--muted)",
            padding: "3px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600
          }}>
            🧠 {topic}
          </span>
          <span className={`badge badge-${difficulty}`}>{difficulty}</span>
          {ai_generated && (
            <span style={{
              background: "rgba(108,99,255,0.15)", color: "var(--accent)",
              padding: "3px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700
            }}>🤖 AI Generated</span>
          )}
        </div>

        {/* Score circle */}
        <div style={{
          width: 110, height: 110, borderRadius: "50%",
          border: `6px solid ${sc(score_percentage)}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", margin: "20px auto",
        }}>
          <span style={{ fontSize: 28, fontWeight: 900, color: sc(score_percentage) }}>
            {score_percentage}%
          </span>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>{correct}/{total}</span>
        </div>

        <div className="alert alert-info" style={{ textAlign: "left" }}>
          💬 {message}
        </div>
      </div>

      {/* ── Mini stat row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--success)" }}>{correct}</div>
          <div className="stat-label">Correct</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--error)" }}>{total - correct}</div>
          <div className="stat-label">Wrong</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{total}</div>
          <div className="stat-label">Total</div>
        </div>
      </div>

      {/* ── Answer review ── */}
      <p className="section-title">Answer Review</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {feedback.map((f, i) => (
          <div key={i} style={{
            background: f.is_correct ? "rgba(74,222,128,0.07)" : "rgba(248,113,113,0.07)",
            border: `1px solid ${f.is_correct ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}`,
            borderRadius: 10, padding: "12px 14px"
          }}>
            <p style={{ fontWeight: 600, fontSize: 13, marginBottom: f.is_correct ? 0 : 6 }}>
              {f.is_correct ? "✅" : "❌"} {f.question}
            </p>
            {!f.is_correct && (
              <p style={{ fontSize: 12, color: "var(--muted)" }}>
                {f.timed_out
                  ? <span style={{ color: "var(--error)" }}>⏰ Timed out</span>
                  : <>Yours: <span style={{ color: "var(--error)" }}>{f.your_answer}</span></>
                }
                {" "}→ Correct: <span style={{ color: "var(--success)" }}>{f.correct_answer}</span>
              </p>
            )}
          </div>
        ))}
      </div>

      {/* ── Buttons ── */}
      <div style={{ display: "flex", gap: 12 }}>
        <button className="btn btn-primary" onClick={onPracticeAgain} style={{ flex: 1 }}>
          🔄 Practice Again
        </button>
        <button className="btn btn-outline" onClick={onHome} style={{ flex: 1 }}>
          Home
        </button>
      </div>
    </div>
  );
}