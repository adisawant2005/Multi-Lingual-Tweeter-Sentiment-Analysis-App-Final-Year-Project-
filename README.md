# Multi-Lingual Tweeter Sentiment Analysis — FYP

This repository contains a React Native mobile client and an Express.js server that uses Google Gemini (via `@google/generative-ai`) to analyze a local `India.csv` dataset.

The mobile app includes a simple UI to call server endpoints and view their responses. The server samples rows from `India.csv` and calls Gemini to perform sentiment analysis, trend extraction, insights, and summaries.

<img width="479" height="1017" alt="Screenshot 2025-10-28 151319" src="https://github.com/user-attachments/assets/b7e446eb-59be-4cd7-b52d-8f53f045600f" />


---

## What was implemented

- React Native app with navigation and two main screens:
  - `HomeScreen` — buttons to call server endpoints and show loading/errors
  - `DetailsScreen` — pretty-prints API responses
- Express server under `server/` with ESM (`server/package.json` contains `"type": "module"`)
- API endpoints under `/api`:
  - `/api/analyze-multiple-tweets-sentiment`
  - `/api/analyze-trends`
  - `/api/generate-insights`
  - `/api/generate-summary`

---

## Prerequisites

- Node.js (v18+ recommended)
- Android Studio / Xcode or device for testing
- React Native CLI environment (see: https://reactnative.dev/docs/environment-setup)
- Gemini API key (set in `server/.env`)

---

## Install dependencies

From the project root:

```powershell
# Install app dependencies
npm install

# Install server dependencies (server has its own package.json)
cd server
npm install
cd ..
```

The server is installed inside `server/` so it can use ESM (`type: "module"`) without breaking Metro.

---

## Environment

Create `server/.env` and add your Gemini API key:

```
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## Run (development)

- Start Metro and the server together (recommended):

```powershell
npm run dev
```

This runs Metro for React Native and the server (using `server/`'s dev script which uses `nodemon`).

- Run server only (dev watch):

```powershell
npm run server
```

- Run server only (production):

```powershell
npm run server:prod
```

- Start Android app (separate terminal; ensure Metro is running):

```powershell
npm run android
```

---

## Networking / Emulator notes

- Android emulator uses `10.0.2.2` to reach the host machine. The app's `HomeScreen` selects the correct base URL automatically:
  - Android emulator: `http://10.0.2.2:3000`
  - iOS Simulator / macOS: `http://localhost:3000`

If you use a physical device, replace the base URL in `src/screens/HomeScreen.tsx` with your machine IP (e.g. `http://192.168.x.y:3000`).

---

## Test endpoints from the app

1. Start the server: `npm run server` (or `npm run dev` to run both)
2. Start the app and open the Home screen
3. Tap any of the endpoint buttons — the app will call the server and navigate to Details to show the response

If the server isn't reachable you'll see an error message on Home.

---

## Manual curl example

```powershell
curl http://localhost:3000/api/analyze-multiple-tweets-sentiment
```

Use `10.0.2.2` instead of `localhost` if calling from Android emulator code that expects that mapping.

---

## Troubleshooting

- Metro ESM error on Windows ("Only URLs with a scheme ... Received protocol 'c:'"):
  - Do not set `"type": "module"` in the root `package.json`. The server is isolated in `server/` and has `type: "module"`.

- Missing `India.csv` errors:
  - Place your CSV at `server/India.csv` or update the path in `server/utils.js`.

- Gemini responses malformed / empty:
  - Inspect server logs — the server prints model output for debugging. The model may still produce unexpected text even when given a schema.

---

## Next steps (suggestions)

- Add an in-app server health/status indicator and retry button
- Add parameterized calls (e.g. `?lang=hindi`) from UI
- Add unit tests for server utilities
- Provide a small sanitized sample `India.csv` for faster developer testing

---

If you'd like, I can also add an in-app server health indicator and a retry button next.
