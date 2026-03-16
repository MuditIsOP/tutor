import { BookOpen, Layers3 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import AppShell from "../components/AppShell";
import Card from "../components/Card";
import { fetchJson } from "../lib/api";
import { getStoredStudent } from "../lib/session";

function SubjectPage() {
  const navigate = useNavigate();
  const { subjectCode } = useParams();
  const [student, setStudent] = useState(null);
  const [modules, setModules] = useState([]);
  const [subjectTitle, setSubjectTitle] = useState(subjectCode);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const storedStudent = getStoredStudent();
    if (!storedStudent) {
      navigate("/login");
      return;
    }

    setStudent(storedStudent);

    const loadModules = async () => {
      try {
        const [moduleData, subjectData] = await Promise.all([
          fetchJson(`/modules/${subjectCode}`),
          fetchJson(`/subjects/${storedStudent.course_id}/${storedStudent.semester}`),
        ]);

        const modulesWithTopicCounts = await Promise.all(
          moduleData.map(async (module) => {
            const topics = await fetchJson(`/topics/${module.module_id}`);
            return { ...module, topicsCount: topics.length };
          }),
        );

        const matchingSubject = subjectData.find((subject) => subject.subject_code === subjectCode);
        setSubjectTitle(matchingSubject?.subject_name || subjectCode);
        setModules(modulesWithTopicCounts);
      } catch (error) {
        setErrorMessage(error.message);
      }
    };

    loadModules();
  }, [navigate, subjectCode]);

  if (!student) {
    return null;
  }

  return (
    <AppShell student={student} title={subjectTitle} subtitle={`Modules for ${subjectCode}`}>
      {errorMessage ? (
        <p className="rounded-[10px] bg-red-50/70 px-4 py-3 text-sm text-danger">
          {errorMessage}
        </p>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((module) => (
          <Card
            key={module.module_id}
            title={`Module ${module.module_number}`}
            subtitle={module.module_title}
            className="rounded-panel"
          >
            <div className="space-y-4">
              <div className="grid gap-3 text-sm text-muted">
                <div className="flex items-center gap-2 rounded-[14px] bg-white/45 px-4 py-3">
                  <BookOpen size={18} className="text-accent" />
                  <span>{module.topicsCount} topics</span>
                </div>
                <div className="flex items-center gap-2 rounded-[14px] bg-white/45 px-4 py-3">
                  <Layers3 size={18} className="text-accentSecondary" />
                  <span>{module.module_id}</span>
                </div>
              </div>
              <Link
                to={`/module/${module.module_id}`}
                className="primary-button inline-flex items-center gap-2"
              >
                Start Module
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}

export default SubjectPage;
