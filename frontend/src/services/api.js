import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 15000,
});

// Kicks off a crawl+test job on the backend. Returns { jobId }.
export async function startTestJob(url, prompt = "") {
  const { data } = await api.post("/test/start", { url, prompt });
  return data;
}

export async function getReport(jobId) {
  const { data } = await api.get(`/test/${jobId}/report`);
  return data;
}

// Server-Sent Events stream of real-time job progress.
// Backend should expose GET /api/test/:jobId/stream as text/event-stream
// emitting named events: log, status, bug, report, error.
export function subscribeToTestStream(jobId, handlers = {}) {
  const source = new EventSource(`/api/test/${jobId}/stream`);

  source.addEventListener("log", (e) => handlers.onLog?.(JSON.parse(e.data)));
  source.addEventListener("status", (e) => handlers.onStatus?.(JSON.parse(e.data).status));
  source.addEventListener("bug", (e) => handlers.onBug?.(JSON.parse(e.data)));
  source.addEventListener("report", (e) => {
    handlers.onReport?.(JSON.parse(e.data));
    source.close();
  });
  source.addEventListener("error", (e) => {
    handlers.onError?.(e?.data ? JSON.parse(e.data).message : "Connection lost");
  });

  return source;
}

// Sends one turn to the AI chat panel for a specific bug finding.
// { message, url, bug, history } -> { text, provider }
export async function sendChatMessage({ message, url, bug, history }) {
  const { data } = await api.post("/chat", { message, url, bug, history });
  return data;
}

export default api;