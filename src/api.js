const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  dashboard: () => request("/dashboard/today"),

  tasks: (date) => request(`/tasks${date ? `?date_filter=${date}` : ""}`),
  createTask: (payload) => request("/tasks", { method: "POST", body: JSON.stringify(payload) }),
  updateTask: (id, payload) => request(`/tasks/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: "DELETE" }),

  scheduleToday: () => request("/schedule/today"),
  updateBlock: (id, status) => request(`/schedule/blocks/${id}?status=${status}`, { method: "PUT" }),

  startSession: (payload) => request("/sessions/start", { method: "POST", body: JSON.stringify(payload) }),
  stopSession: (id) => request(`/sessions/${id}/stop`, { method: "POST" }),

  createCheckin: (payload) => request("/checkins", { method: "POST", body: JSON.stringify(payload) }),
  checkinsToday: () => request("/checkins/today"),

  hydrationToday: () => request("/hydration/today"),
  logHydration: (id, status) => request("/hydration", { method: "POST", body: JSON.stringify({ id, status }) }),

  exerciseToday: () => request("/exercise/today"),
  logExercise: (id, status) => request("/exercise", { method: "POST", body: JSON.stringify({ id, status }) }),

  createNote: (payload) => request("/notes", { method: "POST", body: JSON.stringify(payload) }),
  notes: () => request("/notes"),

  reportToday: () => request("/reports/today"),
  dayEnd: (payload) => request("/reports/day-end", { method: "POST", body: JSON.stringify(payload) }),
  reportHistory: (days = 14) => request(`/reports/history?days=${days}`),

  settings: () => request("/settings"),
  setSetting: (key, value) => request("/settings", { method: "POST", body: JSON.stringify({ key, value }) }),
};
