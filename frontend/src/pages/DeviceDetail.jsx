export default function DeviceDetail({ device }) {
  if (!device) return null;
  return (
    <div className="p-4 rounded-xl border border-slate-800 bg-card">
      <p className="text-sm text-slate-400">Device Detail</p>
      <pre className="text-xs text-slate-200 bg-slate-900 p-3 rounded-lg overflow-auto">
        {JSON.stringify(device, null, 2)}
      </pre>
    </div>
  );
}
