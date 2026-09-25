import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Crawls target page & sub-routes, probes form controls and action buttons,
 * and gathers console errors, failed 500 HTTP requests, broken assets, and performance.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'public', 'screenshots');

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1366, height: 768 },
];

const ENABLE_SCREENSHOTS = false;

export async function crawlPage(url, { log, jobId, prompt } = {}) {
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  } catch (err) {
    throw new Error(
      `Could not launch the headless browser (${err.message}). ` +
      `This usually means Chromium wasn't installed for Puppeteer — try running ` +
      `"npm install" again in backend/, or set PUPPETEER_EXECUTABLE_PATH in .env ` +
      `to a Chrome/Chromium binary on this machine.`
    );
  }

  const findings = {
    consoleErrors: [],
    failedRequests: [],
    brokenImages: [],
    performance: {},
    accessibility: {},
    meta: { prompt: prompt || "" },
    screenshots: {},
  };

  const seenConsole = new Set();
  const addConsoleError = (msgText) => {
    if (msgText && !seenConsole.has(msgText)) {
      seenConsole.add(msgText);
      findings.consoleErrors.push(msgText);
    }
  };

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        addConsoleError(msg.text());
      }
    });

    page.on("pageerror", (err) => {
      addConsoleError(err?.stack || err?.message || String(err));
    });

    page.on("error", (err) => {
      addConsoleError(err?.message || String(err));
    });

    page.on("requestfailed", (req) => {
      findings.failedRequests.push({
        url: req.url(),
        reason: req.failure()?.errorText,
      });
      addConsoleError(`Failed to load resource: ${req.failure()?.errorText || "request failed"} (${req.url()})`);
    });

    page.on("response", (res) => {
      if (res.status() >= 400) {
        findings.failedRequests.push({ url: res.url(), status: res.status() });
        addConsoleError(`Failed to load resource: the server responded with a status of ${res.status()} (${res.url()})`);
      }
    });

    log?.(`Navigating to ${url}`);
    const start = Date.now();
    const response = await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    findings.performance.loadTimeMs = Date.now() - start;
    findings.meta.statusCode = response?.status();
    findings.meta.title = await page.title();

    // ---------- Sub-route & Deep Navigation Probe ----------
    const promptText = (prompt || "").toLowerCase();
    log?.("Checking for sub-routes and feature navigation links...");
    
    const subRoute = await page.evaluate((pText) => {
      const links = Array.from(document.querySelectorAll("a[href]"));
      for (const a of links) {
        const href = a.getAttribute("href") || "";
        const text = (a.innerText || "").toLowerCase();
        if (
          href &&
          !href.startsWith("#") &&
          !href.startsWith("javascript:") &&
          (href.includes("generate") || href.includes("plan") || (pText && (pText.includes(text) || text.includes(pText))))
        ) {
          return a.href;
        }
      }
      return null;
    }, promptText);

    if (subRoute && subRoute !== url && subRoute.startsWith("http")) {
      log?.(`Navigating to sub-feature route: ${subRoute}`);
      try {
        await page.goto(subRoute, { waitUntil: "networkidle2", timeout: 25000 });
      } catch (e) {
        log?.(`Sub-route navigation note: ${e.message}`);
      }
    }

    // ---------- Form Input Auto-Fill & Button Action Trigger ----------
    log?.("Probing form controls and interactive feature buttons...");
    try {
      const interactionResult = await page.evaluate(async (pText) => {
        // Auto-fill empty numeric/text input fields with dummy data so form validation passes
        const inputs = Array.from(document.querySelectorAll("input[type='number'], input[type='text'], input:not([type])"));
        let filledCount = 0;
        for (const input of inputs) {
          if (!input.value) {
            if (input.type === "number" || input.name?.includes("height") || input.placeholder?.includes("cm")) {
              input.value = "180";
            } else if (input.name?.includes("weight") || input.placeholder?.includes("kg")) {
              input.value = "65";
            } else {
              input.value = "60";
            }
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
            filledCount++;
          }
        }

        // Find and click the target action button
        const buttons = Array.from(
          document.querySelectorAll("button, input[type='submit'], input[type='button'], [role='button']")
        );

        let target = null;
        for (const btn of buttons) {
          const txt = (btn.innerText || btn.value || "").trim().toLowerCase();
          if (!txt) continue;
          if (
            (pText && (pText.includes(txt) || txt.includes(pText))) ||
            txt.includes("generate") ||
            txt.includes("plan") ||
            txt.includes("submit") ||
            txt.includes("save")
          ) {
            target = btn;
            break;
          }
        }

        if (!target && buttons.length > 0) {
          target = buttons.find((b) => b.offsetWidth > 0 && b.offsetHeight > 0);
        }

        if (target) {
          target.scrollIntoView?.({ block: "center" });
          target.click();
          return { clicked: target.innerText || target.value || "button", filledCount };
        }

        return { clicked: null, filledCount };
      }, promptText);

      if (interactionResult?.clicked) {
        log?.(`Triggered action button "${interactionResult.clicked}" (auto-filled ${interactionResult.filledCount} form fields) — waiting for network response`);
        // Wait 4.5s for async fetch/XHR network calls, 500 error responses & promise rejections
        await new Promise((r) => setTimeout(r, 4500));
      }
    } catch (err) {
      log?.(`Interaction probe notice: ${err.message}`);
    }

    log?.("Checking images and links");
    findings.brokenImages = await page.$$eval("img", (imgs) =>
      imgs
        .filter((img) => !img.complete || img.naturalWidth === 0)
        .map((img) => img.src)
    );

    log?.("Running basic accessibility checks");
    findings.accessibility = await page.evaluate(() => {
      const imgsMissingAlt = Array.from(document.querySelectorAll("img:not([alt])")).length;
      const inputsMissingLabel = Array.from(document.querySelectorAll("input:not([aria-label])"))
        .filter((el) => !el.closest("label")).length;
      const hasH1 = !!document.querySelector("h1");
      return { imgsMissingAlt, inputsMissingLabel, hasH1 };
    });

    findings.performance.domContentLoadedMs = await page.evaluate(() => {
      const t = performance.getEntriesByType("navigation")[0];
      return t ? Math.round(t.domContentLoadedEventEnd) : null;
    });

    if (ENABLE_SCREENSHOTS && jobId) {
      const jobDir = path.join(SCREENSHOTS_DIR, jobId);
      fs.mkdirSync(jobDir, { recursive: true });

      for (const vp of VIEWPORTS) {
        log?.(`Capturing ${vp.name} screenshot (${vp.width}x${vp.height})`);
        await page.setViewport({ width: vp.width, height: vp.height });
        await new Promise((r) => setTimeout(r, 250));
        const filename = `${vp.name}.png`;
        await page.screenshot({ path: path.join(jobDir, filename), fullPage: false });
        findings.screenshots[vp.name] = `/screenshots/${jobId}/${filename}`;
      }
    }
  } finally {
    await browser.close();
  }

  return findings;
}