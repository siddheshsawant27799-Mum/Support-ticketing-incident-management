# Real event-log import notes

The application currently runs on synthetic records held in browser local storage. The public BPI Challenge 2013 Volvo IT Belgium VINST event log is **not** included here; obtain it from the official challenge source under its applicable terms before doing any import. This project does not download, redistribute, or claim findings from that dataset.

## Expected normalized event shape

The SQL analysis patterns in `sql/incident_analysis.sql` expect one row per observed event, with these normalized fields:

| Field | Expected meaning | Mapping notes |
|---|---|---|
| `case_id` | Incident identifier | Preserve the source identifier; do not infer unique cases from timestamps. |
| `event_time` | Timestamp of the recorded event | Parse with the source timezone and document any timezone conversion. |
| `status` | Status after the event | Map source lifecycle values only after reviewing the official field definitions. |
| `sub_status` | More specific state, if present | Preserve the original value in a raw column alongside any normalized value. |
| `support_team` | Team associated with the event | Team changes are only a proxy for transfers; they do not prove a formal handoff. |
| `impact` | Recorded impact, if present | Keep source value and normalized category; report missing/unknown values. |
| `product` | Product/service dimension, if available | Avoid equating product with the prototype service taxonomy without a documented mapping. |
| `organization` | Organization dimension, if available | Preserve source values and document grouping decisions. |
| `owner_country` | Owner country, if available | Validate field meaning from the source data dictionary. |
| `event_order` | Deterministic ordering for events with equal timestamps | Use a source sequence if available; otherwise mark tie ordering as an assumption. |

Keep source columns and a separate normalized view. Record file name, checksum, dataset version/DOI, import date, row counts, timestamp parsing rules, null handling, deduplication rules, and every categorical mapping. Validate identifiers, timestamps, event ordering, duplicates, missingness, and case-level trace completeness before running the SQL. Do not silently drop malformed events.

## Mapping limits

The project brief describes a historical event log with status/team transitions. Confirm every field against the official data dictionary before mapping. Do not infer requester messages, first-response timestamps, contractual targets, or business-hours calendars from status changes. Do not treat raw time from first to last event as SLA time. Team transitions can support a transfer proxy only; they do not by themselves establish handoff reasons, ownership acceptance, or escalation decisions. The prototype's service labels, ticket fields, business workflow, and SLA assumptions are not source observations.

When real records are available, analyze them separately using `sql/incident_analysis.sql`, document the mapping and data-quality profile, and report measured findings only with a reproducible denominator and clock definition. The current front-end does not yet have a file-import path or a connector to the event log.
