# FYP Supervisor Meeting Status

Verified on 13 November 2026 (Asia/Colombo). Prepared for Ms. Nuha.

## Demonstration readiness

The existing FastAPI backend and React/Vite authority dashboard run locally. A complete local report lifecycle and saved-warning workflow are implemented. Use the web demonstration as the primary meeting path; native mobile runtime has not been validated on a phone/emulator.

- Dashboard: http://127.0.0.1:5173/
- Public report form: http://127.0.0.1:5173/report
- Public saved alerts: http://127.0.0.1:5173/alerts
- Interactive API documentation: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/health

The running demonstration uses `.demo/demo.db`, a SQLite backup of the original database. Reports and warnings created during the demo affect that copy only. Restarting with `scripts/start_demo.py` reuses the copy rather than replacing it.

## Preservation of existing work

Initial Git status showed only `outputs/app.db` modified. The original database has 13 reports, 2 prediction logs and 7 alerts. Its SHA-256 before and after verification is:

```text
ce60f7036cf5f4c4228b1898d9aae6748777bc726d14692412a400b058fba940
```

No original records were reset, deleted or replaced. All seven saved `.pkl` model files were verified unchanged by SHA-256. No training, dataset generation, model export or deployment-copy scripts were run. The original database remains marked modified in Git because that was the user's pre-existing change.

## Verified functionality

| Area | Verified behavior | Limits |
| --- | --- | --- |
| Backend | Entry point `app.main:app`; health and station endpoints respond | Local prototype; no authentication/authority roles |
| Prediction | Loads `random_forest_fixed.pkl` and the 17 training features; finite prediction responses for all 55 station names | Saved historical CSV; not a live sensor/government feed |
| Prediction logging | `GET /predict/{station}` inserts a SQLite prediction log | `GET /station/{station}` computes station information without logging |
| Reports | API and web form save coordinates, category, severity, description and status | No photo upload, responder notification or real dispatch |
| Report lifecycle | New -> verified -> dispatched -> resolved; PATCH saved in SQLite; invalid transitions rejected; retrying the same status succeeds | Status tracking only; no team assignment or dispatch integration |
| Alerts | Create/list saved warnings; unique IDs support rapid creation; revocation retains the record | Manual warnings; no automatic trigger, SMS, push or acknowledgement tracking |
| Public web alerts | Retrieves active saved warnings on load/refresh | No subscription or geographic targeting |
| Authority dashboard | Historical station forecasts, reports, alert management and map UI | Map coordinates are hardcoded and not independently verified; not every station has coordinates |
| Mobile source | Expo Router home, station retrieval, report submission, alert retrieval/cache, AsyncStorage report queue | TypeScript passes; physical device and emulator flows unverified |
| Mobile SOS | Explicitly labelled a local simulation | No actual SOS request, real GPS capture or responder contact |
| Coordination | Shelter/resource demonstration controls and report statuses | Shelters/resources are mock data and changes are in-memory; no operational coordination backend |
| Nearby search | Endpoint returns station list and explicitly says coordinate matching is pending | Does not calculate a nearest station |
| Priority areas | Reads latest saved prediction logs and filters High/Very High | No spatial report join; report counts remain placeholders; may be empty |

Mobile alerts now filter revoked warnings from successful API responses. Cached/offline warnings can still be stale. The mobile queue has two inconsistent implementations: an AsyncStorage queue in `services/api.ts`, and an in-memory sample queue in `services/offlineQueue.ts`. Do not present offline synchronization as fully validated or deduplicated.

## Model and historical-data results

Data loaded by the API: **21,831 rows**, **55 station names**, from **2021-06-09 12:30** to **2026-08-05 03:30**. Raw PDF directories cover 2018-2026, but those directory years do not establish the model's training coverage. Station aliases are not normalized, so 55 names should not be described as 55 independently verified physical stations.

The existing chronological split is training dates before 2025-01-01 and test dates on/after that date, after dropping rows missing the required features/target. Tonight's check performs inference only on the **5,361** test rows and reproduces the saved Random Forest regression results:

| Model/result provenance | MAE | RMSE | R² |
| --- | ---: | ---: | ---: |
| Deployed Random Forest; fresh inference tonight | 0.410984537 | 0.744538443 | 0.914350179 |
| XGBoost; existing `model_results_fixed.csv`, not re-evaluated tonight | 0.413488615 | 0.782422348 | 0.905412293 |
| RF + GB hybrid; recomputed from aligned saved predictions and saved validation weights | 0.403024358 | 0.742288177 | 0.914867127 |

Hybrid weights are 0.50381809 RF and 0.49618191 GB, from `hybrid_weights.csv`. The hybrid row uses saved predictions, not a new fit or a newly deployed model. API inference remains Random Forest. The model-comparison buttons only highlight saved comparison information; they do not switch the backend model.

