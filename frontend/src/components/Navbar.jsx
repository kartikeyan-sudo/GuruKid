export default function Navbar({ onLogout }) {
  return (
    <header className="flex items-center justify-between px-6 py-3 bg-card border-b border-slate-800">
      <div className="text-lg font-semibold text-white">GuruKid Admin</div>
      <div className="flex items-center gap-3">
        <div className="text-sm text-slate-400">Live monitoring • Hackathon build</div>
        <button
          onClick={onLogout}
          className="px-3 py-1.5 text-xs rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
