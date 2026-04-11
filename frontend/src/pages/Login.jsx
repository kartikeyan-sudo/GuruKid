import { useState } from "react";
import { ShieldCheck, Eye, EyeOff } from "lucide-react";
import { adminLogin } from "../services/api";

export default function Login({ onLoggedIn }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [shakeError, setShakeError] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await adminLogin({ username, password });
      onLoggedIn();
    } catch (err) {
      const backendError = err?.response?.data?.error;
      const message =
        backendError ||
        (err?.request
          ? "Cannot reach server. Check VITE_API_URL and backend status."
          : "Login failed. Please try again.");
      setError(message);
      setShakeError(true);
      setTimeout(() => setShakeError(false), 600);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-white grid place-items-center p-6 bg-gradient-auth relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.5), transparent 70%)" }}
      />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.4), transparent 70%)" }}
      />

      <form
        onSubmit={handleSubmit}
        className={`w-full max-w-sm p-7 rounded-3xl glass-heavy space-y-5 animate-scale-in ${shakeError ? "shake" : ""}`}
      >
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-glow-lg mx-auto">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Admin Portal</h1>
            <p className="text-sm text-slate-400 mt-1">Sign in to manage devices</p>
          </div>
        </div>

        {/* Username */}
        <div className="space-y-1.5">
          <label className="text-xs text-slate-400 font-medium">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-indigo-500/50 focus:shadow-glow text-white transition-all placeholder:text-slate-600"
            placeholder="admin"
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-xs text-slate-400 font-medium">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-indigo-500/50 focus:shadow-glow text-white transition-all placeholder:text-slate-600 pr-10"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm animate-fade-in">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="btn-accent w-full py-3 rounded-xl text-sm font-medium disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            "Sign In"
          )}
        </button>
      </form>
    </div>
  );
}
