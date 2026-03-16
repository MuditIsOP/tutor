import { BookOpen, CalendarDays, Hash } from "lucide-react";
import { Link } from "react-router-dom";

import Card from "./Card";

function SubjectGrid({ subjects }) {
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

            <Link
              to={`/subject/${subject.subject_code}`}
              className="primary-button inline-flex items-center gap-2"
            >
              <BookOpen size={18} />
              Open Subject
            </Link>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default SubjectGrid;
