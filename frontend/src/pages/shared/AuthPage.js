import React, { useState } from "react";
import axios from "axios";

import API from "../../config";

// ── Eye icon ──────────────────────────────────────────────
function Eye({ show }) {
  return show ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

// ── Password input with show/hide eye ─────────────────────
function PwInput({ value, onChange, onKeyDown, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input className="input" type={show ? "text" : "password"}
        placeholder={placeholder || "Password"}
        value={value} onChange={onChange} onKeyDown={onKeyDown}
        style={{ paddingRight: 46 }} />
      <button type="button" onClick={() => setShow(s => !s)} style={{
        position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
        background: "none", border: "none", cursor: "pointer",
        color: "var(--muted)", display: "flex", alignItems: "center", padding: 0
      }}>
        <Eye show={show} />
      </button>
    </div>
  );
}

// ── Role meta ─────────────────────────────────────────────
const ROLE_META = {
  student: { icon: "🎓",  color: "var(--accent2)", label: "Student" },
  teacher: { icon: "👩‍🏫", color: "var(--accent)",  label: "Teacher" },
  admin:   { icon: "🛡️",  color: "#f59e0b",         label: "Admin"   },
};

// ══════════════════════════════════════════════════════════
//  ADMIN LOGIN — username + password only, no register tab
// ══════════════════════════════════════════════════════════
function AdminLogin({ onLogin, onBack }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(false);

  const submit = async () => {
    setError(null);
    if (!username.trim() || !password.trim()) {
      return setError("Please enter username and password.");
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/login`, {
        login: username.trim(),
        password,
        role: "admin"
      });
      onLogin(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || "Wrong credentials.");
    } finally {
      setLoading(false);
    }
  };

  const onKey = e => { if (e.key === "Enter") submit(); };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", padding: "20px" }}>
      <div className="card" style={{ maxWidth: 400 }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 52, marginBottom: 10 }}>🛡️</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Admin Portal</h1>
          <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 6 }}>
            Restricted access — authorised personnel only
          </p>
          <div style={{
            display: "inline-block", background: "rgba(245,158,11,0.15)",
            color: "#f59e0b", padding: "3px 14px", borderRadius: 99,
            fontSize: 12, fontWeight: 700, marginTop: 8, letterSpacing: "0.05em"
          }}>
            ADMIN
          </div>
        </div>

        {/* Back */}
        <button onClick={onBack} style={{
          background: "none", border: "none", color: "var(--muted)", cursor: "pointer",
          fontSize: 13, marginBottom: 20, padding: 0,
          display: "flex", alignItems: "center", gap: 6
        }}>
          ← Back to role select
        </button>

        {/* Divider */}
        <div style={{
          background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)",
          borderRadius: 10, padding: "10px 14px", marginBottom: 20,
          display: "flex", alignItems: "center", gap: 10
        }}>
          <span style={{ fontSize: 16 }}>🔒</span>
          <p style={{ color: "#f59e0b", fontSize: 13, margin: 0, fontWeight: 600 }}>
            Admin login only — no registration available
          </p>
        </div>

        {/* Error */}
        {error && <div className="alert alert-error">{error}</div>}

        {/* Form — username + password only */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
          <input
            className="input"
            type="text"
            placeholder="Admin username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={onKey}
          />
          <PwInput
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={onKey}
            placeholder="Admin password"
          />
        </div>

        {/* Submit */}
        <button
          className="btn"
          onClick={submit}
          disabled={loading}
          style={{
            width: "100%", padding: "14px", fontSize: 16, fontWeight: 700,
            background: "linear-gradient(135deg, #f59e0b, #d97706)",
            color: "white", border: "none", borderRadius: 10,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1, fontFamily: "inherit",
            transition: "all 0.2s"
          }}
        >
          {loading ? "Logging in..." : "Login as Admin →"}
        </button>

        {/* Default credentials hint */}
        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 12, marginTop: 16 }}>
          Default: <strong style={{ color: "var(--text)" }}>admin</strong> /
          <strong style={{ color: "var(--text)" }}> admin123</strong>
        </p>

      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  STUDENT / TEACHER AUTH — full login + register + verify + forgot
// ══════════════════════════════════════════════════════════
function StudentTeacherAuth({ role, onLogin, onBack }) {
  const meta = ROLE_META[role] || ROLE_META.student;

  // Teachers cannot self-register — always start on login
  const [mode,        setMode]        = useState("login");
  // login
  const [loginId,     setLoginId]     = useState("");
  const [password,    setPassword]    = useState("");
  // register
  const [username,    setUsername]    = useState("");
  const [regEmail,    setRegEmail]    = useState("");
  const [regPass,     setRegPass]     = useState("");
  const [rollNumber,  setRollNumber]  = useState("");
  const [batch,       setBatch]       = useState("");
  const [degree,      setDegree]      = useState("");
  const [section,     setSection]     = useState("");
  // verify
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyCode,  setVerifyCode]  = useState("");
  // forgot / reset
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetCode,   setResetCode]   = useState("");
  const [newPass,     setNewPass]     = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  const [error,   setError]   = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const clear = () => { setError(null); setSuccess(null); };
  const go    = m  => { setMode(m); clear(); };
  const onKey = e  => { if (e.key === "Enter") submit(); };

  const submit = async () => {
    clear();
    setLoading(true);
    try {
      if (mode === "login") {
        if (!loginId || !password) return setError("Fill in all fields.");
        const res = await axios.post(`${API}/login`, { login: loginId, password, role });
        onLogin(res.data.user);

      } else if (mode === "register") {
        if (!username || !regEmail || !regPass || !rollNumber || !batch || !degree || !section)
          return setError("All fields required.");
        if (!/^\d[Kk]\d{2}_[A-Za-z]+_\d+$/.test(rollNumber))
          return setError("Roll number must be in format like 2K22_BSCS_442");
        if (regPass.length < 6)          return setError("Password must be at least 6 characters.");
        if (!/[A-Z]/.test(regPass))      return setError("Password must contain at least one uppercase letter (A-Z).");
        if (!/[a-z]/.test(regPass))      return setError("Password must contain at least one lowercase letter (a-z).");
        await axios.post(`${API}/register`, {
          username, email: regEmail, password: regPass, role,
          roll_number: rollNumber.toUpperCase(),
          batch, degree,
          section: section.toUpperCase(),
        });
        setVerifyEmail(regEmail);
        setSuccess("Account created! Check your email for the 6-digit code.");
        go("verify");

      } else if (mode === "verify") {
        if (!verifyCode) return setError("Enter the 6-digit code.");
        const res = await axios.post(`${API}/verify-email`, { email: verifyEmail, code: verifyCode });
        setSuccess(res.data.message);
        setTimeout(() => go("login"), 1500);

      } else if (mode === "forgot") {
        if (!forgotEmail) return setError("Enter your email.");
        await axios.post(`${API}/forgot-password`, { email: forgotEmail });
        setSuccess("If registered, a reset code has been sent to your inbox.");
        go("reset");

      } else if (mode === "reset") {
        if (!resetCode || !newPass)      return setError("Fill in all fields.");
        if (newPass.length < 6)          return setError("Password must be at least 6 characters.");
        if (!/[A-Z]/.test(newPass))      return setError("Password must contain at least one uppercase letter (A-Z).");
        if (!/[a-z]/.test(newPass))      return setError("Password must contain at least one lowercase letter (a-z).");
        if (newPass !== confirmPass)      return setError("Passwords don't match.");
        const res = await axios.post(`${API}/reset-password`,
          { email: forgotEmail, token: resetCode, new_password: newPass });
        setSuccess(res.data.message);
        setTimeout(() => go("login"), 1500);
      }
    } catch (err) {
      const e = err.response?.data;
      if (e?.needs_verification) {
        setVerifyEmail(e.email);
        setError("Please verify your email first.");
        go("verify");
      } else {
        setError(e?.error || "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", padding: "20px" }}>
      <div className="card" style={{ maxWidth: 420 }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{meta.icon}</div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>
            {mode === "verify" ? "Verify Email"
              : mode === "forgot" || mode === "reset" ? "Reset Password"
              : `${meta.label} Portal`}
          </h1>
          <div style={{
            display: "inline-block", background: meta.color + "22", color: meta.color,
            padding: "3px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700, marginTop: 6
          }}>
            {meta.label.toUpperCase()}
          </div>
        </div>

        {/* Back button */}
        <button
          onClick={["login","register"].includes(mode) ? onBack : () => go("login")}
          style={{
            background: "none", border: "none", color: "var(--muted)", cursor: "pointer",
            fontSize: 13, marginBottom: 16, padding: 0,
            display: "flex", alignItems: "center", gap: 6
          }}>
          ← {["login","register"].includes(mode) ? "Back to role select" : "Back to login"}
        </button>

        {/* Login / Register tabs — Register hidden for teachers */}
        {(mode === "login" || mode === "register") && (
          role === "teacher" ? (
            <div style={{
              background: "rgba(108,99,255,0.1)", border: "1px solid rgba(108,99,255,0.3)",
              borderRadius: 10, padding: "10px 14px", marginBottom: 20,
              display: "flex", alignItems: "center", gap: 10
            }}>
              <span style={{ fontSize: 16 }}>🔒</span>
              <p style={{ color: "var(--accent)", fontSize: 13, margin: 0, fontWeight: 600 }}>
                Teacher accounts are created by Admin only — no self-registration.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", background: "var(--bg)", borderRadius: 10,
              padding: 4, marginBottom: 20 }}>
              {["login","register"].map(m => (
                <button key={m} onClick={() => go(m)} style={{
                  flex: 1, padding: "10px",
                  background: mode === m ? meta.color : "transparent",
                  color: mode === m ? "white" : "var(--muted)",
                  border: "none", borderRadius: 8, cursor: "pointer",
                  fontWeight: 600, fontSize: 14, fontFamily: "inherit", transition: "all 0.2s"
                }}>
                  {m === "login" ? "🔑 Login" : "✨ Register"}
                </button>
              ))}
            </div>
          )
        )}

        {error   && <div className="alert alert-error"  >{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* ── LOGIN ── */}
        {mode === "login" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <input className="input" type="text" placeholder="Username or Email"
              value={loginId} onChange={e => setLoginId(e.target.value)} onKeyDown={onKey} />
            <PwInput value={password} onChange={e => setPassword(e.target.value)} onKeyDown={onKey} />
            <button onClick={() => go("forgot")} style={{
              background: "none", border: "none", color: meta.color,
              cursor: "pointer", fontSize: 13, fontWeight: 600,
              textAlign: "right", padding: 0
            }}>
              Forgot password?
            </button>
          </div>
        )}

        {/* ── REGISTER ── */}
        {mode === "register" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input className="input" type="text" placeholder="Full Name"
              value={username} onChange={e => setUsername(e.target.value)} onKeyDown={onKey} />
            <input className="input" type="email" placeholder="Email address (must be real)"
              value={regEmail} onChange={e => setRegEmail(e.target.value)} onKeyDown={onKey} />
            <div>
              <input className="input" type="text" placeholder="Roll Number (e.g. 2K22_BSCS_442)"
                value={rollNumber} onChange={e => setRollNumber(e.target.value)} onKeyDown={onKey}
                style={{ textTransform: "uppercase" }} />
              <p style={{ fontSize: 11, color: "var(--muted)", margin: "4px 0 0 4px" }}>
                Format: &lt;digit&gt;K&lt;YY&gt;_&lt;DEGREE_CODE&gt;_&lt;NUMBER&gt;
              </p>
            </div>
            <select className="input" value={batch} onChange={e => setBatch(e.target.value)}
              style={{ cursor: "pointer" }}>
              <option value="">Select Batch</option>
              <option value="2K22">2K22</option>
              <option value="2K23">2K23</option>
              <option value="2K24">2K24</option>
              <option value="2K25">2K25</option>
            </select>
            <select className="input" value={degree} onChange={e => setDegree(e.target.value)}
              style={{ cursor: "pointer" }}>
              <option value="">Select Degree</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Software Engineering">Software Engineering</option>
            </select>
            <input className="input" type="text" placeholder="Section (e.g. A, B, C)"
              value={section} onChange={e => setSection(e.target.value)} onKeyDown={onKey}
              style={{ textTransform: "uppercase" }} />
            <PwInput value={regPass} onChange={e => setRegPass(e.target.value)} onKeyDown={onKey}
              placeholder="Password (min 6, upper & lowercase)" />
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -4 }}>
              📧 A verification code will be sent to confirm your email.
            </p>
          </div>
        )}

        {/* ── VERIFY EMAIL ── */}
        {mode === "verify" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="alert alert-info">
              A 6-digit code was sent to <strong>{verifyEmail}</strong>. Enter it below.
            </div>
            <input className="input" type="text" placeholder="6-digit verification code"
              value={verifyCode} onChange={e => setVerifyCode(e.target.value)} onKeyDown={onKey}
              maxLength={6} style={{ letterSpacing: 6, fontSize: 20, textAlign: "center" }} />
          </div>
        )}

        {/* ── FORGOT ── */}
        {mode === "forgot" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ color: "var(--muted)", fontSize: 14 }}>
              Enter your registered email. We'll send a reset code.
            </p>
            <input className="input" type="email" placeholder="Your email address"
              value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} onKeyDown={onKey} />
          </div>
        )}

        {/* ── RESET ── */}
        {mode === "reset" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="alert alert-info">Check your inbox for the 6-digit code.</div>
            <input className="input" type="text" placeholder="6-digit reset code"
              value={resetCode} onChange={e => setResetCode(e.target.value)} onKeyDown={onKey}
              maxLength={6} style={{ letterSpacing: 6, fontSize: 20, textAlign: "center" }} />
            <PwInput value={newPass} onChange={e => setNewPass(e.target.value)} onKeyDown={onKey}
              placeholder="New password (min 6, upper & lowercase)" />
            <PwInput value={confirmPass} onChange={e => setConfirmPass(e.target.value)} onKeyDown={onKey}
              placeholder="Confirm new password" />
          </div>
        )}

        {/* Submit button */}
        <button className="btn btn-primary" onClick={submit} disabled={loading}
          style={{ width: "100%", marginTop: 20, padding: "14px", fontSize: 16, background: meta.color }}>
          {loading        ? "Please wait..."      :
           mode==="login" ? `Login as ${meta.label} →` :
           mode==="register" ? "Create Account →" :
           mode==="verify"   ? "Verify Email ✓"   :
           mode==="forgot"   ? "Send Reset Code →" : "Reset Password ✓"}
        </button>

      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  MAIN EXPORT — routes to admin or student/teacher auth
// ══════════════════════════════════════════════════════════
export default function AuthPage({ role, onLogin, onBack }) {
  // Admin gets a completely separate, simpler login screen
  if (role === "admin") {
    return <AdminLogin onLogin={onLogin} onBack={onBack} />;
  }
  // Students and teachers get the full login/register flow
  return <StudentTeacherAuth role={role} onLogin={onLogin} onBack={onBack} />;
}