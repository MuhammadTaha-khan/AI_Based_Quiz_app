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

// Confirm modal
function ConfirmModal({ message, onConfirm, onCancel, danger=false }) {
  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.75)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, padding:20
    }}>
      <div style={{
        background:"var(--card)", border:"1px solid var(--border)",
        borderRadius:16, padding:28, maxWidth:380, width:"100%",
        boxShadow:"0 24px 64px rgba(0,0,0,0.5)"
      }}>
        <p style={{ fontWeight:700, fontSize:16, marginBottom:20, lineHeight:1.5 }}>{message}</p>
        <div style={{ display:"flex", gap:10 }}>
          <button className="btn btn-primary"
            onClick={onConfirm}
            style={{ flex:1, background: danger ? "var(--error)" : "var(--accent)" }}>
            Confirm
          </button>
          <button className="btn btn-outline" onClick={onCancel} style={{ flex:1 }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsers({ user }) {
  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [roleFilter,  setRoleFilter]  = useState("all");
  const [error,       setError]       = useState(null);
  const [success,     setSuccess]     = useState(null);
  const [confirm,     setConfirm]     = useState(null); // { type, uid, username }

  const load = () => {
    setLoading(true);
    axios.get(`${API}/admin/users`, { headers: hdrs(user) })
      .then(r => { setUsers(r.data.users); setLoading(false); })
      .catch(() => { setError("Could not load users."); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => users.filter(u => {
    const q = search.toLowerCase();
    return (!q || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
        && (roleFilter==="all" || u.role===roleFilter);
  }), [users, search, roleFilter]);

  const flash = msg => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleSuspend = async (uid) => {
    setError(null);
    try {
      const res = await axios.post(`${API}/admin/users/${uid}/suspend`, {}, { headers: hdrs(user) });
      setUsers(prev => prev.map(u => u.id===uid ? {...u, suspended: res.data.suspended} : u));
      flash(res.data.message);
    } catch (e) { setError(e.response?.data?.error || "Action failed."); }
    setConfirm(null);
  };

  const handleDelete = async (uid) => {
    setError(null);
    try {
      const res = await axios.delete(`${API}/admin/users/${uid}`, { headers: hdrs(user) });
      setUsers(prev => prev.filter(u => u.id !== uid));
      flash(res.data.message);
    } catch (e) { setError(e.response?.data?.error || "Delete failed."); }
    setConfirm(null);
  };

  const roleBadge = (role) => {
    const map = {
      admin:   { bg:"rgba(245,158,11,0.15)",  color:"#f59e0b",         label:"ADMIN"   },
      teacher: { bg:"rgba(108,99,255,0.15)",  color:"var(--accent)",   label:"TEACHER" },
      student: { bg:"rgba(255,101,132,0.15)", color:"var(--accent2)",  label:"STUDENT" },
    };
    const m = map[role] || map.student;
    return (
      <span style={{ background:m.bg, color:m.color,
        padding:"2px 9px", borderRadius:99, fontSize:11, fontWeight:700 }}>
        {m.label}
      </span>
    );
  };

  return (
    <div>
      <h2 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>👥 User Management</h2>
      <p style={{ color:"var(--muted)", fontSize:14, marginBottom:24 }}>
        View, suspend, or delete any teacher or student account.
      </p>

      {error   && <div className="alert alert-error"   style={{marginBottom:16}}>{error}</div>}
      {success && <div className="alert alert-success" style={{marginBottom:16}}>{success}</div>}

      <div className="card">
        {/* Search + filter row */}
        <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap" }}>
          <div style={{ position:"relative", flex:1, minWidth:200 }}>
            <span style={{ position:"absolute", left:13, top:"50%",
              transform:"translateY(-50%)", color:"var(--muted)", pointerEvents:"none" }}>🔍</span>
            <input className="input" placeholder="Search by name or email..."
              value={search} onChange={e=>setSearch(e.target.value)}
              style={{ paddingLeft:40 }}/>
          </div>

          {/* Role filter pills */}
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            {["all","student","teacher","admin"].map(r => (
              <button key={r} onClick={()=>setRoleFilter(r)} style={{
                padding:"8px 14px", borderRadius:99, fontSize:12, fontWeight:600,
                border:`1px solid ${roleFilter===r?"#f59e0b":"var(--border)"}`,
                background:roleFilter===r?"rgba(245,158,11,0.15)":"transparent",
                color:roleFilter===r?"#f59e0b":"var(--muted)",
                cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s",
                textTransform:"capitalize"
              }}>
                {r==="all" ? "All" : r+"s"}
              </button>
            ))}
          </div>
        </div>

        {/* Count */}
        <p style={{ color:"var(--muted)", fontSize:13, marginBottom:14 }}>
          Showing <strong style={{color:"var(--text)"}}>{filtered.length}</strong> of {users.length} users
        </p>

        {loading && <p style={{color:"var(--muted)",textAlign:"center",padding:"20px 0"}}>Loading...</p>}
        {!loading && filtered.length===0 && (
          <p style={{color:"var(--muted)",textAlign:"center",padding:"20px 0"}}>No users match your search.</p>
        )}

        {/* User list */}
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {filtered.map(u => (
            <div key={u.id} style={{
              display:"flex", alignItems:"center", gap:12,
              background:"var(--bg)",
              border:`1px solid ${u.suspended ? "rgba(248,113,113,0.4)" : "var(--border)"}`,
              borderRadius:12, padding:"12px 14px",
              opacity: u.suspended ? 0.75 : 1
            }}>
              {/* Avatar */}
              <div style={{
                width:40, height:40, borderRadius:"50%", flexShrink:0,
                background: u.suspended
                  ? "var(--border)"
                  : u.role==="admin"   ? "linear-gradient(135deg,#f59e0b,#d97706)"
                  : u.role==="teacher" ? "linear-gradient(135deg,var(--accent),#a78bfa)"
                  : "linear-gradient(135deg,var(--accent2),var(--warning))",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontWeight:800, fontSize:16, color:"white"
              }}>
                {u.username.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                  <p style={{ fontWeight:700, fontSize:14, margin:0 }}>{u.username}</p>
                  {roleBadge(u.role)}
                  {u.suspended && (
                    <span style={{ background:"rgba(248,113,113,0.15)", color:"var(--error)",
                      padding:"2px 9px", borderRadius:99, fontSize:11, fontWeight:700 }}>
                      SUSPENDED
                    </span>
                  )}
                  {!u.email_verified && (
                    <span style={{ background:"rgba(251,191,36,0.15)", color:"var(--warning)",
                      padding:"2px 9px", borderRadius:99, fontSize:11, fontWeight:700 }}>
                      UNVERIFIED
                    </span>
                  )}
                </div>
                <p style={{ color:"var(--muted)", fontSize:12, margin:"3px 0 0" }}>
                  {u.email} · Joined {formatDate(u.created_at)}
                  {u.quiz_attempts > 0 && (
                    <span style={{ color:sc(u.avg_score||0) }}>
                      {" "}· {u.quiz_attempts} quizzes · avg {u.avg_score||0}%
                    </span>
                  )}
                </p>
              </div>

              {/* Actions — not for self */}
              {u.role !== "admin" && (
                <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                  <button
                    onClick={() => setConfirm({
                      type: u.suspended ? "unsuspend" : "suspend",
                      uid: u.id, username: u.username
                    })}
                    style={{
                      padding:"6px 12px", borderRadius:8, fontSize:12, fontWeight:600,
                      cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s",
                      border: u.suspended
                        ? "1px solid var(--success)" : "1px solid var(--warning)",
                      background: "transparent",
                      color: u.suspended ? "var(--success)" : "var(--warning)"
                    }}>
                    {u.suspended ? "✅ Unsuspend" : "⏸ Suspend"}
                  </button>
                  <button
                    onClick={() => setConfirm({ type:"delete", uid:u.id, username:u.username })}
                    style={{
                      padding:"6px 12px", borderRadius:8, fontSize:12, fontWeight:600,
                      cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s",
                      border:"1px solid var(--error)", background:"transparent", color:"var(--error)"
                    }}>
                    🗑 Delete
                  </button>
                </div>
              )}
              {u.role === "admin" && (
                <span style={{ color:"var(--muted)", fontSize:12, fontStyle:"italic" }}>Admin account</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Confirm Modal */}
      {confirm && (
        <ConfirmModal
          danger={confirm.type==="delete"}
          message={
            confirm.type==="delete"
              ? `⚠️ Permanently delete "${confirm.username}"? This cannot be undone. All their data will be lost.`
              : confirm.type==="suspend"
              ? `Suspend "${confirm.username}"? They will not be able to log in until unsuspended.`
              : `Unsuspend "${confirm.username}"? They will regain access to their account.`
          }
          onConfirm={() =>
            confirm.type==="delete"
              ? handleDelete(confirm.uid)
              : handleSuspend(confirm.uid)
          }
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}