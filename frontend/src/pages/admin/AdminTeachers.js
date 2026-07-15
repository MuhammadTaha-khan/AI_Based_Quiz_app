import React, { useState, useEffect } from "react";
import axios from "axios";

import API from "../../config";
const hdrs = u => ({ "X-User-Id": String(u.id), "X-User-Role": u.role });

function formatDate(str) {
  if (!str) return "—";
  return new Date(str.replace(" ", "T")).toLocaleDateString("en-US",
    { month: "short", day: "numeric", year: "numeric" });
}

function ConfirmModal({ message, onConfirm, onCancel, danger = false }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 20
    }}>
      <div style={{
        background: "var(--card)", border: "1px solid var(--border)",
        borderRadius: 16, padding: 28, maxWidth: 400, width: "100%",
        boxShadow: "0 24px 64px rgba(0,0,0,0.5)"
      }}>
        <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 20, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-primary" onClick={onConfirm}
            style={{ flex: 1, background: danger ? "var(--error)" : "var(--accent)" }}>
            Confirm
          </button>
          <button className="btn btn-outline" onClick={onCancel} style={{ flex: 1 }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function EyeIcon({ visible }) {
  return visible ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

export default function AdminTeachers({ user }) {
  const [teachers, setTeachers] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [confirm,  setConfirm]  = useState(null);
  const [error,    setError]    = useState(null);
  const [success,  setSuccess]  = useState(null);

  // Create form
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [creating, setCreating] = useState(false);
  const [formErr,  setFormErr]  = useState(null);

  const load = () => {
    setLoading(true);
    axios.get(`${API}/admin/teachers`, { headers: hdrs(user) })
      .then(r => { setTeachers(r.data.teachers); setLoading(false); })
      .catch(() => { setError("Could not load teachers."); setLoading(false); });
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const flash = msg => { setSuccess(msg); setTimeout(() => setSuccess(null), 3500); };

  const openForm = () => {
    setName(""); setEmail(""); setPassword("");
    setFormErr(null); setShowPw(false);
    setShowForm(true);
  };

  const handleCreate = async () => {
    setFormErr(null);
    if (!name.trim() || !email.trim() || !password.trim())
      return setFormErr("All fields are required.");
    if (password.length < 6)
      return setFormErr("Password must be at least 6 characters.");
    if (!/[A-Z]/.test(password))
      return setFormErr("Password must contain at least one uppercase letter (A-Z).");
    if (!/[a-z]/.test(password))
      return setFormErr("Password must contain at least one lowercase letter (a-z).");

    setCreating(true);
    try {
      const res = await axios.post(
        `${API}/admin/teachers`,
        { username: name.trim(), email: email.trim(), password },
        { headers: hdrs(user) }
      );
      setTeachers(prev => [{ ...res.data.teacher, quizzes_created: 0, topics_created: 0 }, ...prev]);
      flash(res.data.message);
      setShowForm(false);
    } catch (e) {
      setFormErr(e.response?.data?.error || "Could not create teacher.");
    } finally {
      setCreating(false);
    }
  };

  const handleSuspend = async uid => {
    setError(null);
    try {
      const res = await axios.post(`${API}/admin/users/${uid}/suspend`, {}, { headers: hdrs(user) });
      setTeachers(prev => prev.map(t => t.id === uid ? { ...t, suspended: res.data.suspended } : t));
      flash(res.data.message);
    } catch (e) { setError(e.response?.data?.error || "Action failed."); }
    setConfirm(null);
  };

  const handleDelete = async uid => {
    setError(null);
    try {
      const res = await axios.delete(`${API}/admin/users/${uid}`, { headers: hdrs(user) });
      setTeachers(prev => prev.filter(t => t.id !== uid));
      flash(res.data.message);
    } catch (e) { setError(e.response?.data?.error || "Delete failed."); }
    setConfirm(null);
  };

  const active    = teachers.filter(t => !t.suspended).length;
  const suspended = teachers.filter(t =>  t.suspended).length;

  return (
    <div>
      {/* Page header */}
      <div style={{
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        marginBottom: 20, flexWrap: "wrap", gap: 12
      }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>👨‍🏫 Teacher Management</h2>
          <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 4, marginBottom: 0 }}>
            Create and manage teacher accounts. Teachers cannot self-register.
          </p>
        </div>
        <button onClick={openForm} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 18px", background: "var(--accent)",
          border: "none", borderRadius: 10, color: "white",
          fontWeight: 700, fontSize: 14, cursor: "pointer",
          fontFamily: "inherit", transition: "opacity 0.2s",
          flexShrink: 0
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          <span style={{ fontSize: 18 }}>+</span> Create Teacher
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "Total Teachers", value: teachers.length, color: "var(--accent)" },
          { label: "Active",         value: active,           color: "var(--success)" },
          { label: "Suspended",      value: suspended,        color: "var(--error)" },
        ].map(s => (
          <div key={s.label} style={{
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: 12, padding: "14px 20px", flex: 1, minWidth: 110
          }}>
            <p style={{ color: "var(--muted)", fontSize: 12, margin: "0 0 4px", fontWeight: 600 }}>{s.label}</p>
            <p style={{ color: s.color, fontSize: 26, fontWeight: 800, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {error   && <div className="alert alert-error"   style={{ marginBottom: 16 }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

      {/* Teachers list */}
      <div className="card">
        {loading && (
          <p style={{ color: "var(--muted)", textAlign: "center", padding: "30px 0" }}>Loading...</p>
        )}

        {!loading && teachers.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <p style={{ fontSize: 52, marginBottom: 12 }}>👨‍🏫</p>
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No teacher accounts yet</p>
            <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 24 }}>
              Create the first teacher account to get started.
            </p>
            <button onClick={openForm} style={{
              padding: "11px 22px", background: "var(--accent)",
              border: "none", borderRadius: 10, color: "white",
              fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit"
            }}>
              + Create First Teacher
            </button>
          </div>
        )}

        {!loading && teachers.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {teachers.map(t => (
              <div key={t.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                background: "var(--bg)",
                border: `1px solid ${t.suspended ? "rgba(248,113,113,0.4)" : "var(--border)"}`,
                borderRadius: 12, padding: "13px 14px",
                opacity: t.suspended ? 0.75 : 1,
                transition: "opacity 0.2s"
              }}>
                {/* Avatar */}
                <div style={{
                  width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                  background: t.suspended
                    ? "var(--border)"
                    : "linear-gradient(135deg, var(--accent), #a78bfa)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: 18, color: "white"
                }}>
                  {t.username.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{t.username}</span>
                    <span style={{
                      background: "rgba(108,99,255,0.15)", color: "var(--accent)",
                      padding: "2px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700
                    }}>TEACHER</span>
                    {t.suspended && (
                      <span style={{
                        background: "rgba(248,113,113,0.15)", color: "var(--error)",
                        padding: "2px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700
                      }}>SUSPENDED</span>
                    )}
                  </div>
                  <p style={{ color: "var(--muted)", fontSize: 12, margin: "4px 0 0" }}>
                    {t.email} · Created {formatDate(t.created_at)}
                    {t.quizzes_created > 0 && (
                      <span style={{ color: "var(--accent)" }}> · {t.quizzes_created} quiz{t.quizzes_created !== 1 ? "zes" : ""}</span>
                    )}
                    {t.topics_created > 0 && (
                      <span style={{ color: "var(--muted)" }}> · {t.topics_created} topic{t.topics_created !== 1 ? "s" : ""}</span>
                    )}
                  </p>
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => setConfirm({
                      type: t.suspended ? "unsuspend" : "suspend",
                      uid: t.id, username: t.username
                    })}
                    style={{
                      padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                      cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                      border: t.suspended ? "1px solid var(--success)" : "1px solid var(--warning)",
                      background: "transparent",
                      color: t.suspended ? "var(--success)" : "var(--warning)"
                    }}>
                    {t.suspended ? "✅ Unsuspend" : "⏸ Suspend"}
                  </button>
                  <button
                    onClick={() => setConfirm({ type: "delete", uid: t.id, username: t.username })}
                    style={{
                      padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                      cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                      border: "1px solid var(--error)", background: "transparent", color: "var(--error)"
                    }}>
                    🗑 Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create Teacher Modal ── */}
      {showForm && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 999, padding: 20
        }}>
          <div style={{
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: 20, padding: 32, maxWidth: 460, width: "100%",
            boxShadow: "0 32px 80px rgba(0,0,0,0.6)"
          }}>
            {/* Modal header */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>👨‍🏫</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Create Teacher Account</h2>
              <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>
                Share these credentials with the teacher privately after creation.
              </p>
            </div>

            {/* Security notice */}
            <div style={{
              background: "rgba(108,99,255,0.1)", border: "1px solid rgba(108,99,255,0.3)",
              borderRadius: 10, padding: "10px 14px", marginBottom: 20,
              display: "flex", alignItems: "center", gap: 10
            }}>
              <span style={{ fontSize: 16 }}>🔒</span>
              <p style={{ color: "var(--accent)", fontSize: 13, margin: 0, fontWeight: 600 }}>
                Account is pre-verified — teacher can log in immediately.
              </p>
            </div>

            {formErr && <div className="alert alert-error" style={{ marginBottom: 16 }}>{formErr}</div>}

            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 22 }}>
              <div>
                <label style={{
                  fontSize: 13, fontWeight: 600, color: "var(--muted)",
                  display: "block", marginBottom: 6
                }}>Full Name / Username</label>
                <input className="input" type="text" placeholder="e.g. Mr. Johnson"
                  value={name} onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCreate()} />
              </div>

              <div>
                <label style={{
                  fontSize: 13, fontWeight: 600, color: "var(--muted)",
                  display: "block", marginBottom: 6
                }}>Email Address</label>
                <input className="input" type="email" placeholder="teacher@school.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCreate()} />
              </div>

              <div>
                <label style={{
                  fontSize: 13, fontWeight: 600, color: "var(--muted)",
                  display: "block", marginBottom: 6
                }}>Password</label>
                <div style={{ position: "relative" }}>
                  <input className="input" type={showPw ? "text" : "password"}
                    placeholder="Min 6 chars, upper & lowercase required"
                    value={password} onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleCreate()}
                    style={{ paddingRight: 46 }} />
                  <button type="button" onClick={() => setShowPw(s => !s)} style={{
                    position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--muted)", display: "flex", alignItems: "center", padding: 0
                  }}>
                    <EyeIcon visible={showPw} />
                  </button>
                </div>
                <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                  Must include at least one uppercase and one lowercase letter.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleCreate} disabled={creating} style={{
                flex: 1, padding: "13px", fontSize: 15, fontWeight: 700,
                background: creating ? "var(--border)" : "var(--accent)",
                border: "none", borderRadius: 10, color: "white",
                cursor: creating ? "not-allowed" : "pointer",
                fontFamily: "inherit", transition: "all 0.2s"
              }}>
                {creating ? "Creating..." : "Create Teacher →"}
              </button>
              <button onClick={() => setShowForm(false)} disabled={creating} style={{
                flex: 1, padding: "13px", fontSize: 15, fontWeight: 700,
                background: "transparent",
                border: "1px solid var(--border)", borderRadius: 10,
                color: "var(--muted)", cursor: creating ? "not-allowed" : "pointer",
                fontFamily: "inherit", transition: "all 0.2s"
              }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm modal (suspend / delete) */}
      {confirm && (
        <ConfirmModal
          danger={confirm.type === "delete"}
          message={
            confirm.type === "delete"
              ? `⚠️ Permanently delete teacher "${confirm.username}"? Their quizzes, questions, and assignments will also be removed.`
              : confirm.type === "suspend"
              ? `Suspend "${confirm.username}"? They won't be able to log in until unsuspended.`
              : `Unsuspend "${confirm.username}"? They will regain full access.`
          }
          onConfirm={() =>
            confirm.type === "delete" ? handleDelete(confirm.uid) : handleSuspend(confirm.uid)
          }
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
