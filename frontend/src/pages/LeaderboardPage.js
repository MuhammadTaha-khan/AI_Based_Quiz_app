import React, { useState, useEffect } from "react";
import axios from "axios";

import API from "../config";

// Medal or rank number
function RankIcon({ rank }) {
  if (rank === 1) return <span className="rank-1">🥇</span>;
  if (rank === 2) return <span className="rank-2">🥈</span>;
  if (rank === 3) return <span className="rank-3">🥉</span>;
  return <span style={{ color: "var(--muted)", fontWeight: 700 }}>#{rank}</span>;
}

// Score color
function scoreColor(pct) {
  if (pct >= 70) return "var(--success)";
  if (pct >= 40) return "var(--warning)";
  return "var(--error)";
}

function LeaderboardPage({ currentUser }) {
  const [data,        setData]        = useState(null);
  const [topics,      setTopics]      = useState([]);
  const [activeTopic, setActiveTopic] = useState(""); // "" = All Topics
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  // Load leaderboard whenever the topic filter changes
  useEffect(() => {
    setLoading(true);
    axios.get(`${API}/leaderboard`, { params: { topic: activeTopic } })
      .then(res => {
        setData(res.data);
        setTopics(res.data.topics);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load leaderboard.");
        setLoading(false);
      });
  }, [activeTopic]);

  return (
    <div className="card">
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🏆</div>
        <h2 style={{ fontSize: 24, fontWeight: 800 }}>Leaderboard</h2>
        <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 4 }}>
          Top 10 players ranked by average score
        </p>
      </div>

      {/* Topic Filter Pills */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
        {/* "All Topics" pill */}
        <button
          onClick={() => setActiveTopic("")}
          style={{
            padding: "6px 16px", borderRadius: 99, fontSize: 13, fontWeight: 600,
            border: activeTopic === "" ? "2px solid var(--accent)" : "2px solid var(--border)",
            background: activeTopic === "" ? "rgba(108,99,255,0.12)" : "transparent",
            color: activeTopic === "" ? "var(--accent)" : "var(--muted)",
            cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
          }}
        >
          🌐 All Topics
        </button>

        {topics.map(t => (
          <button
            key={t}
            onClick={() => setActiveTopic(t)}
            style={{
              padding: "6px 16px", borderRadius: 99, fontSize: 13, fontWeight: 600,
              border: activeTopic === t ? "2px solid var(--accent)" : "2px solid var(--border)",
              background: activeTopic === t ? "rgba(108,99,255,0.12)" : "transparent",
              color: activeTopic === t ? "var(--accent)" : "var(--muted)",
              cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Loading / Error */}
      {loading && <p style={{ textAlign: "center", color: "var(--muted)" }}>Loading...</p>}
      {error   && <div className="alert alert-error">{error}</div>}

      {/* Table */}
      {!loading && data && (
        data.leaderboard.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>📭</div>
            <p style={{ color: "var(--muted)" }}>
              No scores yet for {activeTopic || "any topic"}.
              {activeTopic ? " Be the first!" : " Take a quiz to appear here!"}
            </p>
          </div>
        ) : (
          <table className="lb-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Quizzes</th>
                <th>Avg Score</th>
                <th>Best</th>
              </tr>
            </thead>
            <tbody>
              {data.leaderboard.map((row, i) => {
                const isMe = currentUser && row.username === currentUser.username;
                return (
                  <tr key={i} className={isMe ? "current-user" : ""}>
                    <td><RankIcon rank={i + 1} /></td>
                    <td>
                      <span style={{ fontWeight: isMe ? 800 : 600 }}>
                        {row.username}
                        {isMe && (
                          <span style={{
                            marginLeft: 8, fontSize: 11, background: "rgba(108,99,255,0.2)",
                            color: "var(--accent)", padding: "2px 8px", borderRadius: 99, fontWeight: 700
                          }}>
                            You
                          </span>
                        )}
                      </span>
                    </td>
                    <td style={{ color: "var(--muted)" }}>{row.quizzes}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: scoreColor(row.avg_score) }}>
                        {row.avg_score}%
                      </span>
                    </td>
                    <td style={{ color: "var(--success)", fontWeight: 600 }}>
                      {row.best_score}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )
      )}

      {/* Your rank note */}
      {currentUser && data && data.leaderboard.length > 0 && (
        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 13, marginTop: 16 }}>
          Keep taking quizzes to improve your rank! 🚀
        </p>
      )}
    </div>
  );
}

export default LeaderboardPage;
