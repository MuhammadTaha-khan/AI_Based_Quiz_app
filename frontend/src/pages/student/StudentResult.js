import React from "react";

const sc = p => p>=70?"var(--success)":p>=40?"var(--warning)":"var(--error)";

export default function StudentResult({ result, onHome }) {
  if (!result) return null;
  const { correct, total, score_percentage, message, feedback } = result;
  const emoji = score_percentage>=80?"🏆":score_percentage>=50?"👍":"💪";

  return (
    <div className="card">
      <div style={{textAlign:"center",marginBottom:28}}>
        <div style={{fontSize:56,marginBottom:8}}>{emoji}</div>
        <h1 style={{fontSize:24,fontWeight:800}}>Quiz Complete!</h1>
        <div style={{
          width:100,height:100,borderRadius:"50%",border:`6px solid ${sc(score_percentage)}`,
          display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",margin:"16px auto"
        }}>
          <span style={{fontSize:26,fontWeight:800,color:sc(score_percentage)}}>{score_percentage}%</span>
          <span style={{fontSize:11,color:"var(--muted)"}}>{correct}/{total}</span>
        </div>
        <div className="alert alert-info" style={{textAlign:"left"}}>🤖 {message}</div>
      </div>

      <p className="section-title">Answer Review</p>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:24}}>
        {feedback.map((f,i)=>(
          <div key={i} style={{
            background:f.is_correct?"rgba(74,222,128,0.07)":"rgba(248,113,113,0.07)",
            border:`1px solid ${f.is_correct?"rgba(74,222,128,0.3)":"rgba(248,113,113,0.3)"}`,
            borderRadius:10,padding:"12px 14px"
          }}>
            <p style={{fontWeight:600,fontSize:13,marginBottom:f.is_correct?0:5}}>
              {f.is_correct?"✅":"❌"} {f.question}
            </p>
            {!f.is_correct && (
              <p style={{fontSize:12,color:"var(--muted)"}}>
                Yours: <span style={{color:"var(--error)"}}>{f.your_answer==="__timeout__"?"⏰ Timed out":f.your_answer}</span>
                &nbsp;→ Correct: <span style={{color:"var(--success)"}}>{f.correct_answer}</span>
              </p>
            )}
          </div>
        ))}
      </div>
      <button className="btn btn-primary" onClick={onHome} style={{width:"100%"}}>Back to My Quizzes</button>
    </div>
  );
}