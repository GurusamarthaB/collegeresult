import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { ToastProvider, useToast } from "../components/Toast";

interface ResultData {
  roll_no: string;
  name: string;
  class_grade: string;
  stream: string;
  combination: string;
  marks: Record<string, number | null>;
  total_marks: number | null;
  percentage: number | null;
  rank: number | null;
}

function ResultContent() {
  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const rollNo = localStorage.getItem("student_roll_no");
    if (!rollNo) {
      navigate("/");
      return;
    }

    const normalizedRollNo = rollNo.trim().toUpperCase();

    (async () => {
      try {
        const { data: result, error } = await supabase.rpc("get_student_result", {
          p_roll_no: normalizedRollNo,
        });

        if (error || !result || result.error) {
          showToast(result?.error || "Failed to load results", "error");
          setLoading(false);
          return;
        }

        setData(result as ResultData);
        setLoading(false);
      } catch {
        showToast("Network error — could not load results", "error");
        setLoading(false);
      }
    })();
  }, [navigate, showToast]);

  const handleLogout = () => {
    localStorage.removeItem("student_roll_no");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="result-wrapper">
        <div className="result-card" style={{ textAlign: "center", padding: "60px" }}>
          <span className="spinner" style={{ borderColor: "rgba(97,45,83,0.2)", borderTopColor: "#612D53", width: "36px", height: "36px" }} />
          <p style={{ color: "#9CA3AF", marginTop: "16px" }}>Loading your result...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="result-wrapper">
        <div className="result-card" style={{ textAlign: "center", padding: "60px" }}>
          <i className="fas fa-exclamation-triangle" style={{ fontSize: "3rem", color: "#9CA3AF", marginBottom: "16px" }} />
          <p style={{ color: "#9CA3AF" }}>No results found. Please check your credentials.</p>
          <button onClick={handleLogout} style={{ marginTop: "24px", maxWidth: "200px", margin: "24px auto 0" }}>
            <i className="fas fa-sign-out-alt" />&nbsp; Back to Login
          </button>
        </div>
      </div>
    );
  }

  const subjectOrder = ["Physics", "Chemistry", "Mathematics", "Biology", "Computer Science", "English", "Kannada"];
  const marks = data.marks || {};
  const subjects = subjectOrder.filter((s) => marks[s] != null);
  const fallbackSubjects = subjects.length > 0 ? subjects : Object.keys(marks);

  return (
    <div className="result-wrapper">
      <div className="result-card">
        <h1>Sadvidya PU College</h1>
        <h2>Academic Performance Report</h2>

        <div className="student-info">
          <div className="info-row">
            <i className="fas fa-user" />
            <span className="label">Name:</span>
            <span>{data.name || "—"}</span>
          </div>
          <div className="info-row">
            <i className="fas fa-id-card" />
            <span className="label">Roll No:</span>
            <span>{data.roll_no || "—"}</span>
          </div>
          <div className="info-row">
            <i className="fas fa-graduation-cap" />
            <span className="label">Class:</span>
            <span>{data.class_grade || "—"}</span>
          </div>
          <div className="info-row">
            <i className="fas fa-layer-group" />
            <span className="label">Stream:</span>
            <span>{data.stream || "Science"}</span>
          </div>
          <div className="info-row">
            <i className="fas fa-book" />
            <span className="label">Combination:</span>
            <span>{data.combination || "—"}</span>
          </div>
        </div>

        <hr />

        <table className="marks-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Marks (out of 100)</th>
            </tr>
          </thead>
          <tbody>
            {fallbackSubjects.length === 0 ? (
              <tr>
                <td colSpan={2} style={{ textAlign: "center", color: "#9CA3AF" }}>
                  No marks available for this student.
                </td>
              </tr>
            ) : (
              fallbackSubjects.map((subject) => (
                <tr key={subject}>
                  <td>{subject}</td>
                  <td>{marks[subject] ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="stats">
          <div className="stat-box">
            <div className="stat-icon">
              <i className="fas fa-file-alt" />
            </div>
            <div>
              <div className="stat-title">Total Marks</div>
              <div className="stat-value">{data.total_marks ?? "—"}</div>
            </div>
          </div>

          <div className="stat-box">
            <div className="stat-icon">
              <i className="fas fa-percent" />
            </div>
            <div>
              <div className="stat-title">Percentage</div>
              <div className="stat-value">{data.percentage != null ? `${data.percentage}%` : "—"}</div>
            </div>
          </div>

          <div className="stat-box">
            <div className="stat-icon">
              <i className="fas fa-award" />
            </div>
            <div>
              <div className="stat-title">Rank</div>
              <div className="stat-value">{data.rank ?? "—"}</div>
            </div>
          </div>
        </div>

        <hr />

        <div className="back-link" style={{ display: "flex", justifyContent: "center", gap: "24px", flexWrap: "wrap" }}>
          <a onClick={handleLogout}>
            <i className="fas fa-sign-out-alt" />
            Logout
          </a>
        </div>
      </div>
    </div>
  );
}

export default function ResultPage() {
  return (
    <ToastProvider>
      <ResultContent />
    </ToastProvider>
  );
}
