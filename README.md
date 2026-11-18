# Sri Lanka Flood Risk FYP

Machine Learning-Based Flood Risk Prediction and Real-Time Emergency Response Coordination System for Sri Lanka.

This is a research prototype for the Kelani Ganga and Kalu Ganga basins. Its predictions and local coordination records are not official government warnings or agency dispatches. See [implementation evidence](docs/IMPLEMENTATION.md), [research findings](docs/RESEARCH.md), and the [stakeholder pack](docs/DMC_EVALUATION.md).

## Environment and setup

Verified stack: Python/scikit-learn/XGBoost; FastAPI/SQLAlchemy/SQLite; React 19/Vite/Tailwind/Leaflet; Expo SDK 54/React Native 0.81. Local checks used Python 3.12.3, Node 22.21.1 and Windows 11. `requirements-tested.txt` records tested Python versions. JS dependencies have existing package locks. Saved models and datasets must be supplied locally; existing `.pkl` files are ignored by Git.

```powershell
python -m pip install -r requirements-tested.txt
Set-Location frontend
npm.cmd ci
Set-Location ../mobile
npm.cmd ci
Set-Location ..
```

Dependency installation is a setup command, not evidence of having tested a fresh installation. Source reports/slides/notebooks were not attached or found in this checkout. The supplied supervisor status and source PDFs were inspected.

## Preserve the original database

Use the SQLite backup API, particularly if a database might have open connections. Never reset `outputs/app.db`, delete its records, overwrite `.pkl` files, or run legacy training scripts as setup steps.

```powershell
python scripts/backup_db.py outputs/app.db .demo/submission.db
python scripts/manage.py --db .demo/submission.db migrate
python scripts/manage.py --db .demo/submission.db create-user administrator --role admin
python scripts/manage.py --db .demo/submission.db create-user coordinator --role coordinator
```

Passwords are prompted without echo; no default staff password exists. Backup refuses an existing destination. Choose a new name when taking another backup. Migration creates only `users_v2` and `workflow_records_v2` alongside existing tables; it does not alter/delete legacy records. The JSON payload entities in the additive table are validated by service/API contracts and use unique deterministic keys for idempotency. Original report/alert tables remain readable. To roll back application code, first back up the working DB; legacy tables remain intact and the extra tables can remain. Never copy a working backup over the original while it is open.

## Start the complete workflow

Terminal 1, repository root:

```powershell
$env:FLOOD_DB_PATH = (Resolve-Path .demo/submission.db).Path
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Terminal 2:

```powershell
Set-Location frontend
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort
```

Terminal 3, repository root:

```powershell
python scripts/manage.py --db .demo/submission.db worker --interval 30
```

The separate worker processes pending imports and delivery retries even when no web page is open. Run one worker per DB. It is a local process, not an installed Windows service; keep its terminal open or configure an external scheduler. Import polling from an official feed is blocked: no supported live feed has been verified. The historical downloader is not a live adapter.

Open `http://127.0.0.1:5173/login` and sign in. `/operations` provides CSV/PDF imports, import history, report assignment, audit history, manual response actions and admin model visibility. `/account` provides station/basin web subscriptions, inbox states and acknowledgements. Public `/report` submission and `/alerts` retrieval remain available without staff credentials. Public accounts can register; only the CLI creates staff accounts.

1. Create a public account and subscribe to Hanwella or a basin at `/account`.
2. As administrator, upload valid observations at `/operations`. The source-mode selector separates manual upload from historical replay. CSV example: [observation template](examples/observations.csv). Supply actual report-derived values and timestamps; the template is historical demonstration data.
3. Four consecutive observations are required for three water-level lags. History resets across gaps over 72 hours or invalid readings. The legacy active RF requires observed rainfall and previous level; missing features fail instead of receiving invented values. Valid manual observations under six hours old are eligible for prototype predictive alerts. Historical/stale observations never generate operational predictive alerts.
4. The worker records each inference result, including failures. On an eligible Moderate-or-higher risk event, it persists a prototype alert and subscriber delivery queue. Same/lower risk is suppressed during cooldown; increasing risk bypasses it. Inspect the inbox, then acknowledge. Web availability, test-recorded attempts, provider acceptance and acknowledgement are separate states.
5. Submit a report at `/report`, then use `/operations`: submitted → reviewed → assigned (choose an existing coordinator) → in_progress → resolved. The assigned coordinator or an administrator performs later transitions. History retains actor, time and notes. Manual response actions have their own planned → in_progress → completed/cancelled lifecycle. No physical deployment occurs.

