/**
 * Produces a plain-English summary of the scan, a 0-100 health score,
 * and groups bugs by category → severity so the frontend can render
 * a proper audit-style report. Also upgrades each bug's description
 * into a developer-friendly explanation using whichever AI provider is
 * configured (see backend/lib/aiClient.js — Groq, OpenRouter, Gemini,
 * with automatic fallback between them). Falls back to rule-based text
 * so the app works fully offline / without any key configured.
 */

import { chatCompletion } from "../lib/aiClient.js";

async function explainWithAI(bugs, url, prompt = "") {
  if (bugs.length === 0) return bugs;

  try {
    const featureContext = prompt ? ` The user requested testing specifically for the following feature/goal: "${prompt}".` : "";
    const { text } = await chatCompletion([
      {
        role: "user",
        content:
          `You are a senior web engineer reviewing automated test findings for ${url}.${featureContext} ` +
          `For each bug below, write a 1-2 sentence developer-facing explanation of likely cause and impact. ` +
          `Return ONLY a JSON array of strings, same order, no markdown fences.\n\n` +
          JSON.stringify(bugs.map((b) => ({ title: b.title, description: b.description, category: b.category }))),
      },
    ]);

    const clean = text.replace(/```json|```/g, "").trim();
    const explanations = JSON.parse(clean);

    return bugs.map((b, i) => ({ ...b, explanation: explanations[i] || b.description }));
  } catch (err) {
    console.warn("AI explanation generation failed, falling back to raw descriptions:", err.message);
    return bugs;
  }
}

async function evaluateTargetFeatureWithAI(bugs, url, findings, prompt) {
  if (!prompt) return null;

  const criticals = bugs.filter((b) => b.severity === "critical");
  const warnings = bugs.filter((b) => b.severity === "warning");

  let status = "PASS";
  if (criticals.length > 0) {
    status = "FAIL";
  } else if (warnings.length > 0) {
    status = "WARNING";
  }

  try {
    const { text } = await chatCompletion([
      {
        role: "user",
        content:
          `You are a senior QA & Web Reliability Engineer reviewing an automated test scan for ${url}.\n` +
          `The user specifically requested testing for the target feature: "${prompt}".\n\n` +
          `Crawl Details:\n` +
          `- Page Title: "${findings.meta.title || "N/A"}"\n` +
          `- Page Load Time: ${findings.performance.loadTimeMs || 0}ms\n` +
          `- Console Errors: ${findings.consoleErrors.length > 0 ? JSON.stringify(findings.consoleErrors.slice(0, 5)) : "None"}\n` +
          `- Failed Network Requests: ${findings.failedRequests.length > 0 ? JSON.stringify(findings.failedRequests.slice(0, 5)) : "None"}\n` +
          `- Total Issues Found: ${bugs.length} (${criticals.length} critical, ${warnings.length} warning)\n\n` +
          `Instructions:\n` +
          `Write a concise 2-3 sentence AI evaluation answering: Is "${prompt}" working properly based on the scan results? Mention any console errors, network failures, or performance delays affecting this feature. Be direct and developer-friendly.`,
      },
    ]);

    return {
      prompt,
      status,
      evaluation: text.trim(),
    };
  } catch (err) {
    console.warn("Feature evaluation AI call failed, fallback used:", err.message);
    return {
      prompt,
      status,
      evaluation:
        status === "PASS"
          ? `Automated check for "${prompt}" completed successfully with 0 critical functional errors.`
          : `Automated check for "${prompt}" completed. Detected ${bugs.length} issue(s) (${criticals.length} critical, ${warnings.length} warning) that may impact functionality or performance.`,
    };
  }
}

// Points deducted per issue, by severity. Floor at 0 / cap at 100.
const SEVERITY_WEIGHTS = { critical: 20, warning: 8, info: 2 };
const SEVERITY_ORDER = ["critical", "warning", "info"];

// Known categories render in this order; anything else is appended
// alphabetically after.
const CATEGORY_ORDER = ["Functionality", "Performance", "Accessibility", "UI"];

function calculateHealthScore(bugs) {
  const penalty = bugs.reduce((sum, b) => sum + (SEVERITY_WEIGHTS[b.severity] ?? SEVERITY_WEIGHTS.info), 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}

function groupByCategoryAndSeverity(bugs) {
  const byCategory = {};

  for (const bug of bugs) {
    const category = bug.category || "Other";
    const severity = SEVERITY_ORDER.includes(bug.severity) ? bug.severity : "info";

    if (!byCategory[category]) {
      byCategory[category] = { critical: [], warning: [], info: [] };
    }
    byCategory[category][severity].push(bug);
  }

  const orderedCategories = [
    ...CATEGORY_ORDER.filter((c) => byCategory[c]),
    ...Object.keys(byCategory)
      .filter((c) => !CATEGORY_ORDER.includes(c))
      .sort(),
  ];

  return orderedCategories.map((category) => {
    const bySeverity = byCategory[category];
    const total = SEVERITY_ORDER.reduce((n, s) => n + bySeverity[s].length, 0);

    return {
      category,
      total,
      severities: SEVERITY_ORDER
        .map((severity) => ({ severity, bugs: bySeverity[severity] }))
        .filter((group) => group.bugs.length > 0),
    };
  });
}

export async function generateReport(bugs, url, findings, prompt = "") {
  const explainedBugs = await explainWithAI(bugs, url, prompt);
  const featureResult = await evaluateTargetFeatureWithAI(explainedBugs, url, findings, prompt);

  const critical = explainedBugs.filter((b) => b.severity === "critical").length;
  const warning = explainedBugs.filter((b) => b.severity === "warning").length;
  const info = explainedBugs.filter((b) => b.severity === "info").length;

  const healthScore = calculateHealthScore(explainedBugs);
  const groups = groupByCategoryAndSeverity(explainedBugs);

  const targetSuffix = prompt ? ` (Target Feature: "${prompt}")` : "";
  const summary =
    explainedBugs.length === 0
      ? `WebGuard scanned ${url}${targetSuffix} and found no issues across functionality, performance, and accessibility checks.`
      : `WebGuard scanned ${url}${targetSuffix} and found ${explainedBugs.length} issue(s): ${critical} critical, ${warning} warning, ${info} info. ` +
        `Page loaded in ${findings.performance.loadTimeMs || 0}ms. Review the critical items first — they're most likely to affect users.`;

  return {
    summary,
    targetPrompt: prompt,
    featureResult,
    healthScore,
    counts: { critical, warning, info, total: explainedBugs.length },
    groups,
    bugs: explainedBugs,
    screenshots: findings.screenshots || {},
    generatedAt: Date.now(),
  };
}