import React, { useState } from "react";
import axios from "axios";

import API from "../config";

// ─────────────────────────────────────────────────────────
// EYE ICON — reusable component for show/hide password
// ─────────────────────────────────────────────────────────
function EyeIcon({ visible }) {
  // Closed eye (password hidden)
  if (!visible) return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
  // Open eye (password visible)
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────
// PASSWORD INPUT — input + eye toggle button combined
// ─────────────────────────────────────────────────────────
function PasswordInput({ value, onChange, onKeyDown, placeholder = "Password" }) {
  const [show, setShow] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <input
        className="input"
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        // Right padding so text doesn't go behind the eye button
        style={{ paddingRight: 48 }}
      />
      {/* Eye toggle button */}
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        style={{
          position: "absolute", right: 14, top: "50%",
          transform: "translateY(-50%)",
          background: "none", border: "none",
          cursor: "pointer", color: "var(--muted)",
          display: "flex", alignItems: "center",
          padding: 0, transition: "color 0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.color = "var(--text)"}
        onMouseLeave={e => e.currentTarget.style.color = "var(--muted)"}
        title={show ? "Hide password" : "Show password"}
      >
        <EyeIcon visible={show} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// MAIN LOGIN PAGE
// Modes: "login" | "register" | "forgot" | "verify"
// ─────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [mode, setMode] = useState("login");

  // Login fields
  const [loginId,  setLoginId]  = useState("");
  const [password, setPassword] = useState("");

  // Register fields
  const [username, setUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass,  setRegPass]  = useState("");

  // Forgot password fields
  const [forgotEmail,   setForgotEmail]   = useState("");
  const [resetToken,    setResetToken]    = useState(""); // the 6-digit code
  const [shownToken,    setShownToken]    = useState(""); // code displayed to user
  const [newPassword,   setNewPassword]   = useState("");
  const [confirmPass,   setConfirmPass]   = useState("");
  const [tokenFromUser, setTokenFromUser] = useState(""); // what user types

  // UI state
  const [error,   setError]   = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const clearMessages = () => { setError(null); setSuccess(null); };

  const switchMode = (m) => {
    setMode(m);
    clearMessages();
  };

  // ── SUBMIT: login or register ────────────────────────
  const handleAuthSubmit = async () => {
    clearMessages();
    if (mode === "login" && (!loginId.trim() || !password.trim()))
      return setError("Please fill in all fields.");
    if (mode === "register" && (!username.trim() || !regEmail.trim() || !regPass.trim()))
      return setError("All fields are required.");

    setLoading(true);
    try {
      let res;
      if (mode === "login") {
        res = await axios.post(`${API}/login`, { login: loginId, password });
      } else {
        res = await axios.post(`${API}/register`, { username, email: regEmail, password: regPass });
      }
      onLogin(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── SUBMIT: request reset code ───────────────────────
  const handleForgotSubmit = async () => {
    clearMessages();
    if (!forgotEmail.trim()) return setError("Please enter your email.");

    setLoading(true);
    try {
      const res = await axios.post(`${API}/forgot-password`, { email: forgotEmail });
      // The backend returns the code directly (no real email server needed)
      setShownToken(res.data.reset_token);
      setResetToken(res.data.reset_token);
      setSuccess("Reset code generated! See it displayed below.");
      switchMode("verify");
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // ── SUBMIT: verify code + set new password ───────────
  const handleResetSubmit = async () => {
    clearMessages();
    if (!tokenFromUser.trim())  return setError("Please enter the 6-digit code.");
    if (!newPassword.trim())    return setError("Please enter a new password.");
    if (newPassword !== confirmPass) return setError("Passwords do not match.");

    setLoading(true);
    try {
      const res = await axios.post(`${API}/reset-password`, {
        email:        forgotEmail,
        token:        tokenFromUser,
        new_password: newPassword,
      });
      setSuccess(res.data.message);
      // Auto-go back to login after 2 seconds
      setTimeout(() => switchMode("login"), 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const onKey = (handler) => (e) => { if (e.key === "Enter") handler(); };

  // ─────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────
  return (
    <div className="card" style={{ maxWidth: 420, marginTop: 20 }}>

      {/* ── Header ── */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>🧠</div>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>AI Quiz App</h1>
        <p style={{ color: "var(--muted)", marginTop: 6, fontSize: 14 }}>
          Adaptive quizzes powered by AI
        </p>
      </div>

      {/* ── Tabs (only for login/register) ── */}
      {(mode === "login" || mode === "register") && (
        <div style={{ display:"flex", background:"var(--bg)", borderRadius:10, padding:4, marginBottom:24 }}>
          {["login","register"].map(m => (
            <button key={m} onClick={() => switchMode(m)} style={{
              flex:1, padding:"10px",
              background: mode===m ? "var(--accent)" : "transparent",
              color: mode===m ? "white" : "var(--muted)",
              border:"none", borderRadius:8, cursor:"pointer",
              fontWeight:600, fontSize:14, fontFamily:"inherit", transition:"all 0.2s"
            }}>
              {m==="login" ? "🔑 Login" : "✨ Register"}
            </button>
          ))}
        </div>
      )}

      {/* Back button for forgot/verify screens */}
      {(mode === "forgot" || mode === "verify") && (
        <button onClick={() => switchMode("login")} style={{
          background:"none", border:"none", color:"var(--muted)", cursor:"pointer",
          fontSize:13, marginBottom:16, padding:0, display:"flex", alignItems:"center", gap:6
        }}>
          ← Back to Login
        </button>
      )}

      {/* ── Messages ── */}
      {error   && <div className="alert alert-error"  >{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* ══════════════════════════════════════════════ */}
      {/* LOGIN FORM                                     */}
      {/* ══════════════════════════════════════════════ */}
      {mode === "login" && (
        <>
          <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:16 }}>
            <input
              className="input" type="text"
              placeholder="Username or Email"
              value={loginId} onChange={e=>setLoginId(e.target.value)}
              onKeyDown={onKey(handleAuthSubmit)}
            />
            <PasswordInput
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={onKey(handleAuthSubmit)}
              placeholder="Password"
            />
          </div>

          {/* Forgot Password link */}
          <div style={{ textAlign:"right", marginBottom:20 }}>
            <button onClick={() => switchMode("forgot")} style={{
              background:"none", border:"none", color:"var(--accent)",
              cursor:"pointer", fontSize:13, fontWeight:600, padding:0
            }}>
              Forgot password?
            </button>
          </div>

          <button className="btn btn-primary" onClick={handleAuthSubmit}
            disabled={loading} style={{ width:"100%", padding:"14px", fontSize:16 }}>
            {loading ? "Please wait..." : "Login →"}
          </button>

          <p style={{ textAlign:"center", color:"var(--muted)", fontSize:13, marginTop:16 }}>
            No account yet? Click Register above.
          </p>
        </>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/* REGISTER FORM                                  */}
      {/* ══════════════════════════════════════════════ */}
      {mode === "register" && (
        <>
          <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:20 }}>
            <input className="input" type="text" placeholder="Username"
              value={username} onChange={e=>setUsername(e.target.value)}
              onKeyDown={onKey(handleAuthSubmit)} />
            <input className="input" type="email" placeholder="Email (e.g. you@gmail.com)"
              value={regEmail} onChange={e=>setRegEmail(e.target.value)}
              onKeyDown={onKey(handleAuthSubmit)} />
            <PasswordInput
              value={regPass}
              onChange={e => setRegPass(e.target.value)}
              onKeyDown={onKey(handleAuthSubmit)}
              placeholder="Password (min 6 characters)"
            />
            <p style={{ fontSize:12, color:"var(--muted)", marginTop:-6 }}>
              📧 You can also use your email to log in later.
            </p>
          </div>

          <button className="btn btn-primary" onClick={handleAuthSubmit}
            disabled={loading} style={{ width:"100%", padding:"14px", fontSize:16 }}>
            {loading ? "Please wait..." : "Create Account →"}
          </button>

          <p style={{ textAlign:"center", color:"var(--muted)", fontSize:13, marginTop:16 }}>
            Already have an account? Click Login above.
          </p>
        </>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/* FORGOT PASSWORD — Step 1: Enter email          */}
      {/* ══════════════════════════════════════════════ */}
      {mode === "forgot" && (
        <>
          <div style={{ marginBottom:20 }}>
            <h2 style={{ fontSize:20, fontWeight:800, marginBottom:6 }}>Reset Password</h2>
            <p style={{ color:"var(--muted)", fontSize:14 }}>
              Enter your registered email address. We'll generate a 6-digit reset code for you.
            </p>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:20 }}>
            <input className="input" type="email" placeholder="Your email address"
              value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)}
              onKeyDown={onKey(handleForgotSubmit)} />
          </div>

          <button className="btn btn-primary" onClick={handleForgotSubmit}
            disabled={loading} style={{ width:"100%", padding:"14px" }}>
            {loading ? "Generating code..." : "Send Reset Code →"}
          </button>
        </>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/* VERIFY — Step 2: Enter code + new password     */}
      {/* ══════════════════════════════════════════════ */}
      {mode === "verify" && (
        <>
          <div style={{ marginBottom:20 }}>
            <h2 style={{ fontSize:20, fontWeight:800, marginBottom:6 }}>Enter Reset Code</h2>
            <p style={{ color:"var(--muted)", fontSize:14 }}>
              Your 6-digit reset code is shown below. Enter it and choose a new password.
            </p>
          </div>

          {/* Show the generated code in a highlighted box */}
          {shownToken && (
            <div style={{
              background:"rgba(108,99,255,0.12)", border:"2px dashed var(--accent)",
              borderRadius:12, padding:"16px", textAlign:"center", marginBottom:20
            }}>
              <p style={{ color:"var(--muted)", fontSize:12, marginBottom:6 }}>Your Reset Code</p>
              <p style={{ fontSize:36, fontWeight:900, letterSpacing:8, color:"var(--accent)",
                          fontVariantNumeric:"tabular-nums" }}>
                {shownToken}
              </p>
              <p style={{ color:"var(--muted)", fontSize:11, marginTop:6 }}>⏱ Expires in 15 minutes</p>
            </div>
          )}

          <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:20 }}>
            <input className="input" type="text" placeholder="Enter the 6-digit code"
              value={tokenFromUser} onChange={e=>setTokenFromUser(e.target.value)}
              maxLength={6} style={{ letterSpacing:4, fontSize:18, textAlign:"center" }}
              onKeyDown={onKey(handleResetSubmit)} />

            <PasswordInput
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              onKeyDown={onKey(handleResetSubmit)}
              placeholder="New password (min 6 characters)"
            />
            <PasswordInput
              value={confirmPass}
              onChange={e => setConfirmPass(e.target.value)}
              onKeyDown={onKey(handleResetSubmit)}
              placeholder="Confirm new password"
            />
          </div>

          <button className="btn btn-primary" onClick={handleResetSubmit}
            disabled={loading} style={{ width:"100%", padding:"14px" }}>
            {loading ? "Resetting..." : "Reset Password ✓"}
          </button>

          <p style={{ textAlign:"center", color:"var(--muted)", fontSize:13, marginTop:12 }}>
            Didn't get a code?{" "}
            <button onClick={() => switchMode("forgot")} style={{
              background:"none", border:"none", color:"var(--accent)",
              cursor:"pointer", fontSize:13, fontWeight:600, padding:0
            }}>
              Try again
            </button>
          </p>
        </>
      )}

    </div>
  );
}

export default LoginPage;
