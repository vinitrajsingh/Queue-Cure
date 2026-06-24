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
| `CLIENT_ORIGIN` | `http://localhost:5173` | Allowed CORS origin for the frontend |
| `PATIENT_BASE_URL` | `http://localhost:5173` | Base URL used to build patient QR links |

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

## Documentation

- [docs/SOCKET-EVENTS.md](docs/SOCKET-EVENTS.md): socket event diagram (Mermaid)
  and full event reference.
- [docs/THOUGHT-PROCESS.md](docs/THOUGHT-PROCESS.md): architecture and engineering
  notes covering concurrency, the wait-time model, the two bugs found in testing
  and their fixes, and how every edge case is handled and verified.

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
  src/
    components/    reusable UI (TokenCard, StatBar, WaitEstimate, ...)
    hooks/         useSocket, useLang
    lib/           formatting, i18n dictionary
    pages/         AdminPage, DisplayPage, PatientPage
docs/
  SOCKET-EVENTS.md
  THOUGHT-PROCESS.md
```
