import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";

import API from "../../config";
const hdrs = u => ({ "X-User-Id": String(u.id), "X-User-Role": u.role });
const sc   = p  => p >= 70 ? "var(--success)" : p >= 40 ? "var(--warning)" : "var(--error)";

const BATCHES = ["2K22", "2K23", "2K24", "2K25"];
const DEGREES = ["Computer Science", "Software Engineering"];

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}

export default function TeacherStudents({ user }) {
  const [students,      setStudents]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [filterBatch,   setFilterBatch]   = useState("all");
  const [filterDegree,  setFilterDegree]  = useState("all");
  const [filterSection, setFilterSection] = useState("all");
  const [error,         setError]         = useState(null);
  const [success,       setSuccess]       = useState(null);
  const [confirmId,     setConfirmId]     = useState(null);
  const [deleting,      setDeleting]      = useState(false);

  const load = () => {
    setLoading(true);
    axios.get(`${API}/teacher/students`, { headers: hdrs(user) })
      .then(r => { setStudents(r.data.students); setLoading(false); })
      .catch(() => { setError("Could not load students."); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const sections = useMemo(() =>
    ["all", ...new Set(students.map(s => s.section).filter(Boolean).sort())],
    [students]
  );

  const filtered = useMemo(() => students.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || s.username.toLowerCase().includes(q)
      || (s.roll_number || "").toLowerCase().includes(q);
    return matchSearch
      && (filterBatch   === "all" || s.batch   === filterBatch)
      && (filterDegree  === "all" || s.degree  === filterDegree)
      && (filterSection === "all" || s.section === filterSection);
  }), [students, search, filterBatch, filterDegree, filterSection]);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(s => {
      const key = s.section || "No Section";
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const classAvg = students.length > 0
    ? Math.round(students.reduce((a, s) => a + (s.avg_score || 0), 0) / students.length) : 0;

  const hasFilters = filterBatch !== "all" || filterDegree !== "all" || filterSection !== "all" || search;

  const confirmStudent = students.find(s => s.id === confirmId);

  const deleteStudent = async () => {
    if (!confirmId) return;
    setDeleting(true);
    setError(null);
    try {
      await axios.delete(`${API}/teacher/students/${confirmId}`, { headers: hdrs(user) });
      setStudents(prev => prev.filter(s => s.id !== confirmId));
      setSuccess(`Student "${confirmStudent?.username}" deleted.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e.response?.data?.error || "Could not delete student.");
    } finally {
      setConfirmId(null);
      setDeleting(false);
    }
  };

  const selectStyle = {
    background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8,
    padding: "8px 12px", fontSize: 13, color: "var(--text)", fontFamily: "inherit",
    cursor: "pointer", outline: "none", minWidth: 160,
  };

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Students</h2>
      <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 24 }}>
        View and filter all registered students. Students set their own batch, degree, and section during registration.
      </p>

      {error   && <div className="alert alert-error"   style={{ marginBottom: 16 }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

      {/* Summary */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-value">{students.length}</div>
          <div className="stat-label">Total Students</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{students.filter(s => s.quizzes_taken > 0).length}</div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: sc(classAvg) }}>{classAvg}%</div>
          <div className="stat-label">Class Avg</div>
        </div>
      </div>

      <div className="card">
        {/* Search */}
        <div style={{ position: "relative", marginBottom: 14 }}>
          <span style={{
            position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)",
            color: "var(--muted)", pointerEvents: "none"
          }}>🔍</span>
          <input className="input" placeholder="Search by name or roll number..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 40 }} />
        </div>

        {/* Filter dropdowns */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <div>
            <label style={{
              display: "block", color: "var(--muted)", fontSize: 11, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4
            }}>Batch</label>
            <select value={filterBatch} onChange={e => setFilterBatch(e.target.value)} style={selectStyle}>
              <option value="all">All Batches</option>
              {BATCHES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div>
            <label style={{
              display: "block", color: "var(--muted)", fontSize: 11, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4
            }}>Degree</label>
            <select value={filterDegree} onChange={e => setFilterDegree(e.target.value)} style={selectStyle}>
              <option value="all">All Degrees</option>
              {DEGREES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label style={{
              display: "block", color: "var(--muted)", fontSize: 11, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4
            }}>Section</label>
            <select value={filterSection} onChange={e => setFilterSection(e.target.value)} style={selectStyle}>
              {sections.map(s => (
                <option key={s} value={s}>
                  {s === "all" ? "All Sections" : `Section ${s}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Count + clear */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>
            Showing <strong style={{ color: "var(--text)" }}>{filtered.length}</strong> of {students.length} students
          </span>
          {hasFilters && (
            <button
              onClick={() => { setSearch(""); setFilterBatch("all"); setFilterDegree("all"); setFilterSection("all"); }}
              style={{
                background: "none", border: "none", color: "var(--accent)",
                cursor: "pointer", fontSize: 13, fontWeight: 600, padding: 0
              }}>
              Clear filters
            </button>
          )}
        </div>

        {loading && <p style={{ color: "var(--muted)", textAlign: "center", padding: "20px 0" }}>Loading...</p>}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
            <p style={{ color: "var(--muted)" }}>
              {students.length === 0 ? "No students registered yet." : "No students match your filters."}
            </p>
          </div>
        )}

        {/* Grouped by section */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {grouped.map(([groupName, groupStudents]) => (
            <div key={groupName}>
              {/* Section header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                <span style={{
                  fontSize: 11, fontWeight: 800,
                  textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap",
                  background: groupName !== "No Section" ? "rgba(255,193,7,0.15)" : "transparent",
                  color: groupName !== "No Section" ? "#d97706" : "var(--muted)",
                  padding: "2px 10px", borderRadius: 99,
                  border: groupName !== "No Section" ? "1px solid rgba(255,193,7,0.4)" : "none"
                }}>
                  {groupName === "No Section" ? "No Section Assigned" : `Section ${groupName}`} · {groupStudents.length}
                </span>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {groupStudents.map(s => (
                  <div key={s.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    background: "var(--bg)", border: "1px solid var(--border)",
                    borderRadius: 12, padding: "11px 14px"
                  }}>
                    {/* Avatar */}
                    <div style={{
                      width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                      background: "linear-gradient(135deg,var(--accent2),var(--warning))",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 800, fontSize: 15, color: "white"
                    }}>
                      {s.username.charAt(0).toUpperCase()}
                    </div>

                    {/* Name + roll + email */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>{s.username}</p>
                      {s.roll_number && (
                        <p style={{ color: "var(--accent)", fontSize: 12, margin: "1px 0 0", fontWeight: 600 }}>
                          {s.roll_number}
                        </p>
                      )}
                      <p style={{
                        color: "var(--muted)", fontSize: 12, margin: "1px 0 0",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                      }}>{s.email}</p>
                    </div>

                    {/* Tags */}
                    <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0, flexWrap: "wrap" }}>
                      {s.batch && (
                        <span style={{
                          background: "rgba(108,99,255,0.12)", color: "var(--accent)",
                          padding: "2px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700
                        }}>{s.batch}</span>
                      )}
                      {s.degree && (
                        <span style={{
                          background: "rgba(16,185,129,0.12)", color: "var(--success)",
                          padding: "2px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700
                        }}>{s.degree === "Computer Science" ? "CS" : "SE"}</span>
                      )}
                      {s.section && (
                        <span style={{
                          background: "rgba(255,193,7,0.15)", color: "#d97706",
                          padding: "2px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                          border: "1px solid rgba(255,193,7,0.35)"
                        }}>{s.section}</span>
                      )}
                      {s.quizzes_taken > 0 && (
                        <span style={{ color: sc(s.avg_score || 0), fontWeight: 700, fontSize: 13 }}>
                          {s.avg_score || 0}%
                        </span>
                      )}
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={() => setConfirmId(s.id)}
                      title="Delete student"
                      style={{
                        flexShrink: 0,
                        background: "transparent",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        color: "var(--error)",
                        cursor: "pointer",
                        padding: "6px 8px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = "rgba(248,113,113,0.12)";
                        e.currentTarget.style.borderColor = "var(--error)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.borderColor = "var(--border)";
                      }}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {confirmId && confirmStudent && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 999, padding: 16
        }}>
          <div style={{
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: 16, padding: "28px 28px 24px", maxWidth: 380, width: "100%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)"
          }}>
            <div style={{ fontSize: 40, textAlign: "center", marginBottom: 12 }}>🗑️</div>
            <h3 style={{ fontWeight: 800, fontSize: 18, textAlign: "center", margin: "0 0 8px" }}>
              Delete Student?
            </h3>
            <p style={{ color: "var(--muted)", fontSize: 14, textAlign: "center", margin: "0 0 6px" }}>
              This will permanently remove
            </p>
            <p style={{ fontWeight: 700, fontSize: 15, textAlign: "center", color: "var(--text)", margin: "0 0 4px" }}>
              {confirmStudent.username}
            </p>
            {confirmStudent.roll_number && (
              <p style={{ color: "var(--accent)", fontSize: 13, textAlign: "center", margin: "0 0 16px", fontWeight: 600 }}>
                {confirmStudent.roll_number}
              </p>
            )}
            <p style={{ color: "var(--error)", fontSize: 13, textAlign: "center", margin: "0 0 22px" }}>
              All quiz attempts and assignments will also be deleted. This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setConfirmId(null)}
                disabled={deleting}
                style={{
                  flex: 1, padding: "11px", borderRadius: 10, fontWeight: 600,
                  fontSize: 14, fontFamily: "inherit", cursor: "pointer",
                  background: "transparent", border: "1px solid var(--border)", color: "var(--text)"
                }}>
                Cancel
              </button>
              <button
                onClick={deleteStudent}
                disabled={deleting}
                style={{
                  flex: 1, padding: "11px", borderRadius: 10, fontWeight: 700,
                  fontSize: 14, fontFamily: "inherit", cursor: deleting ? "not-allowed" : "pointer",
                  background: "var(--error)", border: "none", color: "white",
                  opacity: deleting ? 0.7 : 1
                }}>
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
