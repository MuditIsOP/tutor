import { Bell, ChevronDown } from "lucide-react";

function Navbar({ student, title = "Dashboard", subtitle = "AI-assisted learning" }) {
  const avatarLetter = (student?.name || "S").charAt(0).toUpperCase();

  return (
    <header className="glass-panel flex items-center justify-between gap-4 rounded-panel px-6 py-4">
      <div>
        <p className="text-sm font-medium text-muted">{subtitle}</p>
        <h1 className="text-[32px] font-bold leading-tight text-ink">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          className="secondary-button flex h-11 w-11 items-center justify-center p-0"
          aria-label="Notifications"
        >
          <Bell size={20} />
        </button>

        <button type="button" className="glass-panel flex items-center gap-3 px-3 py-2">
          {student?.profile_photo ? (
            <img
              src={student.profile_photo}
              alt={student.name}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accentSecondary text-sm font-semibold text-white">
              {avatarLetter}
            </div>
          )}
          <div className="text-left">
            <p className="text-sm font-semibold text-ink">{student?.name || "Student"}</p>
            <p className="text-xs text-soft">{student?.student_id || "Student account"}</p>
          </div>
          <ChevronDown size={18} className="text-muted" />
        </button>
      </div>
    </header>
  );
}

export default Navbar;
