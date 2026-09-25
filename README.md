# WebGuard

A futuristic AI website-testing assistant. Point it at a URL, watch it crawl and
test the site in real time, and get back a developer-ready report of what's broken.

This is **Layer 1**: the Vite + React frontend shell — 3D assistant, URL input,
phase tracker, live dashboard, and report view, all wired to shared state via
`TestingContext`. It talks to an Express + Puppeteer backend over REST (job start)
and Socket.IO (live logs/bugs/report) that you build next.

## Stack

- Vite + React 18
- Three.js + `@react-three/fiber` — the 3D scan orb
- Framer Motion — progress bar / UI motion
- Axios — REST calls to the backend
- socket.io-client — real-time log/bug/report streaming

## Getting started

```bash
npm install
npm run dev
```

The dev server proxies `/api` and `/socket.io` to `http://localhost:4000` (see
`vite.config.js`), so once you stand up the Express backend on port 4000, the
frontend will talk to it with no extra config.

## Project structure

```
src/
  context/
    TestingContext.jsx   # single source of truth for a running test
  services/
    api.js                # REST calls (start job, fetch report, cancel)
    socket.js              # Socket.IO wiring for live events
  components/
    Layout/Navbar.jsx
    Hero.jsx
    URLInput/URLInput.jsx
    AIAssistant/ScanOrb.jsx     # the 3D assistant
    PhaseTracker.jsx             # crawl → test → analyze → report
    Dashboard/
      Dashboard.jsx
      LogStream.jsx
      StatsPanel.jsx
    Report/
      BugList.jsx
```

## State model

`TestingContext` tracks one test run at a time:

- `status`: `idle | crawling | testing | analyzing | reporting | done | error`
- `progress`: 0–100, continuous — remapped from whatever phase-local percentage
  the backend reports, so the UI always animates smoothly even though the
  backend thinks in discrete phases
- `logs`, `bugs`, `report`: filled in as Socket.IO events arrive

## Backend contract (next layer)

REST:
- `POST /api/test/start` `{ url }` → `{ jobId }`
- `GET /api/test/:jobId/report`
- `POST /api/test/:jobId/cancel`

Socket.IO (client joins a room per `jobId`):
- `log` → `{ level: "info" | "warn" | "error", text }`
- `phase` → `{ phase: "crawling" | "testing" | "analyzing" | "reporting", pct }`
- `bug` → `{ id, severity: "critical" | "warning" | "info", title, description, selector }`
- `report` → full report object
- `error` → `{ message }`

## Next layers

1. Express backend + Puppeteer crawler
2. Bug detection engine (broken links, console errors, layout shifts, a11y, perf)
3. AI-powered bug explanations (plain-language cause + suggested fix per bug)
4. Polish + docs
