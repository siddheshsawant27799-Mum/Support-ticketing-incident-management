# Historical incident event-log import

## Supplied source and published extract

The source file supplied for this project is `bpi_challenge_2013_incidents.xes`, from the BPI Challenge 2013 incident log: [challenge source page](https://ais.win.tue.nl/bpi/2013/challenge.html), [4TU.ResearchData DOI 10.4121/500573e6-accc-4b0c-9576-aa5468b10cee](https://doi.org/10.4121/500573e6-accc-4b0c-9576-aa5468b10cee). The raw XES remains outside the repository and is not redistributed here.

A minimized, gzip-compressed normalized extract can be generated at `public/data/historical-volvo.json.gz` for local use. This generated event data is ignored by Git and must not be committed. A clean clone will show the file picker until a source file or local extract is provided. The extract has 65,533 accepted event rows and 7,554 stable pseudonymous case labels; it replaces original case IDs and omits `org:resource`. When the original XES is selected in the browser importer, trace/event attributes are retained in `source_fields` for that browser session and invalid rows remain in the downloadable report. The selected original file is not permanently stored by the site.

To regenerate the minimized extract from a local original file (the command validates the whole file and refuses partial snapshots):

```powershell
python scripts/build_historical_snapshot.py `
  "C:\path\to\bpi_challenge_2013_incidents.xes" `
  public/data/historical-volvo.json.gz
```

## Actual XES structure inspected

The source root is `<log>`, with 7,554 `<trace>` elements. Each trace has `concept:name` as a string case identifier. The 65,533 event elements have `time:timestamp` as a `date` attribute and these actual typed attributes:

| XES attribute | Type | Occurrence | Historical event model |
|---|---|---:|---|
| `concept:name` | string | 65,533 | `status` / observed activity label |
| `org:group` | string | 65,533 | `support_team` |
| `impact` | string | 65,533 | `impact` |
| `product` | string | 65,533 | `product` |
| `organization involved` | string | 65,533 | `organization` |
| `organization country` | string | 65,533 | `organization_country` |
| `resource country` | string | 65,533 | Retained as source field on local import |
| `org:resource` | string | 65,533 | Retained on local import; omitted from published extract |
| `org:role` | string | 58,583 | Retained as source field on local import |
| `lifecycle:transition` | string | 65,533 | Retained as source field on local import |
| `time:timestamp` | date | 65,533 | `event_time` |
| trace `concept:name` | string | 7,554 | `case_id` (pseudonymized in published extract) |

This is the inspected file's actual structure. CSV remains supported with documented headers `SR Number` and `Change Date+Time`. XES aliases are documented in `src/historical.ts`; no fields are inferred from missing attributes.

## Validation and measured coverage

For the supplied file: 65,533 source events; 65,533 accepted; 0 rejected; 0 missing trace IDs; 0 missing timestamps; 0 invalid timestamps; 0 missing activity/status; 0 exact duplicate events; and 0 out-of-order events. Date range is 2010-03-31 14:59:42 UTC to 2012-05-22 23:22:25 UTC. These counts were calculated by parsing the supplied XES. Re-importing the original through the app reports file-level validation.

- Missing case IDs, missing timestamps, and invalid timestamps have distinct validation reasons. Malformed XML is a file-level error. Missing activity/status and malformed duplicate or anonymous attributes are event-level rejection reasons.
- Exact duplicate events are detected using case and complete trace/event attribute values. Valid out-of-order events are flagged and sorted before analysis.
- The timestamp parser accepts ISO timestamps with optional fractional seconds and explicit timezone offsets. Timezone-naive timestamps are interpreted as UTC, a technical assumption.

## Metric definitions and measured values

- **Cases:** 7,554 distinct trace IDs represented among accepted events.
- **Events:** 65,533 valid, nonduplicate records with case ID, timestamp, and activity/status.
- **Case duration:** median 181.2 hours and p90 541.4 hours of raw elapsed time from first to last observed event; denominator 7,553 cases with at least two events.
- **Activity/status event counts:** Accepted 40,117; Completed 13,867; Queued 11,544; Unmatched 5.
- **Status transitions:** changed adjacent activity/status labels with event and distinct-case counts.
- **Team changes:** 9,454 changes between adjacent nonempty `org:group` values; 1,258 cases revisited a previously seen team. A team transition is not proof of a formal handoff.
- **Elapsed time in observed status:** raw elapsed time from each event to the next event in its trace, grouped by the current activity/status. The final event per case is excluded.

All elapsed measures are wall-clock time between recorded events. They are not first-response times, business-hours clocks, contractual SLA compliance, restoration times, or Volvo policy targets. The synthetic ticket workflow and its prototype SLA assumptions are separate from these historical records.

## Source references

- [BPI Challenge 2013 source page](https://ais.win.tue.nl/bpi/2013/challenge.html)
- [VINST dataset/process description](https://ais.win.tue.nl/bpi/2013/vinst_data_set.pdf)
- Incident dataset DOI: [10.4121/500573e6-accc-4b0c-9576-aa5468b10cee](https://doi.org/10.4121/500573e6-accc-4b0c-9576-aa5468b10cee)