API docs: `http://127.0.0.1:8000/docs`. Most staff endpoints now require a bearer token from `/auth/login`; the former unauthenticated authority demo is intentionally protected. Legacy report status routes remain, but cannot bypass the assignment requirement. The original `scripts/start_demo.py` still starts `.demo/demo.db`; create staff accounts in that copy before using its authority dashboard.

## Research reproduction

```powershell
python -X utf8 scripts/audit_ml.py
python -X utf8 -m unittest discover -s tests -v
python -X utf8 scripts/train_ml.py --candidates 2 --folds 3 --trees 80 --jobs 2 --boosting
python -X utf8 scripts/summarize_research.py research/runs/submission-01
```

Training creates a unique `research/runs/<UTC timestamp>/` directory and never activates or overwrites a model. The completed run is `research/runs/submission-01`. Choose another run ID or omit it; reusing an ID fails safely. Full-run reproduction includes the already inspected historical holdout; do not use its result to select subsequent hyperparameters. Larger **validation-only** exploratory budget:

```powershell
python -X utf8 scripts/train_ml.py --candidates 8 --folds 4 --trees 300 --jobs 4 --boosting --validation-only
```

The original model remains active because corrected-data candidates did not beat persistence reliably. Candidate bundles include feature order/types, learned imputer, training period, dependency versions, seed, fingerprint and metrics. Promotion requires review of gauge metadata, matching preprocessing and coverage, plus a controlled activation implementation. The API deliberately exposes no retraining/activation button that could overwrite the active model on failure.

## Verification

```powershell
python -X utf8 -m unittest discover -s tests -v
python -X utf8 scripts/verify_demo.py
python -X utf8 scripts/verify_browser.py
Set-Location frontend
node node_modules/vite/bin/vite.js build
node node_modules/eslint/bin/eslint.js .
Set-Location ../mobile
node node_modules/typescript/bin/tsc --noEmit
Set-Location ..
```

Integration verification uses a disposable SQLite backup and checks the original DB/model hashes. Browser verification uses isolated ports 8011/5174/9234, temporary users and a temporary DB. It requires installed Chrome/Edge and may require sandbox approval. Existing demo servers are not stopped. Results are in `research/verification/`; model results are in the run directory. Latency evidence covers sequential local feature-generation/inference requests, not concurrent production traffic or uptime.

`python -X utf8 scripts/check_submission.py` runs the compile, 13 regression/integration tests, 23 compatibility checks, web build/lint, mobile typecheck and whitespace checks with bounded subprocesses and writes `research/verification/checks.json`. The separate browser suite has 12 checks, including actual web CSV import → prediction → alert → acknowledgement. Its ignored Chrome profile is retained under `.demo/` to avoid Windows profile-lock cleanup failures; its database is disposable. These counts describe the current suite, not independent user studies.

## Mobile and notification configuration

```powershell
Set-Location mobile
$env:EXPO_PUBLIC_API_BASE_URL = 'http://YOUR_COMPUTER_LAN_IP:8000'
node node_modules/expo/bin/cli start
```

For a physical device, bind the backend to a reachable interface deliberately and configure its firewall; loopback is not reachable from a phone. Use HTTPS before sending credentials over any untrusted network. More Options contains real sign-in, subscriptions, inbox acknowledgements, existing Expo-token registration and report retry controls. Session tokens stay in memory. Source/freshness and offline cache age are visible. Location denial prevents submission; no fixed fallback location is sent.

The default delivery adapter is `test`: it records an attempt without contacting Expo. `FLOOD_DELIVERY_ADAPTER=expo` enables the real Expo push transport for registered tokens; configure `EXPO_ACCESS_TOKEN` if your Expo project requires it. Native token acquisition/build credentials and phone testing remain external work. Provider-accepted tickets are stored; device delivery receipts are not polled and no delivered claim is made. Missing/unsupported providers record failed attempts and bounded retries. SMS/email adapters are not implemented.

`.env.example` documents configuration; these are environment variables, not automatically loaded dotenv files. Do not put credentials into JS build variables or commit `.env` files. This local prototype has no penetration test, monitored uptime, independently validated station geolocation, certified thresholds or inundation model.
