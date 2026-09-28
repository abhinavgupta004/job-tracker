const BASE = import.meta.env.VITE_API_URL || "/api";

export const getToken = () => localStorage.getItem("token");

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && getToken()) { localStorage.clear(); location.reload(); }
    throw new Error(data.error || data.msg || "Something went wrong.");
  }
  return data;
}

export const api = {
  login: (b) => request("/auth/login", { method: "POST", body: JSON.stringify(b) }),
  register: (b) => request("/auth/register", { method: "POST", body: JSON.stringify(b) }),
  list: (status, q) => request(`/applications?status=${encodeURIComponent(status)}&q=${encodeURIComponent(q)}`),
  create: (b) => request("/applications", { method: "POST", body: JSON.stringify(b) }),
  update: (id, b) => request(`/applications/${id}`, { method: "PUT", body: JSON.stringify(b) }),
  remove: (id) => request(`/applications/${id}`, { method: "DELETE" }),
  stats: () => request("/stats"),
};
