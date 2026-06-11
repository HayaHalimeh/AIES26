# ECA — Embodied Conversational Agent

A conversational ECA that recommends healthy recipes through a guided two-phase interaction. An animated 3D avatar speaks responses aloud using ElevenLabs TTS and lip-sync. Participants chat with the agent, receive recipe suggestions, and complete in-app surveys.

**Stack:** React + Vite + Three.js (frontend) · Node.js + Express · OpenAI API · ElevenLabs TTS · Rhubarb Lip-Sync · SQLite · Python recipe recommender

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommended)
- Or Node.js 20+ and Python 3.11+ for running without Docker

---

## Project Structure

```
ECA/
├── docker-compose.yml
├── r3f-virtual-ai-backend/
│   ├── index.js                         # Express server + OpenAI + ElevenLabs integration
│   ├── recommend.py                     # Recipe recommendation entry point
│   ├── recipe_recommender.py            # ML-based recommender
│   ├── recommenderClient.js             # Node → Python bridge
│   ├── Rhubarb-Lip-Sync/               # Lip-sync binary
│   ├── prompts/
│   │   ├── system_prompt.txt            # Main conversation instructions
│   │   └── additional_prompt_phase2.txt # Phase 2 instructions
│   ├── data/
│   │   ├── main_dishes.csv              # Recipe dataset
│   │   └── recipe_images/              # Recipe images
│   └── .env.example
└── r3f-virtual-ai-frontend/
    ├── src/
    │   ├── components/                  # UI, ECA, SurveyOverlay, WelcomeOverlay
    │   └── hooks/                       # useChat, useSession
    └── .env.example
```

---

## Quick Start

### 1. Clone the repository

```bash
git clone <repo-url>
cd ECA
```

### 2. Set up environment files

**Backend** — copy and fill in your API keys:

```bash
cp r3f-virtual-ai-backend/.env.example r3f-virtual-ai-backend/.env
```

```env
OPENAI_API_KEY=your_openai_api_key_here
ELEVEN_LABS_API_KEY=your_elevenlabs_api_key_here
```

**Frontend** — copy the example file:

```bash
cp r3f-virtual-ai-frontend/.env.example r3f-virtual-ai-frontend/.env
```

The frontend `.env` only needs to be edited if you are using Prolific (see [Prolific Integration](#prolific-integration-optional)).

### 3. Run with Docker

```bash
docker compose up --build
```

- Frontend: [http://localhost:3001](http://localhost:3001)
- Backend API: [http://localhost:3000](http://localhost:3000)

To stop:

```bash
docker compose down
```

> If port 3000 is already in use:
> ```bash
> lsof -i :3000
> kill <PID>
> ```

---

## Running Without Docker

**Backend:**

```bash
cd r3f-virtual-ai-backend
npm install
node index.js
```

**Frontend** (separate terminal):

```bash
cd r3f-virtual-ai-frontend
npm install
npm run dev
```

Frontend available at [http://localhost:5173](http://localhost:5173).

---

## Deploying to a Server

### 1. Set the public backend URL

Create `ECA/.env` on the server:

```env
VITE_API_URL=http://YOUR_SERVER_IP:3000
```

Docker Compose picks this up automatically. Without it, the frontend defaults to `localhost:3000`.

### 2. Start in the background

```bash
docker compose up --build -d
```

---

## Prolific Integration (Optional)

If you are running this as a Prolific study, two extra steps are needed.

### 1. Set completion URLs

Edit `r3f-virtual-ai-frontend/.env`:

```env
VITE_PROLIFIC_COMPLETION_URL=https://app.prolific.com/submissions/complete?cc=YOUR_COMPLETION_CODE
VITE_PROLIFIC_FAILURE_URL=https://app.prolific.com/submissions/complete?cc=YOUR_FAILURE_CODE
```

These are shown to participants at the end of the study. Without them set, the completion screen will have no redirect link.

### 2. Set your study URL in Prolific

```
http://YOUR_SERVER_IP:3001/?PROLIFIC_PID={{%PROLIFIC_PID%}}
```

The app reads `PROLIFIC_PID` from the URL and stores it alongside each participant's conversation and survey responses.

---

## Customising the Study

| What | Where |
|---|---|
| Conversation behaviour | `r3f-virtual-ai-backend/prompts/system_prompt.txt` |
| Phase 2 instructions | `r3f-virtual-ai-backend/prompts/additional_prompt_phase2.txt` |
| Survey questions | `r3f-virtual-ai-frontend/src/components/SurveyOverlay.jsx` |
| Welcome screen text | `r3f-virtual-ai-frontend/src/components/WelcomeOverlay.jsx` |
| Recipe dataset | `r3f-virtual-ai-backend/data/main_dishes.csv` |

---

## Resetting App State

The app saves conversation progress (welcome screen, survey state, thread) to **localStorage** in the browser. If the app appears stuck — skipping the welcome screen, showing a completed state, or not responding — clear the browser's localStorage for the app's URL and refresh the page.

> If running multiple projects on the same port (e.g. `localhost:3001`), they share the same localStorage. Switching between projects without clearing storage will cause one project to pick up the other's saved state.

---

## Exporting Participant Data

Conversation logs and survey responses are stored in a SQLite database, persisted in a Docker volume.

```bash
# Copy the database to your local machine
docker cp r3f-backend:/app/db/data.db ./data.db

# Query via CLI
sqlite3 data.db "SELECT * FROM survey_responses;"
sqlite3 data.db "SELECT * FROM conversations;"
```

---

## Environment Variables Reference

### Backend — `r3f-virtual-ai-backend/.env`

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `ELEVEN_LABS_API_KEY` | Yes | ElevenLabs key for ECA text-to-speech |

### Frontend — `r3f-virtual-ai-frontend/.env`

| Variable | Required | Description |
|---|---|---|
| `VITE_PROLIFIC_COMPLETION_URL` | Only for Prolific | Redirect URL for participants who pass |
| `VITE_PROLIFIC_FAILURE_URL` | Only for Prolific | Redirect URL for participants who fail attention checks |

### Root — `ECA/.env` (server deployment only)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000` | Public URL of the backend |
