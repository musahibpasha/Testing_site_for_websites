/**
 * Turns raw crawl findings into structured bug objects the
 * frontend Report component knows how to render.
 */
export function detectBugs(findings) {
  const bugs = [];

  for (const err of findings.consoleErrors.slice(0, 20)) {
    bugs.push({
      category: "Functionality",
      severity: "critical",
      title: "JavaScript console error",
      description: err,
      location: "Browser console",
      suggestedFix: "Inspect the stack trace and fix the throwing script; verify no dependent features rely on it.",
    });
  }

  for (const req of findings.failedRequests.slice(0, 20)) {
    bugs.push({
      category: "Functionality",
      severity: req.status && req.status < 500 ? "warning" : "critical",
      title: `Network request failed${req.status ? ` (${req.status})` : ""}`,
      description: req.url,
      location: req.url,
      suggestedFix: "Verify the endpoint exists and returns a successful response; check CORS/auth if applicable.",
    });
  }

  for (const src of findings.brokenImages.slice(0, 20)) {
    bugs.push({
      category: "UI",
      severity: "warning",
      title: "Broken image",
      description: `Image failed to load: ${src}`,
      location: src,
      suggestedFix: "Confirm the image path is correct and the asset is deployed.",
    });
  }

  if (findings.performance.loadTimeMs > 3000) {
    bugs.push({
      category: "Performance",
      severity: findings.performance.loadTimeMs > 6000 ? "critical" : "warning",
      title: "Slow page load",
      description: `Page took ${findings.performance.loadTimeMs}ms to reach network-idle.`,
      suggestedFix: "Audit large assets, enable compression/caching, and defer non-critical scripts.",
    });
  }

  if (findings.accessibility.imgsMissingAlt > 0) {
    bugs.push({
      category: "Accessibility",
      severity: "warning",
      title: "Images missing alt text",
      description: `${findings.accessibility.imgsMissingAlt} image(s) have no alt attribute.`,
      suggestedFix: "Add descriptive alt text for screen reader accessibility.",
    });
  }

  if (findings.accessibility.inputsMissingLabel > 0) {
    bugs.push({
      category: "Accessibility",
      severity: "warning",
      title: "Form inputs missing labels",
      description: `${findings.accessibility.inputsMissingLabel} input(s) are not associated with a label.`,
      suggestedFix: "Wrap inputs in a <label> or add an aria-label attribute.",
    });
  }

  if (!findings.accessibility.hasH1) {
    bugs.push({
      category: "Accessibility",
      severity: "info",
      title: "Missing top-level heading",
      description: "No <h1> element was found on the page.",
      suggestedFix: "Add a single, descriptive <h1> to establish page hierarchy for screen readers and SEO.",
    });
  }

  if (findings.meta.statusCode && findings.meta.statusCode >= 400) {
    bugs.push({
      category: "Functionality",
      severity: "critical",
      title: `Page responded with status ${findings.meta.statusCode}`,
      description: `The target URL did not return a successful response.`,
      suggestedFix: "Check server routing/config; confirm the URL is publicly reachable.",
    });
  }

  return bugs;
}
