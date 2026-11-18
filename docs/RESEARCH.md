# Verified research findings

The supplied historical report figures were treated as claims to reproduce, not performance targets. Exact files are in `research/audit/` and `research/runs/submission-01/`. These local artifacts are part of the submission evidence; model bundle files must be packaged with the report, not assumed to be present on another machine.

## Historical reproduction

The legacy fixed CSV has 21,831 rows: 16,457 before 2025-01-01 and 5,374 after/on it. Its model script drops missing values in the actual 17 inputs plus target. All 13 omitted test examples lack `water_level_previous`, leaving 5,361 evaluated predictions. `legacy_test_exclusions.csv` lists their identities and reasons. The 29-feature count comes from the comprehensive report counting non-input metadata columns; the fitted RF exposes 17 actual names, exported in `summary.json` and asserted in code.

Fresh inference with the original RF on those 5,361 rows reproduces MAE **0.410984537 m**, RMSE **0.744538443 m**, R² **0.914350179**, maximum absolute error **10.086263333 m**. This reproduces a result; it does not establish data validity. The reported 84.46% accuracy/macro F1 0.8266 uses P60/P80/P95 thresholds computed from test targets in `final_comprehensive_evaluation.py`. It is not accuracy of station-specific warning categories and must not be labelled deployed alert accuracy. The new strict risk mapper returns Unknown for unavailable/inconsistent thresholds; the historical relative-rise fallback has been removed.

The original feature builder already grouped station lags/rolling means/next targets. `fix_target.py` then shifted the feature-filtered rows again. The audit finds **438 target disagreements** with available corrected, valid-segment next targets. This count excludes ambiguous duplicate keys and rows with no eligible next target; it is not a count of all potentially wrong historical targets. **66 clean rows** share station/timestamps. Legacy test next-target gaps: median **9 h**, range **0–3,201 h**, mean **72.28 h**. The prediction task is next observation, not next hour.

Raw rainfall has **11,342 missing values**. Joining cleaned rows back to raw station/source-page/date/time recovers **5,722 missing rainfall values** with unambiguous provenance for all clean rows. This preserves observed zeros and distinguishes missing readings. Both zero-plus-missingness and training-fold-median-plus-missingness strategies were compared. There is no assertion that missing rainfall means no rain.

The inventory contains 55 station spellings, mixed m/ft units, missing basin cells, aliases and coordinate strings where units should be. Those strings indicate shifted extraction columns, so they are excluded rather than treated as units or automatically repaired. Known ft readings and their thresholds are converted together to m. Similar names remain separate; a provisional station-to-basin map scopes the corrected experiment to Kelani/Kalu. The raw PDFs can include merged basin cells, so inferred membership requires official gauge metadata confirmation.

Threshold inventories list changing report values; no official thresholds were tuned. Inclusive boundaries are tested: exactly alert → Moderate, exactly minor → High, exactly major → Very High. Inconsistent/missing threshold triples fail validation. Corrected data keeps valid extremes; it excludes documented metadata/history/duplicate issues, not high regression errors. The legacy cleaner's historical -20..100 range removal is documented but was not rerun or widened silently.

## Largest-error source check

The 438 disagreement count includes unit-normalization effects as well as alignment/valid-segment differences; it must not be quoted as 438 proved target-shift bugs. Compare the source rows and units in the exported audit before attributing each discrepancy.

At Glencourse, 2026-06-24 00:30 current level is 10.98 m; the next 03:30 report says 0.95 m, followed by 10.74 m at 06:30. The RF predicts 11.036263 m for the first transition, producing 10.086263 m error. The 00:30 and 03:30 PDF text was inspected directly and contains these readings with 15/16.5/19 m thresholds. The sharp change is present in the source, not proved to be caused by numeric extraction. It might be a reporting/datum/gauge issue or another anomaly; only authoritative review can resolve it. Both rows were retained. Other large errors involve long next-observation gaps and negative readings; neither long gaps nor negative gauge levels alone prove a valid extreme is erroneous. `largest_legacy_errors.csv` includes station, source, observation/target time and horizon for review.

