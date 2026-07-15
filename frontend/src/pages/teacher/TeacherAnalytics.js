import React, { useState, useEffect } from "react";
import axios from "axios";

import API from "../../config";
const hdrs = u => ({ "X-User-Id": String(u.id), "X-User-Role": u.role });
const sc = p => p >= 70 ? "var(--success)" : p >= 40 ? "var(--warning)" : "var(--error)";

// Mini horizontal bar chart
function ScoreBar({ value, max = 100 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, background: "var(--border)", borderRadius: 99, height: 8, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 99,
          width: `${(value / max) * 100}%`,
          background: `linear-gradient(90deg, var(--accent), var(--accent2))`,
          transition: "width 0.6s ease"
        }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, width: 40, textAlign: "right", color: sc(value) }}>
        {value}%
      </span>
    </div>
  );
}

export default function TeacherAnalytics({ user }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    axios.get(`${API}/teacher/analytics`, { headers: hdrs(user) })
      .then(r => { setData(r.data); setLoading(false); })
      .catch(() => { setError("Could not load analytics."); setLoading(false); });
  }, []);

  if (loading) return <div className="card" style={{ textAlign: "center" }}><p style={{ color: "var(--muted)" }}>Loading analytics...</p></div>;
  if (error)   return <div className="card"><div className="alert alert-error">{error}</div></div>;
  if (!data)   return null;

  const { overview, quiz_stats, student_stats } = data;

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>📊 Class Analytics</h2>
      <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 24 }}>
        Overview of how your students are performing across all quizzes.
      </p>

      {/* Overview Stats */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-value">{overview.total_students || 0}</div>
          <div className="stat-label">Students</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{overview.total_quizzes || 0}</div>
          <div className="stat-label">Quizzes</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{overview.total_attempts || 0}</div>
          <div className="stat-label">Attempts</div>
        </div>
      </div>

      {/* Class Average */}
      {overview.class_avg > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 8 }}>Class Average Score</p>
          <ScoreBar value={overview.class_avg} />
        </div>
      )}

      {/* Per-Quiz Performance */}
      {quiz_stats.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 16 }}>📝 Quiz Performance</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {quiz_stats.map(q => (
              <div key={q.quiz_id} style={{
                background: "var(--bg)", border: "1px solid var(--border)",
                borderRadius: 12, padding: "14px 16px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                  <p style={{ fontWeight: 700, fontSize: 14 }}>{q.title}</p>
                  <div style={{ display: "flex", gap: 16, fontSize: 13, color: "var(--muted)" }}>
                    <span>👥 {q.students_attempted}/{q.students_assigned} attempted</span>
                    <span style={{ color: "var(--success)" }}>↑ {q.highest_score || 0}%</span>
                    <span style={{ color: "var(--error)" }}>↓ {q.lowest_score || 0}%</span>
                  </div>
                </div>
                <div style={{ marginBottom: 4 }}>
                  <p style={{ color: "var(--muted)", fontSize: 12, marginBottom: 4 }}>Average</p>
                  <ScoreBar value={q.avg_score || 0} />
                </div>

                {/* Completion bar */}
                {q.students_assigned > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <p style={{ color: "var(--muted)", fontSize: 12, marginBottom: 4 }}>
                      Completion rate: {Math.round((q.students_attempted / q.students_assigned) * 100)}%
                    </p>
                    <div style={{ background: "var(--border)", borderRadius: 99, height: 6, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 99,
                        width: `${(q.students_attempted / q.students_assigned) * 100}%`,
                        background: "var(--accent)"
                      }} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-Student Ranking */}
      {student_stats.length > 0 && (
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 16 }}>🏅 Student Rankings</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {student_stats.map((s, i) => (
              <div key={s.username} style={{
                display: "flex", alignItems: "center", gap: 14,
                background: "var(--bg)", border: "1px solid var(--border)",
                borderRadius: 12, padding: "12px 16px"
              }}>
                {/* Rank badge */}
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                  background: i===0?"linear-gradient(135deg,#ffd700,#ffaa00)":
                               i===1?"linear-gradient(135deg,#c0c0c0,#aaaaaa)":
                               i===2?"linear-gradient(135deg,#cd7f32,#a0522d)":"var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: 13, color: i < 3 ? "white" : "var(--muted)"
                }}>
                  {i < 3 ? ["🥇","🥈","🥉"][i] : i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{s.username}</p>
                  <p style={{ color: "var(--muted)", fontSize: 12 }}>{s.email}</p>
                </div>
                <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontWeight: 700 }}>{s.attempts}</p>
                    <p style={{ color: "var(--muted)", fontSize: 11 }}>Attempts</p>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontWeight: 700, color: sc(s.avg_score || 0) }}>{s.avg_score || 0}%</p>
                    <p style={{ color: "var(--muted)", fontSize: 11 }}>Avg</p>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontWeight: 700, color: "var(--success)" }}>{s.best_score || 0}%</p>
                    <p style={{ color: "var(--muted)", fontSize: 11 }}>Best</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {quiz_stats.length === 0 && student_stats.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📈</div>
          <p style={{ color: "var(--muted)" }}>
            No data yet. Create quizzes, assign them to students, and analytics will appear here.
          </p>
        </div>
      )}
    </div>
  );
}