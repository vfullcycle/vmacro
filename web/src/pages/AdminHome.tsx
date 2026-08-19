import { Link, Navigate } from "react-router-dom";
import { ListIcon, WrenchIcon } from "../components/icons";
import { useIsAdmin } from "../lib/use-is-admin";
import "./SettingsHome.css";

const ADMIN_ITEMS = [
  { to: "/settings/admin/food-import", label: "Import อาหาร (JSON)", desc: "เพิ่ม custom food จาก JSON หลายรายการพร้อมกัน", Icon: WrenchIcon },
  { to: "/settings/admin/custom-foods", label: "Custom Food", desc: "ดู list และยืนยันความถูกต้อง (verify)", Icon: ListIcon },
];

export default function AdminHome() {
  const { isAdmin, loading } = useIsAdmin();

  if (loading) return <p>กำลังโหลด...</p>;
  if (!isAdmin) return <Navigate to="/settings" replace />;

  return (
    <section className="settings-home">
      <h1>Admin</h1>
      <ul className="settings-home-list">
        {ADMIN_ITEMS.map(({ to, label, desc, Icon }) => (
          <li key={to}>
            <Link to={to}>
              <Icon className="settings-home-icon" />
              <span className="settings-home-text">
                <span className="settings-home-label">{label}</span>
                <span className="settings-home-desc">{desc}</span>
              </span>
              <span className="settings-home-chevron">›</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
