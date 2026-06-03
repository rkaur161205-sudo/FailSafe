import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";

const RISK_STYLE = {
  high:   { background: "rgba(248,113,113,0.12)", color: "#f87171", border: "1px solid rgba(248,113,113,0.25)" },
  medium: { background: "rgba(251,191,36,0.12)",  color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" },
  low:    { background: "rgba(74,222,128,0.12)",   color: "#4ade80", border: "1px solid rgba(74,222,128,0.25)" },
};

const RISK_ORDER = { high: 0, medium: 1, low: 2 };

function sortByRisk(list) {
  return [...list].sort((a, b) => {
    const ra = RISK_ORDER[a.risk_label] ?? 3;
    const rb = RISK_ORDER[b.risk_label] ?? 3;
    if (ra !== rb) return ra - rb;
    return (b.risk_score ?? 0) - (a.risk_score ?? 0);
  });
}

function RiskBadge({ label }) {
  if (!label) return <span style={{ color: "#6b6b84", fontSize: 12 }}>—</span>;
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium capitalize" style={RISK_STYLE[label] ?? {}}>
      {label}
    </span>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [uploading, setUploading] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [fetchError, setFetchError] = useState("");
  const [loading, setLoading] = useState(true);

  async function fetchStudents() {
    setFetchError("");
    try {
      const { data } = await client.get("/students/");
      setStudents(data);
    } catch (err) {
      setFetchError(err.response?.data?.detail || "Failed to load students.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchStudents(); }, []);

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  async function handleUpload() {
    const file = fileRef.current?.files[0];
    if (!file) return;
    setUploadError("");
    setUploadSuccess("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await client.post("/students/upload", form);
      setUploadSuccess(`Upload complete — ${data.uploaded} student${data.uploaded !== 1 ? "s" : ""} processed.`);
      setStudents(data.students ?? []);
      setSelected(new Set());
      fileRef.current.value = "";
    } catch (err) {
      setUploadError(err.response?.data?.detail || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === students.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(students.map(s => s.student_id)));
    }
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!window.confirm(`Remove ${selected.size} student${selected.size !== 1 ? "s" : ""} and all their predictions?`)) return;
    setBulkDeleting(true);
    try {
      await client.delete("/students/bulk", { data: { student_ids: [...selected] } });
      setStudents(prev => prev.filter(s => !selected.has(s.student_id)));
      setSelected(new Set());
    } catch (err) {
      alert(err.response?.data?.detail || "Bulk delete failed.");
    } finally {
      setBulkDeleting(false);
    }
  }

  const sorted  = sortByRisk(students);
  const total   = students.length;
  const high    = students.filter(s => s.risk_label === "high").length;
  const medium  = students.filter(s => s.risk_label === "medium").length;
  const low     = students.filter(s => s.risk_label === "low").length;
  const allChecked = students.length > 0 && selected.size === students.length;
  const someChecked = selected.size > 0 && selected.size < students.length;

  return (
    <div className="min-h-screen" style={{ background: "#1e1e2e", color: "#ececf1" }}>
      {/* Navbar */}
      <nav className="px-6 py-4 flex items-center justify-between" style={{ background: "#252537", borderBottom: "1px solid #3a3a4c" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#7c6af7" }}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="font-bold text-lg tracking-tight" style={{ color: "#ececf1" }}>FailSafe</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm px-3 py-1.5 rounded-lg transition-colors"
          style={{ color: "#9b9bb4" }}
          onMouseEnter={e => { e.target.style.color = "#ececf1"; e.target.style.background = "#3a3a4c"; }}
          onMouseLeave={e => { e.target.style.color = "#9b9bb4"; e.target.style.background = "transparent"; }}
        >
          Sign out
        </button>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Upload card */}
        <div className="rounded-2xl p-6" style={{ background: "#2a2a3c", border: "1px solid #3a3a4c" }}>
          <h2 className="text-base font-semibold mb-1" style={{ color: "#ececf1" }}>Upload Student CSV</h2>
          <p className="text-sm mb-4" style={{ color: "#9b9bb4" }}>
            CSV must include the UCI student performance fields used by the model. See the README or `backend/ml/data/sample_students.csv` for the full schema.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:text-white file:cursor-pointer cursor-pointer file:bg-[#3a3a4c] hover:file:bg-[#4a4a5c]"
              style={{ color: "#9b9bb4" }}
            />
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="px-5 py-2 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "#7c6af7" }}
              onMouseEnter={e => { if (!uploading) e.target.style.background = "#6a59e0"; }}
              onMouseLeave={e => e.target.style.background = "#7c6af7"}
            >
              {uploading ? "Uploading…" : "Upload Students"}
            </button>
          </div>
          {uploadError   && <p className="mt-3 text-sm" style={{ color: "#f87171" }}>{uploadError}</p>}
          {uploadSuccess && <p className="mt-3 text-sm" style={{ color: "#4ade80" }}>{uploadSuccess}</p>}
        </div>

        {/* Stats */}
        {!loading && total > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Students", value: total,  color: "#ececf1" },
              { label: "High Risk",      value: high,   color: "#f87171" },
              { label: "Medium Risk",    value: medium, color: "#fbbf24" },
              { label: "Low Risk",       value: low,    color: "#4ade80" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-2xl px-5 py-4" style={{ background: "#2a2a3c", border: "1px solid #3a3a4c" }}>
                <p className="text-xs mb-1" style={{ color: "#6b6b84" }}>{label}</p>
                <p className="text-3xl font-bold" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Model Insights */}
        <div className="rounded-2xl p-6" style={{ background: "#2a2a3c", border: "1px solid #3a3a4c" }}>
          <h2 className="text-base font-semibold mb-1" style={{ color: "#ececf1" }}>Model Insights</h2>
          <p className="text-xs mb-5" style={{ color: "#9b9bb4" }}>Generated from the XGBoost model trained on the student dataset</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(() => {
              const apiBaseUrl = import.meta.env.VITE_API_URL || "https://failsafe-backend.onrender.com";
              return (
                <>
                  <img src={`${apiBaseUrl}/ml/plots/feature_importance`} alt="Feature importance" className="w-full rounded-xl" />
                  <img src={`${apiBaseUrl}/ml/plots/risk_distribution`} alt="Risk distribution" className="w-full rounded-xl" />
                </>
              );
            })()}
          </div>
        </div>

        {/* Students table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "#2a2a3c", border: "1px solid #3a3a4c" }}>
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #3a3a4c" }}>
            <div>
              <h2 className="text-base font-semibold" style={{ color: "#ececf1" }}>Students</h2>
              {students.length > 0 && (
                <p className="text-xs mt-0.5" style={{ color: "#6b6b84" }}>Sorted by highest risk</p>
              )}
            </div>
            {selected.size > 0 && (
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="text-sm px-4 py-1.5 rounded-lg font-medium disabled:opacity-50"
                style={{ color: "#f87171", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)" }}
                onMouseEnter={e => { e.target.style.background = "rgba(248,113,113,0.2)"; }}
                onMouseLeave={e => { e.target.style.background = "rgba(248,113,113,0.1)"; }}
              >
                {bulkDeleting ? "Deleting…" : `Delete selected (${selected.size})`}
              </button>
            )}
          </div>

          {loading ? (
            <div className="px-6 py-10 text-center text-sm" style={{ color: "#6b6b84" }}>Loading…</div>
          ) : fetchError ? (
            <div className="px-6 py-6 text-sm" style={{ color: "#f87171" }}>{fetchError}</div>
          ) : students.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm" style={{ color: "#6b6b84" }}>
              No students yet. Upload a CSV to get started.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#252537", borderBottom: "1px solid #3a3a4c" }}>
                  <th className="pl-5 pr-2 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      ref={el => { if (el) el.indeterminate = someChecked; }}
                      onChange={toggleSelectAll}
                      className="rounded cursor-pointer"
                      style={{ accentColor: "#7c6af7", width: 15, height: 15 }}
                    />
                  </th>
                  {["Name", "Student ID", "Final Grade", "Risk Level", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium" style={{ color: "#6b6b84", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((s, i) => {
                  const isSelected = selected.has(s.student_id);
                  return (
                    <tr
                      key={s.student_id}
                      style={{
                        borderBottom: i < sorted.length - 1 ? "1px solid #3a3a4c" : "none",
                        background: isSelected ? "rgba(124,106,247,0.08)" : "transparent",
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "#323248"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = isSelected ? "rgba(124,106,247,0.08)" : "transparent"; }}
                    >
                      <td className="pl-5 pr-2 py-4" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(s.student_id)}
                          className="rounded cursor-pointer"
                          style={{ accentColor: "#7c6af7", width: 15, height: 15 }}
                        />
                      </td>
                      <td className="px-4 py-4 font-medium cursor-pointer" style={{ color: "#ececf1" }} onClick={() => navigate(`/students/${s.student_id}`)}>{s.name}</td>
                      <td className="px-4 py-4 font-mono text-xs cursor-pointer" style={{ color: "#9b9bb4" }} onClick={() => navigate(`/students/${s.student_id}`)}>{s.student_id}</td>
                      <td className="px-4 py-4 cursor-pointer" style={{ color: "#9b9bb4" }} onClick={() => navigate(`/students/${s.student_id}`)}>{s.final_grade ?? "—"}</td>
                      <td className="px-4 py-4 cursor-pointer" onClick={() => navigate(`/students/${s.student_id}`)}><RiskBadge label={s.risk_label} /></td>
                      <td className="px-4 py-4 text-right" />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
