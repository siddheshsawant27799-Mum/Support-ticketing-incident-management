# User acceptance test scenarios

Prototype SLA values are assumptions in `requirements.md`; testers should confirm them against approved configuration before treating a result as policy compliance.

| ID | Scenario | Steps | Expected result |
|---|---|---|---|
| UAT-01 | Valid intake | Submit ticket with requester, service, summary, description, impact and urgency. | Unique ID and timestamps are created; acknowledgement is sent; ticket enters triage queue. |
| UAT-02 | Required field validation | Submit without service or summary. | Missing fields are clearly identified; no silently incomplete ticket is created. |
| UAT-03 | Priority matrix | Set each impact/urgency combination from the configured matrix. | Each combination maps to the configured priority; values and result are auditable. |
| UAT-04 | Major incident override | Authorised incident manager declares a major incident. | Major path and notifications activate; actor, time and reason are recorded. |
| UAT-05 | Assignment acceptance | Route ticket to a queue and leave unaccepted past threshold. | Ticket is visible as unassigned; correct team-lead alert fires with elapsed time. |
| UAT-06 | Valid handoff | Transfer ticket with reason, evidence and receiving queue. | New assignment is timestamped; SLA clock is preserved; transfer appears in history. |
| UAT-07 | Invalid handoff | Attempt transfer without reason or receiving queue. | Transfer is blocked with clear validation guidance. |
| UAT-08 | Requester wait | Move ticket to requester-wait with question and follow-up date. | Required details are stored; requester receives message; clock behavior matches configured rule. |
| UAT-09 | Wait follow-up | Let follow-up date pass with no requester response. | Owner receives follow-up prompt; ticket remains visible and is not silently closed. |
| UAT-10 | SLA warning | Advance a ticket to configured warning threshold. | Alert includes ticket, priority, owner, elapsed time and escalation role. |
| UAT-11 | Resolve | Resolve with resolution code, notes and restoration time. | Required resolution data is validated; requester is notified; resolution timer is finalized. |
| UAT-12 | Reopen | Reopen a resolved ticket. | Full prior history remains; ticket returns to active queue with configured timer treatment. |
| UAT-13 | Dashboard reconciliation | Filter by period and priority; compare a sample to ticket records. | Counts and elapsed-time calculations reconcile; incomplete records are flagged. |
| UAT-14 | Role access | Attempt triage, major-incident declaration and configuration as different roles. | Only authorised roles can perform restricted actions; access is audited. |
| UAT-15 | Valid historical CSV import | Select the official incident source CSV with documented `SR Number` and `Change Date+Time` fields. | Historical view shows accepted/rejected row counts, source mapping, date range, and metrics calculated only from accepted rows; ticket demo counts do not change. |
| UAT-16 | Malformed historical rows | Import CSV rows with missing case IDs, missing timestamps, invalid timestamps, and a mismatched field count. | Each affected row is rejected with one or more reasons; accepted and rejected totals reconcile to nonblank source rows; rejected source fields are downloadable. |
| UAT-17 | Exact duplicate events | Include two identical full source rows in a valid CSV. | Later exact duplicate row is counted as duplicate and excluded from analysis; the rejected-row download retains its values. Similar but nonidentical status events remain distinct. |
| UAT-18 | Missing timestamp reporting | Include a valid case ID with a blank timestamp and a malformed timestamp. | Missing and invalid timestamp counts are shown separately; neither row contributes to case/event duration metrics. |
| UAT-19 | Historical metric reconciliation | For a small valid CSV, manually verify cases, accepted events, first/last event durations, status transitions, team changes, and next-event status intervals. | Displayed values and denominators reconcile to the sorted accepted rows; final event intervals are omitted; durations are labeled raw elapsed time. |
| UAT-20 | Historical and synthetic separation | Import historical rows, then switch between historical analysis and the demo ticket queue. | Historical events never appear as live tickets; queue counts remain based on synthetic/local ticket records; labels identify each source. |
