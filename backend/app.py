import os, time
from datetime import datetime, date
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func, or_
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()
STATUSES = ["Applied", "Online Assessment", "Interview", "Offer", "Rejected"]


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)


class Application(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    company = db.Column(db.String(120), nullable=False)
    position = db.Column(db.String(120), nullable=False)
    status = db.Column(db.String(30), nullable=False, default="Applied")
    company_website = db.Column(db.String(255))
    location = db.Column(db.String(120))
    job_link = db.Column(db.String(500))
    interview_date = db.Column(db.Date)
    notes = db.Column(db.Text)
    applied_on = db.Column(db.Date, default=date.today)

    def to_dict(self):
        return {
            "id": self.id, "company": self.company, "position": self.position,
            "status": self.status, "company_website": self.company_website,
            "location": self.location, "job_link": self.job_link,
            "interview_date": self.interview_date.isoformat() if self.interview_date else None,
            "notes": self.notes,
            "applied_on": self.applied_on.isoformat() if self.applied_on else None,
        }


def parse_date(v):
    return datetime.strptime(v, "%Y-%m-%d").date() if v else None


def create_app(config=None):
    app = Flask(__name__)
    app.config.update(
        SQLALCHEMY_DATABASE_URI=os.getenv("DATABASE_URL", "sqlite:///dev.db"),
        JWT_SECRET_KEY=os.getenv("JWT_SECRET_KEY", "change-me-in-production"),
        SQLALCHEMY_ENGINE_OPTIONS={"pool_pre_ping": True},
    )
    if config:
        app.config.update(config)
    CORS(app)
    db.init_app(app)
    JWTManager(app)

    with app.app_context():
        for attempt in range(30):  # MySQL container may still be starting
            try:
                db.create_all()
                break
            except Exception:
                if attempt == 29:
                    raise
                time.sleep(2)

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    @app.post("/api/auth/register")
    def register():
        d = request.get_json(silent=True) or {}
        name, email, pw = d.get("name", "").strip(), d.get("email", "").strip().lower(), d.get("password", "")
        if not name or "@" not in email or len(pw) < 6:
            return {"error": "Name, valid email and a password of 6+ characters are required."}, 400
        if User.query.filter_by(email=email).first():
            return {"error": "This email is already registered."}, 409
        u = User(name=name, email=email, password_hash=generate_password_hash(pw))
        db.session.add(u)
        db.session.commit()
        return {"token": create_access_token(identity=str(u.id)), "user": {"name": u.name, "email": u.email}}, 201

    @app.post("/api/auth/login")
    def login():
        d = request.get_json(silent=True) or {}
        u = User.query.filter_by(email=d.get("email", "").strip().lower()).first()
        if not u or not check_password_hash(u.password_hash, d.get("password", "")):
            return {"error": "Incorrect email or password."}, 401
        return {"token": create_access_token(identity=str(u.id)), "user": {"name": u.name, "email": u.email}}

    def mine(app_id):
        return Application.query.filter_by(id=app_id, user_id=int(get_jwt_identity())).first_or_404()

    def apply_fields(a, d):
        for f in ("company", "position", "company_website", "location", "job_link", "notes"):
            if f in d:
                setattr(a, f, (d[f] or "").strip() or None)
        if "status" in d:
            a.status = d["status"]
        if "interview_date" in d:
            a.interview_date = parse_date(d["interview_date"])

    def validate(d, partial=False):
        if "status" in d and d["status"] not in STATUSES:
            return f"Status must be one of: {', '.join(STATUSES)}."
        if not partial and not (d.get("company", "").strip() and d.get("position", "").strip()):
            return "Company and position are required."
        try:
            parse_date(d.get("interview_date"))
        except ValueError:
            return "Interview date must be YYYY-MM-DD."

    @app.get("/api/applications")
    @jwt_required()
    def list_apps():
        q = Application.query.filter_by(user_id=int(get_jwt_identity()))
        status, term = request.args.get("status"), request.args.get("q", "").strip()
        if status:
            q = q.filter_by(status=status)
        if term:
            like = f"%{term}%"
            q = q.filter(or_(Application.company.ilike(like), Application.position.ilike(like)))
        return jsonify([a.to_dict() for a in q.order_by(Application.id.desc()).all()])

    @app.post("/api/applications")
    @jwt_required()
    def create_app_():
        d = request.get_json(silent=True) or {}
        err = validate(d)
        if err:
            return {"error": err}, 400
        a = Application(user_id=int(get_jwt_identity()), company="", position="")
        apply_fields(a, d)
        a.status = d.get("status", "Applied")
        db.session.add(a)
        db.session.commit()
        return a.to_dict(), 201

    @app.put("/api/applications/<int:app_id>")
    @jwt_required()
    def update_app(app_id):
        a, d = mine(app_id), request.get_json(silent=True) or {}
        err = validate(d, partial=True)
        if err:
            return {"error": err}, 400
        apply_fields(a, d)
        db.session.commit()
        return a.to_dict()

    @app.delete("/api/applications/<int:app_id>")
    @jwt_required()
    def delete_app(app_id):
        db.session.delete(mine(app_id))
        db.session.commit()
        return "", 204

    @app.get("/api/stats")
    @jwt_required()
    def stats():
        uid = int(get_jwt_identity())
        rows = db.session.query(Application.status, func.count()).filter_by(user_id=uid).group_by(Application.status).all()
        by = {s: 0 for s in STATUSES}
        by.update(dict(rows))
        upcoming = (Application.query.filter(Application.user_id == uid, Application.interview_date >= date.today())
                    .order_by(Application.interview_date).limit(5).all())
        return {"total": sum(by.values()), "by_status": by, "upcoming_interviews": [a.to_dict() for a in upcoming]}

    return app


if __name__ == "__main__":
    create_app().run(host="0.0.0.0", port=5000, debug=True)
