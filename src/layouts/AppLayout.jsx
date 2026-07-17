import { Outlet, useLocation } from "react-router-dom";
import TopHeader from "../components/TopHeader";

export default function AppLayout() {
  const location = useLocation();
  const isLauncher = location.pathname === "/";

  return (
    <div className={`min-h-screen ${isLauncher ? "launcher-shell" : "module-shell"}`}>
      <TopHeader isLauncher={isLauncher} />
      <main className={isLauncher ? "launcher-content" : "module-content"}>
        <Outlet />
      </main>
    </div>
  );
}
