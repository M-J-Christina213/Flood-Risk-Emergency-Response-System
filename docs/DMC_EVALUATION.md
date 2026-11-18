# DMC stakeholder evaluation pack

Status: prepared, **not conducted**. No participants, feedback, expert validation or usability scores have been invented. Use a copied test database and clearly marked simulation data; do not issue public emergency guidance during this session.

## Session record and consent

Participant pseudonym: ______  Role/experience: ______  Date: ______

Facilitator: ______  Device/browser: ______  Application commit/run: ______

Explain purpose, research limitations, voluntary participation, ability to stop, and how anonymized notes will be retained. Obtain permission before recording screen/audio. Do not collect real victim names, phone numbers or precise home locations. Consent given: ______ Recording permission: ______

## Realistic tasks

1. As a public user, identify the station, observation timestamp, source and freshness. Explain whether the displayed estimate is an official warning and whether its forecast has a fixed hour.
2. Subscribe to Hanwella or the Kalu basin. Find a clearly marked test alert, distinguish queue/provider/receipt states, and acknowledge it. Explain what acknowledgement establishes.
3. Submit a fictional road-flood report with deliberate test coordinates and severity. Record the returned ID. Repeat after a simulated lost response and check for a duplicate.
4. As coordinator, review a report, associate a station/basin, add a note and request/receive assignment. Advance to in progress, log a real manual response action, complete it and resolve the report. Find who changed its status and when.
5. As administrator, import a CSV with one invalid threshold row and duplicate/out-of-order rows. Find rejection reasons, last successful update and the prediction failure caused by insufficient history. Explain why stale/replay inputs do not trigger operational predictive alerts.
6. Inspect a map and explain the difference between a station risk marker, an unverified shelter sample and an inundation boundary. Identify coverage missing from the map.
7. View active/candidate model metadata and identify the deployed version, evaluation period, next-observation horizon and retraining command. Explain why the candidate was not activated.
8. On the intended phone, deny GPS permission, disconnect networking, save/retry a report, restart the app and reconnect. Check saved queue persistence, identical request ID and warning cache age. If a configured development build is available, register a device token and test a labelled notification with explicit consent.

For each task record: completion (unassisted/assisted/failed/not attempted), time, errors, assistance, participant comments and facilitator observations. Record failure as failure, not as missing data. Device/push tasks remain not attempted until equipment/credentials are available.

## Questions

Use 1 strongly disagree to 5 strongly agree, plus free text:

- I can tell when the displayed data was observed and whether it is stale.
- I understand the geographic coverage and the uncertainty of the model forecast.
- I can distinguish prototype predictions from official government warnings.
- Report review, assignment and resolution match an understandable workflow.
- I can tell whether a notification was queued, accepted by a provider or acknowledged.
- I can recover from invalid data, a lost connection or a permission error.
- The interface supports the information I need for my role.

Open questions: Which decisions would you use this for? Which would require official confirmation? Which missing field or workflow prevents use? What information is confusing or misleading? What are acceptable freshness and escalation policies? Which official station metadata/feed/threshold source can be authorized? Which languages/accessibility/device constraints must be supported?

## Results and analysis plan

Use [blank results template](../research/stakeholder_results_template.csv). Do not fill it with simulated feedback. Preserve anonymized raw observations, count attempted/successful tasks with explicit denominators, report assistance and device/network conditions, summarize themes with attributed anonymous IDs and retain contradictory feedback. Record resulting changes and retest unresolved tasks. Separate usability evidence from validation of flood forecasts and official-warning decisions.

Outstanding: participant recruitment/access permission, authoritative gauge/threshold/feed review, device build and notification credentials, signed consent, completed task records, analysis and supervisor review.
