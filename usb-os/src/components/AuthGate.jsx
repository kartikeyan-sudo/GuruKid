import { useMemo, useState } from "react";
import { LogIn, UserPlus, ShieldCheck } from "lucide-react";
import { loginKidUser, registerKidUser } from "../services/authApi";
import { registerCurrentSessionDevice } from "../services/socket";

export default function AuthGate({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-white grid place-items-center p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md p-6 rounded-2xl border border-slate-800 bg-card/90 shadow-xl space-y-4"
      >
        <div className="text-center space-y-2">
          <ShieldCheck className="mx-auto text-accent" size={34} />
          <h1 className="text-xl font-semibold">GuruKid User Access</h1>
          <p className="text-sm text-slate-400">Portable, device-bound kid profile authentication</p>
        </div>

        <div className="text-xs text-slate-500 rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 break-all">
          Device Key: {deviceKey || "Unavailable"}
        </div>

        {mode === "register" && (
          <div className="space-y-2">
            <label className="text-xs text-slate-400">Nickname</label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 focus:outline-none focus:border-accent"
              placeholder="Kid nickname"
              required
            />
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs text-slate-400">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 focus:outline-none focus:border-accent"
            placeholder="kid@example.com"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-slate-400">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 focus:outline-none focus:border-accent"
            placeholder="********"
            required
          />
        </div>

        {error && <p className="text-sm text-red-300">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-lg bg-accent/25 border border-accent/60 text-accent font-medium disabled:opacity-70"
        >
          {loading
            ? "Please wait..."
            : mode === "register"
              ? "Register on this Device"
              : "Login on this Device"}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "register" ? "login" : "register")}
          className="w-full py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center gap-2"
        >
          {mode === "register" ? <LogIn size={16} /> : <UserPlus size={16} />}
          {mode === "register" ? "Have an account? Login" : "Create new account"}
        </button>
      </form>
    </div>
  );
}