The legacy hybrid weights 0.50381809 RF / 0.49618191 GB are explicitly inverse-RMSE weights from year-2024 validation. Source and saved metadata agree that test results did not derive them. The old subtrain split did not purge targets crossing into validation; the corrected experiment does.

## Completed bounded experiment

Run `submission-01`: seed 42, 2 randomized candidates per algorithm, 3 expanding timestamp folds, 80 trees/boosting stages, 2 CPUs, RF/Extra Trees/Gradient Boosting/XGBoost, each with median and constant-zero rainfall imputation plus three provenance missingness inputs (**20 research inputs**). Learned preprocessing is inside each fold. Station histories are chronological and isolated; invalid rows and >72h gaps reset history. Training labels reaching a validation boundary are purged; the same actual observation timestamps stay together across stations. The 72h ceiling is an engineering policy exposed in configuration; no fixed-hour horizon is inferred from it.

The corrected eligible subset has **3,357 training** and **1,115 historical holdout** rows after scope/history/validity filtering. These are not the same denominators as the legacy reproduction. The holdout retains the 2025-01-01 cutoff but was previously inspected. No demonstrably unused prospective holdout was established, and raw later directory years alone do not prove one exists.

| Result | Mean validation RMSE (m) | Historical holdout RMSE (m) |
|---|---:|---:|
| Persistence (next level = current) | **0.587633** | **0.819508** |
| Best learned RF (`rf_1_constant`) | 0.602981 | 0.887442 |

Best learned RF holdout MAE **0.442289 m**, R² **0.935456**, macro F1 **0.696590**. High/Very High support is **101**; **46** are underpredicted by at least one risk class (**45.54%**). Mean-fold severe underprediction is 22.57% for the candidate versus 8.83% for persistence. RMSE is the primary selection criterion, with per-class/severe-risk tradeoffs reported. No reliable improvement over persistence occurred, so the original active RF was retained. The candidate is a research artifact, not a deployment recommendation.

RF/GB exploratory validation-only hybrid weights are 0.51444905 / 0.48555095. Its pooled OOF RMSE is 0.597991 m; pooled and mean-fold metrics have different denominators/weighting and must not be interchanged. This exploratory ensemble did not justify changing the active model. `validation_comparison.csv` provides all model/preprocessing candidates. An ordinal classifier was deferred because alias/datums/threshold provenance and severe-event label validity are still unresolved; no unexecuted alternative is described as tested.

Moderate error analysis on the frozen candidate holdout: 153 rows have actual or predicted Moderate; 86 disagree, including 41 within 0.25 m of a report threshold. The 0.25m band is descriptive, not a changed classification rule. Event analysis defines above-alert sequences separated by below-alert observations or >24h gaps, with at least three examples; **24** have sufficient rows. These are descriptive recorded sequences, not independently certified flood events.

## Artifacts and limitations

The updated compatibility verifier reports 94.2361% legacy-test accuracy under the strict report-threshold mapper. This differs from the former 75.3964% mapping because the former function applied a relative-rise fallback even below available official thresholds. The change is a decision-rule correction, **not model improvement**, and those legacy rows still include mixed units/coverage and unresolved extraction issues. Severe-class recalls remain much lower than the aggregate accuracy. Neither aggregate figure establishes safety or prospective warning performance.

Run artifacts contain configuration/dependency versions/fingerprint, split/fold manifests, exclusions, search and comparison tables, per-row validation/holdout predictions, residual/confusion/event plots, largest errors, Moderate confusion, per-station/basin metrics, event metrics, versioned imputer/model bundle and model card. Targets/timestamps/thresholds/risk labels are included. The original run predates the later validation-only CLI and all-candidate OOF-export convenience flags; its frozen config describes exactly what ran. No subsequent tuning used the held-out results.

Full regression tests and local integration/latency evidence are separate from scientific model validation. Gauge aliases, datum consistency, rainfall units/publication timing and threshold changes still need authoritative review. No inundation boundaries, official-warning reliability, monitored uptime, prospective performance or stakeholder endorsement is claimed.
