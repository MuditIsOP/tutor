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

      <SubjectGrid subjects={subjects} />
    </AppShell>
  );
}

export default Subjects;
