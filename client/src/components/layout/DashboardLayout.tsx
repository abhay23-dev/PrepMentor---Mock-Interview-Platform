import { Outlet } from "@tanstack/react-router";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function DashboardLayout() {
  return (
    <div className="min-h-screen flex flex-col">

      <Navbar />

      <div className="flex flex-1">

        <Sidebar />

        <main className="flex-1 bg-slate-950 p-6">
          <Outlet />
        </main>

      </div>

    </div>
  );
}