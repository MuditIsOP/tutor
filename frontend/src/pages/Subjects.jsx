import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import AppShell from "../components/AppShell";
import SubjectGrid from "../components/SubjectGrid";
import { fetchJson } from "../lib/api";
import { getStoredStudent } from "../lib/session";

function Subjects() {
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
      title="Subjects"
      subtitle={`Browse the subjects assigned to semester ${student.semester}`}
    >
      {errorMessage ? (
        <p className="rounded-[10px] bg-red-50/70 px-4 py-3 text-sm text-danger">
          {errorMessage}
        </p>
      ) : null}

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-ink">Study Subjects</h2>
          <p className="mt-1 text-sm text-muted">
            These subjects open modules and topics for self-learning.
          </p>
        </div>
        <SubjectGrid
          subjects={studySubjects}
          emptyMessage="No study subjects are available for this semester yet."
        />
      </section>

      <section className="mt-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-ink">Lab Subjects</h2>
          <p className="mt-1 text-sm text-muted">
            Lab subjects for the current semester are shown here separately.
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

export default Subjects;
