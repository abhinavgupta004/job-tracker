# Job Application Tracker

React + Flask + MySQL, containerised with Docker, tested and built by GitHub Actions.

## Run with Docker
```bash
cp .env.example .env    # change the secrets
docker compose up --build
```
App: http://localhost:3000 · API: http://localhost:5000/api/health

## Run locally
```bash
# backend (uses SQLite by default)
cd backend && pip install -r requirements.txt && python app.py
# frontend
cd frontend && npm install && npm run dev     # http://localhost:5173
# tests
cd backend && pytest
```

## API
| Method | Endpoint | Purpose |
|---|---|---|
| POST | /api/auth/register, /api/auth/login | Get a JWT |
| GET | /api/applications?status=&q= | List, filter, search |
| POST | /api/applications | Add |
| PUT / DELETE | /api/applications/:id | Update / delete |
| GET | /api/stats | Dashboard counts and upcoming interviews |

Statuses: Applied → Online Assessment → Interview → Offer / Rejected.
