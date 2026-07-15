import React, { useState, useEffect } from "react";
import axios from "axios";

import API from "../config";

// Formats "2024-01-15 10:30:00" → "Jan 15, 2024"
function formatDate(str) {
  if (!str) return "—";
  const d = new Date(str.replace(" ", "T"));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ProfilePage({ user, onStartQuiz }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    axios.get(`${API}/profile/${user.id}`)
      .then(res => { setData(res.data); setLoading(false); })
      .catch(() => { setError("Could not load profile."); setLoading(false); });
  }, [user.id]);

  if (loading) return (
    <div className="card" style={{ textAlign: "center" }}>
      <p style={{ color: "var(--muted)" }}>Loading profile...</p>
    </div>
  );

  if (error) return (
    <div className="card"><div className="alert alert-error">{error}</div></div>
  );

  const { stats, topics, history } = data;
  const hasQuizzes = stats.total_quizzes > 0;

  // Score color helper
  const scoreColor = (pct) =>
    pct >= 70 ? "var(--success)" : pct >= 40 ? "var(--warning)" : "var(--error)";

  return (
    <div className="card">
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
        {/* Avatar circle */}
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: "linear-gradient(135deg, var(--accent), var(--accent2))",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 26, fontWeight: 800, color: "white", flexShrink: 0,
        }}>
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>{user.username}</h2>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>
            📧 {user.email}
          </p>
          <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>
            Joined {formatDate(data.user.joined)}
          </p>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <p className="section-title">Overall Stats</p>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total_quizzes}</div>
          <div className="stat-label">Quizzes Taken</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: scoreColor(stats.avg_score) }}>
            {stats.avg_score}%
          </div>
          <div className="stat-label">Avg Score</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--success)" }}>
            {stats.best_score}%
          </div>
          <div className="stat-label">Best Score</div>
        </div>
      </div>

      {/* Accuracy bar */}
      {hasQuizzes && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>
              Overall Accuracy
            </span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>
              {stats.total_correct} / {stats.total_questions} correct
            </span>
          </div>
          <div className="progress-container" style={{ marginBottom: 0 }}>
            <div className="progress-fill"
              style={{ width: `${stats.avg_score}%` }} />
          </div>
        </div>
      )}

      {/* ── Topic Breakdown ── */}
      {topics.length > 0 && (
        <>
          <p className="section-title">Performance by Topic</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {topics.map(t => (
              <div key={t.topic} style={{
                background: "var(--bg)", border: "1px solid var(--border)",
                borderRadius: 10, padding: "12px 16px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{t.topic}</span>
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>
                    {t.quizzes_taken} quiz{t.quizzes_taken !== 1 ? "zes" : ""}
                    &nbsp;·&nbsp; Best: <span style={{ color: "var(--success)", fontWeight: 700 }}>{t.best_score}%</span>
                  </span>
                </div>
                {/* Mini progress bar */}
                <div style={{ background: "var(--border)", borderRadius: 99, height: 6, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 99,
                    width: `${t.avg_score}%`,
                    background: scoreColor(t.avg_score),
                    transition: "width 0.6s ease",
                  }} />
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                  Avg: {t.avg_score}%
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Recent History ── */}
      {history.length > 0 && (
        <>
          <p className="section-title">Recent Quizzes</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {history.map((h, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: "var(--bg)", border: "1px solid var(--border)",
                borderRadius: 10, padding: "10px 14px",
              }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{h.topic}</span>
                  <span className={`badge badge-${h.difficulty}`} style={{ marginLeft: 8 }}>
                    {h.difficulty}
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontWeight: 700, color: scoreColor(h.score_percentage), fontSize: 15 }}>
                    {h.score_percentage}%
                  </span>
                  <span style={{ fontSize: 12, color: "var(--muted)", display: "block" }}>
                    {h.score}/{h.total} · {formatDate(h.taken_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Empty State ── */}
      {!hasQuizzes && (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
          <p style={{ color: "var(--muted)", marginBottom: 20 }}>
            No quizzes taken yet. Take your first quiz to see your stats here!
          </p>
        </div>
      )}

      {/* Start Quiz Button */}
      <button className="btn btn-primary" onClick={onStartQuiz} style={{ width: "100%" }}>
        Take a Quiz →
      </button>
    </div>
  );
}

export default ProfilePage;
