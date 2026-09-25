import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTesting, PHASES } from "../../context/TestingContext";
import "./Dashboard.css";

const CHECKS = [
  { key: "functional", label: "Functionality", phase: PHASES.CRAWLING },
  { key: "performance", label: "Performance", phase: PHASES.TESTING },
  { key: "ui", label: "UI / Responsiveness", phase: PHASES.TESTING },
  { key: "accessibility", label: "Accessibility", phase: PHASES.ANALYZING },
];

const PHASE_ORDER = [PHASES.CRAWLING, PHASES.TESTING, PHASES.ANALYZING, PHASES.DONE];

function checkState(checkPhase, currentStatus) {
  if (currentStatus === PHASES.ERROR) return "error";
  const currentIdx = PHASE_ORDER.indexOf(currentStatus);
  const checkIdx = PHASE_ORDER.indexOf(checkPhase);
  if (currentIdx > checkIdx) return "done";
  if (currentIdx === checkIdx) return "active";
  return "pending";
}

export default function Dashboard() {
  const { status, progress, logs, bugs, url } = useTesting();
  const logEndRef = useRef(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  if (status === PHASES.IDLE) return null;

  return (
    <section id="dashboard" className="wg-dashboard container">
      <div className="wg-dashboard__header">
        <h3>Live Diagnostic — <span className="glow-text">{url}</span></h3>
        <div className="wg-progress">
          <div className="wg-progress__bar" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="wg-dashboard__grid">
        <div className="wg-dashboard__checks glass-panel">
          <h4>Checks</h4>
          {CHECKS.map((c) => {
            const state = checkState(c.phase, status);
            return (
              <div key={c.key} className={`wg-check wg-check--${state}`}>
                <span className="wg-check__dot" />
                <span>{c.label}</span>
                <span className="wg-check__state">{state}</span>
              </div>
            );
          })}
        </div>

        <div className="wg-dashboard__logs glass-panel">
          <h4>Console</h4>
          <div className="wg-dashboard__logbody">
            <AnimatePresence initial={false}>
              {logs.map((log, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="wg-log-line"
                >
                  {typeof log === "string" ? log : log.message}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={logEndRef} />
          </div>
        </div>

        <div className="wg-dashboard__stats glass-panel">
          <h4>Stats</h4>
          <div className="wg-stat">
            <span>Bugs found</span>
            <strong>{bugs.length}</strong>
          </div>
          <div className="wg-stat">
            <span>Critical</span>
            <strong className="wg-stat--critical">
              {bugs.filter((b) => b.severity === "critical").length}
            </strong>
          </div>
          <div className="wg-stat">
            <span>Warnings</span>
            <strong className="wg-stat--warning">
              {bugs.filter((b) => b.severity === "warning").length}
            </strong>
          </div>
          <div className="wg-stat">
            <span>Status</span>
            <strong>{status}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
