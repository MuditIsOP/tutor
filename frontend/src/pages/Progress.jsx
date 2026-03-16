import {
  BookOpenText,
  BrainCircuit,
  ChartColumnIncreasing,
  CircleCheckBig,
  CircleDashed,
  Filter,
  History,
  Sparkles,
  TimerReset,
  Trophy,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

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

function formatDuration(seconds) {
  const totalSeconds = Number(seconds || 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function Progress() {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [progress, setProgress] = useState(null);
  const [filters, setFilters] = useState({
    subjectCode: "",
    activityType: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

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

  useEffect(() => {
    if (!student) {
      return;
    }

    const loadProgress = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const query = new URLSearchParams();
        if (filters.subjectCode) {
          query.set("subject_code", filters.subjectCode);
        }
        if (filters.activityType) {
          query.set("activity_type", filters.activityType);
        }

        const suffix = query.toString() ? `?${query.toString()}` : "";
        const data = await fetchJson(`/progress/${student.student_id}${suffix}`);
        setProgress(data);
      } catch (error) {
        setErrorMessage(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadProgress();
  }, [filters.activityType, filters.subjectCode, student]);

  if (!student) {
    return null;
  }

  return (
    <AppShell
      student={student}
      title="Progress"
      subtitle="Track completed topics, quiz trends, and the time you are investing"
    >
      <div className="grid gap-6">
        <Card
          title="Learning Activity"
          subtitle="Use subject and activity filters separately or together to narrow the feed."
          className="rounded-panel"
        >
          <div className="grid gap-5 lg:grid-cols-[1fr_1fr_auto]">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-muted">Subject</span>
              <select
                className="glass-input"
                value={filters.subjectCode}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    subjectCode: event.target.value,
                  }))
                }
              >
                <option value="">All subjects</option>
                {subjects.map((subject) => (
                  <option key={subject.subject_code} value={subject.subject_code}>
                    {subject.subject_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-muted">Activity Type</span>
              <select
                className="glass-input"
                value={filters.activityType}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    activityType: event.target.value,
                  }))
                }
              >
                <option value="">All activity</option>
                <option value="study">Study</option>
                <option value="quiz">Quiz</option>
              </select>
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setFilters({ subjectCode: "", activityType: "" })}
                className="secondary-button inline-flex items-center gap-2"
              >
                <Filter size={18} />
                Reset Filters
              </button>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-4">
          <Card title="Completed Topics" subtitle="Marked complete from your learning sessions.">
            <div className="rounded-[16px] bg-white/45 px-4 py-5 text-center">
              <p className="text-3xl font-bold text-ink">
                {progress?.completed_topics ?? 0}/{progress?.total_topics ?? 0}
              </p>
            </div>
          </Card>
          <Card title="Time Invested" subtitle="Total tracked study time across your topics.">
            <div className="rounded-[16px] bg-white/45 px-4 py-5 text-center">
              <p className="text-3xl font-bold text-ink">
                {formatDuration(progress?.total_time_spent_seconds)}
              </p>
            </div>
          </Card>
          <Card title="Quiz Average" subtitle="Average percentage across stored quiz sessions.">
            <div className="rounded-[16px] bg-white/45 px-4 py-5 text-center">
              <p className="text-3xl font-bold text-ink">{progress?.average_quiz_percentage ?? 0}%</p>
            </div>
          </Card>
          <Card title="Latest Quiz" subtitle="Most recent recorded quiz performance.">
            <div className="rounded-[16px] bg-white/45 px-4 py-5 text-center">
              <p className="text-3xl font-bold text-ink">
                {progress?.latest_quiz_percentage ?? "-"}
                {progress?.latest_quiz_percentage !== null ? "%" : ""}
              </p>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
          <Card
            title="Subject Progress"
            subtitle="Completion percentage is based on tracked topic completion inside each subject."
            className="rounded-panel"
          >
            {progress?.subject_progress?.length ? (
              <div className="grid gap-4">
                {progress.subject_progress.map((subjectItem) => (
                  <article key={subjectItem.subject_code} className="rounded-[18px] bg-white/45 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-base font-semibold text-ink">{subjectItem.subject_name}</h3>
                        <p className="mt-1 text-sm text-muted">
                          {subjectItem.completed_topics}/{subjectItem.total_topics} topics completed |{" "}
                          {subjectItem.completed_modules}/{subjectItem.total_modules} modules completed
                        </p>
                      </div>
                      <div className="rounded-full bg-white/55 px-4 py-2 text-sm font-semibold text-ink">
                        {subjectItem.progress_percentage}%
                      </div>
                    </div>

                    <div className="mt-4 h-3 rounded-full bg-white/50">
                      <div
                        className="h-3 rounded-full bg-gradient-to-r from-accent to-accentSecondary"
                        style={{ width: `${subjectItem.progress_percentage}%` }}
                      />
                    </div>

                    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/55 px-4 py-2 text-sm text-ink">
                      <TimerReset size={16} className="text-accent" />
                      {formatDuration(subjectItem.time_spent_seconds)} tracked
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-[16px] bg-white/40 px-4 py-5 text-sm text-muted">
                Subject progress will appear once topics begin receiving tracked time or completion.
              </div>
            )}
          </Card>

          <div className="grid gap-6">
            <Card
              title="Strengths"
              subtitle="Subjects where your quiz average is currently strongest."
              className="rounded-panel"
            >
              {progress?.strengths?.length ? (
                <div className="grid gap-3">
                  {progress.strengths.map((item) => (
                    <div key={item.subject_code} className="rounded-[16px] bg-white/45 px-4 py-4">
                      <p className="text-sm font-semibold text-ink">{item.subject_name}</p>
                      <p className="mt-1 text-sm text-muted">
                        {item.average_percentage}% average across {item.attempts} quiz
                        {item.attempts > 1 ? "es" : ""}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[16px] bg-white/40 px-4 py-5 text-sm text-muted">
                  Quiz strengths will appear after you complete a few assessments.
                </div>
              )}
            </Card>

            <Card
              title="Weaknesses"
              subtitle="Subjects that could use more revision based on quiz performance."
              className="rounded-panel"
            >
              {progress?.weaknesses?.length ? (
                <div className="grid gap-3">
                  {progress.weaknesses.map((item) => (
                    <div key={item.subject_code} className="rounded-[16px] bg-white/45 px-4 py-4">
                      <p className="text-sm font-semibold text-ink">{item.subject_name}</p>
                      <p className="mt-1 text-sm text-muted">
                        {item.average_percentage}% average across {item.attempts} quiz
                        {item.attempts > 1 ? "es" : ""}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[16px] bg-white/40 px-4 py-5 text-sm text-muted">
                  Once you have quiz results, this panel will highlight where to focus next.
                </div>
              )}
            </Card>
          </div>
        </div>

        {errorMessage ? (
          <p className="rounded-[10px] bg-red-50/70 px-4 py-3 text-sm text-danger">
            {errorMessage}
          </p>
        ) : null}

        <Card
          title="Activity Feed"
          subtitle="Newest activity appears first so you can quickly resume where you left off."
          className="rounded-panel"
        >
          {isLoading ? (
            <div className="flex min-h-[240px] items-center justify-center text-sm text-muted">
              Loading your progress...
            </div>
          ) : progress?.activities?.length ? (
            <div className="grid gap-4">
              {progress.activities.map((activity) => {
                const isQuiz = activity.activity_type === "quiz";

                return (
                  <article
                    key={activity.activity_id}
                    className="rounded-[18px] border border-white/45 bg-white/45 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/55 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-soft">
                          {isQuiz ? (
                            <Trophy size={14} className="text-warning" />
                          ) : (
                            <BookOpenText size={14} className="text-accent" />
                          )}
                          {activity.activity_type}
                        </div>
                        <h3 className="mt-3 text-base font-semibold text-ink">{activity.subject_name}</h3>
                        <p className="mt-1 text-sm text-muted">
                          {activity.module_title} | {activity.topic_name}
                        </p>
                      </div>
                      <p className="text-sm text-soft">{formatTimestamp(activity.timestamp)}</p>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                      <div className="rounded-[14px] bg-white/55 px-4 py-4 text-sm text-muted">
                        {activity.summary}
                      </div>

                      {isQuiz ? (
                        <div className="rounded-[14px] bg-white/55 px-4 py-4 text-sm text-muted">
                          <p>
                            Score:{" "}
                            <span className="font-semibold text-ink">
                              {activity.score}/{activity.total_questions}
                            </span>
                          </p>
                          <p className="mt-2">
                            Percentage:{" "}
                            <span className="font-semibold text-ink">{activity.percentage}%</span>
                          </p>
                          {activity.quiz_session_id ? (
                            <Link
                              to={`/quiz-review/${activity.quiz_session_id}`}
                              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-accent transition hover:text-[#4F46E5]"
                            >
                              <History size={16} />
                              Review quiz
                            </Link>
                          ) : null}
                        </div>
                      ) : (
                        <div className="rounded-[14px] bg-white/55 px-4 py-4 text-sm text-muted">
                          <p className="inline-flex items-center gap-2 font-semibold text-ink">
                            <TimerReset size={16} className="text-accent" />
                            {formatDuration(activity.time_spent_seconds)}
                          </p>
                          <p className="mt-2 inline-flex items-center gap-2">
                            {activity.is_completed ? (
                              <>
                                <CircleCheckBig size={16} className="text-success" />
                                Completed
                              </>
                            ) : (
                              <>
                                <BrainCircuit size={16} className="text-accentSecondary" />
                                In progress
                              </>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[18px] border border-dashed border-white/50 bg-white/35 px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/60 text-accent">
                <CircleDashed size={24} />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-ink">No progress yet</h3>
              <p className="mt-2 max-w-md text-sm text-muted">
                Your progress will start filling in once you study with the AI tutor or finish a quiz.
                Keep using the learning flow and we will build the timeline automatically.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/55 px-4 py-2 text-sm text-ink">
                <Sparkles size={16} className="text-accent" />
                Your dashboard will become more insightful as you continue
              </div>
            </div>
          )}
        </Card>

        <Card
          title="Quick Snapshot"
          subtitle="A short summary of your tracked learning profile."
          className="rounded-panel"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[16px] bg-white/45 px-4 py-4 text-sm text-muted">
              <p className="inline-flex items-center gap-2 font-semibold text-ink">
                <ChartColumnIncreasing size={16} className="text-accent" />
                Activity count
              </p>
              <p className="mt-2">{progress?.total_activities ?? 0} total learning events tracked</p>
            </div>
            <div className="rounded-[16px] bg-white/45 px-4 py-4 text-sm text-muted">
              <p className="inline-flex items-center gap-2 font-semibold text-ink">
                <BookOpenText size={16} className="text-accentSecondary" />
                Study sessions
              </p>
              <p className="mt-2">{progress?.study_activities ?? 0} AI tutor prompts recorded</p>
            </div>
            <div className="rounded-[16px] bg-white/45 px-4 py-4 text-sm text-muted">
              <p className="inline-flex items-center gap-2 font-semibold text-ink">
                <Trophy size={16} className="text-warning" />
                Quiz sessions
              </p>
              <p className="mt-2">{progress?.quiz_activities ?? 0} quiz records saved for review</p>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

export default Progress;
