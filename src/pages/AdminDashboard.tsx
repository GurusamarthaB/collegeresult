import { useState, useEffect, FormEvent, ChangeEvent, DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { adminApiUrl } from "../lib/supabase";
import { ToastProvider, useToast } from "../components/Toast";

interface Student {
  roll_no: string;
  name: string;
  class_grade: string;
  stream: string;
  combination: string;
}

function AdminContent() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showStudentsModal, setShowStudentsModal] = useState(false);

  const [newStudent, setNewStudent] = useState({
    roll_no: "", name: "", password: "", class_grade: "", stream: "Science", combination: "",
  });
  const [addingStudent, setAddingStudent] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) navigate("/admin-login");
  }, [navigate]);

  const authHeaders = () => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      navigate("/admin-login");
      return {};
    }
    return { Authorization: `Bearer ${token}` };
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    navigate("/admin-login");
  };

  // ── Add Student ──────────────────────────
  const handleAddStudent = async (e: FormEvent) => {
    e.preventDefault();
    setAddingStudent(true);

    const body = {
      roll_no: newStudent.roll_no.trim(),
      name: newStudent.name.trim(),
      password: newStudent.password.trim() || undefined,
      class_grade: newStudent.class_grade.trim(),
      stream: newStudent.stream.trim(),
      combination: newStudent.combination.trim(),
    };

    try {
      const res = await fetch(`${adminApiUrl}/student`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showToast(data.message, "success");
        setNewStudent({ roll_no: "", name: "", password: "", class_grade: "", stream: "Science", combination: "" });
        setShowAddModal(false);
      } else {
        showToast(data.error || "Failed to add student", "error");
      }
    } catch {
      showToast("Network error", "error");
    }

    setAddingStudent(false);
  };

  // ── Upload Excel ─────────────────────────
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch(`${adminApiUrl}/upload-excel`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setUploadResult({ type: "success", message: data.message });
        showToast(data.message, "success");
        setTimeout(() => {
          setShowUploadModal(false);
          setSelectedFile(null);
          setUploadResult(null);
        }, 2000);
      } else {
        setUploadResult({ type: "error", message: data.error || "Upload failed" });
      }
    } catch {
      setUploadResult({ type: "error", message: "Server error. Please try again." });
    }

    setUploading(false);
  };

  // ── View Students ────────────────────────
  const loadStudents = async () => {
    setShowStudentsModal(true);
    setStudentsLoading(true);

    try {
      const res = await fetch(`${adminApiUrl}/students`, { headers: authHeaders() });
      const data = await res.json();

      if (res.ok && data.success) {
        setStudents(data.students || []);
      } else {
        setStudents([]);
        showToast(data.error || "Failed to load students", "error");
      }
    } catch {
      setStudents([]);
      showToast("Network error — could not load students", "error");
    }

    setStudentsLoading(false);
  };

  return (
    <>
      <div className="container">
        <div className="admin-dashboard">
          <div className="admin-header">
            <div>
              <h1>Sadvidya PU College</h1>
              <h2 style={{ textAlign: "left", marginBottom: 0 }}>Admin Dashboard</h2>
            </div>
            <button className="btn-logout btn-small" onClick={handleLogout}>
              <i className="fas fa-right-from-bracket" />
              &nbsp; Logout
            </button>
          </div>

          <div className="admin-grid">
            <div className="admin-card">
              <h3>👨‍🎓 Add Student</h3>
              <p>Create new student accounts and assign login passwords.</p>
              <button onClick={() => setShowAddModal(true)}>
                <i className="fas fa-user-plus" />
                &nbsp; Add Student
              </button>
            </div>

            <div className="admin-card">
              <h3>📊 Upload Results</h3>
              <p>Import marks from Excel sheets. Auto-calculates totals &amp; percentages.</p>
              <button onClick={() => setShowUploadModal(true)}>
                <i className="fas fa-file-excel" />
                &nbsp; Upload Excel
              </button>
            </div>

            <div className="admin-card">
              <h3>🏆 Generate Rank List</h3>
              <p>Rankings are auto-calculated from the Excel data during upload.</p>
              <button disabled style={{ opacity: 0.5 }}>
                <i className="fas fa-trophy" />
                &nbsp; Auto-generated
              </button>
            </div>

            <div className="admin-card">
              <h3>📋 View Students</h3>
              <p>See all registered students and their details.</p>
              <button onClick={loadStudents}>
                <i className="fas fa-list" />
                &nbsp; View All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div className="modal">
            <h2><i className="fas fa-user-plus" />&nbsp; Add New Student</h2>
            <form onSubmit={handleAddStudent}>
              <label htmlFor="newRollNo">Roll Number *</label>
              <input type="text" id="newRollNo" placeholder="e.g. 1001" value={newStudent.roll_no} onChange={(e) => setNewStudent({ ...newStudent, roll_no: e.target.value })} required />

              <label htmlFor="newName">Full Name *</label>
              <input type="text" id="newName" placeholder="e.g. Arjun Kumar" value={newStudent.name} onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })} required />

              <label htmlFor="newPassword">Password</label>
              <input type="text" id="newPassword" placeholder="Defaults to roll number" value={newStudent.password} onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })} />

              <label htmlFor="newClass">Class / Grade</label>
              <input type="text" id="newClass" placeholder="e.g. 12" value={newStudent.class_grade} onChange={(e) => setNewStudent({ ...newStudent, class_grade: e.target.value })} />

              <label htmlFor="newStream">Stream</label>
              <input type="text" id="newStream" placeholder="e.g. Science" value={newStudent.stream} onChange={(e) => setNewStudent({ ...newStudent, stream: e.target.value })} />

              <label htmlFor="newCombination">Combination</label>
              <input type="text" id="newCombination" placeholder="e.g. PCMC" value={newStudent.combination} onChange={(e) => setNewStudent({ ...newStudent, combination: e.target.value })} />

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" disabled={addingStudent}>
                  {addingStudent ? <><span className="spinner" /> Adding...</> : "Add Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Excel Modal */}
      {showUploadModal && (
        <div className="modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) setShowUploadModal(false); }}>
          <div className="modal">
            <h2><i className="fas fa-file-excel" />&nbsp; Upload Results Excel</h2>

            <div
              className="upload-area"
              onClick={() => document.getElementById("excelFileInput")?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={(e) => e.currentTarget}
              onDrop={handleDrop}
            >
              <i className="fas fa-cloud-arrow-up" />
              <p>Click or drag &amp; drop your <strong>.xlsx</strong> file here</p>
              {selectedFile && <p className="file-name">{selectedFile.name}</p>}
              <input type="file" id="excelFileInput" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleFileChange} />
            </div>

            <p style={{ color: "#9CA3AF", fontSize: "0.8rem", marginBottom: "16px", marginTop: "12px" }}>
              <i className="fas fa-info-circle" />&nbsp;
              Expected columns: RollNo, Name, Combination, English, Kannada, plus core science subjects marks.
            </p>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowUploadModal(false)}>Cancel</button>
              <button type="button" onClick={handleUpload} disabled={!selectedFile || uploading}>
                {uploading ? <><span className="spinner" /> Processing...</> : <><i className="fas fa-upload" />&nbsp; Upload</>}
              </button>
            </div>

            {uploadResult && (
              <p style={{
                color: uploadResult.type === "success" ? "#10B981" : "#EF4444",
                fontSize: "0.9rem", marginTop: "10px",
              }}>
                <i className={`fas ${uploadResult.type === "success" ? "fa-check-circle" : "fa-exclamation-triangle"}`} />
                &nbsp; {uploadResult.message}
              </p>
            )}
          </div>
        </div>
      )}

      {/* View Students Modal */}
      {showStudentsModal && (
        <div className="modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) setShowStudentsModal(false); }}>
          <div className="modal" style={{ maxWidth: "700px" }}>
            <h2><i className="fas fa-users" />&nbsp; Registered Students</h2>

            {studentsLoading ? (
              <div className="empty-state">
                <i className="fas fa-spinner fa-spin" />
                <p>Loading students...</p>
              </div>
            ) : students.length > 0 ? (
              <>
                <div className="student-table-wrapper">
                  <table className="student-table">
                    <thead>
                      <tr>
                        <th>Roll No</th>
                        <th>Name</th>
                        <th>Class</th>
                        <th>Stream</th>
                        <th>Combination</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s) => (
                        <tr key={s.roll_no}>
                          <td>{s.roll_no}</td>
                          <td>{s.name}</td>
                          <td>{s.class_grade || "—"}</td>
                          <td>{s.stream || "—"}</td>
                          <td>{s.combination || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p style={{ color: "#9CA3AF", fontSize: "0.8rem", marginTop: "12px" }}>
                  {students.length} student(s) registered
                </p>
              </>
            ) : (
              <div className="empty-state">
                <i className="fas fa-users-slash" />
                <p>No students registered yet</p>
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: "20px" }}>
              <button type="button" className="btn-secondary" onClick={() => setShowStudentsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function AdminDashboard() {
  return (
    <ToastProvider>
      <AdminContent />
    </ToastProvider>
  );
}
