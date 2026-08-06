import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { ToastProvider, useToast } from "../components/Toast";

function StudentLoginForm() {
  const [rollNo, setRollNo] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const normalizedRollNo = rollNo.trim().toUpperCase();
    const trimmedPassword = password.trim();

    if (!normalizedRollNo || !trimmedPassword) {
      showToast("Please enter both roll number and password", "warning");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc("student_login", {
        p_roll_no: normalizedRollNo,
        p_password: trimmedPassword,
      });

      if (error || !data || data.length === 0) {
        showToast("Invalid credentials", "error");
        setLoading(false);
        return;
      }

      showToast("Login successful! Redirecting...", "success");
      localStorage.setItem("student_roll_no", normalizedRollNo);
      setTimeout(() => navigate("/result"), 600);
    } catch {
      showToast("Network error — please try again", "error");
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="login-card">
        <h1>Sadvidya PU College</h1>
        <h2>Student Result Portal</h2>
        <p className="portal-description">
          Access your academic performance, semester results and ranking securely.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="roll_no">Roll Number</label>
          <input
            type="text"
            id="roll_no"
            placeholder="Enter your roll number"
            value={rollNo}
            onChange={(e) => setRollNo(e.target.value)}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" />
                Logging in...
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt" />
                &nbsp; View Result
              </>
            )}
          </button>
        </form>

        <hr />

        <div style={{ textAlign: "center" }}>
          <a
            className="admin-link"
            onClick={() => (window.location.href = "/admin-login")}
          >
            <i className="fas fa-lock" />
            &nbsp; Admin Access
          </a>
        </div>
      </div>
    </div>
  );
}

export default function StudentLogin() {
  return (
    <ToastProvider>
      <StudentLoginForm />
    </ToastProvider>
  );
}
