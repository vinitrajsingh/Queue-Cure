# Queue Cure

A full-stack clinic queue management system for a single clinic with one doctor
and one live queue. Three interfaces share one realtime socket layer so every
screen stays in sync the instant the queue changes.

- **Receptionist admin** at `/admin` (tablet and laptop) manages the queue.
- **Waiting hall display** at `/display` (large TV, read-only) shows the now
  serving token and what is next.
- **Patient tracking view** at `/patient/:tokenId` (mobile, opened by scanning a
  QR code) shows the patient's place in line, wait estimate, and break status in
  their chosen language.

## Live demo

- Admin: <https://queue-cure-puce.vercel.app/admin>
- Display: <https://queue-cure-puce.vercel.app/display>
- Patient: open the admin, add a patient, and scan the QR (or use the patient
  link from the QR dialog).

The "Show on TV" button on the admin opens a dialog with the display link, a
scannable QR, and instructions for casting to a smart TV, Chromecast, HDMI, or a
streaming stick. The display page has a fullscreen button for a kiosk view.

Note: the backend runs on a free tier that sleeps after about 15 minutes idle.
The first request after a nap can take 30 to 50 seconds to wake; open the admin a
minute before a demo and the screens reconnect automatically once it is awake.

## Stack

- Backend: Node.js, Express, Socket.io, Mongoose (MongoDB)
- Frontend: React (Vite), React Router, TailwindCSS, Socket.io client

## Prerequisites

- Node.js 18+ (developed on Node 22)
- A running MongoDB instance (developed on MongoDB 8)

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env        # adjust if needed
npm run seed                # wipe and seed clinic state + sample patients
npm start                   # starts on http://localhost:4000
```

Backend environment variables (`backend/.env`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `4000` | API and socket server port |
| `MONGO_URI` | `mongodb://localhost:27017/queue-cure` | MongoDB connection string |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Allowed CORS origin(s) for the frontend. Accepts a comma-separated list to allow several origins (for example local plus the deployed URL) |
| `PATIENT_BASE_URL` | `http://localhost:5173` | Base URL used to build patient QR links. Must include the scheme (for example `https://your-app.vercel.app`) and no trailing slash |

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env        # adjust if needed
npm run dev                 # starts on http://localhost:5173
```

Frontend environment variables (`frontend/.env`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_SOCKET_URL` | `http://localhost:4000` | Backend socket/API URL |

## Running the three views

With both servers running:

- Admin: <http://localhost:5173/admin>
- Display: <http://localhost:5173/display>
- Patient: add a patient in the admin; the QR dialog shows the tracking link, or
  copy it. The link is `http://localhost:5173/patient/<tokenId>`.

To see live sync, open the admin and the display in two tabs side by side and
press Call Next in the admin. Both update instantly, with no refresh.

## The seed

`npm run seed` (in `backend`) wipes the clinic and seeds:

- one `ClinicState` pre-trained from four completed consultations (720, 900, 660,
  840 seconds), so `ewmaAvg` is realistic and confidence starts at "Medium" the
  moment the demo opens, and
- three waiting patients of mixed categories so the screens are not empty.

## Key behaviors

- **Wait times are never hardcoded.** They derive from `ClinicState.ewmaAvg`,
  which updates from real recorded consultation durations
  (`ewmaAvg = 0.3 * duration + 0.7 * ewmaAvg`).
- **Every queue change goes through one broadcast function** so the admin,
  display, and each patient phone always render the same source of truth.
- **All queue mutations are atomic** (`findOneAndUpdate`); Call Next is additionally
  serialized by a self-expiring lock so a double-click cannot advance twice.
- **Break time never pollutes the wait model**: on resume, the active patient's
  `calledAt` is reset so only real doctor-patient time enters EWMA.

## Tests

```bash
cd backend
npm run test:engine         # pure wait-engine unit tests (no DB)
npm run test:integration    # socket + DB integration tests (needs MongoDB)
```

The integration suite uses a separate `queue-cure-test` database and drops it on
completion.

## Deployment

The app uses three services because the Socket.io backend must stay alive to hold
live connections, which a serverless platform cannot do:

- MongoDB Atlas for the database,
- Render for the backend (always-on web service),
- Vercel for the frontend.

### 1. MongoDB Atlas

1. Create a free M0 cluster.
2. Add a database user (use an alphanumeric password to avoid URL-encoding issues).
3. Under Network Access, allow access from anywhere (`0.0.0.0/0`), since the
   backend host IP is not fixed.
4. Copy the connection string and add the database name, for example:
   `mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/queue-cure?retryWrites=true&w=majority`

### 2. Render (backend)

1. New Web Service from the GitHub repo.
2. Root Directory `backend`, Build Command `npm install`, Start Command `npm start`.
3. Environment variables:
   - `MONGO_URI`: the Atlas string (the value only, no `MONGO_URI=` prefix).
   - `CLIENT_ORIGIN`: the Vercel URL, for example `https://your-app.vercel.app`.
   - `PATIENT_BASE_URL`: the Vercel URL, with `https://` and no trailing slash.
   - Do not set `PORT`; Render provides it and the server reads `process.env.PORT`.
4. Optionally seed the production database once from the Render shell: `npm run seed`.

### 3. Vercel (frontend)

1. Import the repo, Root Directory `frontend`, framework Vite.
2. Environment variable `VITE_SOCKET_URL`: the Render backend URL (https).
3. Deploy.

`frontend/vercel.json` rewrites all paths to `index.html` so client-side routes
such as `/patient/:tokenId` resolve correctly when opened directly (which is what
scanning the patient QR does); without it those deep links return a 404.

### Common deployment pitfalls

- The QR shows a `localhost` link: `PATIENT_BASE_URL` is not set on Render.
- The QR link is missing `https://`: add the scheme to `PATIENT_BASE_URL`.
- 404 when opening a patient or display link directly: the `vercel.json` rewrite
  is missing.
- The frontend cannot connect: `CLIENT_ORIGIN` on Render does not match the
  Vercel domain.

## Project structure

```
backend/
  src/
    config/        constants, db connection
    models/        Patient, ClinicState (Mongoose)
    services/      wait-engine, broadcast, queue-service
    sockets/       socket event handlers
    __tests__/     engine + integration tests
    seed.js
    server.js
frontend/
  vercel.json      SPA rewrite so client-side routes resolve on Vercel
  src/
    components/    reusable UI (TokenCard, StatBar, WaitEstimate, CastDialog, ...)
    hooks/         useSocket, useLang
    lib/           formatting, i18n dictionary
    pages/         AdminPage, DisplayPage, PatientPage
```
