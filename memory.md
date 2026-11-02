# Project memory

## Volvo IT incident analysis project

- Purpose: analyze the BPI Challenge 2013 Volvo IT Belgium VINST incident process in a historical process-analysis view, separate from the synthetic ticket-management demo.
- Source file inspected: `bpi_challenge_2013_incidents.xes`. Keep the source dataset and generated event extracts out of Git. The original `.xes` file is not in this repository workspace.
- Measured import: 65,533 accepted events, 0 rejected events, and 7,554 cases.
- Observed metrics: median raw elapsed case duration 7.5 days; P90 22.6 days; 9,454 team changes; 1,258 cases with a team revisit. Case-duration denominator: 7,553 cases with at least two events.
- These are measurements between recorded historical event-log timestamps. They are not contractual SLA compliance, business-hours duration, first-response time, or verified handoffs. Do not present prototype SLA assumptions as Volvo policy.
- Source DOI: `10.4121/500573e6-accc-4b0c-9576-aa5468b10cee`.
- A file selected through the browser importer is held in that browser session; do not claim that the uploaded source file is permanently stored by the site.
- Run locally with Node.js 18+: `npm install`, `npm run dev`; build with `npm run build`. In a clean Git checkout, obtain the source file from the official DOI/source page and import it in the Historical process analysis view. The source dataset and derived event extract are intentionally ignored by Git.
