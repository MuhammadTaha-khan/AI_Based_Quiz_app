import React, { useState } from "react";
import StudentAssignments from "./StudentAssignments";
import StudentQuiz        from "./StudentQuiz";
import StudentResult      from "./StudentResult";
import StudentProfile     from "./StudentProfile";
import LeaderboardPage    from "../shared/LeaderboardPage";
import PracticeSetup      from "./PracticeSetup";
import PracticeQuiz       from "./PracticeQuiz";
import PracticeResult     from "./PracticeResult";

const S = {
  HOME:"home", QUIZ:"quiz", RESULT:"result",
  PROFILE:"profile", LB:"leaderboard",
  PSETUP:"practice_setup", PQUIZ:"practice_quiz", PRESULT:"practice_result",
};

function HomeIcon({ a }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill={a?"currentColor":"none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}
function TrophyIcon({ a }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill={a?"currentColor":"none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="8 21 12 21 16 21"/><line x1="12" y1="17" x2="12" y2="21"/><path d="M7 4H2v5a5 5 0 0 0 5 5"/><path d="M17 4h5v5a5 5 0 0 1-5 5"/><path d="M7 4h10v7a5 5 0 0 1-10 0V4z"/></svg>;
}
function PersonIcon({ a }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill={a?"currentColor":"none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}

const TABS = [
  { s:S.HOME,    label:"Quizzes",     Icon:HomeIcon    },
  { s:S.LB,      label:"Leaderboard", Icon:TrophyIcon  },
  { s:S.PROFILE, label:"Profile",     Icon:PersonIcon  },
];

const HIDE_NAV = [S.QUIZ, S.PQUIZ];

export default function StudentApp({ user, onLogout }) {
  const [screen,          setScreen]         = useState(S.HOME);
  const [activeQuiz,      setActiveQuiz]      = useState(null);
  const [quizResult,      setQuizResult]      = useState(null);
  const [practiceSession, setPracticeSession] = useState(null);
  const [practiceResult,  setPracticeResult]  = useState(null);

  const startAssignedQuiz  = quiz    => { setActiveQuiz(quiz);      setScreen(S.QUIZ);    };
  const finishAssignedQuiz = res     => { setQuizResult(res);        setScreen(S.RESULT);  };
  const goHome             = ()      => { setScreen(S.HOME);         setActiveQuiz(null);  };
  const startPracticeQuiz  = session => { setPracticeSession(session); setScreen(S.PQUIZ);   };
  const finishPracticeQuiz = result  => { setPracticeResult(result);   setScreen(S.PRESULT); };

  const showTabs  = !HIDE_NAV.includes(screen);
  const activeTab = [S.QUIZ, S.RESULT].includes(screen) ? S.HOME : screen;

  return (
    <div className="App">
      <header className="top-bar">
        <span className="top-bar-logo">🎓 Student Portal</span>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:13, color:"var(--muted)" }}>{user.username}</span>
          <button className="btn-logout" onClick={onLogout}>Logout</button>
        </div>
      </header>

      <div className="page-content">
        {screen===S.HOME    && <StudentAssignments user={user} onStartQuiz={startAssignedQuiz} onStartPractice={()=>setScreen(S.PSETUP)}/>}
        {screen===S.QUIZ    && <StudentQuiz        user={user} quiz={activeQuiz} onFinish={finishAssignedQuiz}/>}
        {screen===S.RESULT  && <StudentResult      result={quizResult} onHome={goHome}/>}
        {screen===S.PROFILE && <StudentProfile     user={user} onLogout={onLogout}/>}
        {screen===S.LB      && <LeaderboardPage    currentUser={user}/>}
        {screen===S.PSETUP  && <PracticeSetup      user={user} onStart={startPracticeQuiz} onBack={()=>setScreen(S.HOME)}/>}
        {screen===S.PQUIZ   && <PracticeQuiz       session={practiceSession} onFinish={finishPracticeQuiz}/>}
        {screen===S.PRESULT && <PracticeResult     result={practiceResult} onPracticeAgain={()=>setScreen(S.PSETUP)} onHome={()=>setScreen(S.HOME)}/>}
      </div>

      {showTabs && (
        <nav className="bottom-nav">
          {TABS.map(({s,label,Icon})=>{
            const active = activeTab===s;
            return (
              <button key={s} className={`bottom-nav-btn${active?" active":""}`} onClick={()=>setScreen(s)}>
                {active && <span className="bottom-nav-dot"/>}
                <span className="bottom-nav-icon"><Icon a={active}/></span>
                <span className="bottom-nav-label">{label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}