import { Router } from "express";
import { nanoid } from "nanoid";
import { createJob, getJob, subscribe, log, setStatus, addBug, setReport, fail } from "../utils/jobStore.js";
import { crawlPage } from "../services/crawler.js";
import { detectBugs } from "../services/bugDetector.js";
import { generateReport } from "../services/reportGenerator.js";

const router = Router();

router.post("/start", async (req, res) => {
  const { url, prompt } = req.body;
  if (!url || !/^https?:\/\//.test(url)) {
    return res.status(400).json({ message: "A valid http(s) URL is required" });
  }

  const jobId = nanoid(10);
  const job = createJob(jobId, url);
  job.prompt = prompt || "";
  res.json({ jobId });

  // Run the pipeline asynchronously; progress streams via SSE.
  runPipeline(job).catch((err) => {
    console.error("Pipeline error:", err);
    fail(job, err.message || "Unexpected error during scan");
  });
});

router.get("/:jobId/stream", (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) return res.status(404).end();

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders?.();

  // Replay history so late subscribers aren't lost.
  for (const entry of job.logs) {
    res.write(`event: log\ndata: ${JSON.stringify(entry)}\n\n`);
  }
  for (const bug of job.bugs) {
    res.write(`event: bug\ndata: ${JSON.stringify(bug)}\n\n`);
  }
  res.write(`event: status\ndata: ${JSON.stringify({ status: job.status })}\n\n`);
  if (job.error) {
    res.write(`event: error\ndata: ${JSON.stringify({ message: job.error })}\n\n`);
  }
  if (job.report) {
    res.write(`event: report\ndata: ${JSON.stringify(job.report)}\n\n`);
  }

  const unsubscribe = subscribe(job, res);
  req.on("close", unsubscribe);
});

router.get("/:jobId/report", (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) return res.status(404).json({ message: "Job not found" });
  res.json({ status: job.status, bugs: job.bugs, report: job.report });
});

async function runPipeline(job) {
  setStatus(job, "crawling");
  log(job, `Launching headless browser for ${job.url}`);
  if (job.prompt) {
    log(job, `Target feature prompt: "${job.prompt}"`);
  }

  const findings = await crawlPage(job.url, { log: (m) => log(job, m), jobId: job.id, prompt: job.prompt });

  setStatus(job, "testing");
  log(job, "Running functionality, performance and UI checks");

  const bugs = detectBugs(findings);

  setStatus(job, "analyzing");
  log(job, `Found ${bugs.length} potential issue(s) — generating explanations`);

  const report = await generateReport(bugs, job.url, findings, job.prompt);

  for (const bug of report.bugs) {
    addBug(job, bug);
  }

  log(job, "Scan complete");
  setReport(job, report);
}

export default router;