import { MessageSquareMore } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import AppShell from "../components/AppShell";
import Card from "../components/Card";
import { fetchJson } from "../lib/api";
import { getStoredStudent } from "../lib/session";

function ModulePage() {
  const navigate = useNavigate();
  const { moduleId } = useParams();
  const [student, setStudent] = useState(null);
  const [topics, setTopics] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const storedStudent = getStoredStudent();
    if (!storedStudent) {
      navigate("/login");
      return;
    }

    setStudent(storedStudent);

    const loadTopics = async () => {
      try {
        const data = await fetchJson(`/topics/${moduleId}`);
        setTopics(data);
      } catch (error) {
        setErrorMessage(error.message);
      }
    };

    loadTopics();
  }, [moduleId, navigate]);

  if (!student) {
    return null;
  }

  return (
    <AppShell
      student={student}
      title={`Module ${moduleId}`}
      subtitle="Topic-by-topic learning path"
    >
      {errorMessage ? (
        <p className="rounded-[10px] bg-red-50/70 px-4 py-3 text-sm text-danger">
          {errorMessage}
        </p>
      ) : null}

      <div className="grid gap-4">
        {topics.map((topic) => (
          <Card key={topic.topic_id} title={topic.topic} className="rounded-panel">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-muted">Topic linked to {topic.module_id}</p>
              <Link
                to={`/learn/${topic.topic_id}`}
                className="primary-button inline-flex items-center gap-2"
              >
                <MessageSquareMore size={18} />
                Start Learning
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}

export default ModulePage;
