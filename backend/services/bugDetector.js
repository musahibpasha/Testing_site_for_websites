/**
 * Turns raw crawl findings into structured bug objects the
 * frontend Report component knows how to render.
 */

// Domains for third-party analytics/tracking/monitoring scripts. When
// these fail, nothing breaks for an actual user of the site — the
// vendor's own beacon just didn't land — so these get downgraded to
// "info" instead of "critical". A first-party API failing never matches
// this; it's about the *purpose* of the request, not who owns it.
const THIRD_PARTY_NOISE = /(optimizely|google-analytics|googletagmanager|doubleclick|google-syndication|facebook\.(com|net)|hotjar|segment\.(io|com)|mixpanel|sentry\.io|fullstory|intercom\.io|amplitude\.com|clarity\.ms|newrelic\.com|cloudflareinsights\.com|bugsnag\.com|pendo\.io|snowplow)/i;

function isThirdPartyNoise(text) {
  return THIRD_PARTY_NOISE.test(text || "");
}

function isFavicon(url) {
  return /\/favicon\.ico(\?|$)/i.test(url || "");
}

export function detectBugs(findings) {
  const bugs = [];

  for (const err of findings.consoleErrors.slice(0, 20)) {
    const noise = isThirdPartyNoise(err);
    bugs.push({
      category: "Functionality",
      severity: noise ? "info" : "critical",
      title: noise ? "Third-party script error" : "JavaScript console error",
      description: noise
        ? `A third-party script logged an error: ${err}. Usually a vendor-side issue, not a bug in this site's own code.`
        : err,
      location: "Browser console",
      suggestedFix: noise
        ? "Usually safe to ignore unless a real feature depends on this script."
        : "Inspect the stack trace and fix the throwing script; verify no dependent features rely on it.",
    });
  }

  for (const req of findings.failedRequests.slice(0, 20)) {
    if (isFavicon(req.url)) {
      bugs.push({
        category: "Functionality",
        severity: "info",
        title: "Missing favicon",
        description: `${req.url} returned ${req.status || "an error"}. Harmless — just a missing browser-tab icon, no functional impact.`,
        location: req.url,
        suggestedFix: 'Add a favicon.ico, or a <link rel="icon"> pointing elsewhere — purely cosmetic otherwise.',
      });
      continue;
    }
    const noise = isThirdPartyNoise(req.url);
    bugs.push({
      category: "Functionality",
      severity: noise ? "info" : req.status && req.status < 500 ? "warning" : "critical",
      title: `${noise ? "Third-party analytics request failed" : "Network request failed"}${req.status ? ` (${req.status})` : ""}`,
      description: noise
        ? `A third-party tracking/analytics beacon failed to reach ${req.url}. Doesn't affect site functionality, only that vendor's own data collection.`
        : req.url,
      location: req.url,
      suggestedFix: noise
        ? "Usually safe to ignore. If it's meant to track real usage, check the vendor snippet/config is current."
        : "Verify the endpoint exists and returns a successful response; check CORS/auth if applicable.",
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