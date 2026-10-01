Job Application Tracker

A full-stack web app that helps you track every job application you send — from the day you apply to the final outcome — instead of losing track in a spreadsheet or your memory.

What this project does

When you're applying to internships or jobs, you quickly lose track of things: which companies you applied to, what stage each application is at, when your next interview is, and what notes you took after a call. This app solves that by giving every user their own private dashboard where they can log, update, and search their applications.

In plain terms: sign up, add a job application with a few details, and update its status as it moves through the hiring process. The dashboard shows you, at a glance, how many applications are in each stage and which interviews are coming up.

Features   

Feature	What it means
Account system	Each user registers with an email and password. Passwords are never stored as plain text — they're hashed before being saved.
Add / edit / delete applications	Store company name, position, location, company website, job posting link, interview date, and free-text notes.
Status pipeline	Every application moves through: Applied → Online Assessment → Interview → Offer / Rejected. You can update the status directly from the table.
Search & filter	Search by company or position name, or filter the list to just one status (e.g. only show "Interview").
Dashboard	Live counts of how many applications are in each status, plus a list of upcoming interviews sorted by date.
Private data	You only ever see your own applications — another user's data is never visible to you, even if they share the same app instance.
Automated tests	The backend has a test suite that checks login, adding/editing/deleting applications, filtering, and that one user can't see another user's data.
One-command setup	The whole app (frontend + backend + database) starts with a single Docker command — no manual installation of MySQL or Node needed.
Continuous Integration (CI)	Every time code is pushed to GitHub, it automatically runs the tests and builds the project, so bugs are caught early.

How it's built (tech stack)


Part	Technology	Why
Frontend	React (built with Vite)	Builds the interface — the dashboard, forms, and table the user interacts with.
Backend	Flask (Python)	Serves a REST API: handles login, saving applications, and returning data as JSON.
Database	MySQL	Stores users and applications permanently.
Authentication	JWT (JSON Web Tokens)	After login, the user gets a token proving who they are, sent with every request instead of a password.
Containerization	Docker + Docker Compose	Packages the frontend, backend, and database into separate containers that run together with one command, so it behaves the same on any machine.
Web server	Nginx	Serves the built frontend and forwards API requests to the backend.
CI/CD	GitHub Actions	Automatically tests and builds the project on every push.
Testing	Pytest	Runs the backend's automated tests.
How the pieces talk to each other
┌──────────────┐      HTTP requests       ┌──────────────┐      SQL queries     ┌───────────┐
│   Browser    │ ───────────────────────▶ │    React     │                       │           │
│  (the user)  │                            │  (Nginx:80)  │                       │           │
└──────────────┘                            └──────┬───────┘                       │   MySQL   │
                                                     │  /api/* requests             │ database  │
                                                     ▼                               │           │
                                              ┌──────────────┐    SQLAlchemy  ──────▶│           │
                                              │    Flask     │                       │           │
                                              │   (API)      │◀──────────────────────│           │
                                              └──────────────┘                       └───────────┘
The browser loads the React app, which is served as static files by Nginx.
When you click something (like "Add application"), React sends a request to /api/....
Nginx forwards that request to the Flask backend.
Flask checks your login token, runs the logic, and reads/writes data in MySQL through SQLAlchemy (a tool that lets Python talk to the database without writing raw SQL by hand).
Flask sends the result back as JSON, and React updates the screen.


Project structure

job-tracker/
├── backend/                 # Flask API
│   ├── app.py                # All routes, database models, and business logic
│   ├── wsgi.py                # Entry point used by the production server (Gunicorn)
│   ├── requirements.txt       # Python packages the backend needs
│   ├── tests/                 # Automated tests (Pytest)
│   └── Dockerfile             # How to build the backend into a container
│
├── frontend/                 # React app
│   ├── src/
│   │   ├── App.jsx             # Main UI: login/register, dashboard, table, add/edit form
│   │   ├── api.js               # Handles all communication with the backend API
│   │   └── styles.css           # All styling
│   ├── package.json
│   └── Dockerfile             # How to build the frontend into a container
│
├── .github/workflows/ci.yml  # Defines what GitHub Actions runs on every push
├── docker-compose.yml        # Starts frontend + backend + database together
├── .env.example               # Template for environment variables (secrets)
└── README.md

Getting started

Option 1: Run with Docker (recommended — easiest)

You only need Docker Desktop installed. Everything else (Python, Node, MySQL) runs inside containers automatically.

bash
git clone https://github.com/abhinavgupta004/job-tracker.git
cd job-tracker
cp .env.example .env      # then open .env and set a long random JWT_SECRET_KEY
docker compose up --build
App: http://localhost:3000
API health check: http://localhost:5000/api/health
Option 2: Run without Docker (for development)

Useful if you want to edit the code and see changes instantly. Uses SQLite automatically (no MySQL setup needed).

bash
# Terminal 1 — backend
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py                   # runs on http://localhost:5000

# Terminal 2 — frontend
cd frontend
npm install
npm run dev                     # runs on http://localhost:5173
Running the tests
bash
cd backend
pytest
API reference

All endpoints return JSON. Routes other than register/login require sending the JWT token in the request header: Authorization: Bearer <token>.

Method	Endpoint	What it does
POST	/api/auth/register	Create a new account. Returns a token.
POST	/api/auth/login	Log in with email + password. Returns a token.
GET	/api/applications?status=&q=	List your applications. Optionally filter by status or search by text.
POST	/api/applications	Add a new application.
PUT	/api/applications/:id	Update an existing application (e.g. change its status).
DELETE	/api/applications/:id	Delete an application.
GET	/api/stats	Get dashboard numbers: count per status + upcoming interviews.
Why I built this

I built this to actually manage my own job search — I kept losing track of where I'd applied and when interviews were scheduled. Building it also let me practice things that matter for real software jobs: designing a REST API, handling authentication securely, running multiple services with Docker, writing automated tests, and setting up a CI pipeline — not just writing a single script.
