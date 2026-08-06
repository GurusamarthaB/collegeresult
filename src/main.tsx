import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import StudentLogin from "./pages/StudentLogin";
import ResultPage from "./pages/ResultPage";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import { isSupabaseConfigured } from "./lib/supabase";
import "./index.css";

function SetupRequired() {
  return (
    <div className="container">
      <div className="login-card">
        <h1>Sadvidya PU College</h1>
        <h2>Student Result Portal</h2>
        <p className="portal-description">
          This site isn't connected to its database yet. Set the{" "}
          <strong>VITE_SUPABASE_URL</strong> and{" "}
          <strong>VITE_SUPABASE_ANON_KEY</strong> environment variables in the
          site's configuration and redeploy to enable login and results.
        </p>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isSupabaseConfigured ? (
      <HashRouter>
        <Routes>
          <Route path="/" element={<StudentLogin />} />
          <Route path="/result" element={<ResultPage />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </HashRouter>
    ) : (
      <SetupRequired />
    )}
  </React.StrictMode>
);
