import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import pytest
from app import create_app, db


@pytest.fixture
def client():
    app = create_app({"TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"})
    with app.test_client() as c:
        yield c


def auth(client, email="a@b.com"):
    r = client.post("/api/auth/register", json={"name": "A", "email": email, "password": "secret1"})
    return {"Authorization": f"Bearer {r.json['token']}"}


def test_register_login(client):
    auth(client)
    assert client.post("/api/auth/login", json={"email": "a@b.com", "password": "secret1"}).status_code == 200
    assert client.post("/api/auth/login", json={"email": "a@b.com", "password": "bad"}).status_code == 401


def test_crud_filter_stats(client):
    h = auth(client)
    r = client.post("/api/applications", headers=h, json={"company": "Google", "position": "SWE Intern"})
    assert r.status_code == 201
    aid = r.json["id"]
    client.post("/api/applications", headers=h, json={"company": "Amazon", "position": "SDE Intern"})
    r = client.put(f"/api/applications/{aid}", headers=h, json={"status": "Interview", "interview_date": "2099-01-01"})
    assert r.json["status"] == "Interview"
    assert len(client.get("/api/applications?status=Interview", headers=h).json) == 1
    assert len(client.get("/api/applications?q=amaz", headers=h).json) == 1
    s = client.get("/api/stats", headers=h).json
    assert s["total"] == 2 and len(s["upcoming_interviews"]) == 1
    assert client.delete(f"/api/applications/{aid}", headers=h).status_code == 204


def test_isolation_and_validation(client):
    h1, h2 = auth(client), auth(client, "c@d.com")
    aid = client.post("/api/applications", headers=h1, json={"company": "X", "position": "Y"}).json["id"]
    assert client.put(f"/api/applications/{aid}", headers=h2, json={"notes": "hi"}).status_code == 404
    assert client.post("/api/applications", headers=h1, json={"company": "X", "position": "Y", "status": "Nope"}).status_code == 400
    assert client.get("/api/applications").status_code == 401
