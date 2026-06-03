import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import client from "../api/client";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = location.state?.success;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await client.post("/auth/login", { email, password });
      localStorage.setItem("token", data.access_token);
      const payload = JSON.parse(atob(data.access_token.split(".")[1]));
      navigate(payload.role === "hod" ? "/hod" : "/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#1e1e2e" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: "#7c6af7" }}>
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "#ececf1" }}>FailSafe</h1>
          <p className="mt-1 text-sm" style={{ color: "#9b9bb4" }}>Student Risk Intelligence Platform</p>
        </div>

        <div className="rounded-2xl p-8" style={{ background: "#2a2a3c", border: "1px solid #3a3a4c" }}>
          <h2 className="text-lg font-semibold mb-6" style={{ color: "#ececf1" }}>Sign in to your account</h2>

          {successMessage && (
            <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", color: "#4ade80" }}>
              {successMessage}
            </div>
          )}

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "#f87171" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#9b9bb4" }}>Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@institution.edu"
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
                style={{ background: "#252537", border: "1px solid #3a3a4c", color: "#ececf1" }}
                onFocus={e => e.target.style.borderColor = "#7c6af7"}
                onBlur={e => e.target.style.borderColor = "#3a3a4c"}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#9b9bb4" }}>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
                style={{ background: "#252537", border: "1px solid #3a3a4c", color: "#ececf1" }}
                onFocus={e => e.target.style.borderColor = "#7c6af7"}
                onBlur={e => e.target.style.borderColor = "#3a3a4c"}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 text-white font-semibold rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "#7c6af7" }}
              onMouseEnter={e => { if (!loading) e.target.style.background = "#6a59e0"; }}
              onMouseLeave={e => e.target.style.background = "#7c6af7"}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: "#6b6b84" }}>
            Don&apos;t have an account?{" "}
            <Link to="/register" className="font-medium" style={{ color: "#7c6af7" }}>
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
