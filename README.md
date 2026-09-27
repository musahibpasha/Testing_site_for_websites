# WebGuard

WebGuard is a futuristic AI website-testing assistant that crawls a site, checks for functional and UI issues, and returns a developer-ready report with bug explanations.

It is built as a split app:
- a Vite + React frontend for the UI and landing page
- an Express + Puppeteer backend for crawling, auditing, and generating reports

## Stack

- React 18 + Vite
- Three.js + @react-three/fiber
- Framer Motion
- Axios
- Express
- Puppeteer
- Groq / OpenRouter / Gemini via optional AI API keys

## Project structure

```bash
backend/
  lib/
    aiClient.js
  public/
    screenshots/
  routes/
    chat.js
    test.js
  services/
    bugDetector.js
    crawler.js
    reportGenerator.js
  utils/
    jobStore.js
  .env.example
  package.json
  server.js

frontend/
  src/
    App.jsx
    index.css
    main.jsx
    components/
      Assistant3D/
      ChatPanel/
      Dashboard/
      ErrorBanner/
      Hero/
      Navbar/
      Report/
      URLInput/
    context/
      TestingContext.jsx
    services/
      api.js
  package.json
  vite.config.js
```

## Local development

1. Start the backend:

```bash
cd backend
npm install
npm run dev
```

2. Start the frontend:

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server proxies `/api` to `http://localhost:4000` via [frontend/vite.config.js](frontend/vite.config.js).

## Required backend env vars

Create a `.env` file inside `backend/` with:

```env
PORT=4000
GROQ_API_KEY=your_key_here
GROQ_MODEL=openai/gpt-oss-20b
```

You can also set optional providers:

```env
OPENROUTER_API_KEY=
GEMINI_API_KEY=
PUPPETEER_EXECUTABLE_PATH=
```

If no AI provider key is configured, the app still runs and falls back to non-AI responses.

## Frontend env vars for deployment

Create a `.env` file inside `frontend/` for Vercel deployment:

```env
VITE_API_URL=https://your-backend-url
VITE_API_TIMEOUT_MS=60000
```

Example:

```env
VITE_API_URL=https://testing-site-for-websites.onrender.com
VITE_API_TIMEOUT_MS=60000
```

## API routes

### Backend

```text
GET /api/health
POST /api/test/start
GET /api/test/:jobId/report
GET /api/test/:jobId/stream
POST /api/chat
```

### Request format

```json
POST /api/test/start
{
  "url": "https://example.com",
  "prompt": "Check the login flow"
}
```

Response:

```json
{ "jobId": "abc123" }
```

## Deployment

### Recommended hosting setup
- Frontend: Vercel
- Backend: Render or Railway

### Frontend on Vercel
- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`

### Backend on Render
- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`

The backend includes:

```json
"postinstall": "npx puppeteer browsers install chrome"
```

This ensures Puppeteer has a Chrome binary available on Render.

## Notes

- The project is designed for browser automation, so a VM or Node host with Chrome support is needed.
- Vercel alone is not ideal for the backend because the scanning service uses Puppeteer.
- The app already includes a fallback path for AI configuration so the backend does not fail if no key is set.

## License

This project is for demo and portfolio use unless otherwise specified.
