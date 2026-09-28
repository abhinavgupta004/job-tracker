import { useState, useEffect, useCallback } from "react";
import { api, getToken } from "./api.js";

export const STATUSES = ["Applied", "Online Assessment", "Interview", "Offer", "Rejected"];
const slug = (s) => s.toLowerCase().replace(/\s+/g, "-");

function Auth({ onDone }) {
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      const r = await (mode === "login" ? api.login(f) : api.register(f));
      localStorage.setItem("token", r.token);
      localStorage.setItem("name", r.user.name);
      onDone();
    } catch (x) { setErr(x.message); }
  }

  return (
    <main className="auth">
      <form onSubmit={submit}>
        <h1>{mode === "login" ? "Sign in" : "Create your account"}</h1>
        <p className="muted">Keep every application, interview and note in one place.</p>
        {mode === "register" && <label>Name<input value={f.name} onChange={set("name")} required /></label>}
        <label>Email<input type="email" value={f.email} onChange={set("email")} required /></label>
        <label>Password<input type="password" value={f.password} onChange={set("password")} minLength={6} required /></label>
        {err && <p className="error" role="alert">{err}</p>}
        <button className="primary">{mode === "login" ? "Sign in" : "Create account"}</button>
        <button type="button" className="link" onClick={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </form>
    </main>
  );
}

function Dashboard({ stats }) {
  if (!stats) return null;
  return (
    <section className="dash">
      <div className="pipeline">
        <div className="total"><strong>{stats.total}</strong><span>applications</span></div>
        {STATUSES.map((s) => (
          <div key={s} className={`stage ${slug(s)}`}>
            <strong>{stats.by_status[s]}</strong><span>{s}</span>
          </div>
        ))}
      </div>
      <div className="upcoming">
        <h2>Upcoming interviews</h2>
        {stats.upcoming_interviews.length === 0 ? <p className="muted">No interviews scheduled. Set an interview date on an application to see it here.</p> : (
          <ul>{stats.upcoming_interviews.map((a) => (
            <li key={a.id}><time>{a.interview_date}</time> {a.company} · {a.position}</li>
          ))}</ul>
        )}
      </div>
    </section>
  );
}

const EMPTY = { company: "", position: "", status: "Applied", company_website: "", location: "", job_link: "", interview_date: "", notes: "" };

function AppForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState({ ...EMPTY, ...Object.fromEntries(Object.entries(initial || {}).map(([k, v]) => [k, v ?? ""])) });
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    try { await onSave(f); } catch (x) { setErr(x.message); }
  }

  return (
    <div className="overlay" onClick={onCancel}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>{initial?.id ? "Edit application" : "Add application"}</h2>
        <div className="grid">
          <label>Company<input value={f.company} onChange={set("company")} required /></label>
          <label>Position<input value={f.position} onChange={set("position")} required /></label>
          <label>Status
            <select value={f.status} onChange={set("status")}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
          </label>
          <label>Interview date<input type="date" value={f.interview_date} onChange={set("interview_date")} /></label>
          <label>Company website<input value={f.company_website} onChange={set("company_website")} placeholder="https://" /></label>
          <label>Location<input value={f.location} onChange={set("location")} /></label>
        </div>
        <label>Job link<input value={f.job_link} onChange={set("job_link")} placeholder="https://" /></label>
        <label>Notes<textarea rows={4} value={f.notes} onChange={set("notes")} /></label>
        {err && <p className="error" role="alert">{err}</p>}
        <div className="actions">
          <button type="button" onClick={onCancel}>Cancel</button>
          <button className="primary">Save application</button>
        </div>
      </form>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [apps, setApps] = useState([]);
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [a, s] = await Promise.all([api.list(status, q), api.stats()]);
      setApps(a); setStats(s); setError("");
    } catch (x) { setError(x.message); }
  }, [status, q]);

  useEffect(() => { if (authed) { const t = setTimeout(load, 250); return () => clearTimeout(t); } }, [authed, load]);

  if (!authed) return <Auth onDone={() => setAuthed(true)} />;

  async function save(f) {
    const body = { ...f, interview_date: f.interview_date || null };
    editing.id ? await api.update(editing.id, body) : await api.create(body);
    setEditing(null); load();
  }
  async function changeStatus(a, s) { await api.update(a.id, { status: s }); load(); }
  async function remove(a) { if (confirm(`Delete ${a.company} – ${a.position}?`)) { await api.remove(a.id); load(); } }

  return (
    <div className="shell">
      <header>
        <h1>Job Application Tracker</h1>
        <span>{localStorage.getItem("name")}</span>
        <button onClick={() => { localStorage.clear(); setAuthed(false); }}>Sign out</button>
      </header>
      <Dashboard stats={stats} />
      <section className="toolbar">
        <input type="search" placeholder="Search company or position" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button className="primary" onClick={() => setEditing({})}>Add application</button>
      </section>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Company</th><th>Position</th><th>Status</th><th>Interview</th><th>Notes</th><th></th></tr></thead>
          <tbody>
            {apps.map((a) => (
              <tr key={a.id}>
                <td>{a.company_website ? <a href={a.company_website} target="_blank" rel="noreferrer">{a.company}</a> : a.company}
                  {a.location && <small>{a.location}</small>}</td>
                <td>{a.job_link ? <a href={a.job_link} target="_blank" rel="noreferrer">{a.position}</a> : a.position}</td>
                <td><select className={`pill ${slug(a.status)}`} value={a.status} onChange={(e) => changeStatus(a, e.target.value)} aria-label="Update status">
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}</select></td>
                <td>{a.interview_date || "–"}</td>
                <td className="notes">{a.notes}</td>
                <td className="row-actions"><button onClick={() => setEditing(a)}>Edit</button><button onClick={() => remove(a)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {apps.length === 0 && <p className="empty">No applications yet. Choose “Add application” to log your first one.</p>}
      </div>
      {editing && <AppForm initial={editing} onSave={save} onCancel={() => setEditing(null)} />}
    </div>
  );
}
