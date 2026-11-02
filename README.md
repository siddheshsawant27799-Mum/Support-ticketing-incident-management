# Volvo IT Incident Management Improvement

Business analysis portfolio case study based on the BPI Challenge 2013 Volvo IT Belgium incident event log. The objective is to turn observed incident process behavior into testable requirements for clearer ownership, prioritisation and escalation.

## Evidence and boundaries

The source is the [BPI Challenge 2013 dataset page](https://ais.win.tue.nl/bpi/2013/challenge.html). The challenge page describes an event log from Volvo IT Belgium's VINST incident and problem management system and lists process owner questions on push-to-front escalation, team ping-pong, “wait user” use, and organisational process differences. The supporting [VINST dataset description](https://ais.win.tue.nl/bpi/2013/vinst_data_set.pdf) describes first, second and third line responsibilities and priority as a function of impact and urgency.

Dataset DOI (incidents): [10.4121/500573e6-accc-4b0c-9576-aa5468b10cee](https://doi.org/10.4121/500573e6-accc-4b0c-9576-aa5468b10cee). Neither the source XES nor derived event extracts are committed to this repository. Measured results and validation from the supplied file are documented below and in `data/README.md`.

SLA thresholds in `requirements.md` are **proposed prototype assumptions**, not Volvo policy and not evidence of historical SLA compliance. The event log captures status transitions; response-time targets and customer-facing first response may not be observable in it.

## Project artifacts

- `requirements.md` — problem framing, scope, current-state map, stakeholders, improved workflow, rules and stories.
- `sql/incident_analysis.sql` — portable analytical query patterns against a normalized event table.
- `uat_scenarios.md` — acceptance and UAT scenarios.

## Analysis plan

1. Load the incident log and validate case identifiers, event timestamps, event order, status/substatus, support team, impact and organisational attributes.
2. Derive case-level timelines and flag missing/duplicate timestamps and incomplete traces.
3. Quantify volume, elapsed resolution time, assignment waits, transfers, repeated team visits and wait-user intervals.
4. Segment results by priority/impact, product, team and organisation where data completeness permits.
5. Compare proposed workflow measures only after documenting the mapping assumptions; historical elapsed time is not SLA compliance.

## Source references

- Steeman, W. (2013), BPI Challenge 2013. Incident dataset DOI above.
- [Challenge description and downloads](https://ais.win.tue.nl/bpi/2013/challenge.html)
- [VINST data set: process and field definitions](https://ais.win.tue.nl/bpi/2013/vinst_data_set.pdf)

## Local prototype

This repository includes a working React + TypeScript + Vite incident operations demo. The live ticket workflow and its calculations use **synthetic tickets only**; they are not measurements about Volvo IT or VINST. The historical view is a separate analysis of a minimized extract from the supplied BPI Challenge XES file.

The application also includes a separate **Historical process analysis** view. A clean repository checkout does not include historical data: select a local CSV, `.xes`, or `.xes.gz` file to populate it. The selected file is processed in the browser session and is not converted into live tickets or mixed into synthetic queue metrics.

### Run locally

1. Install Node.js (18 or newer).
2. From the project folder run `npm install`.
3. Run `npm run dev` and open the local URL printed by Vite.
4. Run `npm run build` to create a production bundle in `dist/`.

Changes made in the demo are saved in this browser's local storage. Use the browser's site data controls to reset the demo to its original seed records.

### Demo features

- Overview cards for active, unassigned, at-risk and resolved tickets; priority distribution and attention queue.
- Search and filters by status, priority and service; keyboard-accessible ticket rows.
- Ticket details with an event timeline, assignment history, notes, requester updates and resolution details.
- Ticket creation with required-field validation and priority calculated from the impact/urgency matrix in `requirements.md`.
- Assignment and reassignment require a team and handoff reason; status and requester-wait transitions are audited.
- Requester-wait requires a specific question and follow-up date. Resolution requires a resolution summary; resolved tickets can be reopened with history retained.
- Configurable-in-code sample unassigned thresholds. The SLA indicator uses raw elapsed time since ticket creation and the displayed threshold assumptions. It does not calculate a business-hours clock.

### Historical event-log import and analysis

The **Historical process analysis** view is separate from the synthetic ticket queue. The repository excludes both the original XES and generated event extracts. In a clean checkout, select the official source CSV, `.xes`, or `.xes.gz` to run the importer. Source attributes and validation results remain in the browser session; the importer does not permanently store the selected file.

The actual XES fields were inspected. The file has trace `concept:name` (`string`); event `time:timestamp` (`date`), `concept:name`, `org:group`, `impact`, `product`, `organization involved`, `organization country`, `resource country`, `org:resource`, `org:role`, and `lifecycle:transition` (`string`). In the imported model, trace `concept:name` maps to case ID; event `time:timestamp` to event time; event `concept:name` to observed activity/status; `org:group` to support team; and `impact`, `product`, and `organization involved` map when present. Additional fields from a local source-file import are retained in `source_fields`. See [`data/README.md`](data/README.md) for exact mapping and extract handling.

#### Measured from the supplied XES

- **7,554 cases; 65,533 events.** All 65,533 events were accepted by the snapshot validation; missing case IDs, missing or invalid timestamps, missing activity/status, exact duplicate events, and source-order violations each counted 0.
- **Observed range:** 2010-03-31 14:59:42 UTC through 2012-05-22 23:22:25 UTC.
- **Case duration:** median 181.2 hours (7.5 days) and p90 541.4 hours (22.6 days), across 7,553 cases with at least two accepted events. This is raw elapsed time from first to last recorded event.
- **Observed activity/status values:** Accepted (40,117 events), Completed (13,867), Queued (11,544), Unmatched (5).
- **Team transitions:** 9,454 consecutive changes in `org:group`; 1,258 cases revisited a previously seen team. These are event-log sequence measures, not confirmed handoffs.

The dashboard also shows changed status pairs and raw time from each event to its next recorded event grouped by the current activity/status. Event elapsed time is not first-response time, business-hours duration, contractual SLA attainment, or a comparison against Volvo policy. Denominators and metric definitions are shown beside each measure. These results describe this supplied event log only.

#### Optional local extract generation

Keep the original file and generated extract out of Git. To generate an ignored local snapshot after placing the source file on your computer:

`python scripts/build_historical_snapshot.py \
  "path/to/bpi_challenge_2013_incidents.xes" \
  public/data/historical-volvo.json.gz`

The script validates the full XES before output. It refuses to write a partial snapshot, replaces trace IDs, omits `org:resource`, and writes a gzip-compressed normalized event extract under the Git-ignored `public/data/` directory. See [`data/README.md`](data/README.md) for provenance and privacy boundaries.

### Limitations and evidence boundaries

Seed records and any tickets created in the app are synthetic. They do not represent Volvo observations. SLA thresholds are prototype assumptions, not Volvo policy, contractual targets, or verified historical targets. The demo age and escalation indicators are raw elapsed-time demonstrations; they do not establish business-hours SLA compliance. The historical importer does not infer first-response timestamps, contractual SLA data, or business-hours clocks. The sample intake acknowledgement is a simulated demo event. This is not a production service: authentication, role permissions, email delivery, service calendars, and server-side storage are out of scope.

### Short demo walkthrough

1. Open **Incident overview** and inspect the synthetic backlog and the assumption callout.
2. Open **Ticket queue**, filter or search for an unassigned ticket, and open its details.
3. Assign it to a team and owner, entering a handoff reason; inspect the timeline entry.
4. Move it to **Waiting for requester** and provide a question and follow-up date; then resume work.
5. Resolve the ticket with a code and restoration summary, then reopen it to see that history is preserved.
6. Create a ticket and change impact/urgency to see the prototype priority matrix update.
7. Open **Historical process analysis**. Review the preloaded historical extract, validation counts, date range, case durations, status transitions, team changes, and elapsed status intervals independently from synthetic tickets. Select a local CSV/XES file to replace the reviewed extract for the current browser session.

For the real event-log import boundary and field mapping, see [`data/README.md`](data/README.md).
