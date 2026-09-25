import { motion } from "framer-motion";
import { useTesting, PHASES } from "../../context/TestingContext";
import ChatPanel from "../ChatPanel/ChatPanel";
import "./Report.css";

const SEVERITY_LABEL = {
  critical: "Critical",
  warning: "Warning",
  info: "Info",
};

function healthScoreMeta(score) {
  if (score >= 90) return { label: "Excellent", className: "excellent" };
  if (score >= 70) return { label: "Good", className: "good" };
  if (score >= 40) return { label: "Needs Work", className: "needs-work" };
  return { label: "Poor", className: "poor" };
}

export default function Report() {
  const { status, report, url, reset } = useTesting();

  if (status !== PHASES.DONE) return null;

  const groups = report?.groups || [];
  const healthScore = report?.healthScore ?? 100;
  const counts = report?.counts || { critical: 0, warning: 0, info: 0, total: 0 };
  const scoreMeta = healthScoreMeta(healthScore);
  const targetPrompt = report?.featureResult?.prompt || report?.targetPrompt;

  return (
    <section id="report" className="wg-report container">
      <div className="wg-report__header">
        <h3>
          Report — <span className="glow-text">{url}</span>
        </h3>
        <button className="wg-report__reset" onClick={reset}>
          NEW SCAN
        </button>
      </div>

      <div className="wg-scorecard glass-panel">
        <div className={`wg-score wg-score--${scoreMeta.className}`}>
          <span className="wg-score__value">{healthScore}</span>
          <span className="wg-score__max">/100</span>
        </div>
        <div className="wg-scorecard__details">
          <div className={`wg-scorecard__label wg-scorecard__label--${scoreMeta.className}`}>
            {scoreMeta.label}
          </div>
          {report?.summary && <p className="wg-scorecard__summary">{report.summary}</p>}
          <div className="wg-scorecard__counts">
            <span className="wg-count wg-count--critical">{counts.critical} Critical</span>
            <span className="wg-count wg-count--warning">{counts.warning} Warning</span>
            <span className="wg-count wg-count--info">{counts.info} Info</span>
          </div>
        </div>
      </div>

      {/* Target Feature Audit Result Section */}
      {targetPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="wg-feature-result glass-panel"
        >
          <div className="wg-feature-result__header">
            <div className="wg-feature-result__title-group">
              <span className="wg-feature-result__badge">🎯 TARGET FEATURE EVALUATION</span>
              <h4>&ldquo;{targetPrompt}&rdquo;</h4>
            </div>
            <div className={`wg-feature-result__status wg-feature-result__status--${(report.featureResult?.status || "PASS").toLowerCase()}`}>
              {report.featureResult?.status === "PASS" && "🟢 PASSED"}
              {report.featureResult?.status === "WARNING" && "⚠️ OPERATIONAL (WITH WARNINGS)"}
              {report.featureResult?.status === "FAIL" && "🔴 ISSUES DETECTED"}
              {!report.featureResult?.status && "🟢 EVALUATED"}
            </div>
          </div>
          <p className="wg-feature-result__eval">
            {report.featureResult?.evaluation ||
              `Target feature "${targetPrompt}" was analyzed during the scan across console, network, and performance metrics.`}
          </p>
        </motion.div>
      )}

      {groups.length === 0 && (
        <div className="glass-panel wg-report__empty">
          No issues detected. Your site passed all checks. ✅
        </div>
      )}

      <div className="wg-report__groups">
        {groups.map((group) => (
          <div key={group.category} className="wg-category glass-panel">
            <div className="wg-category__header">
              <h4>{group.category}</h4>
              <span className="wg-category__count">
                {group.total} issue{group.total === 1 ? "" : "s"}
              </span>
            </div>

            {group.severities.map(({ severity, bugs }) => (
              <div key={severity} className="wg-severity-group">
                <div className={`wg-severity-group__label wg-severity-group__label--${severity}`}>
                  {SEVERITY_LABEL[severity]} ({bugs.length})
                </div>
                <div className="wg-report__list">
                  {bugs.map((bug, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`wg-bug-card glass-panel wg-bug-card--${bug.severity || "info"}`}
                    >
                      <h4>{bug.title}</h4>
                      <p>{bug.explanation || bug.description}</p>
                      {bug.location && <code>{bug.location}</code>}
                      {bug.suggestedFix && (
                        <div className="wg-bug-card__fix">
                          <strong>Suggested fix:</strong> {bug.suggestedFix}
                        </div>
                      )}
                      <ChatPanel bug={bug} url={url} />
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}