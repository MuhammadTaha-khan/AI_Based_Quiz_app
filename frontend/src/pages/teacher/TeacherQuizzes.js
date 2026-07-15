import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";

import API from "../../config";
const hdrs = u => ({ "X-User-Id": String(u.id), "X-User-Role": u.role });
const scoreColor = p => p >= 70 ? "var(--success)" : p >= 40 ? "var(--warning)" : "var(--error)";

// ── Assign Modal ─────────────────────────────────────────────────────────────
const ASSIGN_BATCHES = ["2K22", "2K23", "2K24", "2K25"];

function AssignModal({ quiz, students, user, onSuccess, onClose }) {
  const [search,        setSearch]        = useState("");
  const [filterBatch,   setFilterBatch]   = useState("all");
  const [filterSection, setFilterSection] = useState("all");
  const [selIds,        setSelIds]        = useState([]);
  const [dueDate,       setDueDate]       = useState("");
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState(null);

  // Dynamic sections from student data
  const sections = useMemo(() =>
    ["all", ...new Set(students.map(s => s.section).filter(Boolean).sort())],
    [students]
  );

  // Filter by search (name or roll number) + batch + section
  const filtered = useMemo(() => students.filter(s => {
    const q = search.toLowerCase();
    return (!q || s.username.toLowerCase().includes(q) || (s.roll_number||"").toLowerCase().includes(q))
        && (filterBatch   === "all" || s.batch   === filterBatch)
        && (filterSection === "all" || s.section === filterSection);
  }), [students, search, filterBatch, filterSection]);

  const allFilteredSelected = filtered.length > 0 && filtered.every(s => selIds.includes(s.id));
  const toggle = id => setSelIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleAllFiltered = () => {
    const ids = new Set(filtered.map(s => s.id));
    if (allFilteredSelected) setSelIds(p => p.filter(id => !ids.has(id)));
    else { const s = new Set(selIds); ids.forEach(id => s.add(id)); setSelIds([...s]); }
  };

  // Group by section
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(s => {
      const key = s.section || "No Section";
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    return Object.entries(map).sort(([a],[b]) => a.localeCompare(b));
  }, [filtered]);

  const handleAssign = async () => {
    if (!selIds.length) return setError("Select at least one student.");
    setError(null); setSaving(true);
    try {
      const res = await axios.post(`${API}/teacher/assign`,
        { quiz_id: quiz.id, student_ids: selIds, due_date: dueDate || null },
        { headers: hdrs(user) }
      );
      onSuccess(res.data.message);
    } catch (e) {
      setError(e.response?.data?.error || "Assignment failed.");
      setSaving(false);
    }
  };

  const pillBtn = (active, color, bg) => ({
    padding:"3px 11px", borderRadius:99, fontSize:12, fontWeight:600,
    border:`1px solid ${active ? color : "var(--border)"}`,
    background: active ? bg : "transparent",
    color: active ? color : "var(--muted)",
    cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s"
  });

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.75)",
      display:"flex", alignItems:"center", justifyContent:"center",
      zIndex:999, padding:16
    }}>
      <div style={{
        background:"var(--card)", border:"1px solid var(--border)",
        borderRadius:16, width:"100%", maxWidth:580, maxHeight:"92vh",
        display:"flex", flexDirection:"column", overflow:"hidden",
        boxShadow:"0 24px 64px rgba(0,0,0,0.5)"
      }}>

        {/* Header */}
        <div style={{ padding:"20px 24px 0", flexShrink:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
            <div>
              <h3 style={{ fontWeight:800, fontSize:18, margin:0 }}>Assign Quiz</h3>
              <p style={{ color:"var(--accent)", fontSize:13, margin:"4px 0 0", fontWeight:600 }}>
                📝 {quiz.title}
              </p>
            </div>
            <button onClick={onClose} style={{
              background:"none", border:"none", color:"var(--muted)",
              cursor:"pointer", fontSize:22, lineHeight:1, padding:4
            }}>✕</button>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {/* Due date */}
          <div style={{ marginBottom:14 }}>
            <label style={{ color:"var(--muted)", fontSize:12, fontWeight:700,
              textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:6 }}>
              Due Date (optional)
            </label>
            <input className="input" type="date" value={dueDate}
              onChange={e => setDueDate(e.target.value)} style={{ maxWidth:220 }} />
          </div>

          {/* Search */}
          <div style={{ position:"relative", marginBottom:10 }}>
            <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)",
              color:"var(--muted)", fontSize:16, pointerEvents:"none" }}>🔍</span>
            <input className="input" placeholder="Search by name or roll number..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft:38 }} />
          </div>

          {/* Batch filter pills */}
          <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", marginBottom:8 }}>
            <span style={{ color:"var(--muted)", fontSize:12, fontWeight:700 }}>Batch:</span>
            <button onClick={() => setFilterBatch("all")}
              style={pillBtn(filterBatch==="all","var(--accent)","rgba(108,99,255,0.15)")}>
              All
            </button>
            {ASSIGN_BATCHES.map(b => (
              <button key={b} onClick={() => setFilterBatch(b)}
                style={pillBtn(filterBatch===b,"var(--accent)","rgba(108,99,255,0.15)")}>
                {b}
              </button>
            ))}
          </div>

          {/* Section filter pills — dynamic */}
          {sections.length > 1 && (
            <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", marginBottom:10 }}>
              <span style={{ color:"var(--muted)", fontSize:12, fontWeight:700 }}>Section:</span>
              {sections.map(s => (
                <button key={s} onClick={() => setFilterSection(s)}
                  style={pillBtn(filterSection===s,"#d97706","rgba(255,193,7,0.2)")}>
                  {s==="all" ? "All" : `${s}`}
                </button>
              ))}
            </div>
          )}

          {/* Select all / count bar */}
          <div style={{
            display:"flex", justifyContent:"space-between", alignItems:"center",
            padding:"8px 12px", background:"var(--bg)", borderRadius:10, marginBottom:6
          }}>
            <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
              <input type="checkbox" checked={allFilteredSelected} onChange={toggleAllFiltered}
                style={{ width:16, height:16, cursor:"pointer" }} />
              <span style={{ fontSize:13, fontWeight:600 }}>
                {allFilteredSelected ? "Deselect visible" : `Select all visible (${filtered.length})`}
              </span>
            </label>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              {selIds.length > 0 && (
                <>
                  <span style={{
                    background:"rgba(108,99,255,0.15)", color:"var(--accent)",
                    padding:"3px 10px", borderRadius:99, fontSize:12, fontWeight:700
                  }}>{selIds.length} selected</span>
                  <button onClick={() => setSelIds([])} style={{
                    background:"none", border:"none", color:"var(--muted)",
                    cursor:"pointer", fontSize:12, textDecoration:"underline",
                    padding:0, fontFamily:"inherit"
                  }}>Clear</button>
                </>
              )}
              <span style={{ color:"var(--muted)", fontSize:12 }}>
                {filtered.length}/{students.length} shown
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable list */}
        <div style={{ flex:1, overflowY:"auto", padding:"0 24px 8px" }}>
          {filtered.length === 0 && (
            <div style={{ textAlign:"center", padding:"32px 0", color:"var(--muted)" }}>
              {students.length === 0 ? "No students registered yet." : "No students match your filters."}
            </div>
          )}

          {grouped.map(([groupName, groupStudents]) => {
            const allGroupSel = groupStudents.every(s => selIds.includes(s.id));
            const toggleGroup = () => {
              const ids = groupStudents.map(s => s.id);
              if (allGroupSel) { setSelIds(p => p.filter(id => !ids.includes(id))); }
              else { const s = new Set(selIds); ids.forEach(id => s.add(id)); setSelIds([...s]); }
            };
            return (
              <div key={groupName} style={{ marginBottom:10 }}>
                {/* Group header */}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                  padding:"6px 4px", marginBottom:4 }}>
                  <span style={{
                    fontSize:11, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.07em",
                    background: groupName !== "No Section" ? "rgba(255,193,7,0.15)" : "transparent",
                    color: groupName !== "No Section" ? "#d97706" : "var(--muted)",
                    padding: groupName !== "No Section" ? "2px 10px" : "2px 0",
                    borderRadius:99,
                    border: groupName !== "No Section" ? "1px solid rgba(255,193,7,0.4)" : "none"
                  }}>
                    {groupName === "No Section" ? "No Section" : `Section ${groupName}`} ({groupStudents.length})
                  </span>
                  <button onClick={toggleGroup} style={{
                    background:"none", border:"none", color:"var(--accent)",
                    cursor:"pointer", fontSize:12, fontWeight:600,
                    padding:0, fontFamily:"inherit"
                  }}>
                    {allGroupSel ? "Deselect group" : "Select group"}
                  </button>
                </div>

                {/* Students */}
                <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                  {groupStudents.map(s => {
                    const isSel = selIds.includes(s.id);
                    return (
                      <label key={s.id} style={{
                        display:"flex", alignItems:"center", gap:12,
                        padding:"10px 12px", borderRadius:10, cursor:"pointer",
                        border:`1px solid ${isSel?"rgba(108,99,255,0.4)":"var(--border)"}`,
                        background:isSel?"rgba(108,99,255,0.08)":"var(--bg)",
                        transition:"all 0.15s"
                      }}>
                        <input type="checkbox" checked={isSel} onChange={() => toggle(s.id)}
                          style={{ width:16, height:16, cursor:"pointer", flexShrink:0 }} />

                        {/* Avatar */}
                        <div style={{
                          width:34, height:34, borderRadius:"50%", flexShrink:0,
                          background:isSel
                            ?"linear-gradient(135deg,var(--accent),var(--accent2))"
                            :"var(--border)",
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontWeight:800, fontSize:13, color:"white"
                        }}>
                          {s.username.charAt(0).toUpperCase()}
                        </div>

                        {/* Info */}
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontWeight:700, fontSize:14, margin:0,
                            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {s.username}
                          </p>
                          <p style={{ color:"var(--accent)", fontSize:11, margin:"1px 0 0", fontWeight:600 }}>
                            {s.roll_number || s.email}
                          </p>
                        </div>

                        {/* Tags */}
                        <div style={{ display:"flex", gap:5, flexShrink:0, alignItems:"center", flexWrap:"wrap" }}>
                          {s.batch && (
                            <span style={{ background:"rgba(108,99,255,0.12)", color:"var(--accent)",
                              padding:"2px 8px", borderRadius:99, fontSize:11, fontWeight:700 }}>
                              {s.batch}
                            </span>
                          )}
                          {s.section && (
                            <span style={{ background:"rgba(255,193,7,0.15)", color:"#d97706",
                              padding:"2px 8px", borderRadius:99, fontSize:11, fontWeight:700,
                              border:"1px solid rgba(255,193,7,0.35)" }}>
                              {s.section}
                            </span>
                          )}
                          {s.quizzes_taken > 0 && (
                            <span style={{ color:scoreColor(s.avg_score), fontSize:12, fontWeight:700 }}>
                              {s.avg_score}%
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding:"16px 24px", borderTop:"1px solid var(--border)",
          display:"flex", gap:10, flexShrink:0
        }}>
          <button className="btn btn-primary" onClick={handleAssign}
            disabled={saving || selIds.length === 0}
            style={{ flex:1, padding:"12px" }}>
            {saving
              ? "Assigning..."
              : `Assign to ${selIds.length} Student${selIds.length!==1?"s":""} ✓`}
          </button>
          <button className="btn btn-outline" onClick={onClose}
            style={{ padding:"12px 20px" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}


// ── Main component ────────────────────────────────────────────────────────────
export default function TeacherQuizzes({ user }) {
  const [quizzes,   setQuizzes]   = useState([]);
  const [topics,    setTopics]    = useState([]);
  const [questions, setQuestions] = useState([]);
  const [students,  setStudents]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [success,   setSuccess]   = useState(null);

  const [title,     setTitle]     = useState("");
  const [topicId,   setTopicId]   = useState("");
  const [diff,      setDiff]      = useState("easy");
  const [timeLimit, setTimeLimit] = useState(20);
  const [selQIds,   setSelQIds]   = useState([]);
  const [assignQuiz,setAssignQuiz]= useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      axios.get(`${API}/teacher/quizzes`,  { headers: hdrs(user) }),
      axios.get(`${API}/teacher/topics`,   { headers: hdrs(user) }),
      axios.get(`${API}/teacher/students`, { headers: hdrs(user) }),
    ]).then(([qz,tp,st]) => {
      setQuizzes(qz.data.quizzes);
      setTopics(tp.data.topics);
      setStudents(st.data.students);
      setLoading(false);
    }).catch(() => { setError("Could not load data."); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!topicId) { setQuestions([]); return; }
    axios.get(`${API}/teacher/questions/${topicId}`, { headers: hdrs(user) })
      .then(r => setQuestions(r.data.questions.filter(q => q.approved)));
  }, [topicId]);

  const toggleQ = id => setSelQIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const createQuiz = async () => {
    if (!title.trim() || !topicId) return setError("Title and topic are required.");
    setError(null); setSuccess(null);
    try {
      const res = await axios.post(`${API}/teacher/quizzes`,
        { title, topic_id: Number(topicId), difficulty: diff, time_limit: timeLimit, question_ids: selQIds },
        { headers: hdrs(user) }
      );
      setSuccess(res.data.message);
      setTitle(""); setTopicId(""); setSelQIds([]);
      load();
    } catch (e) { setError(e.response?.data?.error || "Failed to create quiz."); }
  };

  const publishQuiz = async (qid) => {
    try {
      await axios.post(`${API}/teacher/quizzes/${qid}/publish`, {}, { headers: hdrs(user) });
      setQuizzes(p => p.map(q => q.id===qid ? {...q, published:1} : q));
      setSuccess("Quiz published!");
    } catch { setError("Could not publish."); }
  };

  return (
    <div>
      <h2 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>📝 Quizzes</h2>
      <p style={{ color:"var(--muted)", fontSize:14, marginBottom:24 }}>
        Build quizzes, publish them, then assign to students with powerful filters.
      </p>

      {error   && <div className="alert alert-error"   style={{ marginBottom:16 }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom:16 }}>{success}</div>}

      {/* Create Quiz */}
      <div className="card" style={{ marginBottom:24 }}>
        <h3 style={{ fontWeight:700, marginBottom:16 }}>Create New Quiz</h3>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <input className="input" placeholder="Quiz title" value={title} onChange={e=>setTitle(e.target.value)}/>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            <select className="input" style={{ flex:1, cursor:"pointer" }} value={topicId} onChange={e=>setTopicId(e.target.value)}>
              <option value="">-- select topic --</option>
              {topics.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select className="input" style={{ width:130, cursor:"pointer" }} value={diff} onChange={e=>setDiff(e.target.value)}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <label style={{ color:"var(--muted)", fontSize:13, whiteSpace:"nowrap" }}>Timer (sec)</label>
              <input className="input" type="number" min={10} max={120} value={timeLimit}
                onChange={e=>setTimeLimit(Number(e.target.value))} style={{ width:80 }}/>
            </div>
          </div>
          {questions.length > 0 && (
            <div>
              <p style={{ color:"var(--muted)", fontSize:13, marginBottom:8 }}>
                Select questions ({selQIds.length} selected — leave empty to use all approved):
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:220,
                overflowY:"auto", border:"1px solid var(--border)", borderRadius:10, padding:10 }}>
                {questions.map(q=>(
                  <label key={q.id} style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer",
                    padding:"6px 8px", borderRadius:8,
                    background:selQIds.includes(q.id)?"rgba(108,99,255,0.12)":"transparent" }}>
                    <input type="checkbox" checked={selQIds.includes(q.id)} onChange={()=>toggleQ(q.id)}/>
                    <span style={{ fontSize:13, flex:1 }}>{q.question}</span>
                    <span className={`badge badge-${q.difficulty}`}>{q.difficulty}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <button className="btn btn-primary" onClick={createQuiz}
            style={{ alignSelf:"flex-start", padding:"10px 24px" }}>
            + Create Quiz
          </button>
        </div>
      </div>

      {/* Quiz List */}
      <div className="card">
        <h3 style={{ fontWeight:700, marginBottom:16 }}>My Quizzes ({quizzes.length})</h3>
        {loading && <p style={{ color:"var(--muted)" }}>Loading...</p>}
        {!loading && quizzes.length===0 && (
          <p style={{ color:"var(--muted)", textAlign:"center", padding:"20px 0" }}>No quizzes yet.</p>
        )}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {quizzes.map(q=>(
            <div key={q.id} style={{ background:"var(--bg)", border:"1px solid var(--border)", borderRadius:12, padding:"14px 16px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
                    <p style={{ fontWeight:700, fontSize:15 }}>{q.title}</p>
                    {q.published
                      ? <span style={{ background:"rgba(74,222,128,0.15)",color:"var(--success)",padding:"2px 10px",borderRadius:99,fontSize:11,fontWeight:700 }}>PUBLISHED</span>
                      : <span style={{ background:"rgba(251,191,36,0.15)",color:"var(--warning)",padding:"2px 10px",borderRadius:99,fontSize:11,fontWeight:700 }}>DRAFT</span>}
                  </div>
                  <p style={{ color:"var(--muted)", fontSize:13 }}>
                    📚 {q.topic_name} · <span className={`badge badge-${q.difficulty}`}>{q.difficulty}</span>
                    {" "}· ⏱ {q.time_limit}s · 🎓 {q.assigned_count} assigned · 📊 {q.attempt_count} attempts
                  </p>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  {!q.published && (
                    <button className="btn btn-primary" style={{ fontSize:13, padding:"7px 14px" }}
                      onClick={()=>publishQuiz(q.id)}>🚀 Publish</button>
                  )}
                  {q.published && (
                    <button className="btn btn-secondary" style={{ fontSize:13, padding:"7px 14px" }}
                      onClick={()=>{ setAssignQuiz(q); setError(null); setSuccess(null); }}>
                      👥 Assign Students
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Assign Modal */}
      {assignQuiz && (
        <AssignModal
          quiz={assignQuiz}
          students={students}
          user={user}
          onSuccess={msg=>{ setSuccess(msg); setAssignQuiz(null); load(); }}
          onClose={()=>setAssignQuiz(null)}
        />
      )}
    </div>
  );
}