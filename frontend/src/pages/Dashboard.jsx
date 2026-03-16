import { ArrowRight, BookOpen, Layers3, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import AppShell from "../components/AppShell";
import Card from "../components/Card";
import SubjectGrid from "../components/SubjectGrid";
import { fetchJson } from "../lib/api";
import { getStoredStudent } from "../lib/session";

function Dashboard() {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const studySubjects = subjects.filter((subject) => subject.type?.toLowerCase() !== "lab");
  const labSubjects = subjects.filter((subject) => subject.type?.toLowerCase() === "lab");

  useEffect(() => {
    const storedStudent = getStoredStudent();
    if (!storedStudent) {
      navigate("/login");
      return;
    }

    setStudent(storedStudent);

    const loadSubjects = async () => {
      try {
        const data = await fetchJson(
          `/subjects/${storedStudent.course_id}/${storedStudent.semester}`,
        );
        setSubjects(data);
      } catch (error) {
        setErrorMessage(error.message);
      }
    };

    loadSubjects();
  }, [navigate]);

  if (!student) {
    return null;
  }

  return (
    <AppShell
      student={student}
      title="Dashboard"
      subtitle="Your learning path for the current semester"
    >
      <Card
        title={`Hi ${student.name}, Ready to Learn?`}
        subtitle={`${student.course_name} | Year ${student.year} | Semester ${student.semester}`}
        className="rounded-panel"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-3 text-sm text-muted">
            <div className="rounded-[14px] bg-white/45 px-4 py-3">
              Registration: <span className="font-semibold text-ink">{student.student_id}</span>
            </div>
            <div className="rounded-[14px] bg-white/45 px-4 py-3">
              Subjects this semester:{" "}
              <span className="font-semibold text-ink">{studySubjects.length}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/subjects" className="primary-button inline-flex items-center gap-2">
              <ArrowRight size={18} />
              Explore Subjects
            </Link>
            <Link to="/assessments" className="secondary-button inline-flex items-center gap-2">
              <Sparkles size={18} />
              Assessments
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card title="Current Course" subtitle="Fetched from your student profile.">
          <div className="inline-flex items-center gap-3 rounded-[14px] bg-white/45 px-4 py-3 text-sm text-ink">
            <BookOpen size={18} className="text-accent" />
            {student.course_name}
          </div>
        </Card>

        <Card title="Academic Slot" subtitle="Used to filter your live subjects.">
          <div className="inline-flex items-center gap-3 rounded-[14px] bg-white/45 px-4 py-3 text-sm text-ink">
            <Layers3 size={18} className="text-accentSecondary" />
            Year {student.year} | Semester {student.semester}
          </div>
        </Card>

        <Card title="Learning Focus" subtitle="Your modules and topics come from the database.">
          <div className="rounded-[14px] bg-white/45 px-4 py-3 text-sm text-muted">
            Browse subjects, open modules, then jump into topic learning screens.
          </div>
        </Card>
      </div>

      {errorMessage ? (
        <p className="rounded-[10px] bg-red-50/70 px-4 py-3 text-sm text-danger">
          {errorMessage}
        </p>
      ) : null}

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-ink">Your Subjects</h2>
          <p className="mt-1 text-sm text-muted">
            Showing study subjects for {student.course_name}, semester {student.semester}.
          </p>
        </div>

        <SubjectGrid
          subjects={studySubjects}
          emptyMessage="No study subjects are available for this semester yet."
        />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-ink">Current Semester Labs</h2>
          <p className="mt-1 text-sm text-muted">
            Lab components are listed separately because they do not open the self-study flow.
          </p>
        </div>

        <SubjectGrid
          subjects={labSubjects}
          showAction={false}
          staticLabel="Lab component"
          emptyMessage="No lab subjects are assigned in this semester."
        />
      </section>
    </AppShell>
  );
}

export default Dashboard;
