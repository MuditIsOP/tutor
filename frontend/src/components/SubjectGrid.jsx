import { BookOpen, CalendarDays, Hash } from "lucide-react";
import { Link } from "react-router-dom";

import Card from "./Card";

function SubjectGrid({
  subjects,
  showAction = true,
  staticLabel = "Lab component",
  emptyMessage = "No subjects found.",
}) {
  if (!subjects.length) {
    return (
      <div className="rounded-[18px] border border-dashed border-white/45 bg-white/35 px-6 py-8 text-sm text-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {subjects.map((subject) => (
        <Card
          key={subject.subject_code}
          title={subject.subject_name}
          subtitle={subject.subject_code}
          className="rounded-panel"
        >
          <div className="space-y-4">
            <div className="grid gap-3 text-sm text-muted">
              <div className="flex items-center gap-2 rounded-[14px] bg-white/45 px-4 py-3">
                <CalendarDays size={18} className="text-accent" />
                <span>Semester {subject.semester}</span>
              </div>
              <div className="flex items-center gap-2 rounded-[14px] bg-white/45 px-4 py-3">
                <Hash size={18} className="text-accentSecondary" />
                <span>{subject.subject_code}</span>
              </div>
            </div>

            {showAction ? (
              <Link
                to={`/subject/${subject.subject_code}`}
                className="primary-button inline-flex items-center gap-2"
              >
                <BookOpen size={18} />
                Open Subject
              </Link>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full bg-white/55 px-4 py-2 text-sm font-medium text-muted">
                <BookOpen size={16} className="text-accentSecondary" />
                {staticLabel}
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

export default SubjectGrid;
