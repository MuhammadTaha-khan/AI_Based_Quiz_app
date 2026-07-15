import React, { useState } from "react";
import RoleSelectPage from "./pages/shared/RoleSelectPage";
import AuthPage       from "./pages/shared/AuthPage";
import StudentApp     from "./pages/student/StudentApp";
import TeacherApp     from "./pages/teacher/TeacherApp";
import AdminApp       from "./pages/admin/AdminApp";
import "./App.css";

function App() {
  const [role, setRole] = useState(null);
  const [user, setUser] = useState(null);

  const handleLogin  = u  => setUser(u);
  const handleLogout = () => { setUser(null); setRole(null); };
  const handleBack   = () => setRole(null);

  if (!user) {
    if (!role) return <RoleSelectPage onSelect={setRole} />;
    return <AuthPage role={role} onLogin={handleLogin} onBack={handleBack} />;
  }

  if (user.role === "admin")   return <AdminApp   user={user} onLogout={handleLogout} />;
  if (user.role === "teacher") return <TeacherApp user={user} onLogout={handleLogout} />;
  return                              <StudentApp user={user} onLogout={handleLogout} />;
}

export default App;