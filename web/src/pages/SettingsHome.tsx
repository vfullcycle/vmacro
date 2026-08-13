import { Link } from "react-router-dom";
import { GearIcon, UserIcon } from "../components/icons";
import "./SettingsHome.css";

const SETTINGS_ITEMS = [
  { to: "/settings/profile", label: "โปรไฟล์", desc: "ข้อมูลร่างกาย เป้าหมาย สูตรคำนวณ", Icon: UserIcon },
  { to: "/settings/system", label: "ระบบ", desc: "หน่วย ค่า default", Icon: GearIcon },
];

export default function SettingsHome() {
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
    </section>
  );
}
