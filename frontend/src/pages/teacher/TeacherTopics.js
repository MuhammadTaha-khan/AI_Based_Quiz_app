import React, { useState, useEffect } from "react";
import axios from "axios";

import API from "../../config";
const hdrs = u => ({ "X-User-Id": String(u.id), "X-User-Role": u.role });

export default function TeacherTopics({ user, onSelectTopic }) {
  const [topics,  setTopics]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [name,    setName]    = useState("");
  const [desc,    setDesc]    = useState("");
  const [error,   setError]   = useState(null);
  const [success, setSuccess] = useState(null);
  const [saving,  setSaving]  = useState(false);

  const load = () => {
    setLoading(true);
    axios.get(`${API}/teacher/topics`, { headers: hdrs(user) })
      .then(r => { setTopics(r.data.topics); setLoading(false); })
      .catch(() => { setError("Could not load topics."); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const createTopic = async () => {
    if (!name.trim()) return setError("Topic name is required.");
    setError(null); setSuccess(null); setSaving(true);
    try {
      const res = await axios.post(`${API}/teacher/topics`,
        { name: name.trim(), description: desc.trim() },
        { headers: hdrs(user) }
      );
      setSuccess(res.data.message);
      setName(""); setDesc("");
      load();
    } catch (e) {
      setError(e.response?.data?.error || "Failed to create topic.");
    } finally { setSaving(false); }
  };

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>📚 Topics</h2>
      <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 24 }}>
        Create topics, then generate AI questions for each one.
      </p>

      {/* Create Topic Card */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Create New Topic</h3>
        {error   && <div className="alert alert-error"  >{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input className="input" placeholder="Topic name (e.g. Biology, History)"
            value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && createTopic()} />
          <textarea className="input" placeholder="Short description (optional)"
            value={desc} onChange={e => setDesc(e.target.value)}
            rows={2} style={{ resize: "vertical" }} />
          <button className="btn btn-primary" onClick={createTopic} disabled={saving}
            style={{ alignSelf: "flex-start", padding: "10px 24px" }}>
            {saving ? "Creating..." : "+ Create Topic"}
          </button>
        </div>
      </div>

      {/* Topics List */}
      <div className="card">
        <h3 style={{ fontWeight: 700, marginBottom: 16 }}>All Topics</h3>
        {loading && <p style={{ color: "var(--muted)" }}>Loading...</p>}
        {!loading && topics.length === 0 && (
          <p style={{ color: "var(--muted)", textAlign: "center", padding: "20px 0" }}>
            No topics yet. Create your first one above!
          </p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {topics.map(t => (
            <div key={t.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "var(--bg)", border: "1px solid var(--border)",
              borderRadius: 12, padding: "14px 16px"
            }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 15 }}>{t.name}</p>
                {t.description && <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>{t.description}</p>}
                <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
                  {t.question_count} approved question{t.question_count !== 1 ? "s" : ""}
                </p>
              </div>
              <button className="btn btn-secondary" style={{ fontSize: 13, padding: "8px 16px" }}
                onClick={() => onSelectTopic(t)}>
                Manage Questions →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}