Applying the deployed station-threshold risk mapping to fresh RF test predictions gives:

- Risk accuracy: **75.3964%**.
- Low recall: **82.5841%**.
- Moderate recall: **53.6150%**.
- High recall: **44.0559%**.
- Very High recall: **56.0976%**.

The `final_comprehensive_summary.csv` RF accuracy of 84.46% uses a different classification definition: `final_comprehensive_evaluation.py` computes P60/P80/P95 thresholds from test-set water levels. It does not measure the deployed station-specific risk mapping. Do not interchange these results or present the percentile-based score as deployed alert accuracy. The existing comparison file reports hybrid Very High recall of 45.12%, lower than RF under the deployed mapping; no new model improvement is claimed.

Historical Hanwella example, reproduced by the API:

```text
Observation: 2026-08-05T03:30:00
Current level: 5.180
Predicted next observation: 5.054
12-hour rainfall field: 0.0
Risk: Low
Alert / minor / major thresholds: 7.0 / 8.0 / 10.0
```

The target is the next recorded observation, not a verified fixed one-hour forecast. `fix_target.py` shifts the already feature-filtered station rows. Gaps and station aliases require review before making horizon claims. CSV parsing also needs review: the first Badalgama row has coordinate text in `unit` and an alert-level field of 1360. A read-only CSV scan found one row with out-of-order alert/minor/major thresholds. These values were preserved tonight. Good regression reproduction does not resolve input/threshold quality or severe-risk recall limitations.

## Commands and checks

Existing dependencies were available; no dependency install was necessary. Actual checks used direct executable equivalents where npm commands stalled:

```powershell
Get-Location
git status --short
rg --files
python -m py_compile app/main.py app/database.py scripts/start_demo.py scripts/verify_demo.py
python scripts/verify_demo.py
# In frontend:
node node_modules/vite/bin/vite.js build
node node_modules/eslint/bin/eslint.js .
# In mobile:
node node_modules/typescript/bin/tsc --noEmit
# From repository root:
python scripts/start_demo.py
git diff --check
Get-FileHash outputs/app.db
```

- API verification: **22 checks passed**, including all station predictions, prediction logging, report transitions, 404/409/422 cases, rapid alert ID uniqueness, revocation, new-client/new-connection persistence, preservation of existing records, original DB hash and model hashes.
- Browser integration: **9 checks passed** using headless Chrome and `node .demo/browser-check.mjs`: online dashboard, real web report submission, Verify persistence across page reload, dispatched/resolved status actions, warning creation, public warning retrieval, revocation visibility, live Hanwella prediction, and no uncaught browser exceptions. Evidence: `.demo/browser-partial.json`, `.demo/browser-check.json`, `.demo/browser-check.log`, `.demo/dashboard.png`.
- Frontend production build: passed (exit 0).
- Frontend ESLint: passed (exit 0).
- Mobile TypeScript: passed (exit 0).
- API and Vite startup: health and HTTP checks passed within the launcher's 60-second readiness limit.
- Initial npm/tool-helper attempts stalled; these were not repeated indefinitely. Direct commands with file logs and 45/90/120/180-second watchdogs were used subsequently.
- First API test run completed its workflow assertions but failed during temporary SQLite cleanup on Windows. Explicit connection closing fixed it; the full rerun passed.
- Mobile web export (`node node_modules/expo/bin/cli export --platform web --output-dir ../.demo/mobile-web`) exceeded its 90-second timeout during Metro bundling. No successful mobile web build or phone test is claimed.
- FastAPI TestClient emitted an httpx deprecation warning, without failing the checks.

Machine-readable evidence and logs are local in `.demo/verification.json`, `.demo/verification-final.log`, `.demo/frontend-build-final.json`, `.demo/frontend-lint-final.json`, `.demo/mobile-typecheck-final.json`, `.demo/hybrid-metrics.json` and `.demo/running.json`. `.demo/` is ignored by Git because it contains database copies, logs and browser profiles.

## Restart/setup and meeting demonstration

From the repository root, the recommended restart command is:

```powershell
python scripts/start_demo.py
```

It starts `python -m uvicorn app.main:app --host 127.0.0.1 --port 8000` and Vite on 127.0.0.1:5173 with `.demo/demo.db`. It refuses occupied ports; check `.demo/running.json` before starting a second instance. Server output is in `.demo/api.log` and `.demo/frontend.log`. To stop only the recorded demo servers, read the two PIDs from `.demo/running.json` and use `Stop-Process -Id <apiPID>,<frontendPID>`.

If dependencies are needed later, use `python -m pip install -r requirements.txt`, plus `requirements-dev.txt` for verification; run `npm.cmd install` in each JS project. These install commands were identified, not executed tonight. Dependencies remain unpinned; record a tested lock/version set before another environment is used.

