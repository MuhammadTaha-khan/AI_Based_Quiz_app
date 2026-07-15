import React, { useState, useEffect, useCallback } from "react";

const TIMER_SECONDS = 30;

export default function PracticeQuiz({ session, onFinish }) {
  // session = { topic, difficulty, count, questions, ai_generated }
  const questions = session.questions;

  const [idx,      setIdx]      = useState(0);
  const [selected, setSelected] = useState(null);
  const [showFB,   setShowFB]   = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [results,  setResults]  = useState([]);   // accumulates per-question results

  const q = questions[idx];

  // ── Timer ─────────────────────────────────────────────
  const handleTimeout = useCallback(() => {
    if (showFB) return;
    setTimedOut(true);
    setShowFB(true);
    setResults(prev => [...prev, {
      question:       q.question,
      your_answer:    null,
      correct_answer: q.answer,
      is_correct:     false,
      timed_out:      true,
    }]);
  }, [showFB, q]);

  useEffect(() => {
    if (showFB) return;
    setTimeLeft(TIMER_SECONDS);
    setTimedOut(false);
    const t = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 1) { clearInterval(t); handleTimeout(); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [idx]);

  // ── Submit ────────────────────────────────────────────
  const submitAnswer = () => {
    if (!selected) return;
    const correct = selected === q.answer;
    setResults(prev => [...prev, {
      question:       q.question,
      your_answer:    selected,
      correct_answer: q.answer,
      is_correct:     correct,
      timed_out:      false,
    }]);
    setShowFB(true);
  };

  // ── Next / Finish ─────────────────────────────────────
  const goNext = () => {
    const next = idx + 1;
    if (next >= questions.length) {
      // Build final result object and hand it to parent
      const allResults = results;  // already includes this question (set in submitAnswer or handleTimeout)
      const correct    = allResults.filter(r => r.is_correct).length;
      const total      = allResults.length;
      onFinish({
        topic:      session.topic,
        difficulty: session.difficulty,
        correct,
        total,
        score_percentage: Math.round((correct / total) * 100),
        feedback:   allResults,
        ai_generated: session.ai_generated,
      });
    } else {
      setIdx(next);
      setSelected(null);
      setShowFB(false);
    }
  };

  const isCorrect   = selected === q?.answer;
  const progress    = (idx / questions.length) * 100;
  const timerColor  = timeLeft <= 5  ? "var(--error)"   :
                      timeLeft <= 10 ? "var(--warning)"  : "var(--success)";
  const timerClass  = timeLeft <= 5  ? "timer-urgent"   :
                      timeLeft <= 10 ? "timer-warning"   : "timer-ok";

  return (
    <div className="card">
      {/* ── Header row ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>
            {idx + 1} / {questions.length}
          </span>
          <span className={`badge badge-${session.difficulty}`}>{session.difficulty}</span>
          <span style={{
            background: "var(--border)", color: "var(--muted)",
            padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600
          }}>
            🧠 {session.topic}
          </span>
          {session.ai_generated && (
            <span style={{
              background: "rgba(108,99,255,0.15)", color: "var(--accent)",
              padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700
            }}>🤖 AI</span>
          )}
        </div>
        <div className={`timer ${timerClass}`}>⏱ {timeLeft}s</div>
      </div>

      {/* ── Quiz progress bar ── */}
      <div className="progress-container">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* ── Timer bar ── */}
      <div className="progress-container" style={{ marginBottom: 22 }}>
        <div style={{
          height: "100%", borderRadius: 99,
          width: `${(timeLeft / TIMER_SECONDS) * 100}%`,
          background: timerColor,
          transition: "width 1s linear, background 0.4s"
        }} />
      </div>

      {/* ── Question ── */}
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, lineHeight: 1.55 }}>
        {q.question}
      </h2>

      {/* ── Options ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
        {q.options.map((opt, i) => {
          let border = "var(--border)", bg = "transparent", color = "var(--text)";
          if (showFB) {
            if (opt === q.answer) {
              border = "var(--success)"; bg = "rgba(74,222,128,0.1)"; color = "var(--success)";
            } else if (opt === selected && !isCorrect) {
              border = "var(--error)"; bg = "rgba(248,113,113,0.1)"; color = "var(--error)";
            }
          } else if (opt === selected) {
            border = "var(--accent)"; bg = "rgba(108,99,255,0.12)";
          }
          return (
            <button key={i} onClick={() => !showFB && setSelected(opt)} style={{
              background: bg, border: `2px solid ${border}`, borderRadius: 10,
              padding: "13px 16px", color, fontSize: 14, textAlign: "left",
              cursor: showFB ? "default" : "pointer",
              fontFamily: "inherit", transition: "all 0.18s",
            }}>
              <span style={{ marginRight: 10, opacity: 0.5 }}>{String.fromCharCode(65 + i)}.</span>
              {opt}
            </button>
          );
        })}
      </div>

      {/* ── Feedback ── */}
      {showFB && (
        <div className={`alert ${timedOut ? "alert-error" : isCorrect ? "alert-success" : "alert-error"}`}
          style={{ marginBottom: 14 }}>
          {timedOut
            ? `⏰ Time's up! Correct answer: ${q.answer}`
            : isCorrect
              ? "✅ Correct! Well done!"
              : `❌ Wrong. Correct answer: ${q.answer}`
          }
        </div>
      )}

      {/* ── Action button ── */}
      {!showFB ? (
        <button className="btn btn-primary" onClick={submitAnswer}
          disabled={!selected} style={{ width: "100%" }}>
          Submit Answer
        </button>
      ) : (
        <button className="btn btn-primary" onClick={goNext} style={{ width: "100%" }}>
          {idx + 1 >= questions.length ? "See Results 🏁" : "Next Question →"}
        </button>
      )}
    </div>
  );
}