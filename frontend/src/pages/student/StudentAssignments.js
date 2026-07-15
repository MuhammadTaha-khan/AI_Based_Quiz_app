import React, { useState, useEffect } from "react";
import axios from "axios";

import API from "../../config";
const hdrs = u => ({ "X-User-Id": u.id, "X-User-Role": u.role });

export default function StudentAssignments({ user, onStartQuiz, onStartPractice }) {
  const [assignments, setAssignments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  useEffect(() => {
    axios.get(`${API}/student/assignments`, { headers: hdrs(user) })
      .then(r => { setAssignments(r.data.assignments); setLoading(false); })
      .catch(() => { setError("Could not load assignments."); setLoading(false); });
  }, []);

  if (loading) return <div className="card" style={{textAlign:"center"}}><p style={{color:"var(--muted)"}}>Loading quizzes...</p></div>;
  if (error)   return <div className="card"><div className="alert alert-error">{error}</div></div>;

  const pending   = assignments.filter(a => a.my_score === null);
  const completed = assignments.filter(a => a.my_score !== null);

  const scoreColor = p => p>=70?"var(--success)":p>=40?"var(--warning)":"var(--error)";

  return (
    <div className="card">
      {/* ── Practice Banner ── */}
      <div onClick={onStartPractice} style={{
        background:"linear-gradient(135deg,rgba(108,99,255,0.15),rgba(255,101,132,0.15))",
        border:"2px solid rgba(108,99,255,0.35)", borderRadius:14,
        padding:"18px 20px", marginBottom:20, cursor:"pointer",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        transition:"all 0.2s",
      }}
        onMouseEnter={e=>e.currentTarget.style.borderColor="var(--accent)"}
        onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(108,99,255,0.35)"}
      >
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{
            width:48, height:48, borderRadius:12, flexShrink:0,
            background:"linear-gradient(135deg,var(--accent),var(--accent2))",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:24
          }}>🧠</div>
          <div>
            <p style={{ fontWeight:800, fontSize:16, margin:0 }}>Start Practice</p>
            <p style={{ color:"var(--muted)", fontSize:13, margin:"3px 0 0" }}>
              AI generates fresh questions · Pick topic, difficulty &amp; count
            </p>
          </div>
        </div>
        <span style={{ fontSize:22, color:"var(--accent)", flexShrink:0 }}>→</span>
      </div>

      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontSize:22, fontWeight:800 }}>My Quizzes</h2>
        <p style={{ color:"var(--muted)", fontSize:14, marginTop:4 }}>
          {pending.length} pending · {completed.length} completed
        </p>
      </div>

      {assignments.length === 0 && (
        <div style={{ textAlign:"center", padding:"32px 0" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📭</div>
          <p style={{ color:"var(--muted)" }}>No quizzes assigned yet. Check back later!</p>
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <>
          <p className="section-title">📋 Pending</p>
          <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:24 }}>
            {pending.map(a => (
              <div key={a.assignment_id} style={{
                background:"var(--bg)", border:"1px solid var(--border)",
                borderRadius:12, padding:"16px", display:"flex",
                alignItems:"center", justifyContent:"space-between", gap:12
              }}>
                <div style={{ flex:1 }}>
                  <p style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>{a.title}</p>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    <span className={`badge badge-${a.difficulty}`}>{a.difficulty}</span>
                    <span style={{ color:"var(--muted)", fontSize:12 }}>📚 {a.topic}</span>
                    <span style={{ color:"var(--muted)", fontSize:12 }}>⏱ {a.time_limit}s/question</span>
                    {a.due_date && <span style={{ color:"var(--warning)", fontSize:12 }}>📅 Due: {a.due_date}</span>}
                  </div>
                  <p style={{ color:"var(--muted)", fontSize:12, marginTop:4 }}>
                    Assigned by: {a.assigned_by_name}
                  </p>
                </div>
                <button className="btn btn-primary" style={{ whiteSpace:"nowrap", padding:"10px 18px", fontSize:14 }}
                  onClick={() => onStartQuiz(a)}>
                  Start →
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <>
          <p className="section-title">✅ Completed</p>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {completed.map(a => (
              <div key={a.assignment_id} style={{
                background:"var(--bg)", border:"1px solid var(--border)",
                borderRadius:12, padding:"14px 16px",
                display:"flex", alignItems:"center", justifyContent:"space-between"
              }}>
                <div>
                  <p style={{ fontWeight:700, fontSize:14 }}>{a.title}</p>
                  <p style={{ color:"var(--muted)", fontSize:12 }}>📚 {a.topic} · {a.assigned_by_name}</p>
                </div>
                <div style={{ textAlign:"right" }}>
                  <span style={{ fontWeight:800, fontSize:18, color:scoreColor(a.my_score) }}>
                    {a.my_score}%
                  </span>
                  <p style={{ color:"var(--muted)", fontSize:11 }}>
                    {a.taken_at ? new Date(a.taken_at).toLocaleDateString() : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}