import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import Breadcrumb from "../components/Breadcrumb";
import DashboardNoticiaBanner from "../components/DashboardNoticiaBanner";
import RouteErrorBoundary from "../components/RouteErrorBoundary";


export default function Dashboard() {
  return (
    <div className="layout">
      <RouteErrorBoundary>
        <Sidebar />
      </RouteErrorBoundary>
      <div className="main">
        <Topbar />
        <div className="content">
          <DashboardNoticiaBanner />
          <RouteErrorBoundary>
            <Breadcrumb />
          </RouteErrorBoundary>
          <RouteErrorBoundary>
            <Outlet />
          </RouteErrorBoundary>
        </div>
      </div>
    </div>
  );
}
