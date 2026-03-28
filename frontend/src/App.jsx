import { useEffect, useState } from "react";
import Navbar from "./components/Navbar.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Login from "./pages/Login.jsx";
import { fetchAdminSession, setAdminToken } from "./services/api";
import { joinAdminRoom } from "./services/socket";

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    const checkSession = async () => {
      try {
        await fetchAdminSession();
        if (mounted) {
          setAuthenticated(true);
          joinAdminRoom();
        }
      } catch {
        setAdminToken("");
        if (mounted) setAuthenticated(false);
      } finally {
        if (mounted) setChecking(false);
      }
    };
    checkSession();
    return () => {
      mounted = false;
    };
  }, []);

  if (checking) {
    return <div className="min-h-screen bg-bg text-slate-300 grid place-items-center">Checking session...</div>;
  }

  if (!authenticated) {
    return <Login onLoggedIn={() => {
      setAuthenticated(true);
      joinAdminRoom();
    }} />;
  }

  return (
    <div className="min-h-screen bg-bg text-white">
      <Navbar onLogout={() => {
        setAdminToken("");
        setAuthenticated(false);
      }} />
      <Dashboard />
    </div>
  );
}
