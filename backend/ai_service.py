import json
import os
import re
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv
from groq import Groq

load_dotenv(Path(__file__).resolve().parent / ".env")
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile"
AI_REQUEST_TIMEOUT_SECONDS = float(os.getenv("AI_REQUEST_TIMEOUT_SECONDS", "180"))
AI_MAX_TOKENS = int(os.getenv("AI_MAX_TOKENS", "400"))
QUIZ_MAX_TOKENS = int(os.getenv("QUIZ_MAX_TOKENS", "4000"))


class AIConfigurationError(RuntimeError):
    pass


@dataclass
class SyllabusContext:
    course: str
    year: int
    subject: str
    module: str
    topic: str


def get_groq_api_key() -> str:
    # Accept the earlier GROK_* env names as aliases so existing local env files keep working.
    api_key = os.getenv("GROQ_API_KEY") or os.getenv("GROK_API_KEY")
    if not api_key:
        raise AIConfigurationError("GROQ_API_KEY is not configured in the environment.")
    return api_key


def get_groq_model() -> str:
    model = os.getenv("GROQ_MODEL") or os.getenv("GROK_MODEL") or DEFAULT_GROQ_MODEL
    if model.startswith("grok-"):
        return DEFAULT_GROQ_MODEL
    return model


def create_groq_completion(messages: list[dict[str, str]]) -> str:
    base_url = os.getenv("GROQ_API_BASE_URL")
    client = Groq(
        api_key=get_groq_api_key(),
        base_url=base_url if base_url else None,
        timeout=AI_REQUEST_TIMEOUT_SECONDS,
        max_retries=1,
    )
    response = client.chat.completions.create(
        model=get_groq_model(),
        messages=messages,
        max_tokens=AI_MAX_TOKENS,
    )
    return response.choices[0].message.content or ""


def infer_student_level(history_messages: list[str], fallback: int = 5) -> int:
    for message in reversed(history_messages):
        matches = re.findall(r"\b([1-9]|10)\b", message)
        if matches:
            value = int(matches[-1])
            if 1 <= value <= 10:
                return value
    return fallback


def build_tutor_system_prompt(context: SyllabusContext, student_level: int) -> str:
    return f"""
You are an AI Virtual Tutor for the system:

ChatGPT-based Virtual Tutor System.

SYLLABUS CONTEXT

Course: {context.course}
Year: {context.year}

Subject: {context.subject}
Module: {context.module}
Topic: {context.topic}

Student understanding level: {student_level}/10

TEACHING PROTOCOL

1. Ask student to rate understanding (1-10).
2. Ask 5 diagnostic questions.
3. Estimate level (Beginner / Intermediate / Advanced).
4. Teach topic step-by-step.
5. Answer student questions.
6. When student indicates understanding, ask 5 verification questions.
7. Provide final summary.

Be clear, patient, and practical. Use the syllabus context only.
""".strip()


def build_quiz_system_prompt(context: SyllabusContext, student_level: int) -> str:
    return f"""
You are an AI assessment generator for:

ChatGPT-based Virtual Tutor System.

SYLLABUS CONTEXT

Course: {context.course}
Year: {context.year}

Subject: {context.subject}
Module: {context.module}
Topic: {context.topic}

Student understanding level: {student_level}/10

Generate exactly 10 Multiple Choice Questions.

Difficulty progression:

Questions 1-3 -> Easy
Questions 4-7 -> Medium
Questions 8-10 -> Hard

Each question must contain:

question
4 options
correct_answer
explanation

Return only a JSON object.

Use this exact JSON shape:
{{
  "course": "{context.course}",
  "year": {context.year},
  "subject": "{context.subject}",
  "module": "{context.module}",
  "topic": "{context.topic}",
  "student_level": {student_level},
  "difficulty_progression": "easy_to_hard",
  "total_questions": 10,
  "questions": [
    {{
      "id": "Q1",
      "difficulty": "easy",
      "question": "...",
      "options": {{
        "A": "...",
        "B": "...",
        "C": "...",
        "D": "..."
      }},
      "correct_answer": "A",
      "explanation": "..."
    }}
  ]
}}

Rules:
- Return exactly 10 questions.
- "options" must be an object with keys A, B, C, and D. Do not use an array.
- "correct_answer" must be one of A, B, C, or D.
- Do not include markdown fences.
- Keep option text plain and JSON-safe.
""".strip()


def create_chat_completion(messages: list[dict[str, str]]) -> str:
    return create_groq_completion(messages)


def create_quiz_completion(messages: list[dict[str, str]]) -> dict:
    base_url = os.getenv("GROQ_API_BASE_URL")
    client = Groq(
        api_key=get_groq_api_key(),
        base_url=base_url if base_url else None,
        timeout=AI_REQUEST_TIMEOUT_SECONDS,
        max_retries=1,
    )
    response = client.chat.completions.create(
        model=get_groq_model(),
        messages=messages,
        max_tokens=QUIZ_MAX_TOKENS,
        response_format={"type": "json_object"},
    )
    content = response.choices[0].message.content or "{}"
    return json.loads(content)


def normalize_quiz_payload(quiz_payload: dict, context: SyllabusContext, student_level: int) -> dict:
    normalized_questions: list[dict[str, object]] = []
    raw_questions = quiz_payload.get("questions", [])

    if not isinstance(raw_questions, list):
        raise ValueError("AI quiz response did not contain a valid questions list.")

    for index, raw_question in enumerate(raw_questions[:10], start=1):
        if not isinstance(raw_question, dict):
            continue

        options = raw_question.get("options", {})
        normalized_options: dict[str, str] = {}
        if isinstance(options, dict):
            for key in ("A", "B", "C", "D"):
                normalized_options[key] = str(options.get(key, "")).strip()
        elif isinstance(options, list):
            for key, value in zip(("A", "B", "C", "D"), options[:4]):
                normalized_options[key] = str(value).strip()

        if len([value for value in normalized_options.values() if value]) < 4:
            continue

        correct_answer = str(raw_question.get("correct_answer", "")).strip().upper()
        if correct_answer not in normalized_options:
            matched_key = next(
                (key for key, value in normalized_options.items() if value.strip().lower() == correct_answer.lower()),
                None,
            )
            correct_answer = matched_key or "A"

        if index <= 3:
            difficulty = "easy"
        elif index <= 7:
            difficulty = "medium"
        else:
            difficulty = "hard"

        normalized_questions.append(
            {
                "id": str(raw_question.get("id") or f"Q{index}"),
                "difficulty": str(raw_question.get("difficulty") or difficulty).lower(),
                "question": str(raw_question.get("question", "")).strip(),
                "options": normalized_options,
                "correct_answer": correct_answer,
                "explanation": str(raw_question.get("explanation", "")).strip(),
            }
        )

    if len(normalized_questions) != 10:
        raise ValueError("AI quiz response did not contain exactly 10 usable questions.")

    return {
        "course": str(quiz_payload.get("course") or context.course),
        "year": int(quiz_payload.get("year") or context.year),
        "subject": str(quiz_payload.get("subject") or context.subject),
        "module": str(quiz_payload.get("module") or context.module),
        "topic": str(quiz_payload.get("topic") or context.topic),
        "student_level": int(quiz_payload.get("student_level") or student_level),
        "difficulty_progression": str(quiz_payload.get("difficulty_progression") or "easy_to_hard"),
        "total_questions": int(quiz_payload.get("total_questions") or len(normalized_questions)),
        "questions": normalized_questions,
    }
