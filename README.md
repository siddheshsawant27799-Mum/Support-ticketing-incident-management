# Volvo IT Incident Management Improvement

Business analysis portfolio case study based on the BPI Challenge 2013 Volvo IT Belgium incident event log. The objective is to turn observed incident process behavior into testable requirements for clearer ownership, prioritisation and escalation.

## Evidence and boundaries

The source is the [BPI Challenge 2013 dataset page](https://ais.win.tue.nl/bpi/2013/challenge.html). The challenge page describes an event log from Volvo IT Belgium's VINST incident and problem management system and lists process owner questions on push-to-front escalation, team ping-pong, “wait user” use, and organisational process differences. The supporting [VINST dataset description](https://ais.win.tue.nl/bpi/2013/vinst_data_set.pdf) describes first, second and third line responsibilities and priority as a function of impact and urgency.

Dataset DOI (incidents): [10.4121/500573e6-accc-4b0c-9576-aa5468b10cee](https://doi.org/10.4121/500573e6-accc-4b0c-9576-aa5468b10cee). The original source file is not bundled here. Obtain it from the official challenge page before running the SQL; no findings are presented as measured until the file has been profiled and loaded.

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

This repository now includes a working React + TypeScript + Vite incident operations demo. It uses **synthetic tickets only** and does not bundle or download the BPI Challenge dataset. The dashboard calculations are based only on the ticket records stored in the browser. They are not measured findings about Volvo IT or VINST.

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

### Limitations and evidence boundaries

Seed records and any tickets created in the app are synthetic. They do not represent Volvo observations. SLA thresholds are prototype assumptions, not Volvo policy, contractual targets, or verified historical targets. The age and escalation indicators are raw elapsed-time demonstrations; they do not establish business-hours SLA compliance. The app does not ingest first-response timestamps, contractual SLA data, or the real event log. The sample intake acknowledgement is a simulated demo event. This is not a production service: authentication, role permissions, email delivery, service calendars, and server-side storage are out of scope.

### Short demo walkthrough

1. Open **Incident overview** and inspect the synthetic backlog and the assumption callout.
2. Open **Ticket queue**, filter or search for an unassigned ticket, and open its details.
3. Assign it to a team and owner, entering a handoff reason; inspect the timeline entry.
4. Move it to **Waiting for requester** and provide a question and follow-up date; then resume work.
5. Resolve the ticket with a code and restoration summary, then reopen it to see that history is preserved.
6. Create a ticket and change impact/urgency to see the prototype priority matrix update.

For the real event-log import boundary and field mapping, see [`data/README.md`](data/README.md).
