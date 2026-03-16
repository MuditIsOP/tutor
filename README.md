# ChatGPT-based Virtual Tutor System

Virtual tutor platform with a FastAPI backend, SQLite database, React + Vite frontend, and a glassmorphism UI guided by [design.md](D:\tutor%20codex\design.md).

## What is included

- student registration and login
- dashboard, subjects, modules, topics, and learning flow
- AI tutor backend integration
- quiz generation and quiz review history
- progress tracking with time spent, topic completion, and subject analytics
- working settings page with profile updates and password reset

## Ports

- backend: `8002`
- frontend: `5174`

## Project structure

```text
.
|-- backend/
|   |-- .env.example
|   |-- ai_service.py
|   |-- auth.py
|   |-- database.py
|   |-- main.py
|   |-- models.py
|   |-- requirements.txt
|   |-- schemas.py
|   |-- seed.py
|   |-- uploads/
|   `-- virtual_tutor.db
|-- frontend/
|   |-- package.json
|   |-- src/
|   `-- vite.config.js
|-- design.md
`-- README.md
```

## Backend setup

1. Install Python dependencies:

```bash
cd backend
pip install -r requirements.txt
```

2. Create a local env file:

```bash
copy .env.example .env
```

3. Put your AI key into `backend/.env`.

This project supports either:

- `Groq`
  - `GROQ_API_KEY`
  - optional `GROQ_MODEL`

- `xAI / Grok`
  - `GROK_API_KEY`
  - optional `GROK_API_BASE_URL`
  - optional `GROK_MODEL`

The backend loads `backend/.env` automatically.

4. Start the API server:

```bash
python -m uvicorn main:app --app-dir . --reload --host 127.0.0.1 --port 8002
```

Startup creates and updates `virtual_tutor.db`, seeds the course data, imports subjects/modules/topics, and keeps uploads in `backend/uploads`.

## Frontend setup

1. Install frontend dependencies:

```bash
cd frontend
npm install
```

2. Start the Vite dev server:

```bash
npm run dev -- --host 127.0.0.1 --port 5174
```

## Data to include when sharing the project

If you zip this project for someone else, include:

- [D:\tutor codex\backend\virtual_tutor.db](D:\tutor%20codex\backend\virtual_tutor.db)
- [D:\tutor codex\backend\uploads](D:\tutor%20codex\backend\uploads)

Do not include:

- `backend/.env` if it contains your real API key

Instead, share:

- [D:\tutor codex\backend\.env.example](D:\tutor%20codex\backend\.env.example)

and ask them to create their own `backend/.env`.

## Current routes

Important backend routes include:

- `POST /login`
- `POST /register`
- `POST /reset-password`
- `POST /ai-tutor`
- `POST /generate-quiz`
- `POST /submit-quiz`
- `POST /topic-progress`
- `GET /progress/{student_id}`
- `GET /quiz-history/{student_id}`
- `GET /quiz-session/{session_id}`

## Notes

- passwords are hashed with SHA-256
- the app still uses frontend local storage for the login session foundation
- there is no JWT auth yet
- `.env` files are ignored by [.gitignore](D:\tutor%20codex\.gitignore)
