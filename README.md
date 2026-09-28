Job Application Tracker

A full-stack web app to track job applications end-to-end — from "Applied" to "Offer" or "Rejected" — with a live dashboard, search/filter, and per-user authentication.
<img width="1901" height="920" alt="Screenshot 2026-09-29 001217" src="https://github.com/user-attachments/assets/ffc82112-3c48-4741-8180-5ca34119dfbf" />

<img width="1905" height="898" alt="Screenshot 2026-09-29 010534" src="https://github.com/user-attachments/assets/98ecb081-b24b-4d7e-972d-5e03a22d31ec" />


Why I built this

Most job-search trackers are just a spreadsheet. This app replaces that with a proper full-stack project: a REST API, authenticated multi-user data, a relational database, and a CI pipeline that runs tests and builds on every push — built to demonstrate real backend + frontend + DevOps skills for internship/SDE interviews.

Features
Authentication — register/login with JWT, passwords hashed (never stored in plain text)
Application tracking — add, edit, delete applications with company, position, location, job link, interview date, and notes
Status pipeline — Applied → Online Assessment → Interview → Offer / Rejected, updatable inline from the table
Search & filter — search by company/position, filter by status
Dashboard — live counts per status and a list of upcoming interviews
Data isolation — each user only sees their own applications
Tested — backend covered by pytest (auth, CRUD, filtering, stats, cross-user isolation)
Containerized — one-command startup with Docker Compose
CI/CD — GitHub Actions runs backend tests, builds the frontend, and builds both Docker images on every push
Tech stack
Layer	Tech
Frontend	React (Vite)
Backend	Flask, Flask-JWT-Extended, SQLAlchemy
Database	MySQL 8
Auth	JWT, hashed passwords (Werkzeug)
Infra	Docker, Docker Compose, Nginx (frontend)
CI/CD	GitHub Actions
Testing	Pytest
Architecture
┌─────────────┐      /api/*       ┌─────────────┐      SQL      ┌───────────┐
│   React     │ ───────────────▶  │   Flask     │ ────────────▶ │   MySQL   │
│ (Nginx:80)  │  ◀───────────────  │  (Gunicorn) │ ◀──────────── │           │
└─────────────┘      JSON         └─────────────┘               └───────────┘

The Nginx container serves the built React app and proxies /api/* requests to the Flask backend. Flask talks to MySQL over SQLAlchemy. Everything runs as separate services under Docker Compose.

Getting started
Run with Docker (recommended)
bash
git clone https://github.com/abhinavgupta004/job-tracker.git
cd job-tracker
cp .env.example .env      # then edit JWT_SECRET_KEY to a long random string
docker compose up --build
App: http://localhost:3000
API health check: http://localhost:5000/api/health
Run locally (without Docker)

Backend uses SQLite automatically when no DATABASE_URL is set.

bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py                   # http://localhost:5000

# Frontend (new terminal)
cd frontend
npm install
npm run dev                     # http://localhost:5173
Run tests
bash
cd backend
pytest
API reference
Method	Endpoint	Description
POST	/api/auth/register	Create an account, returns a JWT
POST	/api/auth/login	Log in, returns a JWT
GET	/api/applications?status=&q=	List applications, optional status filter and search
POST	/api/applications	Create an application
PUT	/api/applications/:id	Update an application
DELETE	/api/applications/:id	Delete an application
GET	/api/stats	Dashboard counts by status + upcoming interviews

All /api/applications* and /api/stats routes require Authorization: Bearer <token>.

Project structure
job-tracker/
├── backend/            # Flask API
│   ├── app.py          # Routes, models, business logic
│   ├── wsgi.py         # Gunicorn entrypoint
│   ├── tests/          # Pytest suite
│   └── Dockerfile
├── frontend/            # React app (Vite)
│   ├── src/
│   │   ├── App.jsx      # UI: auth, dashboard, table, forms
│   │   ├── api.js       # API client
│   │   └── styles.css
│   └── Dockerfile
├── .github/workflows/   # CI pipeline
├── docker-compose.yml
└── .env.example
