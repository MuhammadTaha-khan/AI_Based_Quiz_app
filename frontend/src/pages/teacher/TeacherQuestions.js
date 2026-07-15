import React, { useState, useEffect } from "react";
import axios from "axios";

import API from "../../config";
const hdrs = u => ({ "X-User-Id": String(u.id), "X-User-Role": u.role });

// ── Inline question editor ─────────────────────────────────
function QuestionEditor({ q, onSave, onCancel }) {
  const [form, setForm] = useState({ ...q });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{
      background: "var(--bg)", border: "2px solid var(--accent)",
      borderRadius: 12, padding: 16, marginTop: 8
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <textarea className="input" value={form.question} onChange={e => set("question", e.target.value)}
          rows={2} placeholder="Question text" style={{ resize: "vertical" }} />
        {["option_a","option_b","option_c","option_d"].map((k, i) => (
          <div key={k} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ color: "var(--muted)", fontSize: 13, width: 20, flexShrink: 0 }}>
              {String.fromCharCode(65+i)}.
            </span>
            <input className="input" value={form[k]} onChange={e => set(k, e.target.value)}
              placeholder={`Option ${String.fromCharCode(65+i)}`} />
          </div>
        ))}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ color: "var(--muted)", fontSize: 12, marginBottom: 4, display: "block" }}>
              Correct Answer (must match an option exactly)
            </label>
            <select className="input" value={form.answer} onChange={e => set("answer", e.target.value)}
              style={{ cursor: "pointer" }}>
              {["option_a","option_b","option_c","option_d"].map((k, i) => (
                <option key={k} value={form[k]}>{String.fromCharCode(65+i)}. {form[k]}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ color: "var(--muted)", fontSize: 12, marginBottom: 4, display: "block" }}>
              Difficulty
            </label>
            <select className="input" value={form.difficulty} onChange={e => set("difficulty", e.target.value)}
              style={{ cursor: "pointer" }}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-primary" style={{ flex: 1, padding: "10px" }}
            onClick={() => onSave(form)}>Save Changes</button>
          <button className="btn btn-outline" style={{ flex: 1, padding: "10px" }}
            onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────
export default function TeacherQuestions({ user, context }) {
  const [topics,    setTopics]    = useState([]);
  const [selTopic,  setSelTopic]  = useState(context?.topic || null);
  const [questions, setQuestions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [genLoading,setGenLoading]= useState(false);
  const [error,     setError]     = useState(null);
  const [success,   setSuccess]   = useState(null);
  // AI generation settings
  const [genDiff,   setGenDiff]   = useState("medium");
  const [genCount,  setGenCount]  = useState(20);

  // Load topics for the dropdown
  useEffect(() => {
    axios.get(`${API}/teacher/topics`, { headers: hdrs(user) })
      .then(r => setTopics(r.data.topics))
      .catch(() => {});
  }, []);

  // Load questions when topic selected
  useEffect(() => {
    if (!selTopic) return;
    setLoading(true); setError(null);
    axios.get(`${API}/teacher/questions/${selTopic.id}`, { headers: hdrs(user) })
      .then(r => { setQuestions(r.data.questions); setLoading(false); })
      .catch(() => { setError("Could not load questions."); setLoading(false); });
  }, [selTopic]);

  const refresh = () => {
    if (!selTopic) return;
    axios.get(`${API}/teacher/questions/${selTopic.id}`, { headers: hdrs(user) })
      .then(r => setQuestions(r.data.questions));
  };

  // ── AI Generate ──────────────────────────────────────────
  const generateAI = async () => {
    if (!selTopic) return setError("Select a topic first.");
    setError(null); setSuccess(null); setGenLoading(true);
    try {
      const res = await axios.post(`${API}/teacher/generate-questions`,
        { topic_id: selTopic.id, difficulty: genDiff, count: genCount },
        { headers: hdrs(user) }
      );
      setSuccess(`✅ Generated ${res.data.questions.length} questions! Review them below before approving.`);
      refresh();
    } catch (e) {
      setError(e.response?.data?.error || "AI generation failed.");
    } finally { setGenLoading(false); }
  };

  // ── Approve ──────────────────────────────────────────────
  const approveQ = async (qid) => {
    await axios.post(`${API}/teacher/questions/${qid}/approve`, {}, { headers: hdrs(user) });
    setQuestions(qs => qs.map(q => q.id === qid ? { ...q, approved: 1 } : q));
  };

  // ── Save Edit ────────────────────────────────────────────
  const saveEdit = async (form) => {
    try {
      await axios.put(`${API}/teacher/questions/${form.id}`, { ...form, approved: 1 }, { headers: hdrs(user) });
      setEditingId(null);
      refresh();
    } catch (e) { setError("Save failed."); }
  };

  // ── Delete ───────────────────────────────────────────────
  const deleteQ = async (qid) => {
    if (!window.confirm("Delete this question?")) return;
    await axios.delete(`${API}/teacher/questions/${qid}`, { headers: hdrs(user) });
    setQuestions(qs => qs.filter(q => q.id !== qid));
  };

  const pending  = questions.filter(q => !q.approved);
  const approved = questions.filter(q =>  q.approved);

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>❓ Questions</h2>
      <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 24 }}>
        Generate questions with AI, then review, edit and approve them.
      </p>

      {/* Topic Selector */}
      <div className="card" style={{ marginBottom: 20 }}>
        <label style={{ color: "var(--muted)", fontSize: 13, marginBottom: 8, display: "block" }}>
          Select Topic
        </label>
        <select className="input" value={selTopic?.id || ""}
          onChange={e => {
            const t = topics.find(t => t.id === Number(e.target.value));
            setSelTopic(t || null);
          }}
          style={{ cursor: "pointer", maxWidth: 320 }}>
          <option value="">-- choose a topic --</option>
          {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {/* AI Generation Panel */}
      {selTopic && (
        <div className="card" style={{ marginBottom: 20, border: "1px solid rgba(108,99,255,0.4)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 24 }}>🤖</span>
            <div>
              <h3 style={{ fontWeight: 800, margin: 0 }}>AI Question Generator</h3>
              <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
                Uses OpenAI to generate questions for <strong style={{ color: "var(--text)" }}>{selTopic.name}</strong>
              </p>
            </div>
          </div>

          {error   && <div className="alert alert-error"  >{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <label style={{ color: "var(--muted)", fontSize: 12, marginBottom: 4, display: "block" }}>
                Difficulty
              </label>
              <select className="input" value={genDiff} onChange={e => setGenDiff(e.target.value)}
                style={{ cursor: "pointer", width: 130 }}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label style={{ color: "var(--muted)", fontSize: 12, marginBottom: 4, display: "block" }}>
                How many (min 5, max 50)
              </label>
              <input className="input" type="number" min={5} max={50} value={genCount}
                onChange={e => setGenCount(Number(e.target.value))} style={{ width: 100 }} />
            </div>
            <button className="btn btn-primary" onClick={generateAI} disabled={genLoading}
              style={{ padding: "12px 24px", whiteSpace: "nowrap" }}>
              {genLoading ? "⏳ Generating..." : "🤖 Generate with AI"}
            </button>
          </div>

          {genLoading && (
            <div style={{ marginTop: 14, color: "var(--accent)", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⚙️</span>
              Asking AI to generate questions... this may take a few seconds.
            </div>
          )}
        </div>
      )}

      {/* Questions list */}
      {selTopic && !loading && (
        <>
          {/* Pending Review */}
          {pending.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 18 }}>⏳</span>
                <h3 style={{ fontWeight: 700, margin: 0 }}>Needs Review ({pending.length})</h3>
                <span style={{ background: "rgba(251,191,36,0.15)", color: "var(--warning)",
                  padding: "2px 10px", borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
                  AI Generated
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {pending.map(q => (
                  <div key={q.id} style={{
                    background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.3)",
                    borderRadius: 12, padding: 14
                  }}>
                    {editingId === q.id ? (
                      <QuestionEditor q={q} onSave={saveEdit} onCancel={() => setEditingId(null)} />
                    ) : (
                      <>
                        <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>{q.question}</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
                          {["option_a","option_b","option_c","option_d"].map((k, i) => (
                            <div key={k} style={{
                              padding: "6px 10px", borderRadius: 8, fontSize: 13,
                              background: q[k] === q.answer ? "rgba(74,222,128,0.12)" : "var(--bg)",
                              border: q[k] === q.answer ? "1px solid var(--success)" : "1px solid var(--border)",
                              color: q[k] === q.answer ? "var(--success)" : "var(--text)"
                            }}>
                              {String.fromCharCode(65+i)}. {q[k]}
                            </div>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="btn btn-primary" style={{ fontSize: 13, padding: "7px 16px" }}
                            onClick={() => approveQ(q.id)}>✅ Approve</button>
                          <button className="btn btn-secondary" style={{ fontSize: 13, padding: "7px 16px" }}
                            onClick={() => setEditingId(q.id)}>✏️ Edit</button>
                          <button className="btn btn-outline" style={{ fontSize: 13, padding: "7px 16px", color: "var(--error)", borderColor: "var(--error)" }}
                            onClick={() => deleteQ(q.id)}>🗑 Delete</button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approved Questions */}
          {approved.length > 0 && (
            <div className="card">
              <h3 style={{ fontWeight: 700, marginBottom: 16 }}>✅ Approved Questions ({approved.length})</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {approved.map(q => (
                  <div key={q.id} style={{
                    background: "var(--bg)", border: "1px solid var(--border)",
                    borderRadius: 12, padding: 14
                  }}>
                    {editingId === q.id ? (
                      <QuestionEditor q={q} onSave={saveEdit} onCancel={() => setEditingId(null)} />
                    ) : (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{q.question}</p>
                          <p style={{ color: "var(--success)", fontSize: 13 }}>✓ {q.answer}</p>
                          <span className={`badge badge-${q.difficulty}`} style={{ marginTop: 6 }}>{q.difficulty}</span>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                          <button className="btn btn-outline" style={{ fontSize: 12, padding: "6px 12px" }}
                            onClick={() => setEditingId(q.id)}>✏️ Edit</button>
                          <button className="btn btn-outline" style={{ fontSize: 12, padding: "6px 12px", color: "var(--error)", borderColor: "var(--error)" }}
                            onClick={() => deleteQ(q.id)}>🗑</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && questions.length === 0 && (
            <div className="card" style={{ textAlign: "center", padding: "40px" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>💡</div>
              <p style={{ color: "var(--muted)" }}>No questions yet. Use the AI Generator above to create some!</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}