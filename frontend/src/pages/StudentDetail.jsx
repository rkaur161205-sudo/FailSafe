import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import client from "../api/client";

const RISK_STYLE = {
  high:   { background: "rgba(248,113,113,0.12)", color: "#f87171", border: "1px solid rgba(248,113,113,0.25)" },
  medium: { background: "rgba(251,191,36,0.12)",  color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" },
  low:    { background: "rgba(74,222,128,0.12)",   color: "#4ade80", border: "1px solid rgba(74,222,128,0.25)" },
};

// Backend stores UTC but sends no timezone marker — append Z so JS converts correctly to local time
function utcDate(str) { return str ? new Date(str.endsWith("Z") ? str : str + "Z") : null; }

const SVG_W = 520;
const SVG_H = 160;
const PAD = { top: 16, right: 20, bottom: 36, left: 44 };

function RiskHistory({ history }) {
  if (!history || history.length === 0) return null;

  if (history.length === 1) {
    return (
      <div className="rounded-2xl p-6" style={{ background: "#2a2a3c", border: "1px solid #3a3a4c" }}>
        <h2 className="text-base font-semibold mb-2" style={{ color: "#ececf1" }}>Risk Score History</h2>
        <p className="text-sm" style={{ color: "#9b9bb4" }}>
          No historical data yet — re-upload student data in a future semester to track improvement.
        </p>
      </div>
    );
  }

  const scores = history.map((h) => h.risk_score * 100);
  const dates  = history.map((h) =>
    utcDate(h.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  );
  const minScore = Math.max(0, Math.min(...scores) - 5);
  const maxScore = Math.min(100, Math.max(...scores) + 5);
  const chartW = SVG_W - PAD.left - PAD.right;
  const chartH = SVG_H - PAD.top - PAD.bottom;
  const toX = (i) => PAD.left + i * (chartW / (scores.length - 1));
  const toY = (v) => PAD.top + chartH - ((v - minScore) / (maxScore - minScore)) * chartH;
  const points = scores.map((s, i) => `${toX(i)},${toY(s)}`).join(" ");
  const diff = scores[scores.length - 1] - scores[0];
  const trending = diff > 0 ? "up" : diff < 0 ? "down" : "stable";
  const lineColor = trending === "up" ? "#f87171" : "#4ade80";

  return (
    <div className="rounded-2xl p-6" style={{ background: "#2a2a3c", border: "1px solid #3a3a4c" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold" style={{ color: "#ececf1" }}>Risk Score History</h2>
        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full"
          style={trending === "up" ? RISK_STYLE.high : trending === "down" ? RISK_STYLE.low : RISK_STYLE.medium}>
          {trending === "up" ? "▲ Trending up" : trending === "down" ? "▼ Trending down" : "● Stable"}
        </span>
      </div>
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ height: SVG_H }}>
        {[0, 25, 50, 75, 100].filter(v => v >= minScore - 5 && v <= maxScore + 5).map(v => {
          const y = toY(v);
          if (y < PAD.top || y > PAD.top + chartH) return null;
          return (
            <g key={v}>
              <line x1={PAD.left} y1={y} x2={PAD.left + chartW} y2={y} stroke="#3a3a4c" strokeWidth="1" strokeDasharray="4 3" />
              <text x={PAD.left - 6} y={y + 4} textAnchor="end" fill="#6b6b84" fontSize="10">{v}%</text>
            </g>
          );
        })}
        <polyline points={points} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <polygon
          points={`${toX(0)},${PAD.top + chartH} ${points} ${toX(scores.length - 1)},${PAD.top + chartH}`}
          fill={lineColor} fillOpacity="0.08" />
        {scores.map((s, i) => (
          <g key={i}>
            <circle cx={toX(i)} cy={toY(s)} r="4" fill={lineColor} />
            <text x={toX(i)} y={PAD.top + chartH + 18} textAnchor="middle" fill="#6b6b84" fontSize="9">{dates[i]}</text>
            <text x={toX(i)} y={toY(s) - 8} textAnchor="middle" fill="#9b9bb4" fontSize="9">{s.toFixed(1)}%</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function StudentDetail() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [intervention, setIntervention] = useState(null);
  const [notes, setNotes] = useState("");
  const [marking, setMarking] = useState(false);
  const [markError, setMarkError] = useState("");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    Promise.all([
      client.get(`/students/${studentId}/prediction`),
      client.get(`/students/${studentId}/history`),
    ])
      .then(([predRes, histRes]) => {
        setData(predRes.data);
        setIntervention({
          applied:    predRes.data.intervention_applied ?? false,
          applied_at: predRes.data.intervention_applied_at ?? null,
          notes:      predRes.data.intervention_notes ?? null,
        });
        setHistory(histRes.data);
      })
      .catch((err) => setError(err.response?.data?.detail || "Failed to load student."));
  }, [studentId]);

  async function handleMarkApplied() {
    setMarkError("");
    setMarking(true);
    try {
      const { data: result } = await client.patch(`/interventions/${studentId}`, { notes: notes || null });
      setIntervention({ applied: result.intervention_applied, applied_at: result.intervention_applied_at, notes: result.intervention_notes });
      setNotes("");
    } catch (err) {
      setMarkError(err.response?.data?.detail || "Failed to save intervention.");
    } finally {
      setMarking(false);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#1e1e2e" }}>
        <div className="text-center">
          <p className="mb-4" style={{ color: "#f87171" }}>{error}</p>
          <button onClick={() => navigate("/dashboard")} className="text-sm" style={{ color: "#7c6af7" }}>← Back to dashboard</button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#1e1e2e" }}>
        <p className="text-sm" style={{ color: "#6b6b84" }}>Loading…</p>
      </div>
    );
  }

  const shapEntries = Object.entries(data.shap_values).sort(([, a], [, b]) => Math.abs(b) - Math.abs(a));
  const maxAbsShap = Math.max(...shapEntries.map(([, v]) => Math.abs(v)), 0.001);

  return (
    <div className="min-h-screen" style={{ background: "#1e1e2e", color: "#ececf1" }}>
      {/* Navbar */}
      <nav className="px-6 py-4 flex items-center gap-4" style={{ background: "#252537", borderBottom: "1px solid #3a3a4c" }}>
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-sm transition-colors"
          style={{ color: "#9b9bb4" }}
          onMouseEnter={e => e.currentTarget.style.color = "#ececf1"}
          onMouseLeave={e => e.currentTarget.style.color = "#9b9bb4"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </button>
        <span style={{ color: "#3a3a4c" }}>/</span>
        <span className="text-sm" style={{ color: "#9b9bb4" }}>{data.name}</span>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Student header */}
        <div className="rounded-2xl p-6" style={{ background: "#2a2a3c", border: "1px solid #3a3a4c" }}>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-xl font-bold" style={{ color: "#ececf1" }}>{data.name}</h1>
              <p className="text-sm font-mono mt-0.5" style={{ color: "#6b6b84" }}>{data.student_id}</p>
            </div>
            <span className="px-3 py-1 rounded-full text-sm font-semibold capitalize" style={RISK_STYLE[data.risk_label] ?? {}}>
              {data.risk_label} risk
            </span>
          </div>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: "Final Grade", value: data.final_grade ?? "—" },
              { label: "Risk Score",  value: `${(data.risk_score * 100).toFixed(1)}%` },
              { label: "Assessed",    value: data.predicted_at ? utcDate(data.predicted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl px-4 py-3" style={{ background: "#252537", border: "1px solid #3a3a4c" }}>
                <p className="text-xs mb-0.5" style={{ color: "#6b6b84" }}>{label}</p>
                <p className="text-xl font-bold" style={{ color: "#ececf1" }}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Score History */}
        <RiskHistory history={history} />

        {/* SHAP values */}
        <div className="rounded-2xl p-6" style={{ background: "#2a2a3c", border: "1px solid #3a3a4c" }}>
          <h2 className="text-base font-semibold mb-1" style={{ color: "#ececf1" }}>Feature Impact (SHAP Values)</h2>
          <p className="text-xs mb-5" style={{ color: "#9b9bb4" }}>
            Red bars push risk higher · Blue bars push risk lower · Length = magnitude of impact
          </p>
          <div className="space-y-3">
            {shapEntries.map(([feature, value]) => {
              const pct = (Math.abs(value) / maxAbsShap) * 100;
              const isPositive = value >= 0;
              return (
                <div key={feature} className="flex items-center gap-3">
                  <span className="w-24 text-xs text-right shrink-0 font-mono" style={{ color: "#6b6b84" }}>{feature}</span>
                  <div className="flex-1 rounded-full h-3 overflow-hidden" style={{ background: "#3a3a4c" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: isPositive ? "#f87171" : "#60a5fa" }}
                    />
                  </div>
                  <span className="w-14 text-xs text-right shrink-0 font-mono" style={{ color: isPositive ? "#f87171" : "#60a5fa" }}>
                    {value >= 0 ? "+" : ""}{value.toFixed(3)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Intervention plan */}
        <div className="rounded-2xl p-6" style={{ background: "rgba(124,106,247,0.08)", border: "1px solid rgba(124,106,247,0.25)" }}>
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5" style={{ color: "#7c6af7" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h2 className="text-base font-semibold" style={{ color: "#ececf1" }}>Recommended Intervention</h2>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "#9b9bb4" }}>{data.intervention_plan}</p>
        </div>

        {/* Intervention tracking */}
        <div className="rounded-2xl p-6" style={{ background: "#2a2a3c", border: "1px solid #3a3a4c" }}>
          <h2 className="text-base font-semibold mb-4" style={{ color: "#ececf1" }}>Intervention Tracking</h2>

          {intervention?.applied ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)" }}>
                  <svg className="w-3.5 h-3.5" style={{ color: "#4ade80" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm font-medium" style={{ color: "#4ade80" }}>Intervention Applied</span>
              </div>
              {intervention.applied_at && (
                <p className="text-xs ml-8" style={{ color: "#6b6b84" }}>
                  Applied on {utcDate(intervention.applied_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}
              {intervention.notes && (
                <div className="ml-8 mt-2 rounded-xl px-4 py-3" style={{ background: "#252537", border: "1px solid #3a3a4c" }}>
                  <p className="text-xs mb-1" style={{ color: "#6b6b84" }}>Notes</p>
                  <p className="text-sm leading-relaxed" style={{ color: "#9b9bb4" }}>{intervention.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "#252537", border: "1px solid #3a3a4c" }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: "#6b6b84" }} />
                </div>
                <span className="text-sm" style={{ color: "#9b9bb4" }}>Not Yet Applied</span>
              </div>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes about the intervention…"
                rows={3}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none transition-colors"
                style={{ background: "#252537", border: "1px solid #3a3a4c", color: "#ececf1" }}
                onFocus={e => e.target.style.borderColor = "#7c6af7"}
                onBlur={e => e.target.style.borderColor = "#3a3a4c"}
              />

              {markError && <p className="text-sm" style={{ color: "#f87171" }}>{markError}</p>}

              <button
                onClick={handleMarkApplied}
                disabled={marking}
                className="flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80" }}
                onMouseEnter={e => { if (!marking) e.currentTarget.style.background = "rgba(74,222,128,0.22)"; }}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(74,222,128,0.15)"}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {marking ? "Saving…" : "Mark as Applied"}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
