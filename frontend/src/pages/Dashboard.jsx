import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import Miembros from "./Miembros";

export default function Dashboard() {
  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <div style={{ flex: 1 }}>
        <Topbar />
        <Miembros />
      </div>
    </div>
  );
}
