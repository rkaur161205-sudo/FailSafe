import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";

const RISK_STYLE = {
  high:   { background: "rgba(248,113,113,0.12)", color: "#f87171", border: "1px solid rgba(248,113,113,0.25)" },
  medium: { background: "rgba(251,191,36,0.12)",  color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" },
  low:    { background: "rgba(74,222,128,0.12)",   color: "#4ade80", border: "1px solid rgba(74,222,128,0.25)" },
};

function RiskBadge({ label }) {
  if (!label) return <span style={{ color: "#6b6b84", fontSize: 12 }}>—</span>;
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium capitalize" style={RISK_STYLE[label] ?? {}}>
      {label}
    </span>
  );
}

function StatCard({ label, value, color = "#ececf1", sub }) {
  return (
    <div className="rounded-2xl px-5 py-4" style={{ background: "#2a2a3c", border: "1px solid #3a3a4c" }}>
      <p className="text-xs mb-1" style={{ color: "#6b6b84" }}>{label}</p>
      <p className="text-3xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: "#6b6b84" }}>{sub}</p>}
    </div>
  );
}

export default function HodDashboard() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([client.get("/hod/overview"), client.get("/hod/faculty-breakdown")])
      .then(([ov, fb]) => { setOverview(ov.data); setFaculty(fb.data); })
      .catch((err) => setError(err.response?.data?.detail || "Failed to load HOD data."))
      .finally(() => setLoading(false));
  }, []);

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  const total   = overview?.total_students || 0;
  const highPct = total ? (overview.high_risk   / total) * 100 : 0;
  const medPct  = total ? (overview.medium_risk / total) * 100 : 0;
  const lowPct  = total ? (overview.low_risk    / total) * 100 : 0;

  const TH = ({ children, color }) => (
    <th className="px-6 py-3 text-left font-medium" style={{ color: color ?? "#6b6b84", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {children}
    </th>
  );

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
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight" style={{ color: "#ececf1" }}>FailSafe</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ color: "#7c6af7", background: "rgba(124,106,247,0.12)", border: "1px solid rgba(124,106,247,0.25)" }}>
              HOD
            </span>
          </div>
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

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {loading && <div className="text-center py-20 text-sm" style={{ color: "#6b6b84" }}>Loading overview…</div>}

        {error && (
          <div className="px-4 py-3 rounded-lg text-sm"
            style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "#f87171" }}>
            {error}
          </div>
        )}

        {!loading && overview && (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <StatCard label="Total Students" value={overview.total_students} />
              <StatCard label="High Risk"   value={overview.high_risk}   color="#f87171" sub={`${highPct.toFixed(1)}% of cohort`} />
              <StatCard label="Medium Risk" value={overview.medium_risk} color="#fbbf24" sub={`${medPct.toFixed(1)}% of cohort`} />
              <StatCard label="Low Risk"    value={overview.low_risk}    color="#4ade80" sub={`${lowPct.toFixed(1)}% of cohort`} />
              <StatCard label="Avg Risk Score" value={`${(overview.avg_risk_score * 100).toFixed(1)}%`} color="#7c6af7" />
            </div>

            {/* Risk distribution bar */}
            <div className="rounded-2xl p-6" style={{ background: "#2a2a3c", border: "1px solid #3a3a4c" }}>
              <h2 className="text-base font-semibold mb-4" style={{ color: "#ececf1" }}>Risk Distribution</h2>
              {total === 0 ? (
                <p className="text-sm" style={{ color: "#6b6b84" }}>No student data yet.</p>
              ) : (
                <>
                  <div className="flex h-9 rounded-lg overflow-hidden w-full">
                    {highPct > 0 && (
                      <div className="flex items-center justify-center text-xs font-semibold text-white"
                        style={{ width: `${highPct}%`, background: "#f87171" }}>
                        {highPct >= 8 && `${highPct.toFixed(1)}%`}
                      </div>
                    )}
                    {medPct > 0 && (
                      <div className="flex items-center justify-center text-xs font-semibold text-white"
                        style={{ width: `${medPct}%`, background: "#fbbf24" }}>
                        {medPct >= 8 && `${medPct.toFixed(1)}%`}
                      </div>
                    )}
                    {lowPct > 0 && (
                      <div className="flex items-center justify-center text-xs font-semibold text-white"
                        style={{ width: `${lowPct}%`, background: "#4ade80" }}>
                        {lowPct >= 8 && `${lowPct.toFixed(1)}%`}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-6 mt-3">
                    {[
                      { label: "High Risk",   color: "#f87171" },
                      { label: "Medium Risk", color: "#fbbf24" },
                      { label: "Low Risk",    color: "#4ade80" },
                    ].map(({ label, color }) => (
                      <div key={label} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ background: color }} />
                        <span className="text-xs" style={{ color: "#9b9bb4" }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Top at-risk students */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "#2a2a3c", border: "1px solid #3a3a4c" }}>
              <div className="px-6 py-4" style={{ background: "#252537", borderBottom: "1px solid #3a3a4c" }}>
                <h2 className="text-base font-semibold" style={{ color: "#ececf1" }}>Top At-Risk Students</h2>
                <p className="text-xs mt-0.5" style={{ color: "#6b6b84" }}>Highest predicted risk scores across all faculty</p>
              </div>
              {overview.top_at_risk.length === 0 ? (
                <div className="px-6 py-8 text-sm" style={{ color: "#6b6b84" }}>No data available.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "#252537", borderBottom: "1px solid #3a3a4c" }}>
                      <TH>Name</TH><TH>Student ID</TH><TH>Final Grade</TH>
                      <TH>Risk Score</TH><TH>Risk Level</TH><TH>Uploaded By</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.top_at_risk.map((s, i) => (
                      <tr key={s.student_id}
                        style={{ borderBottom: i < overview.top_at_risk.length - 1 ? "1px solid #3a3a4c" : "none" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#323248"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <td className="px-6 py-4 font-medium" style={{ color: "#ececf1" }}>{s.name}</td>
                        <td className="px-6 py-4 font-mono text-xs" style={{ color: "#9b9bb4" }}>{s.student_id}</td>
                        <td className="px-6 py-4" style={{ color: "#9b9bb4" }}>{s.final_grade ?? "—"}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 rounded-full h-1.5" style={{ background: "#3a3a4c" }}>
                              <div className="h-1.5 rounded-full" style={{ width: `${(s.risk_score * 100).toFixed(0)}%`, background: "#f87171" }} />
                            </div>
                            <span className="text-xs" style={{ color: "#9b9bb4" }}>{(s.risk_score * 100).toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4"><RiskBadge label={s.risk_label} /></td>
                        <td className="px-6 py-4 text-xs" style={{ color: "#6b6b84" }}>{s.uploaded_by_email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Faculty breakdown */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "#2a2a3c", border: "1px solid #3a3a4c" }}>
              <div className="px-6 py-4" style={{ background: "#252537", borderBottom: "1px solid #3a3a4c" }}>
                <h2 className="text-base font-semibold" style={{ color: "#ececf1" }}>Faculty Breakdown</h2>
                <p className="text-xs mt-0.5" style={{ color: "#6b6b84" }}>Risk distribution per faculty member</p>
              </div>
              {faculty.length === 0 ? (
                <div className="px-6 py-8 text-sm" style={{ color: "#6b6b84" }}>No faculty data available.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "#252537", borderBottom: "1px solid #3a3a4c" }}>
                      <TH>Faculty Name</TH><TH>Email</TH><TH>Total</TH>
                      <TH color="#f87171">High</TH><TH color="#fbbf24">Medium</TH><TH color="#4ade80">Low</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {faculty.map((f, i) => (
                      <tr key={f.faculty_email}
                        style={{ borderBottom: i < faculty.length - 1 ? "1px solid #3a3a4c" : "none" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#323248"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <td className="px-6 py-4 font-medium" style={{ color: "#ececf1" }}>{f.faculty_name}</td>
                        <td className="px-6 py-4 text-xs" style={{ color: "#6b6b84" }}>{f.faculty_email}</td>
                        <td className="px-6 py-4" style={{ color: "#9b9bb4" }}>{f.total_students}</td>
                        <td className="px-6 py-4 font-medium" style={{ color: "#f87171" }}>{f.high_risk}</td>
                        <td className="px-6 py-4 font-medium" style={{ color: "#fbbf24" }}>{f.medium_risk}</td>
                        <td className="px-6 py-4 font-medium" style={{ color: "#4ade80" }}>{f.low_risk}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
