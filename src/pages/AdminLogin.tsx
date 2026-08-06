import { useState, FormEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminApiUrl } from "../lib/supabase";
import { ToastProvider, useToast } from "../components/Toast";

function AdminLoginForm() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const existingToken = localStorage.getItem("admin_token");
    if (existingToken) navigate("/admin");
  }, [navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = password.trim();

    if (!trimmed) {
      showToast("Please enter the admin password", "warning");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${adminApiUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: trimmed }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem("admin_token", data.token);
        showToast("Admin login successful!", "success");
        setTimeout(() => navigate("/admin"), 500);
      } else {
        showToast(data.error || "Incorrect password", "error");
        setLoading(false);
      }
    } catch {
      showToast("Network error — please try again", "error");
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="login-card">
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              background: "linear-gradient(135deg,#612D53,#7B3F6B)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px",
            }}
          >
            <i className="fas fa-shield-halved" style={{ color: "white", fontSize: "1.8rem" }} />
          </div>
        </div>

        <h1>Admin Access</h1>
        <h2>Sadvidya PU College Portal</h2>

        <form onSubmit={handleSubmit}>
          <label htmlFor="adminPassword">Admin Password</label>
          <input
            type="password"
            id="adminPassword"
            placeholder="Enter admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
          />

          <button type="submit" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" />
                Authenticating...
              </>
            ) : (
              <>
                <i className="fas fa-right-to-bracket" />
                &nbsp; Login
              </>
            )}
          </button>
        </form>

        <hr />

        <div style={{ textAlign: "center" }}>
          <a className="admin-link" onClick={() => navigate("/")}>
            <i className="fas fa-arrow-left" />
            &nbsp; Back to Student Portal
          </a>
        </div>
      </div>
    </div>
  );
}

export default function AdminLogin() {
  return (
    <ToastProvider>
      <AdminLoginForm />
    </ToastProvider>
  );
}
