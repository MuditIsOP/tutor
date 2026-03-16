import {
  BookCheck,
  BookOpen,
  ChartSpline,
  LayoutDashboard,
  LogOut,
  Settings,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { clearStoredStudent } from "../lib/session";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Subjects", icon: BookOpen, path: "/subjects" },
  { label: "Assessments", icon: BookCheck, path: "/assessments" },
  { label: "Progress", icon: ChartSpline, path: "/progress" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

function Sidebar() {
  const location = useLocation();

  return (
    <aside className="glass-panel flex w-full max-w-[260px] flex-col rounded-panel p-5 lg:min-h-[calc(100vh-4rem)]">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-soft">
          Virtual Tutor
        </p>
        <h2 className="mt-3 text-xl font-semibold text-ink">Student Workspace</h2>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-2">
        {navItems.map((item) => {
          const isActive =
            item.path === "/dashboard"
              ? location.pathname === "/dashboard"
              : location.pathname.startsWith(item.path);
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex items-center gap-3 rounded-[14px] px-4 py-3 text-sm font-medium text-ink transition duration-200 ease-in-out hover:scale-[1.02] ${
                isActive ? "bg-white/50" : "hover:bg-white/40"
              }`}
            >
              <Icon size={20} className="text-accent" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 grid gap-3">
        <Link
          to="/"
          onClick={clearStoredStudent}
          className="secondary-button flex items-center justify-center gap-2 text-center"
        >
          <LogOut size={18} />
          Logout
        </Link>
      </div>
    </aside>
  );
}

export default Sidebar;
