import { NavLink, Outlet } from "react-router-dom";
import { useFeedBadge } from "../lib/useFeedBadge";
import { DashboardIcon, DiaryIcon, GearIcon, SearchIcon, UsersIcon } from "./icons";
import "./Layout.css";

const TABS = [
  { to: "/diary", label: "Diary", Icon: DiaryIcon },
  { to: "/food/search", label: "Search", Icon: SearchIcon },
  { to: "/dashboard", label: "Dashboard", Icon: DashboardIcon },
  { to: "/friends", label: "Friends", Icon: UsersIcon },
  { to: "/settings", label: "Settings", Icon: GearIcon },
];

export default function Layout() {
  const hasUnseenFeed = useFeedBadge();

  return (
    <div className="app-shell">
      <div className="app-content">
        <Outlet />
      </div>

      <nav className="app-tabbar">
        {TABS.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "active" : "")}>
            <span className="tab-icon-wrap">
              <Icon className="tab-icon" />
              {to === "/friends" && hasUnseenFeed && <span className="tab-badge-dot" />}
            </span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
