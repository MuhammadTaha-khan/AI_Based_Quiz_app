import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";

import API from "../../config";
const hdrs = u => ({ "X-User-Id": String(u.id), "X-User-Role": u.role });
const sc   = p => p>=70?"var(--success)":p>=40?"var(--warning)":"var(--error)";

function formatDate(str) {
  if (!str) return "—";
  return new Date(str.replace(" ","T")).toLocaleDateString("en-US",
    { month:"short", day:"numeric", year:"numeric" });
}

export default function AdminQuizzes({ user }) {
  const [quizzes,  setQuizzes]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState("all"); // all | published | draft

  useEffect(() => {
    axios.get(`${API}/admin/quizzes`, { headers: hdrs(user) })
      .then(r => { setQuizzes(r.data.quizzes); setLoading(false); })
      .catch(() => { setError("Could not load quizzes."); setLoading(false); });
  }, []);

  const filtered = useMemo(() => quizzes.filter(q => {
    const s = search.toLowerCase();
    return (!s || q.title.toLowerCase().includes(s) || q.teacher_name.toLowerCase().includes(s)
              || q.topic_name.toLowerCase().includes(s))
        && (filter==="all" || (filter==="published" ? q.published : !q.published));
  }), [quizzes, search, filter]);

  const totalAttempts  = quizzes.reduce((a,q)=>a+(q.attempt_count||0), 0);
  const totalAssigned  = quizzes.reduce((a,q)=>a+(q.assigned_count||0), 0);
  const published      = quizzes.filter(q=>q.published).length;

  return (
    <div>
      <h2 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>📝 All Quizzes</h2>
      <p style={{ color:"var(--muted)", fontSize:14, marginBottom:24 }}>
        Read-only view of every quiz created by all teachers.
      </p>

      {error && <div className="alert alert-error" style={{marginBottom:16}}>{error}</div>}

      {/* Summary */}
      <div className="stat-grid" style={{marginBottom:20}}>
        <div className="stat-card">
          <div className="stat-value">{quizzes.length}</div>
          <div className="stat-label">Total Quizzes</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{color:"var(--success)"}}>{published}</div>
          <div className="stat-label">Published</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalAttempts}</div>
          <div className="stat-label">Total Attempts</div>
        </div>
      </div>

      <div className="card">
        {/* Search + filter */}
        <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap" }}>
          <div style={{ position:"relative", flex:1, minWidth:200 }}>
            <span style={{ position:"absolute", left:13, top:"50%",
              transform:"translateY(-50%)", color:"var(--muted)", pointerEvents:"none" }}>🔍</span>
            <input className="input" placeholder="Search by title, teacher, or topic..."
              value={search} onChange={e=>setSearch(e.target.value)}
              style={{ paddingLeft:40 }}/>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            {["all","published","draft"].map(f => (
              <button key={f} onClick={()=>setFilter(f)} style={{
                padding:"8px 14px", borderRadius:99, fontSize:12, fontWeight:600,
                border:`1px solid ${filter===f?"#f59e0b":"var(--border)"}`,
                background:filter===f?"rgba(245,158,11,0.15)":"transparent",
                color:filter===f?"#f59e0b":"var(--muted)",
                cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s",
                textTransform:"capitalize"
              }}>{f}</button>
            ))}
          </div>
        </div>

        <p style={{ color:"var(--muted)", fontSize:13, marginBottom:14 }}>
          Showing <strong style={{color:"var(--text)"}}>{filtered.length}</strong> of {quizzes.length} quizzes
        </p>

        {loading && <p style={{color:"var(--muted)",textAlign:"center",padding:"20px 0"}}>Loading...</p>}
        {!loading && filtered.length===0 && (
          <p style={{color:"var(--muted)",textAlign:"center",padding:"20px 0"}}>No quizzes found.</p>
        )}

        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.map(q => (
            <div key={q.id} style={{
              background:"var(--bg)", border:"1px solid var(--border)",
              borderRadius:12, padding:"14px 16px"
            }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:5 }}>
                    <p style={{ fontWeight:700, fontSize:15, margin:0 }}>{q.title}</p>
                    {q.published
                      ? <span style={{ background:"rgba(74,222,128,0.15)",color:"var(--success)",
                          padding:"2px 9px",borderRadius:99,fontSize:11,fontWeight:700 }}>PUBLISHED</span>
                      : <span style={{ background:"rgba(251,191,36,0.15)",color:"var(--warning)",
                          padding:"2px 9px",borderRadius:99,fontSize:11,fontWeight:700 }}>DRAFT</span>}
                    <span className={`badge badge-${q.difficulty}`}>{q.difficulty}</span>
                  </div>
                  <p style={{ color:"var(--muted)", fontSize:13, margin:0 }}>
                    📚 {q.topic_name}
                    &nbsp;·&nbsp; 👩‍🏫 {q.teacher_name}
                    &nbsp;·&nbsp; Created {formatDate(q.created_at)}
                  </p>
                </div>

                {/* Stats */}
                <div style={{ display:"flex", gap:16, flexShrink:0 }}>
                  <div style={{ textAlign:"center" }}>
                    <p style={{ fontWeight:700, fontSize:15, margin:0 }}>{q.assigned_count||0}</p>
                    <p style={{ color:"var(--muted)", fontSize:11 }}>Assigned</p>
                  </div>
                  <div style={{ textAlign:"center" }}>
                    <p style={{ fontWeight:700, fontSize:15, margin:0 }}>{q.attempt_count||0}</p>
                    <p style={{ color:"var(--muted)", fontSize:11 }}>Attempts</p>
                  </div>
                  <div style={{ textAlign:"center" }}>
                    <p style={{ fontWeight:700, fontSize:15, margin:0,
                      color: q.avg_score ? sc(q.avg_score) : "var(--muted)" }}>
                      {q.avg_score || "—"}{q.avg_score ? "%" : ""}
                    </p>
                    <p style={{ color:"var(--muted)", fontSize:11 }}>Avg Score</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}