import React, { useState, useEffect } from "react";
import axios from "axios";

import API from "../../config";
const sc = p => p>=70?"var(--success)":p>=40?"var(--warning)":"var(--error)";

export default function StudentProfile({ user, onLogout }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    axios.get(`${API}/student/profile/${user.id}`, { headers:{"X-User-Id":user.id,"X-User-Role":user.role} })
      .then(r=>{ setData(r.data); setLoading(false); })
      .catch(()=>setLoading(false));
  },[]);

  if (loading) return <div className="card" style={{textAlign:"center"}}><p style={{color:"var(--muted)"}}>Loading...</p></div>;
  if (!data)   return <div className="card"><div className="alert alert-error">Could not load profile.</div></div>;

  const { stats, history } = data;

  return (
    <div className="card">
      {/* Avatar + info */}
      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:28}}>
        <div style={{width:60,height:60,borderRadius:"50%",background:"linear-gradient(135deg,var(--accent2),var(--warning))",
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:800,color:"white",flexShrink:0}}>
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 style={{fontSize:20,fontWeight:800}}>{user.username}</h2>
          <p style={{color:"var(--muted)",fontSize:13}}>{user.email}</p>
          <span style={{background:"rgba(255,101,132,0.15)",color:"var(--accent2)",padding:"2px 10px",borderRadius:99,fontSize:11,fontWeight:700}}>STUDENT</span>
        </div>
      </div>

      <p className="section-title">Stats</p>
      <div className="stat-grid" style={{marginBottom:24}}>
        <div className="stat-card"><div className="stat-value">{stats.total_quizzes}</div><div className="stat-label">Quizzes</div></div>
        <div className="stat-card"><div className="stat-value" style={{color:sc(stats.avg_score)}}>{stats.avg_score||0}%</div><div className="stat-label">Avg Score</div></div>
        <div className="stat-card"><div className="stat-value" style={{color:"var(--success)"}}>{stats.best_score||0}%</div><div className="stat-label">Best</div></div>
      </div>

      {history.length > 0 && (
        <>
          <p className="section-title">Recent Quizzes</p>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {history.map((h,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                background:"var(--bg)",border:"1px solid var(--border)",borderRadius:10,padding:"10px 14px"}}>
                <span style={{fontWeight:600,fontSize:14}}>{h.title}</span>
                <span style={{fontWeight:800,fontSize:15,color:sc(h.score_percentage)}}>{h.score_percentage}%</span>
              </div>
            ))}
          </div>
        </>
      )}
      {/* ── Logout Button ── */}
      <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
        <button
          onClick={onLogout}
          style={{
            width: '100%', padding: '13px', borderRadius: 12,
            background: 'transparent',
            border: '2px solid var(--error)',
            color: 'var(--error)', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Logout
        </button>
      </div>
    </div>
  );
}