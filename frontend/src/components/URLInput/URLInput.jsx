import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTesting, PHASES } from "../../context/TestingContext";
import "./URLInput.css";

function isValidUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function URLInput() {
  const [value, setValue] = useState("");
  const [prompt, setPrompt] = useState("");
  const [touched, setTouched] = useState(false);
  const { startTest, status } = useTesting();

  const valid = isValidUrl(value);
  const busy = ![PHASES.IDLE, PHASES.DONE, PHASES.ERROR].includes(status);

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!valid || busy) return;
    startTest(value.trim(), prompt.trim());
  };

  return (
    <form className="wg-urlinput glass-panel" onSubmit={handleSubmit}>
      <div className="wg-urlinput__row">
        <span className="wg-urlinput__prefix">TARGET_URL &gt;</span>
        <input
          type="text"
          placeholder="https://your-website.com"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => setTouched(true)}
          disabled={busy}
        />
        <motion.button
          type="submit"
          whileHover={{ scale: busy ? 1 : 1.04 }}
          whileTap={{ scale: busy ? 1 : 0.97 }}
          disabled={busy}
          className="wg-urlinput__btn"
        >
          {busy ? "SCANNING..." : "LAUNCH SCAN"}
        </motion.button>
      </div>

      <AnimatePresence>
        {value.trim() && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 4 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.2 }}
            className="wg-urlinput__row wg-urlinput__row--prompt"
          >
            <span className="wg-urlinput__prefix">FEATURE_PROMPT &gt;</span>
            <input
              type="text"
              placeholder="Optional: test a specific feature (e.g. login form, payment flow, navigation menu)"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={busy}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {touched && !valid && (
        <span className="wg-urlinput__error">Enter a valid http(s) URL</span>
      )}
    </form>
  );
}
