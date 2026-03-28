import React from "react";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Unknown app error" };
  }

  componentDidCatch(error) {
    console.error("App window crashed:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full grid place-items-center text-slate-300 p-4">
          <div className="text-center space-y-2">
            <p className="text-sm font-semibold">This app window crashed</p>
            <p className="text-xs text-slate-500">{this.state.message}</p>
            <p className="text-xs text-slate-500">Close and reopen the app window.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
