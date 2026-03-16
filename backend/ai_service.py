import json
import os
import re
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv
from groq import Groq
from openai import OpenAI


GROQ_MODEL = "llama3-70b-8192"
DEFAULT_GROK_API_BASE_URL = "https://api.x.ai/v1"

load_dotenv(Path(__file__).resolve().parent / ".env")
load_dotenv(Path(__file__).resolve().parent.parent / ".env")


class AIConfigurationError(RuntimeError):
    pass


@dataclass
class SyllabusContext:
    course: str
    year: int
    subject: str
    module: str
    topic: str


def get_groq_client() -> Groq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise AIConfigurationError("GROQ_API_KEY is not configured in the environment.")
    return Groq(api_key=api_key)


def get_ai_provider() -> str:
    if os.getenv("GROQ_API_KEY"):
        return "groq"
    if os.getenv("GROK_API_KEY"):
        return "grok"
    raise AIConfigurationError(
        "No AI API key found. Set GROQ_API_KEY for Groq or GROK_API_KEY for xAI/Grok."
    )


def create_grok_completion(messages: list[dict[str, str]]) -> str:
    api_key = os.getenv("GROK_API_KEY") or os.getenv("XAI_API_KEY")
    if not api_key:
        raise AIConfigurationError("GROK_API_KEY is not configured in the environment.")

    model = os.getenv("GROK_MODEL", "grok-3")
    base_url = os.getenv("GROK_API_BASE_URL", DEFAULT_GROK_API_BASE_URL).rstrip("/")
    client = OpenAI(api_key=api_key, base_url=base_url)
    response = client.chat.completions.create(
        model=model,
        messages=messages,
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

Return ONLY JSON.

Wrap output inside markers:

<QUIZ_JSON>
{{json}}
</QUIZ_JSON>
""".strip()


def create_chat_completion(messages: list[dict[str, str]]) -> str:
    provider = get_ai_provider()
    if provider == "groq":
        client = get_groq_client()
        model = os.getenv("GROQ_MODEL", GROQ_MODEL)
        response = client.chat.completions.create(model=model, messages=messages)
        return response.choices[0].message.content or ""

    return create_grok_completion(messages)


def extract_quiz_json(ai_output: str) -> dict:
    try:
        json_text = ai_output.split("<QUIZ_JSON>")[1].split("</QUIZ_JSON>")[0].strip()
    except IndexError as exc:
        raise ValueError("AI quiz response did not contain <QUIZ_JSON> markers.") from exc

    return json.loads(json_text)
