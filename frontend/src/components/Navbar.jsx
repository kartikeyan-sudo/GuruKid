import { Shield, Bell, LogOut, Activity } from "lucide-react";

export default function Navbar({ onLogout }) {
  return (
    <header className="flex items-center justify-between px-6 py-3 glass-heavy border-b border-white/5 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-glow">
          <Shield size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-white tracking-tight">GuruKid Admin</h1>
          <p className="text-[10px] text-slate-500">Device Management Portal</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <Activity size={12} className="text-emerald-400" />
          <span className="text-[10px] text-emerald-300 font-medium">Live</span>
        </div>

        <button className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all relative" title="Notifications">
          <Bell size={16} />
          <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500" />
        </button>

        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </header>
  );
}
