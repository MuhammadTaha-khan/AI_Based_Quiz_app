# AI-Based Quiz App

A full-stack, role-based quiz platform for classrooms. Teachers create topics and quizzes (with AI-assisted question generation), assign them to students, and track class performance. Students take assigned quizzes, practice freely on any topic, and track their own progress. Admins oversee all users, teachers, and activity across the platform.

## Features

**Student**
- Register/login with email verification, password reset
- View and take quizzes assigned by a teacher, timed with auto-scoring
- Practice mode — generate a quiz on any topic/difficulty on demand (AI-generated or pulled from the question bank)
- Personal profile with score history and difficulty progression
- Global leaderboard

**Teacher**
- Create topics and manage a question bank (manual or AI-generated questions, with an approval step before questions go live)
- Build quizzes from approved questions and publish them
- Manage students, assign quizzes with due dates
- Class analytics — scores, completion rates, per-topic performance

**Admin**
- Platform overview stats (users, quizzes, activity)
- Manage/suspend/delete users, manage teacher accounts
- View all quizzes and recent activity across the platform

## Tech Stack

- **Backend**: Flask (Python), SQLite, Gmail SMTP for verification/reset emails, Google Gemini API for AI question generation
- **Frontend**: React 19 (Create React App), Axios

## Project Structure

```
AI_Based_Quiz_app/
├── backend/
│   ├── app.py              # Flask app — all routes, DB schema, business logic
│   ├── requirements.txt
│   ├── .env                # Local secrets (gitignored, not committed)
│   ├── .env.example        # Template for required environment variables
│   └── quiz.db             # SQLite database (auto-created on first run)
└── frontend/
    ├── src/
    │   ├── App.js           # Role-based routing (admin / teacher / student)
    │   └── pages/
    │       ├── admin/       # Admin dashboard pages
    │       ├── teacher/     # Teacher dashboard pages
    │       ├── student/     # Student dashboard pages
    │       └── shared/      # Auth, role select, leaderboard
    └── package.json
```

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- A Gmail account with an [App Password](https://myaccount.google.com/apppasswords) (for sending verification/reset emails)
- A free [Gemini API key](https://aistudio.google.com/apikey) (optional — enables real AI question generation; without it the app falls back to built-in question templates)

### Backend setup

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env   # then fill in your real values
python app.py
```

Backend runs at `http://localhost:5000`. On first run it auto-creates `quiz.db`, seeds sample topics/questions, and creates a default admin account:

```
username: admin
password: admin123
```

### Frontend setup

```bash
cd frontend
npm install
npm start
```

Frontend runs at `http://localhost:3000`. Each page currently points its API calls at `http://localhost:5000/api` — update this if your backend runs elsewhere (e.g. after deployment).

### Environment variables (`backend/.env`)

| Variable | Description |
|---|---|
| `GMAIL_USER` | Gmail address used to send verification/reset emails |
| `GMAIL_APP_PASS` | Gmail App Password (not your regular Gmail password) |
| `GEMINI_API_KEY` | Google Gemini API key for AI question generation. Leave as the placeholder to use template-based generation instead (no cost, no key needed) |

## API Overview

All endpoints are under `/api`. Role is passed via `X-User-Role` / `X-User-Id` headers.

| Group | Examples |
|---|---|
| Auth | `POST /register`, `POST /verify-email`, `POST /login`, `POST /forgot-password`, `POST /reset-password` |
| Teacher | `/teacher/topics`, `/teacher/generate-questions`, `/teacher/questions/<id>`, `/teacher/quizzes`, `/teacher/students`, `/teacher/assign`, `/teacher/analytics` |
| Student | `/student/assignments`, `/student/quiz/<id>/questions`, `/student/quiz/<id>/submit`, `/student/profile/<id>`, `/student/practice/generate` |
| Admin | `/admin/overview`, `/admin/users`, `/admin/quizzes`, `/admin/teachers`, `/admin/activity` |
| Public | `/leaderboard` |

## Deployment

Deployed via [Coolify](https://coolify.io) on a self-hosted server, using Docker.

- `backend/Dockerfile` — Python image running `gunicorn app:app`. `quiz.db` lives at `DB_DIR` (defaults to `/app/data` in the container) so it survives redeploys via a persistent volume, instead of resetting every deploy.
- `frontend/Dockerfile` — multi-stage build: compiles the React app with Node, then serves the static `build/` output via nginx (`frontend/nginx.conf`).
- `docker-compose.yml` (repo root) — defines both services. In Coolify, deploy this repo as a **Docker Compose** resource.

**Required setup in Coolify:**
1. Deploy the `backend` service first, and set `GMAIL_USER`, `GMAIL_APP_PASS`, `GEMINI_API_KEY` as environment variables on it (same values as your local `backend/.env`).
2. Once the backend has a public URL/domain, set `REACT_APP_API_URL` (e.g. `https://your-backend-domain/api`) as a **build-time** variable for the `frontend` service — the frontend bakes this into the JS bundle at build time (Create React App env vars aren't readable at runtime), so it must be set *before* building, and the frontend must be rebuilt any time this value changes.
3. Assign a domain to each service and redeploy.
