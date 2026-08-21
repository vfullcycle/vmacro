import { Link } from "react-router-dom";
import { DiaryIcon, GearIcon, ListIcon, TrendIcon, UserIcon, WrenchIcon } from "../components/icons";
import { useAuth } from "../lib/auth-context";
import { useIsAdmin } from "../lib/use-is-admin";
import "./SettingsHome.css";

const SETTINGS_ITEMS = [
  { to: "/settings/profile", label: "โปรไฟล์", desc: "ข้อมูลร่างกาย เป้าหมาย สูตรคำนวณ", Icon: UserIcon },
  { to: "/settings/system", label: "ระบบ", desc: "หน่วย ค่า default", Icon: GearIcon },
  { to: "/settings/day-type", label: "เป้าตามประเภทวันฝึก", desc: "Allowance วัน rest/light/hard, carb/fat floor", Icon: TrendIcon },
  { to: "/settings/meal-targets", label: "เป้าต่อมื้ออาหาร", desc: "เวลาตื่นนอน, เวลาต่อมื้อ, สัดส่วน % ต่อมื้อ", Icon: DiaryIcon },
  { to: "/settings/meal-templates", label: "มื้ออาหารของฉัน", desc: "จัดการชุดอาหารที่บันทึกไว้", Icon: ListIcon },
];

const ADMIN_SETTINGS_ITEM = {
  to: "/settings/admin",
  label: "Admin",
  desc: "Import อาหาร, ตรวจสอบ custom food",
  Icon: WrenchIcon,
};

export default function SettingsHome() {
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const items = isAdmin ? [...SETTINGS_ITEMS, ADMIN_SETTINGS_ITEM] : SETTINGS_ITEMS;

  return (
    <section className="settings-home">
      <h1>Settings</h1>
      <ul className="settings-home-list">
        {items.map(({ to, label, desc, Icon }) => (
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
