import React, { useState } from "react";
import AdminOverview  from "./AdminOverview";
import AdminUsers     from "./AdminUsers";
import AdminTeachers  from "./AdminTeachers";
import AdminQuizzes   from "./AdminQuizzes";
import AdminActivity  from "./AdminActivity";

const TABS = [
  { id:"overview",  label:"Overview",  icon:"📊" },
  { id:"users",     label:"Users",     icon:"👥" },
  { id:"teachers",  label:"Teachers",  icon:"👨‍🏫" },
  { id:"quizzes",   label:"Quizzes",   icon:"📝" },
  { id:"activity",  label:"Activity",  icon:"🕐" },
];

export default function AdminApp({ user, onLogout }) {
  const [tab, setTab] = useState("overview");

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", background:"var(--bg)" }}>

      {/* Top Bar */}
      <header className="top-bar" style={{ borderBottom:"2px solid rgba(245,158,11,0.4)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:22 }}>🛡️</span>
          <div>
            <span className="top-bar-logo" style={{ color:"#f59e0b" }}>Admin Dashboard</span>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:13, color:"var(--muted)" }}>{user.username}</span>
          <span style={{
            background:"rgba(245,158,11,0.15)", color:"#f59e0b",
            padding:"2px 10px", borderRadius:99, fontSize:11, fontWeight:700
          }}>ADMIN</span>
          <button className="btn-logout" onClick={onLogout}>Logout</button>
        </div>
      </header>

      <div style={{ display:"flex", flex:1, paddingTop:"var(--top-h)" }}>

        {/* Sidebar */}
        <aside style={{
          width:200, background:"var(--card)",
          borderRight:"1px solid var(--border)",
          padding:"16px 8px", display:"flex", flexDirection:"column", gap:4,
          position:"fixed", top:"var(--top-h)", bottom:0, left:0,
          overflowY:"auto", zIndex:50
        }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display:"flex", alignItems:"center", gap:10,
              padding:"10px 14px", background: tab===t.id
                ? "rgba(245,158,11,0.15)" : "transparent",
              border:"none",
              borderLeft: tab===t.id
                ? "3px solid #f59e0b" : "3px solid transparent",
              borderRadius:10, cursor:"pointer", fontFamily:"inherit",
              color: tab===t.id ? "#f59e0b" : "var(--muted)",
              fontWeight:600, fontSize:14, transition:"all 0.2s", textAlign:"left"
            }}>
              <span style={{ fontSize:18 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}

          <div style={{ flex:1 }} />

          {/* Logout at bottom */}
          <button onClick={onLogout} style={{
            display:"flex", alignItems:"center", gap:10,
            padding:"10px 14px", background:"transparent",
            border:"2px solid var(--error)", borderRadius:10,
            cursor:"pointer", fontFamily:"inherit",
            color:"var(--error)", fontWeight:600, fontSize:14,
            transition:"all 0.2s", marginTop:8
          }}
            onMouseEnter={e => e.currentTarget.style.background="rgba(248,113,113,0.1)"}
            onMouseLeave={e => e.currentTarget.style.background="transparent"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
        </aside>

        {/* Main content */}
        <main style={{ flex:1, marginLeft:200, padding:"24px 20px", maxWidth:960 }}>
          {tab==="overview"  && <AdminOverview  user={user} />}
          {tab==="users"     && <AdminUsers     user={user} />}
          {tab==="teachers"  && <AdminTeachers  user={user} />}
          {tab==="quizzes"   && <AdminQuizzes   user={user} />}
          {tab==="activity"  && <AdminActivity  user={user} />}
        </main>
      </div>
    </div>
  );
}