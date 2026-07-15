import React, { useState, useEffect } from "react";
import axios from "axios";

import API from "../../config";
const hdrs = u => ({ "X-User-Id": String(u.id), "X-User-Role": u.role });
const sc   = p => p>=70?"var(--success)":p>=40?"var(--warning)":"var(--error)";

function timeAgo(str) {
  if (!str) return "—";
  const diff = (Date.now() - new Date(str.replace(" ","T")).getTime()) / 1000;
  if (diff < 60)   return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

export default function AdminActivity({ user }) {
  const [activity, setActivity] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const load = () => {
    setLoading(true);
    axios.get(`${API}/admin/activity`, { headers: hdrs(user) })
      .then(r => { setActivity(r.data.activity); setLoading(false); })
      .catch(() => { setError("Could not load activity."); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
        <h2 style={{ fontSize:22, fontWeight:800, margin:0 }}>🕐 Recent Activity</h2>
        <button className="btn btn-outline" onClick={load}
          style={{ fontSize:13, padding:"7px 16px" }}>
          ↺ Refresh
        </button>
      </div>
      <p style={{ color:"var(--muted)", fontSize:14, marginBottom:24 }}>
        Last 20 quiz attempts across the entire platform.
      </p>

      {error && <div className="alert alert-error" style={{marginBottom:16}}>{error}</div>}

      <div className="card">
        {loading && <p style={{color:"var(--muted)",textAlign:"center",padding:"20px 0"}}>Loading...</p>}

        {!loading && activity.length===0 && (
          <div style={{textAlign:"center",padding:"40px 0"}}>
            <div style={{fontSize:44,marginBottom:12}}>📭</div>
            <p style={{color:"var(--muted)"}}>No quiz attempts yet.</p>
          </div>
        )}

        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {activity.map((a, i) => (
            <div key={i} style={{
              display:"flex", alignItems:"center", gap:14,
              background:"var(--bg)", border:"1px solid var(--border)",
              borderRadius:12, padding:"12px 16px"
            }}>
              {/* Score circle */}
              <div style={{
                width:44, height:44, borderRadius:"50%", flexShrink:0,
                border:`3px solid ${sc(a.score_percentage)}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontWeight:800, fontSize:13, color:sc(a.score_percentage)
              }}>
                {a.score_percentage}%
              </div>

              {/* Details */}
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontWeight:700, fontSize:14, margin:0,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {a.quiz_title}
                </p>
                <p style={{ color:"var(--muted)", fontSize:12, margin:"3px 0 0" }}>
                  🎓 <strong style={{color:"var(--text)"}}>{a.student_name}</strong>
                  &nbsp;·&nbsp; 📚 {a.topic_name}
                </p>
              </div>

              {/* Time ago */}
              <span style={{ color:"var(--muted)", fontSize:12, flexShrink:0, whiteSpace:"nowrap" }}>
                {timeAgo(a.taken_at)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}