import React from "react";

function RoleSelectPage({ onSelect }) {
  return (
    <div style={{
      minHeight:"100vh", background:"var(--bg)",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      padding:"20px"
    }}>
      {/* Logo */}
      <div style={{ textAlign:"center", marginBottom:40 }}>
        <div style={{ fontSize:60, marginBottom:12 }}>🧠</div>
        <h1 style={{ fontSize:32, fontWeight:900, margin:0, letterSpacing:"-0.5px" }}>AI Quiz App</h1>
        <p style={{ color:"var(--muted)", marginTop:8, fontSize:16 }}>Who are you?</p>
      </div>

      {/* Role Cards */}
      <div style={{ display:"flex", gap:20, flexWrap:"wrap", justifyContent:"center", maxWidth:1060, width:"100%" }}>

        {/* Student */}
        <div className="role-card" onClick={()=>onSelect("student")}
          style={{"--role-color":"var(--accent2)","--role-glow":"rgba(255,101,132,0.2)"}}>
          <div className="role-card-icon">🎓</div>
          <h2 className="role-card-title">I'm a Student</h2>
          <p className="role-card-desc">Take assigned quizzes, track your progress, and compete on the leaderboard.</p>
          <ul className="role-card-features">
            <li>✅ Take assigned quizzes</li>
            <li>✅ Practice with AI questions</li>
            <li>✅ View scores & history</li>
            <li>✅ Class leaderboard</li>
          </ul>
          <button className="role-card-btn student-btn">Enter as Student →</button>
        </div>

        {/* Teacher */}
        <div className="role-card" onClick={()=>onSelect("teacher")}
          style={{"--role-color":"var(--accent)","--role-glow":"rgba(108,99,255,0.2)"}}>
          <div className="role-card-icon">👩‍🏫</div>
          <h2 className="role-card-title">I'm a Teacher</h2>
          <p className="role-card-desc">Create topics, generate AI questions, publish quizzes and track class performance.</p>
          <ul className="role-card-features">
            <li>✅ Create topics & questions</li>
            <li>✅ AI question generation</li>
            <li>✅ Assign quizzes to students</li>
            <li>✅ Class analytics dashboard</li>
          </ul>
          <button className="role-card-btn teacher-btn">Enter as Teacher →</button>
        </div>

        {/* Admin */}
        <div className="role-card" onClick={()=>onSelect("admin")}
          style={{"--role-color":"#f59e0b","--role-glow":"rgba(245,158,11,0.2)"}}>
          <div className="role-card-icon">🛡️</div>
          <h2 className="role-card-title">I'm an Admin</h2>
          <p className="role-card-desc">Monitor the entire platform — users, quizzes, activity and platform health.</p>
          <ul className="role-card-features">
            <li>✅ View all teachers & students</li>
            <li>✅ Suspend or delete accounts</li>
            <li>✅ View all quizzes & topics</li>
            <li>✅ Platform-wide analytics</li>
          </ul>
          <button className="role-card-btn" style={{
            background:"linear-gradient(135deg,#f59e0b,#d97706)",
            color:"white", width:"100%", padding:"12px",
            border:"none", borderRadius:10, fontSize:15,
            fontWeight:700, cursor:"pointer", fontFamily:"inherit"
          }}>Enter as Admin →</button>
        </div>

      </div>

      <p style={{ color:"var(--muted)", fontSize:13, marginTop:32 }}>
        Default admin login: <strong style={{color:"var(--text)"}}>admin</strong> / <strong style={{color:"var(--text)"}}>admin123</strong>
      </p>
    </div>
  );
}

export default RoleSelectPage;