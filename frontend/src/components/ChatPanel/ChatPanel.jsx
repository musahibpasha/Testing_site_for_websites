import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sendChatMessage } from "../../services/api";
import "./ChatPanel.css";

const SUGGESTED_PROMPTS = ["Why is this critical?", "Give me the exact code fix", "How do I test this is fixed?"];

/**
 * Per-bug AI chat panel. Toggled open from a bug card in the report.
 * Keeps its own local conversation history and sends it as context on
 * every turn so the backend/AI provider has full context each time.
 */
export default function ChatPanel({ bug, url }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // { role: "user"|"assistant", content }
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function send(text) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const nextMessages = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const { text: reply, provider } = await sendChatMessage({
        message: trimmed,
        url,
        bug,
        history: messages.map(({ role, content }) => ({ role, content })),
      });
      setMessages([...nextMessages, { role: "assistant", content: reply, provider }]);
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't reach the assistant. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wg-chat">
      <button
        type="button"
        className="wg-chat__toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? "Close chat" : "💬 Ask AI about this issue"}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="wg-chat__panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="wg-chat__messages" ref={scrollRef}>
              {messages.length === 0 && (
                <div className="wg-chat__empty">
                  Ask anything about this finding — impact, root cause, or how to fix it.
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`wg-chat__bubble wg-chat__bubble--${m.role}`}>
                  <pre>{m.content}</pre>
                  {m.role === "assistant" && m.provider && m.provider !== "fallback" && (
                    <span className="wg-chat__provider">via {m.provider}</span>
                  )}
                </div>
              ))}
              {loading && (
                <div className="wg-chat__bubble wg-chat__bubble--assistant wg-chat__bubble--loading">
                  <span className="wg-chat__dot" />
                  <span className="wg-chat__dot" />
                  <span className="wg-chat__dot" />
                </div>
              )}
            </div>

            {error && <div className="wg-chat__error">{error}</div>}

            {messages.length === 0 && (
              <div className="wg-chat__suggestions">
                {SUGGESTED_PROMPTS.map((p) => (
                  <button key={p} type="button" onClick={() => send(p)}>
                    {p}
                  </button>
                ))}
              </div>
            )}

            <form
              className="wg-chat__input-row"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a follow-up..."
                disabled={loading}
              />
              <button type="submit" disabled={loading || !input.trim()}>
                Send
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
