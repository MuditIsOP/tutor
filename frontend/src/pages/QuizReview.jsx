import { CircleCheckBig, CircleX, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import AppShell from "../components/AppShell";
import Card from "../components/Card";
import { fetchJson } from "../lib/api";
import { getStoredStudent } from "../lib/session";

function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function QuizReview() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const [student, setStudent] = useState(null);
  const [session, setSession] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const storedStudent = getStoredStudent();
    if (!storedStudent) {
      navigate("/login");
      return;
    }

    setStudent(storedStudent);

    const loadQuizSession = async () => {
      try {
        const data = await fetchJson(`/quiz-session/${sessionId}`);
        setSession(data);
      } catch (error) {
        setErrorMessage(error.message);
      }
    };

    loadQuizSession();
  }, [navigate, sessionId]);

  if (!student) {
    return null;
  }

  return (
    <AppShell
      student={student}
      title="Quiz Review"
      subtitle="Revisit a stored quiz exactly as it was submitted"
    >
      {errorMessage ? (
        <p className="rounded-[10px] bg-red-50/70 px-4 py-3 text-sm text-danger">
          {errorMessage}
        </p>
      ) : null}

      {session ? (
        <div className="grid gap-6">
          <Card
            title={`${session.quiz.subject} Review`}
            subtitle={`${session.quiz.topic} | Taken on ${formatTimestamp(session.created_at)}`}
            className="rounded-panel"
          >
            <div className="grid gap-5 md:grid-cols-4">
              <div className="rounded-[18px] bg-white/45 px-4 py-5 text-center">
                <p className="text-sm text-muted">Score</p>
                <p className="mt-2 text-3xl font-bold text-ink">
                  {session.score}/{session.total_questions}
                </p>
              </div>
              <div className="rounded-[18px] bg-white/45 px-4 py-5 text-center">
                <p className="text-sm text-muted">Percentage</p>
                <p className="mt-2 text-3xl font-bold text-ink">{session.percentage}%</p>
              </div>
              <div className="rounded-[18px] bg-white/45 px-4 py-5 text-center">
                <p className="text-sm text-muted">Student Level</p>
                <p className="mt-2 text-3xl font-bold text-ink">{session.student_level}/10</p>
              </div>
              <div className="rounded-[18px] bg-white/45 px-4 py-5 text-center">
                <p className="text-sm text-muted">Review</p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/55 px-4 py-2 text-sm text-ink">
                  <Trophy size={16} className="text-warning" />
                  Stored session
                </div>
              </div>
            </div>
          </Card>

          <Card
            title="Questions"
            subtitle="Your selected answers are preserved along with the original explanations."
            className="rounded-panel"
          >
            <div className="grid gap-5">
              {session.quiz.questions.map((question, index) => {
                const resultItem = session.result.results.find((item) => item.id === question.id);

                return (
                  <article key={question.id} className="rounded-[18px] bg-white/45 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-soft">
                          {question.id} | {question.difficulty}
                        </p>
                        <h3 className="mt-2 text-base font-semibold text-ink">
                          {index + 1}. {question.question}
                        </h3>
                      </div>
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                          resultItem?.is_correct
                            ? "bg-emerald-100/80 text-emerald-700"
                            : "bg-red-100/80 text-red-700"
                        }`}
                      >
                        {resultItem?.is_correct ? <CircleCheckBig size={14} /> : <CircleX size={14} />}
                        {resultItem?.is_correct ? "Correct" : "Incorrect"}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3">
                      {Object.entries(question.options).map(([optionKey, optionValue]) => {
                        const isSelected = session.answers[question.id] === optionKey;
                        const isCorrect = question.correct_answer === optionKey;

                        return (
                          <div
                            key={optionKey}
                            className={`rounded-[14px] border px-4 py-3 text-sm ${
                              isCorrect
                                ? "border-emerald-300 bg-emerald-50/80"
                                : isSelected
                                  ? "border-red-200 bg-red-50/80"
                                  : "border-white/50 bg-white/55"
                            }`}
                          >
                            <span className="font-semibold text-ink">{optionKey}.</span> {optionValue}
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 rounded-[14px] bg-white/60 px-4 py-4 text-sm text-muted">
                      <p>
                        <span className="font-semibold text-ink">Your answer:</span>{" "}
                        {resultItem?.selected_answer || "Not answered"}
                      </p>
                      <p className="mt-2">
                        <span className="font-semibold text-ink">Correct answer:</span>{" "}
                        {resultItem?.correct_answer}
                      </p>
                      <p className="mt-2">
                        <span className="font-semibold text-ink">Explanation:</span>{" "}
                        {resultItem?.explanation}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-6">
              <Link to="/assessments" className="secondary-button inline-flex items-center gap-2">
                Back to Assessments
              </Link>
            </div>
          </Card>
        </div>
      ) : null}
    </AppShell>
  );
}

export default QuizReview;
