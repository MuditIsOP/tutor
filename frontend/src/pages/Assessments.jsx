import { BookCheck, CircleCheckBig, History, LoaderCircle, Play, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import AppShell from "../components/AppShell";
import Card from "../components/Card";
import { fetchJson, postJson } from "../lib/api";
import { getStoredStudent } from "../lib/session";

function Assessments() {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [modules, setModules] = useState([]);
  const [topics, setTopics] = useState([]);
  const [quizHistory, setQuizHistory] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [quizResult, setQuizResult] = useState(null);
  const [answers, setAnswers] = useState({});
  const [selection, setSelection] = useState({
    subjectCode: "",
    moduleId: "",
    topicId: "",
    studentLevel: 5,
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const storedStudent = getStoredStudent();
    if (!storedStudent) {
      navigate("/login");
      return;
    }

    setStudent(storedStudent);

    const loadSubjects = async () => {
      try {
        const [subjectData, historyData] = await Promise.all([
          fetchJson(`/subjects/${storedStudent.course_id}/${storedStudent.semester}`),
          fetchJson(`/quiz-history/${storedStudent.student_id}`),
        ]);
        setSubjects(subjectData);
        setQuizHistory(historyData);
      } catch (error) {
        setErrorMessage(error.message);
      }
    };

    loadSubjects();
  }, [navigate]);

  useEffect(() => {
    if (!selection.subjectCode) {
      setModules([]);
      return;
    }

    const loadModules = async () => {
      try {
        const data = await fetchJson(`/modules/${selection.subjectCode}`);
        setModules(data);
      } catch (error) {
        setErrorMessage(error.message);
      }
    };

    loadModules();
  }, [selection.subjectCode]);

  useEffect(() => {
    if (!selection.moduleId) {
      setTopics([]);
      return;
    }

    const loadTopics = async () => {
      try {
        const data = await fetchJson(`/topics/${selection.moduleId}`);
        setTopics(data);
      } catch (error) {
        setErrorMessage(error.message);
      }
    };

    loadTopics();
  }, [selection.moduleId]);

  const handleGenerateQuiz = async () => {
    if (!student || !selection.topicId || isGenerating) {
      return;
    }

    setIsGenerating(true);
    setErrorMessage("");
    setQuiz(null);
    setQuizResult(null);
    setAnswers({});

    try {
      const generatedQuiz = await postJson("/generate-quiz", {
        student_id: student.student_id,
        topic_id: selection.topicId,
        student_level: Number(selection.studentLevel),
      });
      setQuiz(generatedQuiz);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!quiz || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const result = await postJson("/submit-quiz", {
        student_id: student.student_id,
        topic_id: selection.topicId,
        student_level: Number(selection.studentLevel),
        quiz,
        answers,
      });
      setQuizResult(result);
      const historyData = await fetchJson(`/quiz-history/${student.student_id}`);
      setQuizHistory(historyData);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!student) {
    return null;
  }

  return (
    <AppShell
      student={student}
      title="Assessments"
      subtitle={`Generate a guided quiz for semester ${student.semester}`}
    >
      <div className="grid gap-6">
        <Card
          title="Assessment Builder"
          subtitle="Choose a syllabus slice, set the student level, and generate a quiz from the backend AI system."
          className="rounded-panel"
        >
          <div className="grid gap-5 lg:grid-cols-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-muted">Subject</span>
              <select
                className="glass-input"
                value={selection.subjectCode}
                onChange={(event) =>
                  setSelection({
                    subjectCode: event.target.value,
                    moduleId: "",
                    topicId: "",
                    studentLevel: selection.studentLevel,
                  })
                }
              >
                <option value="">Select subject</option>
                {subjects.map((subject) => (
                  <option key={subject.subject_code} value={subject.subject_code}>
                    {subject.subject_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-muted">Module</span>
              <select
                className="glass-input"
                value={selection.moduleId}
                onChange={(event) =>
                  setSelection((current) => ({
                    ...current,
                    moduleId: event.target.value,
                    topicId: "",
                  }))
                }
                disabled={!selection.subjectCode}
              >
                <option value="">Select module</option>
                {modules.map((module) => (
                  <option key={module.module_id} value={module.module_id}>
                    Module {module.module_number} | {module.module_title}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-muted">Topic</span>
              <select
                className="glass-input"
                value={selection.topicId}
                onChange={(event) =>
                  setSelection((current) => ({
                    ...current,
                    topicId: event.target.value,
                  }))
                }
                disabled={!selection.moduleId}
              >
                <option value="">Select topic</option>
                {topics.map((topic) => (
                  <option key={topic.topic_id} value={topic.topic_id}>
                    {topic.topic}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-muted">Student Level</span>
              <select
                className="glass-input"
                value={selection.studentLevel}
                onChange={(event) =>
                  setSelection((current) => ({
                    ...current,
                    studentLevel: Number(event.target.value),
                  }))
                }
              >
                {Array.from({ length: 10 }, (_, index) => index + 1).map((level) => (
                  <option key={level} value={level}>
                    {level} / 10
                  </option>
                ))}
              </select>
            </label>
          </div>

          {errorMessage ? (
            <p className="mt-5 rounded-[10px] bg-red-50/70 px-4 py-3 text-sm text-danger">
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleGenerateQuiz}
              className="primary-button inline-flex items-center gap-2"
              disabled={!selection.topicId || isGenerating}
            >
              {isGenerating ? <LoaderCircle size={18} className="animate-spin" /> : <BookCheck size={18} />}
              <Play size={16} />
              {isGenerating ? "Generating Quiz..." : "Start Quiz"}
            </button>

            {quiz ? (
              <div className="inline-flex items-center rounded-[14px] bg-white/45 px-4 py-3 text-sm text-muted">
                {quiz.total_questions} questions generated for {quiz.topic}
              </div>
            ) : null}
          </div>
        </Card>

        {quiz ? (
          <Card
            title={`${quiz.subject} Quiz`}
            subtitle={`Module: ${quiz.module} | Topic: ${quiz.topic} | Difficulty: ${quiz.difficulty_progression}`}
            className="rounded-panel"
          >
            <div className="grid gap-5">
              {quiz.questions.map((question, questionIndex) => (
                <article key={question.id} className="rounded-[18px] bg-white/45 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-soft">
                        {question.id} | {question.difficulty}
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-ink">
                        {questionIndex + 1}. {question.question}
                      </h3>
                    </div>
                    {quizResult?.results?.find((item) => item.id === question.id)?.is_correct ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100/80 px-3 py-1 text-xs font-semibold text-emerald-700">
                        <CircleCheckBig size={14} />
                        Correct
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3">
                    {Object.entries(question.options).map(([optionKey, optionValue]) => (
                      <label
                        key={optionKey}
                        className={`flex cursor-pointer items-start gap-3 rounded-[14px] border px-4 py-3 text-sm transition duration-200 ease-in-out ${
                          answers[question.id] === optionKey
                            ? "border-accent bg-indigo-50/90"
                            : "border-white/50 bg-white/55 hover:bg-white/70"
                        }`}
                      >
                        <input
                          type="radio"
                          name={question.id}
                          value={optionKey}
                          checked={answers[question.id] === optionKey}
                          onChange={(event) =>
                            setAnswers((current) => ({
                              ...current,
                              [question.id]: event.target.value,
                            }))
                          }
                          className="mt-1 h-4 w-4 accent-accent"
                          disabled={Boolean(quizResult)}
                        />
                        <span className="text-ink">
                          <span className="font-semibold">{optionKey}.</span> {optionValue}
                        </span>
                      </label>
                    ))}
                  </div>

                  {quizResult ? (
                    <div className="mt-4 rounded-[14px] bg-white/60 px-4 py-4 text-sm text-muted">
                      <p>
                        <span className="font-semibold text-ink">Correct answer:</span>{" "}
                        {
                          quizResult.results.find((item) => item.id === question.id)?.correct_answer
                        }
                      </p>
                      <p className="mt-2">
                        <span className="font-semibold text-ink">Explanation:</span>{" "}
                        {quizResult.results.find((item) => item.id === question.id)?.explanation}
                      </p>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>

            {!quizResult ? (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleSubmitQuiz}
                  className="primary-button inline-flex items-center gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <LoaderCircle size={18} className="animate-spin" /> : <Trophy size={18} />}
                  {isSubmitting ? "Submitting..." : "Submit Quiz"}
                </button>
              </div>
            ) : null}
          </Card>
        ) : null}

        {quizResult ? (
          <Card
            title="Quiz Result"
            subtitle="Your score and AI-generated answer explanations"
            className="rounded-panel"
          >
            <div className="grid gap-5 md:grid-cols-3">
              <div className="rounded-[18px] bg-white/45 px-5 py-6 text-center">
                <p className="text-sm text-muted">Score</p>
                <p className="mt-2 text-3xl font-bold text-ink">
                  {quizResult.score}/{quizResult.total_questions}
                </p>
              </div>
              <div className="rounded-[18px] bg-white/45 px-5 py-6 text-center">
                <p className="text-sm text-muted">Percentage</p>
                <p className="mt-2 text-3xl font-bold text-ink">{quizResult.percentage}%</p>
              </div>
              <div className="rounded-[18px] bg-white/45 px-5 py-6 text-center">
                <p className="text-sm text-muted">Correct Answers</p>
                <p className="mt-2 text-3xl font-bold text-ink">{quizResult.score}</p>
              </div>
            </div>
          </Card>
        ) : null}

        <Card
          title="Recent Quiz History"
          subtitle="Stored quiz sessions can be reopened exactly as they were taken."
          className="rounded-panel"
        >
          {quizHistory.length ? (
            <div className="grid gap-4">
              {quizHistory.slice(0, 6).map((entry) => (
                <article
                  key={entry.session_id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-[18px] bg-white/45 p-5"
                >
                  <div>
                    <h3 className="text-base font-semibold text-ink">{entry.subject_name}</h3>
                    <p className="mt-1 text-sm text-muted">
                      {entry.module_title} | {entry.topic_name}
                    </p>
                    <p className="mt-2 text-sm text-muted">
                      Score {entry.score}/{entry.total_questions} | {entry.percentage}% | Level{" "}
                      {entry.student_level}/10
                    </p>
                  </div>
                  <Link
                    to={`/quiz-review/${entry.session_id}`}
                    className="secondary-button inline-flex items-center gap-2"
                  >
                    <History size={18} />
                    Review Quiz
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[16px] bg-white/40 px-4 py-5 text-sm text-muted">
              Your generated quizzes will appear here after you submit them.
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

export default Assessments;
