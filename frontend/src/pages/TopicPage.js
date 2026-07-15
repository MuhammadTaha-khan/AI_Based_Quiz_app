import React, { useState, useEffect } from "react";
import axios from "axios";

import API from "../config";

// Map topic names to emojis
const TOPIC_ICONS = {
  "Computer Science":  "💻",
  "Science":           "🔬",
  "Math":              "➗",
  "Machine Learning":  "🤖",
};

function TopicPage({ onSelectTopic }) {
  const [topics,   setTopics]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  // Load topics from backend when page opens
  useEffect(() => {
    axios.get(`${API}/topics`)
      .then(res => {
        setTopics(res.data.topics);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load topics. Is the backend running?");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="card" style={{ textAlign: "center" }}>
        <p style={{ color: "var(--muted)" }}>Loading topics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ textAlign: "center" }}>
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="card">
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>
          Choose a Topic
        </h2>
        <p style={{ color: "var(--muted)", fontSize: 14 }}>
          Pick what you want to be quizzed on
        </p>
      </div>

      {/* Topic Grid */}
      <div className="topic-grid">
        {topics.map(topic => (
          <div
            key={topic}
            className={`topic-card ${selected === topic ? "selected" : ""}`}
            onClick={() => setSelected(topic)}
          >
            <div className="topic-icon">
              {TOPIC_ICONS[topic] || "📚"}
            </div>
            <div className="topic-name">{topic}</div>
          </div>
        ))}
      </div>

      {/* How difficulty works */}
      <div className="alert alert-info" style={{ marginBottom: 20, fontSize: 13 }}>
        🤖 <strong>AI Adaptive Difficulty:</strong> Your first quiz starts at Easy.
        As your score improves, the AI makes questions harder automatically!
      </div>

      {/* Start Button */}
      <button
        className="btn btn-primary"
        onClick={() => onSelectTopic(selected)}
        disabled={!selected}
        style={{ width: "100%", padding: "14px", fontSize: 16 }}
      >
        Start Quiz →
      </button>
    </div>
  );
}

export default TopicPage;
