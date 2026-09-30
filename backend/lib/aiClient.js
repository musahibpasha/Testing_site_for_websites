/**
 * Shared AI chat client used by both the report generator (one-shot bug
 * explanations) and the chat panel (multi-turn Q&A on a report).
 *
 * Tries providers in order and falls back automatically if one is
 * unavailable, unconfigured, or rate-limited — so a live demo never
 * dies because a free-tier key got throttled mid-conversation.
 *
 * Configure via env vars (see .env.example). None are required; if no
 * provider is configured, chatCompletion() returns a canned fallback
 * response instead of throwing, so the rest of the app keeps working.
 */

const DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b";

const PROVIDERS = [
  {
    name: "groq",
    enabled: () => !!process.env.GROQ_API_KEY,
    call: async (messages) => {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL,
          messages,
          max_tokens: 600,
          temperature: 0.4,
        }),
      });
      if (!res.ok) throw new Error(`groq responded ${res.status}: ${await res.text()}`);
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (!text) throw new Error("groq returned no content");
      return text;
    },
  },
  {
    name: "openrouter",
    enabled: () => !!process.env.OPENROUTER_API_KEY,
    call: async (messages) => {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          // OpenRouter asks for these on free-tier usage; harmless if ignored.
          "HTTP-Referer": process.env.APP_URL || "http://localhost:5173",
          "X-Title": "WebGuard",
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct:free",
          messages,
          max_tokens: 600,
        }),
      });
      if (!res.ok) throw new Error(`openrouter responded ${res.status}: ${await res.text()}`);
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (!text) throw new Error("openrouter returned no content");
      return text;
    },
  },
  {
    name: "gemini",
    enabled: () => !!process.env.GEMINI_API_KEY,
    call: async (messages) => {
      // Gemini's API shape differs from OpenAI-style chat; adapt here.
      const system = messages.find((m) => m.role === "system")?.content;
      const turns = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));

      const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: turns,
            ...(system && { systemInstruction: { parts: [{ text: system }] } }),
          }),
        }
      );
      if (!res.ok) throw new Error(`gemini responded ${res.status}: ${await res.text()}`);
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("gemini returned no content");
      return text;
    },
  },
];

/**
 * @param {Array<{role: "system"|"user"|"assistant", content: string}>} messages
 * @returns {Promise<{text: string, provider: string}>}
 */
export async function chatCompletion(messages) {
  const attempted = [];

  for (const provider of PROVIDERS) {
    if (!provider.enabled()) continue;
    attempted.push(provider.name);
    try {
      const text = await provider.call(messages);
      return { text, provider: provider.name };
    } catch (err) {
      console.warn(`[aiClient] ${provider.name} failed, trying next provider:`, err.message);
    }
  }

  if (attempted.length === 0) {
    return {
      text:
        "No AI provider is configured yet. Add GROQ_API_KEY (recommended, free & fast), " +
        "OPENROUTER_API_KEY, or GEMINI_API_KEY to backend/.env to enable the chat panel.",
      provider: "none",
    };
  }

  return {
    text: `All configured AI providers (${attempted.join(", ")}) failed to respond — they may be rate-limited. Try again in a moment.`,
    provider: "fallback",
  };
}
