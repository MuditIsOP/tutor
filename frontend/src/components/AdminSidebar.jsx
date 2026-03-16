import {
  BookOpen,
  Database,
  GraduationCap,
  LogOut,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { clearStoredAdmin } from "../lib/session";

const navItems = [
  { label: "Overview", icon: ShieldCheck, hash: "#overview" },
  { label: "Tables", icon: Database, hash: "#tables" },
  { label: "Courses", icon: GraduationCap, hash: "#courses" },
  { label: "Students", icon: Users, hash: "#students" },
  { label: "Syllabus", icon: BookOpen, hash: "#syllabus" },
];

function AdminSidebar() {
  const location = useLocation();
  const [activeHash, setActiveHash] = useState(location.hash || "#overview");

  useEffect(() => {
    if (location.pathname !== "/admin/dashboard") {
      return undefined;
    }

    const sectionIds = navItems.map((item) => item.hash.replace("#", ""));
    const sectionElements = sectionIds
      .map((sectionId) => document.getElementById(sectionId))
      .filter(Boolean);

    const updateActiveSection = () => {
      const currentScroll = window.scrollY + 180;
      let nextHash = "#overview";

      sectionElements.forEach((section) => {
        if (section.offsetTop <= currentScroll) {
          nextHash = `#${section.id}`;
        }
      });

      setActiveHash(nextHash);
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("hashchange", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("hashchange", updateActiveSection);
    };
  }, [location.pathname]);

  useEffect(() => {
    setActiveHash(location.hash || "#overview");
  }, [location.hash]);

  return (
    <aside className="glass-panel flex w-full max-w-[260px] flex-col rounded-panel p-5 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:self-start">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-soft">
          Virtual Tutor
        </p>
        <h2 className="mt-3 text-xl font-semibold text-ink">Admin Console</h2>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === "/admin/dashboard" && activeHash === item.hash;

          return (
            <a
              key={item.label}
              href={`/admin/dashboard${item.hash}`}
              className={`flex items-center gap-3 rounded-[14px] px-4 py-3 text-sm font-medium text-ink transition duration-200 ease-in-out hover:scale-[1.02] ${
                isActive ? "bg-white/50" : "hover:bg-white/40"
              }`}
            >
              <Icon size={20} className="text-accent" />
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>

      <div className="mt-6 grid gap-3">
        <Link
          to="/"
          onClick={clearStoredAdmin}
          className="secondary-button flex items-center justify-center gap-2 text-center"
        >
          <LogOut size={18} />
          Logout
        </Link>
      </div>
    </aside>
  );
}

export default AdminSidebar;
