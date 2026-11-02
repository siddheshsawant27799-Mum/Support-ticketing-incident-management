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
