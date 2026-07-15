import React, { useState } from "react";
import TeacherTopics    from "./TeacherTopics";
import TeacherQuestions from "./TeacherQuestions";
import TeacherQuizzes   from "./TeacherQuizzes";
import TeacherStudents  from "./TeacherStudents";
import TeacherAnalytics from "./TeacherAnalytics";

const TABS = [
  { id:"topics",    label:"Topics",    icon:"📚" },
  { id:"questions", label:"Questions", icon:"❓" },
  { id:"quizzes",   label:"Quizzes",   icon:"📝" },
  { id:"students",  label:"Students",  icon:"🎓" },
  { id:"analytics", label:"Analytics", icon:"📊" },
];

export default function TeacherApp({ user, onLogout }) {
  const [tab, setTab] = useState("topics");
  const [ctx, setCtx] = useState({});   // shared context e.g. selected topic

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", background:"var(--bg)" }}>

      {/* Top Bar */}
      <header className="top-bar">
        <span className="top-bar-logo">👩‍🏫 Teacher Panel</span>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:13, color:"var(--muted)" }}>{user.username}</span>
          <button className="btn-logout" onClick={onLogout}>Logout</button>
        </div>
      </header>

      {/* Body: sidebar + content */}
      <div style={{ display:"flex", flex:1, paddingTop:"var(--top-h)" }}>

        {/* Sidebar */}
        <aside style={{
          width:200, background:"var(--card)", borderRight:"1px solid var(--border)",
          padding:"16px 8px", display:"flex", flexDirection:"column", gap:4,
          position:"fixed", top:"var(--top-h)", bottom:0, left:0, overflowY:"auto", zIndex:50
        }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
              background:tab===t.id?"rgba(108,99,255,0.15)":"transparent",
              border:"none", borderRadius:10, cursor:"pointer", fontFamily:"inherit",
              color:tab===t.id?"var(--accent)":"var(--muted)", fontWeight:600, fontSize:14,
              transition:"all 0.2s", textAlign:"left",
              borderLeft:tab===t.id?"3px solid var(--accent)":"3px solid transparent"
            }}>
              <span style={{fontSize:18}}>{t.icon}</span>
              {t.label}
            </button>
          ))}
          {/* Spacer pushes logout to bottom */}
          <div style={{ flex: 1 }} />

          {/* Logout at bottom of sidebar */}
          <button onClick={onLogout} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', background: 'transparent',
            border: '2px solid var(--error)', borderRadius: 10,
            cursor: 'pointer', fontFamily: 'inherit',
            color: 'var(--error)', fontWeight: 600, fontSize: 14,
            transition: 'all 0.2s', width: '100%', marginTop: 8,
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
        </aside>

        {/* Main Content */}
        <main style={{ flex:1, marginLeft:200, padding:"24px 20px", maxWidth:900 }}>
          {tab==="topics"    && <TeacherTopics    user={user} onSelectTopic={t=>{ setCtx({topic:t}); setTab("questions"); }}/>}
          {tab==="questions" && <TeacherQuestions user={user} context={ctx}/>}
          {tab==="quizzes"   && <TeacherQuizzes   user={user} context={ctx}/>}
          {tab==="students"  && <TeacherStudents  user={user} context={ctx}/>}
          {tab==="analytics" && <TeacherAnalytics user={user}/>}
        </main>
      </div>
    </div>
  );
}