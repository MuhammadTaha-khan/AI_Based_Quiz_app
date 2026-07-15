import React, { useState, useEffect } from "react";
import axios from "axios";

import API from "../../config";
const hdrs = u => ({ "X-User-Id": String(u.id), "X-User-Role": u.role });

function StatCard({ icon, value, label, color="var(--accent)", sub }) {
  return (
    <div style={{
      background:"var(--card)", border:"1px solid var(--border)",
      borderRadius:14, padding:"20px", textAlign:"center",
      borderTop:`3px solid ${color}`
    }}>
      <div style={{ fontSize:28, marginBottom:6 }}>{icon}</div>
      <div style={{ fontSize:28, fontWeight:900, color }}>{value ?? "—"}</div>
      <div style={{ color:"var(--muted)", fontSize:12, marginTop:4 }}>{label}</div>
      {sub && <div style={{ color:"var(--success)", fontSize:11, marginTop:2 }}>{sub}</div>}
    </div>
  );
}

export default function AdminOverview({ user }) {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    axios.get(`${API}/admin/overview`, { headers: hdrs(user) })
      .then(r => { setStats(r.data); setLoading(false); })
      .catch(() => { setError("Could not load overview."); setLoading(false); });
  }, []);

  if (loading) return <p style={{ color:"var(--muted)" }}>Loading overview...</p>;
  if (error)   return <div className="alert alert-error">{error}</div>;

  const s = stats;

  return (
    <div>
      <h2 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>📊 Platform Overview</h2>
      <p style={{ color:"var(--muted)", fontSize:14, marginBottom:24 }}>
        Real-time snapshot of the entire platform.
      </p>

      {/* Users row */}
      <p className="section-title" style={{ marginBottom:12 }}>Users</p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 }}>
        <StatCard icon="👥" value={s.total_users}    label="Total Users"    color="var(--accent)" sub={`+${s.new_this_week} this week`} />
        <StatCard icon="🎓" value={s.total_students}  label="Students"       color="var(--accent2)" />
        <StatCard icon="👩‍🏫" value={s.total_teachers} label="Teachers"       color="#a78bfa" />
        <StatCard icon="🚫" value={s.suspended_users} label="Suspended"      color="var(--error)" />
      </div>

      {/* Content row */}
      <p className="section-title" style={{ marginBottom:12 }}>Content</p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 }}>
        <StatCard icon="📚" value={s.total_topics}    label="Topics"         color="#34d399" />
        <StatCard icon="❓" value={s.total_questions} label="Questions"      color="#60a5fa" />
        <StatCard icon="📝" value={s.total_quizzes}   label="Total Quizzes"  color="#f59e0b" />
        <StatCard icon="🚀" value={s.total_published} label="Published"      color="var(--success)" />
      </div>

      {/* Activity row */}
      <p className="section-title" style={{ marginBottom:12 }}>Activity</p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12 }}>
        <StatCard icon="📊" value={s.total_attempts}  label="Quiz Attempts"  color="var(--accent)" />
        <StatCard icon="🆕" value={s.new_this_week}   label="New Users This Week" color="var(--success)" />
      </div>
    </div>
  );
}