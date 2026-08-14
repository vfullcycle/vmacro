import { Link } from "react-router-dom";
import { GearIcon, ListIcon, UserIcon } from "../components/icons";
import { useAuth } from "../lib/auth-context";
import "./SettingsHome.css";

const SETTINGS_ITEMS = [
  { to: "/settings/profile", label: "โปรไฟล์", desc: "ข้อมูลร่างกาย เป้าหมาย สูตรคำนวณ", Icon: UserIcon },
  { to: "/settings/system", label: "ระบบ", desc: "หน่วย ค่า default", Icon: GearIcon },
  { to: "/settings/meal-templates", label: "Meal templates", desc: "จัดการชุดอาหารที่บันทึกไว้", Icon: ListIcon },
];

export default function SettingsHome() {
  const { user, signOut } = useAuth();

  return (
    <section className="settings-home">
      <h1>Settings</h1>
      <ul className="settings-home-list">
        {SETTINGS_ITEMS.map(({ to, label, desc, Icon }) => (
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

      {user && (
        <div className="settings-home-account">
          <p className="settings-home-email">{user.email}</p>
          <button type="button" className="settings-home-signout" onClick={() => signOut()}>
            ออกจากระบบ
          </button>
        </div>
      )}
    </section>
  );
}
