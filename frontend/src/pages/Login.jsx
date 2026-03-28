import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { adminLogin } from "../services/api";

export default function Login({ onLoggedIn }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await adminLogin({ username, password });
      onLoggedIn();
    } catch (_err) {
      setError("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-white grid place-items-center p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm p-6 rounded-2xl border border-slate-800 bg-card shadow-xl space-y-4"
      >
        <div className="text-center space-y-2">
          <ShieldCheck className="mx-auto text-accent" size={34} />
          <h1 className="text-xl font-semibold">Admin Login</h1>
          <p className="text-sm text-slate-400">Sign in to manage client devices</p>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-slate-400">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 focus:outline-none focus:border-accent"
            placeholder="admin"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-slate-400">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 focus:outline-none focus:border-accent"
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-sm text-red-300">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-lg bg-accent/25 border border-accent/60 text-accent font-medium disabled:opacity-70"
        >
          {loading ? "Signing in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
