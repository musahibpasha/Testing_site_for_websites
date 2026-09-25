import { Router } from "express";
import { chatCompletion } from "../lib/aiClient.js";

const router = Router();

const MAX_HISTORY_TURNS = 12; // keep requests small & fast for the demo
const MAX_MESSAGE_LENGTH = 2000;

/**
 * POST /api/chat
 * body: {
 *   message: string,               // the user's new question
 *   url: string,                   // the scanned site's URL, for context
 *   bug: object,                   // the specific bug finding being discussed
 *   history?: Array<{role, content}> // prior turns in this bug's conversation
 * }
 */
router.post("/", async (req, res) => {
  const { message, url, bug, history = [] } = req.body || {};

  if (!message || typeof message !== "string") {
    return res.status(400).json({ message: "'message' is required" });
  }
  if (!bug || typeof bug !== "object") {
    return res.status(400).json({ message: "'bug' context is required" });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ message: `message too long (max ${MAX_MESSAGE_LENGTH} chars)` });
  }

  const systemPrompt = {
    role: "system",
    content:
      `You are WebGuard's in-report assistant — a senior web engineer helping a developer ` +
      `understand and fix an issue found during an automated scan of ${url || "the site"}.\n\n` +
      `The finding being discussed:\n${JSON.stringify(bug, null, 2)}\n\n` +
      `Guidelines:\n` +
      `- Be concise and concrete. Prefer short paragraphs or a short code block over long prose.\n` +
      `- If asked "why is this critical/a problem", explain real-world user or business impact.\n` +
      `- If asked for a fix, give an exact, minimal code snippet, not just a description.\n` +
      `- If the question is unrelated to this finding, answer briefly and redirect back to it.`,
  };

  const trimmedHistory = Array.isArray(history)
    ? history
        .filter((m) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
        .map(({ role, content }) => ({ role, content }))
        .slice(-MAX_HISTORY_TURNS)
    : [];

  const messages = [systemPrompt, ...trimmedHistory, { role: "user", content: message }];

  try {
    const result = await chatCompletion(messages);
    res.json(result);
  } catch (err) {
    console.error("Chat completion error:", err);
    res.status(500).json({ message: "Failed to get a response from the AI assistant" });
  }
});

export default router;
