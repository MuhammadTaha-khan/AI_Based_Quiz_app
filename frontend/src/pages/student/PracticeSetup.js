import React, { useState, useEffect } from "react";
import axios from "axios";

import API from "../../config";

const DIFFICULTY_OPTIONS = [
  { value: "easy",   label: "Easy",   icon: "🟢", desc: "Basic facts and definitions" },
  { value: "medium", label: "Medium", icon: "🟡", desc: "Applied knowledge and concepts" },
  { value: "hard",   label: "Hard",   icon: "🔴", desc: "Deep understanding and analysis" },
];

const COUNT_OPTIONS = [5, 10, 15, 20];

const TOPIC_ICONS = {
  "Computer Science": "💻",
  "Science":          "🔬",
  "Math":             "➗",
  "Machine Learning": "🤖",
};

export default function PracticeSetup({ user, onStart, onBack }) {
  const [topics,     setTopics]     = useState([]);
  const [selTopic,   setSelTopic]   = useState("");
  const [selDiff,    setSelDiff]    = useState("medium");
  const [selCount,   setSelCount]   = useState(10);
  const [loading,    setLoading]    = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error,      setError]      = useState(null);

  useEffect(() => {
    axios.get(`${API}/student/practice/topics`, {
      headers: { "X-User-Id": String(user.id), "X-User-Role": user.role }
    })
      .then(r => { setTopics(r.data.topics); setLoading(false); })
      .catch(() => { setError("Could not load topics."); setLoading(false); });
  }, []);

  const handleStart = async () => {
    if (!selTopic) return setError("Please select a topic first.");
    setError(null);
    setGenerating(true);
    try {
      const res = await axios.post(
        `${API}/student/practice/generate`,
        { topic: selTopic, difficulty: selDiff, count: selCount },
        { headers: { "X-User-Id": String(user.id), "X-User-Role": user.role } }
      );
      onStart(res.data);  // pass the full practice session to parent
    } catch (e) {
      setError(e.response?.data?.error || "Could not generate questions. Try again.");
      setGenerating(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 580 }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <button onClick={onBack} style={{
          background: "none", border: "none", color: "var(--muted)",
          cursor: "pointer", fontSize: 13, padding: 0,
          display: "flex", alignItems: "center", gap: 6, marginBottom: 16
        }}>
          ← Back to My Quizzes
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: "linear-gradient(135deg, var(--accent), var(--accent2))",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26
          }}>🧠</div>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Practice Mode</h2>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
              AI generates fresh questions just for you
            </p>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* ── Step 1: Topic ── */}
      <div style={{ marginBottom: 24 }}>
        <p className="section-title">1. Choose Topic</p>
        {loading ? (
          <p style={{ color: "var(--muted)", fontSize: 14 }}>Loading topics...</p>
        ) : (
          <div className="topic-grid">
            {topics.map(t => (
              <div
                key={t.id}
                className={`topic-card ${selTopic === t.name ? "selected" : ""}`}
                onClick={() => { setSelTopic(t.name); setError(null); }}
              >
                <div className="topic-icon">{TOPIC_ICONS[t.name] || "📚"}</div>
                <div className="topic-name">{t.name}</div>
                {t.description && (
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, lineHeight: 1.4 }}>
                    {t.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Step 2: Difficulty ── */}
      <div style={{ marginBottom: 24 }}>
        <p className="section-title">2. Choose Difficulty</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {DIFFICULTY_OPTIONS.map(d => (
            <div
              key={d.value}
              onClick={() => setSelDiff(d.value)}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "12px 16px", borderRadius: 12, cursor: "pointer",
                border: `2px solid ${selDiff === d.value ? "var(--accent)" : "var(--border)"}`,
                background: selDiff === d.value ? "rgba(108,99,255,0.1)" : "var(--bg)",
                transition: "all 0.2s"
              }}
            >
              <span style={{ fontSize: 22 }}>{d.icon}</span>
              <div>
                <p style={{ fontWeight: 700, margin: 0, fontSize: 14 }}>{d.label}</p>
                <p style={{ color: "var(--muted)", margin: 0, fontSize: 12 }}>{d.desc}</p>
              </div>
              {/* Radio dot */}
              <div style={{ marginLeft: "auto", flexShrink: 0 }}>
                <div style={{
                  width: 18, height: 18, borderRadius: "50%",
                  border: `2px solid ${selDiff === d.value ? "var(--accent)" : "var(--border)"}`,
                  background: selDiff === d.value ? "var(--accent)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  {selDiff === d.value && (
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: "white" }} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Step 3: Question Count ── */}
      <div style={{ marginBottom: 28 }}>
        <p className="section-title">3. Number of Questions</p>
        <div style={{ display: "flex", gap: 10 }}>
          {COUNT_OPTIONS.map(n => (
            <button
              key={n}
              onClick={() => setSelCount(n)}
              style={{
                flex: 1, padding: "12px 0", borderRadius: 12, fontWeight: 700,
                fontSize: 16, cursor: "pointer", border: "2px solid",
                fontFamily: "inherit", transition: "all 0.2s",
                borderColor: selCount === n ? "var(--accent)" : "var(--border)",
                background:  selCount === n ? "rgba(108,99,255,0.12)" : "var(--bg)",
                color:       selCount === n ? "var(--accent)" : "var(--muted)",
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 8 }}>
          Each question has a 30-second timer
        </p>
      </div>

      {/* Summary + Start */}
      {selTopic && (
        <div style={{
          background: "rgba(108,99,255,0.08)", border: "1px solid rgba(108,99,255,0.3)",
          borderRadius: 12, padding: "14px 16px", marginBottom: 20
        }}>
          <p style={{ color: "var(--accent)", fontWeight: 700, fontSize: 14, margin: 0 }}>
            🤖 AI will generate {selCount} {selDiff} questions about <strong>{selTopic}</strong>
          </p>
          <p style={{ color: "var(--muted)", fontSize: 12, margin: "4px 0 0" }}>
            Fresh questions every time — no two practice sessions are the same!
          </p>
        </div>
      )}

      <button
        className="btn btn-primary"
        onClick={handleStart}
        disabled={!selTopic || generating}
        style={{ width: "100%", padding: "16px", fontSize: 17, position: "relative" }}
      >
        {generating ? (
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⚙️</span>
            AI is generating your questions...
          </span>
        ) : (
          "🚀 Start Practice"
        )}
      </button>

      {generating && (
        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 13, marginTop: 10 }}>
          This takes about 5–10 seconds. Hang tight!
        </p>
      )}
    </div>
  );
}