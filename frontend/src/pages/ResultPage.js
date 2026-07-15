import React from "react";

function ResultPage({ result, topic, onPlayAgain, onChangeTopic }) {
  if (!result) return null;

  const { correct, total, score_percentage, message, feedback } = result;

  const emoji =
    score_percentage >= 80 ? "🏆" :
    score_percentage >= 50 ? "👍" : "💪";

  const scoreColor =
    score_percentage >= 70 ? "var(--success)" :
    score_percentage >= 40 ? "var(--warning)"  : "var(--error)";

  return (
    <div className="card">
      {/* Score Header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>{emoji}</div>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>Quiz Complete!</h1>
        <p style={{ color: "var(--muted)", marginTop: 4, fontSize: 14 }}>
          Topic: <strong style={{ color: "var(--accent)" }}>{topic}</strong>
        </p>

        {/* Score Circle */}
        <div style={{
          width: 110, height: 110, borderRadius: "50%",
          border: `6px solid ${scoreColor}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", margin: "18px auto",
        }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: scoreColor }}>
            {score_percentage}%
          </span>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            {correct}/{total}
          </span>
        </div>

        {/* AI Message */}
        <div className="alert alert-info" style={{ textAlign: "left" }}>
          🤖 {message}
        </div>
      </div>

      {/* Answer Review */}
      <h3 style={{
        marginBottom: 14, fontSize: 13, fontWeight: 700,
        color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em"
      }}>
        Answer Review
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {feedback.map((item, idx) => (
          <div key={idx} style={{
            background: item.is_correct ? "rgba(74,222,128,0.07)" : "rgba(248,113,113,0.07)",
            border: `1px solid ${item.is_correct ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}`,
            borderRadius: 10, padding: "12px 14px",
          }}>
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: item.is_correct ? 0 : 6 }}>
              {item.is_correct ? "✅" : "❌"} {item.question}
            </p>
            {!item.is_correct && (
              <p style={{ fontSize: 13, color: "var(--muted)" }}>
                Yours: <span style={{ color: "var(--error)" }}>
                  {item.your_answer === "__timeout__" ? "⏰ Timed out" : item.your_answer}
                </span>
                {"  "}→  Correct: <span style={{ color: "var(--success)" }}>{item.correct_answer}</span>
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: 12 }}>
        <button className="btn btn-primary"   onClick={onPlayAgain}     style={{ flex: 1 }}>
          Same Topic ↺
        </button>
        <button className="btn btn-secondary" onClick={onChangeTopic}   style={{ flex: 1 }}>
          Change Topic
        </button>
      </div>
    </div>
  );
}

export default ResultPage;