1. Open the dashboard. Point out the historical-source notice and deployed Random Forest. Show health and the latest observation date.
2. Show Hanwella through `GET /station/Hanwella` in API docs. Then execute `GET /predict/Hanwella` to demonstrate prediction logging in the copied database.
3. Open `/report`. Enter a deliberate demonstration location (e.g. 6.9069, 80.1347), choose a category/severity and submit a description beginning `SUPERVISOR DEMO`. Save the returned ID. GPS is optional; manual coordinates are supported.
4. In the authority dashboard, refresh, open Citizen Reports and locate the report (the table displays the last six ID digits). Click Verify, reload/refresh to show persistence, then Mark Dispatched and Resolve. Explain that these are recorded statuses and do not dispatch a real rescue team.
5. Open Emergency Alerts and create a warning clearly labelled `SUPERVISOR DEMO`. Open `/alerts`, refresh and show it. Revoke it in the authority dashboard, refresh the public alerts page and show that it is no longer active. The original warning record is retained.
6. Show prediction comparison results, distinguishing deployed inference from saved model comparisons. Explain the severe-risk recall and evaluation-definition limitations.
7. Present shelter/resource controls as sample UI only. Present mobile source and successful typecheck; do not depend on an untested phone connection for the primary demonstration.

Existing package scripts: frontend `npm.cmd run dev`, `build`, `lint`, `preview`; mobile `npm.cmd start`, `android`, `ios`, `web`, `lint`. The mobile API can be configured using `EXPO_PUBLIC_API_BASE_URL`; a physical phone needs the computer's reachable LAN address and a backend explicitly bound to a reachable interface. This is not the default loopback-only demo and has not been tested. Do not run the mobile reset-project script.

## Changes made tonight

- `app/database.py`: optional `FLOOD_DB_PATH`, preserving the original default path.
- `app/main.py`: persisted report transitions, retained alert revocation, collision-resistant alert IDs, request coordinate/text validation and historical model/data metadata. Single-row RF inference uses one worker to avoid repeated worker-pool setup; fitted trees/files are unchanged.
- `frontend/src/services/api.js`: status/revocation API methods, optional API base URL and bounded requests.
- `frontend/src/pages/ReportFlood.jsx`: real local report submission, GPS/manual coordinates, returned ID and honest failure state.
- `frontend/src/pages/Alerts.jsx`: active alerts from API with refresh/offline/error state.
- `frontend/src/pages/AdminDashboard.jsx`: persistent status/revocation actions, full station listing, historical/sample labels, accurate deployment/comparison labels and lint corrections.
- `frontend/src/lib/constants.js`: correct RF deployment and saved XGBoost metrics.
- `frontend/src/App.jsx`: unused template imports removed.
- `mobile/services/api.ts`: configurable backend URL; successful alert responses omit revoked warnings.
- `mobile/app/sos.tsx`: simulation labelled explicitly; false responder/GPS claims removed.
- `requirements.txt`: add already-used pandas and Windows timezone data dependencies.
- `requirements-dev.txt`: TestClient dependency for repeatable checks.
- `scripts/start_demo.py`, `scripts/verify_demo.py`: safe startup and regression verification using DB copies.
- `.gitignore`: ignore local demo artifacts.
- `SUPERVISOR_MEETING_STATUS.md`: this report.

No schema migration is required. New endpoints are additive; original routes and stored record formats remain available.

## Outstanding work and questions for Ms. Nuha

1. Is a persistent report lifecycle plus manually saved warnings sufficient for the next milestone? Should the next priority be actual responder assignment or reliable notification delivery?
2. Which station metadata/threshold source should be treated as authoritative? Resolve parsing errors, station aliases, units and coordinates before refining alerts or nearby search.
3. What forecast horizon should be evaluated: next observation or a fixed interval? How should irregular sampling and gaps be handled?
4. Approve one risk-evaluation definition. Should threshold-based severe-risk recall be the primary safety-oriented research metric? How should low High/Very High recall be addressed after data validation?
5. Confirm whether any live government/sensor integration is required and what permission/data access is available. None exists in the demonstrated application.
6. Define authentication, authority roles, assignment/audit history and report verification requirements before exposing admin actions beyond a local prototype.
7. Consolidate and test mobile offline storage, retry/deduplication, cache age, real location failure handling and attachment upload. Current reporting falls back to a fixed location when native GPS is unavailable; review before relying on it.
8. Validate mobile runtime on the intended Android/iOS device and investigate the Metro export timeout. Notification settings and SOS remain incomplete prototype flows.
9. Pin tested dependencies and prepare portable model/data packaging; trained models are ignored by Git and must already exist locally.
10. Keep training/evaluation scripts out of the demonstration path: several scripts fit and overwrite models, plots, summaries or deployment copies. Review their side effects before future execution.
