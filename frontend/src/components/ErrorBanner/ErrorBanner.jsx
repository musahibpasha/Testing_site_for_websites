import { motion } from "framer-motion";
import { useTesting, PHASES } from "../../context/TestingContext";
import "./ErrorBanner.css";

export default function ErrorBanner() {
  const { status, error, url, reset } = useTesting();

  if (status !== PHASES.ERROR) return null;

  return (
    <section className="container">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="wg-error glass-panel"
      >
        <div className="wg-error__icon">!</div>
        <div className="wg-error__body">
          <h4>Scan couldn't finish</h4>
          <p>
            WebGuard hit a problem while scanning <span className="glow-text">{url}</span> —
            this is a scan infrastructure issue, not a report on your site:
          </p>
          <code className="wg-error__message">{error || "Unknown error"}</code>
        </div>
        <button className="wg-error__retry" onClick={reset}>
          TRY AGAIN
        </button>
      </motion.div>
    </section>
  );
}
