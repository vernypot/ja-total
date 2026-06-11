import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import Breadcrumb from "../components/Breadcrumb";


export default function Dashboard() {
  return (
    <div className="layout">
      <Sidebar />
      <div className="main">
        <Topbar />
        <div className="content">
          <Breadcrumb />   {/* ✅ AQUÍ */}
          <Outlet />
        </div>
      </div>
    </div>
  );
}
