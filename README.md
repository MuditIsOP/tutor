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

### Fastest Windows option

Use the included startup scripts from the project root:

- first-time setup and launch:

```bat
first_time_setup.bat
```

- regular launch after dependencies are already installed:

```bat
start_project.bat
```

- rebuild the SQLite database from the bundled syllabus files:

```bat
rebuild_database.bat
```

Useful script options:

- `first_time_setup.bat --no-start`
- `start_project.bat --dry-run`

1. Install Python dependencies:

```bash
cd backend
pip install -r requirements.txt
```

Current backend packages in `backend/requirements.txt`:

- `fastapi`
- `uvicorn[standard]`
- `sqlalchemy`
- `pydantic[email]`
- `email-validator`
- `python-multipart`
- `openpyxl`
- `python-dotenv`
- `groq`

2. Create a local env file:

```bash
copy .env.example .env
```

3. Put your Groq settings into `backend/.env`.

Required values:

- `GROQ_API_KEY`
- `GROQ_MODEL=llama-3.3-70b-versatile`
- `ADMIN_DEFAULT_USERNAME`
- `ADMIN_DEFAULT_PASSWORD`

Optional runtime tuning:

- `AI_REQUEST_TIMEOUT_SECONDS`
- `AI_MAX_TOKENS`
- `QUIZ_MAX_TOKENS`

The backend loads `backend/.env` automatically and uses the Groq API. If you still have older `GROK_*` variable names in your local env file, the backend accepts them as compatibility aliases.
The admin seed also reads `ADMIN_DEFAULT_USERNAME` and `ADMIN_DEFAULT_PASSWORD` from `backend/.env`, so the admin password stays out of the codebase.

4. Start the API server:

```bash
python -m uvicorn main:app --app-dir . --reload --host 127.0.0.1 --port 8002
```

Startup creates and updates `virtual_tutor.db`, seeds the core academic data, imports subjects/modules/topics, and keeps uploads in `backend/uploads`.

If you want to force a clean rebuild of the academic database at any time, run:

```bat
rebuild_database.bat
```

That command recreates `backend/virtual_tutor.db` from:

- [D:\tutor codex\Book1.xlsx](D:\tutor%20codex\Book1.xlsx)
- [D:\tutor codex\modules_cleaned.csv](D:\tutor%20codex\modules_cleaned.csv)

## Frontend setup

1. Install frontend dependencies:

```bash
cd frontend
npm install
```

Frontend libraries are managed through [D:\tutor codex\frontend\package.json](D:\tutor%20codex\frontend\package.json), not `requirements.txt`.

Main frontend packages include:

- `react`
- `react-dom`
- `react-router-dom`
- `lucide-react`
- `react-datepicker`
- `react-phone-input-2`
- `vite`
- `tailwindcss`
- `postcss`
- `autoprefixer`

2. Start the Vite dev server:

```bash
npm run dev -- --host 127.0.0.1 --port 5174
```

## Data to include when sharing the project

If you zip this project for someone else, include:

- [D:\tutor codex\Book1.xlsx](D:\tutor%20codex\Book1.xlsx)
- [D:\tutor codex\modules_cleaned.csv](D:\tutor%20codex\modules_cleaned.csv)
- [D:\tutor codex\backend\.env.example](D:\tutor%20codex\backend\.env.example)

Do not include:

- `backend/virtual_tutor.db`
- `backend/uploads`
- `backend/.env` if it contains your real API key

On a fresh machine, the backend will recreate `courses`, `subjects`, `modules`, and `topics` automatically from the bundled Excel/CSV files. Student accounts, chat history, quiz history, and uploads will start empty, which is usually the right sharing behavior.

## Fresh clone checklist

For a friend cloning the repo on a new machine:

1. Run `first_time_setup.bat`
2. Add a valid key to `backend/.env`
3. Start the app with `start_project.bat`

That setup will install both:

- Python packages from `backend/requirements.txt`
- frontend packages from `frontend/package.json`

## Current routes

Important backend routes include:

- `POST /login`
- `POST /admin/login`
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
- the seeded admin password is read from `backend/.env`, not stored in source files
- the app still uses frontend local storage for the login session foundation
- there is no JWT auth yet
- `.env` files are ignored by [.gitignore](D:\tutor%20codex\.gitignore)
