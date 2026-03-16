import {
  Bot,
  CircleCheckBig,
  Clock3,
  Lightbulb,
  LoaderCircle,
  SendHorizonal,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import AppShell from "../components/AppShell";
import Card from "../components/Card";
import { API_BASE_URL, fetchJson, postJson } from "../lib/api";
import { getStoredStudent } from "../lib/session";

function formatDuration(seconds) {
  const totalSeconds = Number(seconds || 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

const promptIdeas = [
  "Explain this topic from the basics as if I am a beginner.",
  "Give me 5 diagnostic questions before teaching this topic.",
  "Teach this with one simple real-world example.",
  "Summarize this topic in points I can revise quickly.",
];

function Learn() {
  const navigate = useNavigate();
  const { topicId } = useParams();
  const endOfMessagesRef = useRef(null);
  const sessionStartedAtRef = useRef(Date.now());
  const [student, setStudent] = useState(null);
  const [topic, setTopic] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [studentLevel, setStudentLevel] = useState(null);
  const [topicProgress, setTopicProgress] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);

  useEffect(() => {
    const storedStudent = getStoredStudent();
    if (!storedStudent) {
      navigate("/login");
      return;
    }

    setStudent(storedStudent);
    sessionStartedAtRef.current = Date.now();

    const loadLearningContext = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [topicData, historyData, progressData] = await Promise.all([
          fetchJson(`/topic/${topicId}`),
          fetchJson(`/chat-history/${storedStudent.student_id}/${topicId}`),
          fetchJson(`/topic-progress/${storedStudent.student_id}/${topicId}`),
        ]);

        setTopic(topicData);
        setMessages(historyData);
        setTopicProgress(progressData);
      } catch (error) {
        setErrorMessage(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadLearningContext();
  }, [navigate, topicId]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  useEffect(() => {
    return () => {
      if (!student || !topicId) {
        return;
      }

      const secondsSpent = Math.max(0, Math.round((Date.now() - sessionStartedAtRef.current) / 1000));
      if (!secondsSpent) {
        return;
      }

      fetch(`${API_BASE_URL}/topic-progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: student.student_id,
          topic_id: topicId,
          seconds_spent: secondsSpent,
          mark_completed: false,
        }),
        keepalive: true,
      }).catch(() => undefined);
    };
  }, [student, topicId]);

  const handleSendMessage = async (event) => {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage || !student || isSending) {
      return;
    }

    setIsSending(true);
    setErrorMessage("");

    try {
      const response = await postJson("/ai-tutor", {
        student_id: student.student_id,
        topic_id: topicId,
        message: trimmedMessage,
      });

      setMessages((current) => [...current, response.student_message, response.ai_message]);
      setStudentLevel(response.inferred_student_level);
      setMessage("");
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!student || !topicId || isMarkingComplete) {
      return;
    }

    setIsMarkingComplete(true);
    setErrorMessage("");

    try {
      const secondsSpent = Math.max(0, Math.round((Date.now() - sessionStartedAtRef.current) / 1000));
      const response = await postJson("/topic-progress", {
        student_id: student.student_id,
        topic_id: topicId,
        seconds_spent: secondsSpent,
        mark_completed: true,
      });
      setTopicProgress(response);
      sessionStartedAtRef.current = Date.now();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsMarkingComplete(false);
    }
  };

  if (!student) {
    return null;
  }

  return (
    <AppShell
      student={student}
      title={topic?.topic || "Learning Session"}
      subtitle="Ask questions, track time, and mark progress as you master the topic"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid gap-6">
          <Card
            title={topic?.topic || "Learning Session"}
            subtitle={
              topic ? `Topic ID ${topic.topic_id} | Live tutor conversation` : "Preparing your learning room"
            }
            className="rounded-panel"
          >
            {errorMessage ? (
              <p className="mb-5 rounded-[10px] bg-red-50/70 px-4 py-3 text-sm text-danger">
                {errorMessage}
              </p>
            ) : null}

            <div className="grid gap-5">
              <div className="min-h-[420px] space-y-4 rounded-[18px] bg-white/35 p-4">
                {isLoading ? (
                  <div className="flex min-h-[360px] items-center justify-center text-sm text-muted">
                    <LoaderCircle size={18} className="mr-2 animate-spin text-accent" />
                    Loading your topic and previous conversation...
                  </div>
                ) : messages.length ? (
                  messages.map((entry) => {
                    const isAssistant = entry.role === "assistant";

                    return (
                      <article
                        key={entry.chat_id}
                        className={`flex gap-3 ${
                          isAssistant ? "items-start" : "justify-end"
                        }`}
                      >
                        {isAssistant ? (
                          <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accentSecondary text-white">
                            <Bot size={18} />
                          </div>
                        ) : null}

                        <div
                          className={`max-w-3xl rounded-[18px] px-4 py-3 text-sm leading-6 shadow-[0_8px_24px_rgba(0,0,0,0.06)] ${
                            isAssistant
                              ? "border border-white/50 bg-white/60 text-ink"
                              : "bg-accent text-white"
                          }`}
                        >
                          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] opacity-75">
                            {isAssistant ? "AI Tutor" : "You"}
                          </p>
                          <p className="whitespace-pre-wrap">{entry.message}</p>
                        </div>

                        {!isAssistant ? (
                          <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/55 text-accent">
                            <UserRound size={18} />
                          </div>
                        ) : null}
                      </article>
                    );
                  })
                ) : (
                  <div className="flex min-h-[360px] items-center justify-center rounded-[16px] border border-dashed border-white/50 bg-white/30 px-6 text-center text-sm text-muted">
                    Start the conversation with your tutor. A good first message is your current understanding
                    level from 1 to 10 and what you find confusing.
                  </div>
                )}

                {isSending ? (
                  <div className="flex items-center gap-3 rounded-[14px] bg-white/50 px-4 py-3 text-sm text-muted">
                    <LoaderCircle size={18} className="animate-spin text-accent" />
                    The tutor is preparing a response...
                  </div>
                ) : null}

                <div ref={endOfMessagesRef} />
              </div>

              <form className="flex flex-col gap-4 sm:flex-row" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  className="glass-input"
                  placeholder="Ask your tutor a question..."
                  disabled={isLoading || isSending}
                />
                <button
                  type="submit"
                  className="primary-button inline-flex items-center justify-center gap-2"
                  disabled={isLoading || isSending || !message.trim()}
                >
                  {isSending ? <LoaderCircle size={18} className="animate-spin" /> : <SendHorizonal size={18} />}
                  Send
                </button>
              </form>
            </div>
          </Card>

          <Card
            title="Prompt Ideas"
            subtitle="Use these quick starters to make the tutor more useful instead of leaving the lower area empty."
            className="rounded-panel"
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="grid gap-3">
                {promptIdeas.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setMessage(prompt)}
                    className="rounded-[16px] border border-white/50 bg-white/45 px-4 py-4 text-left text-sm text-muted transition duration-200 ease-in-out hover:scale-[1.01] hover:bg-white/55"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="rounded-[18px] bg-white/45 p-5 text-sm text-muted">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-soft">
                  <Lightbulb size={14} className="text-warning" />
                  Best Results
                </div>
                <p className="mt-4">
                  Ask for examples, step-by-step explanations, or a short revision summary to get better help from the tutor.
                </p>
                <p className="mt-3">
                  You can also start with your confidence level from 1 to 10 and what part feels confusing.
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6 xl:self-start xl:sticky xl:top-4">
          <Card
            title="Tutor Session"
            subtitle="This panel keeps the session grounded in your syllabus context."
            className="rounded-panel"
          >
            <div className="grid gap-3 text-sm text-muted">
              <div className="rounded-[14px] bg-white/45 px-4 py-3">
                <span className="font-semibold text-ink">Student</span>
                <p className="mt-1">{student.name}</p>
              </div>
              <div className="rounded-[14px] bg-white/45 px-4 py-3">
                <span className="font-semibold text-ink">Course</span>
                <p className="mt-1">
                  {student.course_name} | Year {student.year} | Semester {student.semester}
                </p>
              </div>
              <div className="rounded-[14px] bg-white/45 px-4 py-3">
                <span className="font-semibold text-ink">Current Topic</span>
                <p className="mt-1">{topic?.topic || "Loading topic..."}</p>
              </div>
            </div>
          </Card>

          <Card
            title="Topic Progress"
            subtitle="Tracked time and completion status for this topic."
            className="rounded-panel"
          >
            <div className="grid gap-3 text-sm text-muted">
              <div className="rounded-[14px] bg-white/45 px-4 py-3">
                <p className="inline-flex items-center gap-2 font-semibold text-ink">
                  <Clock3 size={16} className="text-accent" />
                  {formatDuration(topicProgress?.time_spent_seconds)}
                </p>
                <p className="mt-1">Tracked study time</p>
              </div>
              <div className="rounded-[14px] bg-white/45 px-4 py-3">
                <p className="inline-flex items-center gap-2 font-semibold text-ink">
                  <CircleCheckBig size={16} className={topicProgress?.is_completed ? "text-success" : "text-soft"} />
                  {topicProgress?.is_completed ? "Completed" : "In progress"}
                </p>
                <p className="mt-1">Completion status</p>
              </div>
              <button
                type="button"
                onClick={handleMarkComplete}
                className="primary-button inline-flex items-center justify-center gap-2"
                disabled={isMarkingComplete || topicProgress?.is_completed}
              >
                {isMarkingComplete ? <LoaderCircle size={18} className="animate-spin" /> : <CircleCheckBig size={18} />}
                {topicProgress?.is_completed ? "Topic Completed" : "Mark Topic Complete"}
              </button>
            </div>
          </Card>

          <Card
            title="Understanding Level"
            subtitle="Estimated from the current conversation history."
            className="rounded-panel"
          >
            <div className="rounded-[16px] bg-white/45 px-4 py-5 text-center">
              <p className="text-3xl font-bold text-ink">{studentLevel ?? "-"}</p>
              <p className="mt-2 text-sm text-muted">out of 10</p>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

export default Learn;
