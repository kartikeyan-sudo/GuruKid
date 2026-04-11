import { useMemo, useState } from "react";
import { LogIn, UserPlus, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { loginKidUser, registerKidUser } from "../services/authApi";
import { registerCurrentSessionDevice } from "../services/socket";

export default function AuthGate({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [shakeError, setShakeError] = useState(false);

  const deviceKey = useMemo(() => window.electronAPI?.getDeviceKey?.() || "", []);

  const persistSession = (result) => {
    const payload = {
      userId: result.userId,
      email: result.email,
      nickname: result.nickname,
      token: result.token,
      deviceKey: result.deviceKey || deviceKey,
    };
    window.electronAPI?.setCurrentUser?.(payload);
    registerCurrentSessionDevice();
    onAuthenticated(payload);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "register") {
        const result = await registerKidUser({ email, password, nickname });
        persistSession(result);
      } else {
        const result = await loginKidUser({ email, password });
        persistSession(result);
      }
    } catch (err) {
      setError(err?.response?.data?.error || "Authentication failed");
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
        className={`w-full max-w-md p-7 rounded-3xl glass-heavy space-y-5 animate-scale-in ${shakeError ? "shake" : ""}`}
      >
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-glow-lg mx-auto">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">GuruKid Access</h1>
            <p className="text-sm text-slate-400 mt-1">
              {mode === "register" ? "Create your kid profile" : "Sign in to your device"}
            </p>
          </div>
        </div>

        {/* Device key */}
        <div className="text-[10px] text-slate-500 rounded-xl bg-white/5 border border-white/5 px-3 py-2 break-all font-mono">
          Device: {deviceKey || "Unavailable"}
        </div>

        {/* Nickname field (register only) */}
        {mode === "register" && (
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium">Nickname</label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-indigo-500/50 focus:shadow-glow text-white transition-all placeholder:text-slate-600"
              placeholder="Kid nickname"
              required
            />
          </div>
        )}

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-xs text-slate-400 font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-indigo-500/50 focus:shadow-glow text-white transition-all placeholder:text-slate-600"
            placeholder="kid@example.com"
            required
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
              required
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
          ) : mode === "register" ? (
            <>Register on this Device</>
          ) : (
            <>Login on this Device</>
          )}
        </button>

        {/* Mode toggle */}
        <button
          type="button"
          onClick={() => { setMode(mode === "register" ? "login" : "register"); setError(""); }}
          className="w-full py-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-300 flex items-center justify-center gap-2 hover:bg-white/10 transition-all text-sm"
        >
          {mode === "register" ? <LogIn size={14} /> : <UserPlus size={14} />}
          {mode === "register" ? "Have an account? Login" : "Create new account"}
        </button>
      </form>
    </div>
  );
}
