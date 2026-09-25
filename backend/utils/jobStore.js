// Simple in-memory job store + pub/sub for SSE streaming.
// Swap for Redis in production if you need multi-instance scaling.

const jobs = new Map();

export function createJob(jobId, url) {
  const job = {
    id: jobId,
    url,
    status: "crawling",
    logs: [],
    bugs: [],
    report: null,
    subscribers: new Set(),
    createdAt: Date.now(),
  };
  jobs.set(jobId, job);
  return job;
}

export function getJob(jobId) {
  return jobs.get(jobId);
}

function emit(job, event, payload) {
  for (const res of job.subscribers) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }
}

export function subscribe(job, res) {
  job.subscribers.add(res);
  return () => job.subscribers.delete(res);
}

export function log(job, message) {
  const entry = { message, timestamp: Date.now() };
  job.logs.push(entry);
  emit(job, "log", entry);
}

export function setStatus(job, status) {
  job.status = status;
  emit(job, "status", { status });
}

export function addBug(job, bug) {
  job.bugs.push(bug);
  emit(job, "bug", bug);
}

export function setReport(job, report) {
  job.report = report;
  job.status = "done";
  emit(job, "report", report);
}

export function fail(job, message) {
  job.status = "error";
   job.error = message;  
  emit(job, "error", { message });
}
