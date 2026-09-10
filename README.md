# DAYGUARD

Personal accountability, schedule & productivity console.

- **Frontend:** React + Vite (corporate-portal UI: sidebar nav, shift status, assigned-tasks table)
- **Backend:** FastAPI, deployed as a single Vercel Python serverless function
- **Database:** Turso (hosted, SQLite-compatible via libSQL) — works from Vercel's stateless functions, unlike plain SQLite
- **Cost:** $0 on the free tiers of Vercel + Turso

This implements the DAYGUARD spec: daily schedule, tasks, work sessions, check-ins
("I'm stuck" / unplanned break), hydration + exercise tracking, voice/text capture,
daily productivity score (weighted per spec §32), daily report + history trend,
settings, and PWA installability. Notification scheduling and voice capture run
in the browser (Web Notifications + Web Speech APIs) so no paid AI or push
service is required — matching the spec's zero-cost/AI-optional requirement.

---

## 1. Project structure

```
dayguard/
├── api/
│   ├── index.py       # FastAPI app — all routes, deployed as one function
│   ├── db.py           # SQLAlchemy engine (Turso in prod, local sqlite in dev)
│   ├── models.py        # ORM models
│   ├── schemas.py       # Pydantic request/response schemas
│   ├── seed.py          # idempotent daily schedule/hydration seeding
│   ├── scoring.py       # weighted productivity score
│   └── requirements.txt
├── src/
│   ├── pages/            # Dashboard, Tasks, Schedule, Reports, Settings
│   ├── components/       # Sidebar, Topbar, TaskRow, modals, StatCard
│   ├── hooks/             # clock + browser-notification scheduling
│   ├── api.js             # fetch client for /api/*
│   └── App.jsx, main.jsx, styles.css
├── public/
│   ├── manifest.json, sw.js, icons/    # PWA
├── index.html
├── vercel.json            # routes /api/* to the Python function, rest to the SPA
├── vite.config.js
└── package.json
```

---

## 2. Run it locally

**Backend**

```bash
cd api
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn index:app --reload --port 8000
```

Without `TURSO_DATABASE_URL` set, it automatically falls back to a local
`dayguard_local.db` SQLite file — no cloud account needed for local dev.

**Frontend** (separate terminal)

```bash
npm install
npm run dev
```

Vite proxies `/api/*` to `http://127.0.0.1:8000` (see `vite.config.js`), so
open `http://localhost:5173` and it's fully wired up.

---

## 3. Deploy — one project, entirely free

### Step 1: Create the free Turso database

```bash
curl -sSfL https://get.tur.so/install.sh | bash     # installs the turso CLI
turso auth signup                                    # free account, no card
turso db create dayguard
turso db show dayguard --url          # copy this -> TURSO_DATABASE_URL
turso db tokens create dayguard       # copy this -> TURSO_AUTH_TOKEN
```

### Step 2: Push the code to GitHub

```bash
cd dayguard
git init
git add .
git commit -m "DAYGUARD MVP"
gh repo create dayguard --private --source=. --push
# (or create the repo on github.com and `git remote add origin ...; git push`)
```

### Step 3: Import into Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import the GitHub repo.
2. Vercel auto-detects the Vite frontend at the project root, and auto-detects
   `api/index.py` as a Python serverless function — no extra config needed
   beyond the `vercel.json` already in the repo.
3. Under **Settings → Environment Variables**, add:
   - `TURSO_DATABASE_URL` = the URL from step 1
   - `TURSO_AUTH_TOKEN` = the token from step 1
4. Deploy. Vercel gives you a URL like `https://dayguard-yourname.vercel.app`.

That's it — one deployment, one URL, frontend + backend + database, $0/month
on free tiers (Vercel Hobby + Turso free tier).

### Step 4: Install it on your phone

1. Open the Vercel URL in Chrome on Android.
2. Tap the menu → **Add to Home screen** (or the install banner if it appears).
3. It now opens full-screen like a native app and can request notification
   permission for scheduled work blocks, hydration, and exercise reminders.

---

## 4. What's implemented vs. deferred

**Implemented:** daily schedule with idempotent seeding, tasks (CRUD, status,
priority, category), work sessions tied to schedule blocks, check-ins
("I'm stuck" reasons, unplanned-break reasons), hydration + exercise logging,
voice/text capture with lightweight task-vs-note classification, weighted
daily productivity score, end-of-day review, 14-day history trend, settings
(schedule times, accountability mode), PWA manifest + service worker,
browser-based notification scheduling.

**Deferred (per spec §78, "not required initially"):** the optional AI
supervisor layer (§37, §72), laptop keyboard/mouse activity detection (§68),
and native push notifications when the browser tab/PWA isn't running — free
static hosting can't push to a closed app without a paid push service, so
notifications fire while DAYGUARD is open. These can be layered on later
without changing the data model.

---

## 5. Notes on the notification limitation

Because this is a zero-cost, serverless-hosted app, there's no always-on
server to push notifications when your phone's screen is off and the PWA
isn't running. Notifications fire reliably while the app is open (including
backgrounded briefly, via the service worker). If you want true background
push later, the smallest addition is a scheduled Vercel Cron job calling a
Web Push endpoint — that's a follow-up, not a blocker for daily use.
