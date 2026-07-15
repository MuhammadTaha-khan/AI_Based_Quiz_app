import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";

import API from "../../config";

export default function StudentQuiz({ user, quiz, onFinish }) {
  const [questions,   setQuestions]   = useState([]);
  const [idx,         setIdx]         = useState(0);
  const [selected,    setSelected]    = useState(null);
  const [showFB,      setShowFB]      = useState(false);
  const [answers,     setAnswers]     = useState([]);
  const [timeLeft,    setTimeLeft]    = useState(quiz?.time_limit || 20);
  const [timedOut,    setTimedOut]    = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  const TIME = quiz?.time_limit || 20;

  useEffect(() => {
    axios.get(`${API}/student/quiz/${quiz.quiz_id}/questions`,
      { headers:{ "X-User-Id":user.id, "X-User-Role":user.role } })
      .then(r => { setQuestions(r.data.questions); setLoading(false); })
      .catch(() => { setError("Could not load quiz."); setLoading(false); });
  }, []);

  const handleTimeout = useCallback(() => {
    if (showFB) return;
    const q = questions[idx];
    setAnswers(prev => [...prev, { id:q.id, selected:"__timeout__" }]);
    setTimedOut(true); setShowFB(true);
  }, [showFB, questions, idx]);

  useEffect(() => {
    if (loading || showFB) return;
    setTimeLeft(TIME); setTimedOut(false);
    const t = setInterval(() => {
      setTimeLeft(p => { if (p<=1){ clearInterval(t); handleTimeout(); return 0; } return p-1; });
    }, 1000);
    return () => clearInterval(t);
  }, [idx, loading]);

  const submitAnswer = () => {
    if (!selected) return;
    const q = questions[idx];
    setAnswers(prev => [...prev, { id:q.id, selected }]);
    setShowFB(true);
  };

  const nextQuestion = async () => {
    const next = idx + 1;
    if (next >= questions.length) {
      const allAnswers = [...answers];
      // Add last answer if not already from timeout
      if (allAnswers.length < questions.length) {
        allAnswers.push({ id:questions[idx].id, selected:selected||"__timeout__" });
      }
      try {
        const res = await axios.post(`${API}/student/quiz/${quiz.quiz_id}/submit`,
          { answers:allAnswers },
          { headers:{ "X-User-Id":user.id, "X-User-Role":user.role } });
        onFinish(res.data);
      } catch(e) { setError("Submit failed. Try again."); }
    } else {
      setIdx(next); setSelected(null); setShowFB(false);
    }
  };

  if (loading) return <div className="card" style={{textAlign:"center"}}><p style={{color:"var(--muted)"}}>Loading questions...</p></div>;
  if (error)   return <div className="card"><div className="alert alert-error">{error}</div></div>;
  if (!questions.length) return <div className="card"><div className="alert alert-error">No questions available for this quiz.</div></div>;

  const q         = questions[idx];
  const isCorrect = selected === q?.answer;
  const progress  = (idx / questions.length) * 100;
  const timerCls  = timeLeft<=5?"timer-urgent":timeLeft<=10?"timer-warning":"timer-ok";

  return (
    <div className="card">
      {/* Top row */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ color:"var(--muted)", fontSize:13 }}>{idx+1}/{questions.length}</span>
          <span className={`badge badge-${q.difficulty}`}>{q.difficulty}</span>
        </div>
        <div className={`timer ${timerCls}`}>⏱ {timeLeft}s</div>
      </div>

      {/* Progress bars */}
      <div className="progress-container"><div className="progress-fill" style={{width:`${progress}%`}}/></div>
      <div className="progress-container" style={{marginBottom:20}}>
        <div style={{height:"100%",width:`${(timeLeft/TIME)*100}%`,borderRadius:99,transition:"width 1s linear",
          background:timeLeft<=5?"var(--error)":timeLeft<=10?"var(--warning)":"var(--success)"}}/>
      </div>

      <h2 style={{ fontSize:18, fontWeight:700, marginBottom:20, lineHeight:1.5 }}>{q.question}</h2>

      {/* Options */}
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:18 }}>
        {q.options.map((opt,i)=>{
          let border="var(--border)", bg="transparent", color="var(--text)";
          if (showFB) {
            if (opt===q.answer) { border="var(--success)"; bg="rgba(74,222,128,0.1)"; color="var(--success)"; }
            else if (opt===selected&&!isCorrect) { border="var(--error)"; bg="rgba(248,113,113,0.1)"; color="var(--error)"; }
          } else if (opt===selected) { border="var(--accent)"; bg="rgba(108,99,255,0.12)"; }
          return (
            <button key={i} onClick={()=>!showFB&&setSelected(opt)} style={{
              background:bg, border:`2px solid ${border}`, borderRadius:10,
              padding:"12px 16px", color, fontSize:14, textAlign:"left",
              cursor:showFB?"default":"pointer", fontFamily:"inherit", transition:"all 0.18s"
            }}>
              <span style={{marginRight:10,opacity:0.5}}>{String.fromCharCode(65+i)}.</span>{opt}
            </button>
          );
        })}
      </div>

      {showFB && (
        <div className={`alert ${timedOut?"alert-error":isCorrect?"alert-success":"alert-error"}`} style={{marginBottom:14}}>
          {timedOut ? `⏰ Time's up! Correct: ${q.answer}` : isCorrect ? "✅ Correct!" : `❌ Wrong. Correct: ${q.answer}`}
        </div>
      )}

      {!showFB
        ? <button className="btn btn-primary" onClick={submitAnswer} disabled={!selected} style={{width:"100%"}}>Submit Answer</button>
        : <button className="btn btn-primary" onClick={nextQuestion} style={{width:"100%"}}>
            {idx+1>=questions.length?"See Results 🏁":"Next Question →"}
          </button>
      }
    </div>
  );
}