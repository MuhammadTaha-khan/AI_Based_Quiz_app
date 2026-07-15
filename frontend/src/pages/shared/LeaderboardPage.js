import React, { useState, useEffect } from "react";
import axios from "axios";

import API from "../../config";
const sc = p => p>=70?"var(--success)":p>=40?"var(--warning)":"var(--error)";

function RankIcon({ rank }) {
  if (rank===1) return <span style={{color:"#ffd700",fontSize:18}}>🥇</span>;
  if (rank===2) return <span style={{color:"#c0c0c0",fontSize:18}}>🥈</span>;
  if (rank===3) return <span style={{color:"#cd7f32",fontSize:18}}>🥉</span>;
  return <span style={{color:"var(--muted)",fontWeight:700}}>#{rank}</span>;
}

export default function LeaderboardPage({ currentUser }) {
  const [data, setData]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    axios.get(`${API}/leaderboard`)
      .then(r=>{ setData(r.data.leaderboard); setLoading(false); })
      .catch(()=>setLoading(false));
  },[]);

  return (
    <div className="card">
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontSize:44,marginBottom:8}}>🏆</div>
        <h2 style={{fontSize:22,fontWeight:800}}>Leaderboard</h2>
        <p style={{color:"var(--muted)",fontSize:14,marginTop:4}}>Top students by average score</p>
      </div>

      {loading && <p style={{textAlign:"center",color:"var(--muted)"}}>Loading...</p>}

      {!loading && data.length===0 && (
        <div style={{textAlign:"center",padding:"32px 0"}}>
          <div style={{fontSize:44,marginBottom:12}}>📭</div>
          <p style={{color:"var(--muted)"}}>No scores yet. Take a quiz to appear here!</p>
        </div>
      )}

      {!loading && data.length>0 && (
        <table className="lb-table">
          <thead>
            <tr><th>Rank</th><th>Student</th><th>Quizzes</th><th>Avg Score</th></tr>
          </thead>
          <tbody>
            {data.map((r,i)=>{
              const isMe = currentUser && r.username===currentUser.username;
              return (
                <tr key={i} className={isMe?"current-user":""}>
                  <td><RankIcon rank={i+1}/></td>
                  <td>
                    <span style={{fontWeight:isMe?800:600}}>{r.username}</span>
                    {isMe&&<span style={{marginLeft:8,fontSize:11,background:"rgba(108,99,255,0.2)",
                      color:"var(--accent)",padding:"2px 8px",borderRadius:99,fontWeight:700}}>You</span>}
                  </td>
                  <td style={{color:"var(--muted)"}}>{r.quizzes||"—"}</td>
                  <td><span style={{fontWeight:700,color:sc(r.avg_score)}}>{r.avg_score}%</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}