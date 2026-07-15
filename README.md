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

Frontend runs at `http://localhost:3000`. The API base URL comes from `frontend/src/config.js`, which reads `REACT_APP_API_URL` (defaults to `http://localhost:5000/api` for local dev).

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
- `docker-compose.yml` (repo root) — defines both services. In Coolify, deploy this repo as a **Docker Compose** resource. Both services use `expose` (not `ports`) so Coolify's own reverse proxy routes to them over its internal network, instead of publishing to host ports directly — important on a shared host running multiple Coolify resources.
- `backend/.env` is gitignored and never committed — for Coolify, set `GMAIL_USER`, `GMAIL_APP_PASS`, `GEMINI_API_KEY` in the resource's **Environment Variables** panel instead; Coolify injects them into the running container itself.

**Required setup in Coolify:**
1. Set `GMAIL_USER`, `GMAIL_APP_PASS`, `GEMINI_API_KEY` in the resource's Environment Variables panel (shared across both services), and deploy.
2. Each service (`backend`, `frontend`) gets its own domain/FQDN in Coolify — confirm both are set. Note the **backend's** domain specifically.
3. Set `REACT_APP_API_URL=http://<backend-domain>/api` in the same Environment Variables panel — **must point at the backend's domain, not the frontend's** (easy mix-up since Coolify auto-suggests both `SERVICE_FQDN_BACKEND` and `SERVICE_FQDN_FRONTEND`). This is a build-time value: Create React App bakes it into the JS bundle at build time, not read at container runtime, so the frontend must be rebuilt any time this value changes.
4. Redeploy.
