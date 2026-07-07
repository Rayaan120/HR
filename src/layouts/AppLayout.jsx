import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import TopHeader from "../components/TopHeader";

export default function AppLayout() {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <TopHeader />
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
