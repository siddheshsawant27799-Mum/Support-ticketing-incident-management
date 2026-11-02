# Business requirements: incident ticketing and SLA improvement

## 1. Problem statement

Incident handling needs a dependable path from intake to verified restoration. The case-study hypothesis is that unclear ownership, repeated transfers, weak prioritisation and unstructured waiting can prolong restoration and make escalation hard to manage. These are hypotheses to test against the event log, not findings. The BPI 2013 challenge itself asks whether incidents are pushed to later support lines too soon, how often teams ping-pong, whether “wait user” is abused, and where the two IT organisations differ.

**Business outcome:** every active incident has an accountable owner, impact/urgency-based priority, a visible next action and a timely escalation path; teams can measure elapsed time and explain pauses and transfers.

## 2. Scope

**In scope:** incident intake and required fields; triage; team/individual ownership; priority calculation; status and customer updates; reassignment rationale; SLA clock visibility; escalation alerts; resolution verification and closure; operational reporting.

**Out of scope for the prototype:** production email integration, identity/access management, CMDB discovery, contractual SLA enforcement, automated remediation, problem/change management implementation, and claims about Volvo's current operations.

## 3. Stakeholders and responsibilities

| Stakeholder | Responsibility |
|---|---|
| Requester | Report impact, urgency, affected service/users, contact details; validate restoration where possible. |
| Service desk / first line | Log and acknowledge incidents, assess impact and urgency, resolve or route with evidence. |
| Second-line team | Diagnose and resolve incidents outside first-line capability; keep ownership and next action visible. |
| Third-line/product specialist | Handle specialist defects or deeper technical causes; return actionable findings and workaround. |
| Incident manager | Coordinate major incidents, communications, escalation and post-incident review. |
| Support team lead | Maintain routing rules, queue coverage and unassigned-ticket review; resolve capacity conflicts. |
| Service owner | Approve impact definitions, service criticality and contractual SLA targets. |
| Product owner / system admin | Configure workflow, roles, priority matrix, notifications and audit/reporting. |

## 4. Current-state process (to validate with data and stakeholders)

```text
Email / spreadsheet entry
  -> informal triage and priority decision
  -> manual assignment or queue handoff
  -> work / wait / request more information
  -> possible repeated reassignment or escalation
  -> resolution recorded
  -> closure / spreadsheet update
```

The above is the scenario's stated baseline, not a claim that it exactly represents VINST. The event log supports a separate reconstruction of VINST status/team transitions. Compare the two only after field mapping and stakeholder validation.

## 5. Gaps to test

- Unassigned time: incident created/queued but no accepting owner.
- Priority quality: missing impact/urgency, inconsistent classification, or priority not reflected in work order.
- Handoff quality: transfer without reason, diagnosis, attempted actions or receiving-team acceptance.
- Escalation quality: “push to front” before first-line triage is exhausted, or escalation only after prolonged delay.
- Waiting visibility: requester-wait status lacks a question, due date or clock treatment; blocked work appears active.
- Closure quality: resolution evidence/customer confirmation absent or quick reopen/repeat incident.
- Measurement limits: event timestamps show state-change elapsed time, not necessarily business-hours SLA clocks or first-response messages.

## 6. Improved workflow

1. **Capture:** create a unique ticket from any intake channel; record requester, service, summary, description, affected scope and timestamp. Acknowledge with ticket ID.
2. **Triage:** first line records impact and urgency using approved definitions. System calculates priority; major incident can invoke the major-incident path.
3. **Assign:** route by service/category to a named queue. Queue owner accepts within the proposed acknowledgement window; unaccepted work alerts the team lead.
4. **Diagnose and communicate:** owner records work notes, next action and customer-visible update. A waiting status requires a reason, requested information and follow-up date.
5. **Transfer/escalate:** current owner records reason, evidence and work performed. Receiving team accepts ownership; escalation alert fires on configured threshold or risk.
6. **Resolve:** record resolution code, fix/workaround and restoration time; notify requester and request validation.
7. **Close/reopen:** close after requester confirmation or configured timeout with notice. Reopen retains history and restores assignment/SLA state per policy.
8. **Review:** dashboards show open backlog, age, unassigned age, first response, resolution time, transfers, waiting intervals and target breaches, with clear clock definitions.

## 7. Business rules (prototype assumptions pending service-owner approval)

### Priority calculation

Use the documented concept of impact × urgency. Proposed matrix below is for demonstration and must be approved before operational use.

| Impact \\ Urgency | High | Medium | Low |
|---|---:|---:|---:|
| Major | P1 | P1 | P2 |
| High | P1 | P2 | P3 |
| Medium | P2 | P3 | P4 |
| Low | P3 | P4 | P4 |

Impact is not automatically raised by elapsed time. A major incident may be declared by an authorised incident manager independent of the matrix.

### Proposed response and escalation targets

Business-hours clock and 24×7 coverage assumptions must be set per service. The following are sample targets for the prototype only; they are not dataset-derived or contractual.

| Priority | Acknowledge target | Update cadence | Escalation trigger if not owned / no progress |
|---|---:|---:|---:|
| P1 | 15 min | 30 min | Immediate incident-manager alert; team-lead alert at 10 min unassigned |
| P2 | 1 hour | 2 hours | Team-lead alert at 30 min unassigned; manager at 50% of resolution target |
| P3 | 4 business hours | 1 business day | Team-lead alert at 2 business hours unassigned |
| P4 | 1 business day | 3 business days | Team-lead alert at 4 business hours unassigned |

Pause the resolution clock only when status is “Waiting for requester” and the ticket contains a specific request plus follow-up date. Do not pause the acknowledgement clock. Reassignment does not reset either clock. The service owner defines holidays, support hours, resolution targets, pause rules, breach handling and reopen treatment before launch.

## 8. User stories and acceptance criteria

### US1 — Log and acknowledge

As a requester, I want a ticket ID and acknowledgement so that I know my issue is recorded.

- Given a valid submission, when it is saved, then a unique ID, creation timestamp and requester receipt are created.
- Given required service or summary details are missing, when submitted, then the system identifies the missing fields and does not silently create an untriageable ticket.

### US2 — Triage consistently

As a first-line analyst, I want impact and urgency to determine priority so that work is ordered consistently.

- Given impact and urgency values, when both are saved, then the configured matrix sets priority and records the values used.
- Given either value changes, when saved, then priority is recalculated and the old and new values are audit logged.
- Given an authorised major-incident declaration, then the major-incident workflow can override normal routing with an audit entry.

### US3 — Make ownership explicit

As a queue lead, I want every active ticket to have a named queue and acceptance state so that unowned work is visible.

- Given a ticket is routed, then its assigned queue, assignment time and accepting owner are visible.
- Given a ticket remains unaccepted beyond its priority threshold, then the configured alert is sent and the ticket appears in the unassigned view.
- Given a transfer, then the sending owner must provide a reason and receiving queue; the handoff is timestamped and auditable.

### US4 — Manage waiting and updates

As a requester, I want clear updates and explicit information requests so that I know what is blocking resolution.

- Given a ticket enters requester-wait, then a request, due date and customer-visible message are required.
- Given a due date passes without response, then the owner is prompted to follow up; the ticket is not silently closed.
- Given an owner changes status, then the audit history captures actor and timestamp.

### US5 — Escalate at risk

As an incident manager, I want alerts before target breach so that I can intervene.

- Given the configured threshold is reached, then an alert names ticket, priority, owner, elapsed clock and next escalation role.
- Given the ticket is reassigned, then elapsed SLA time is preserved.
- Given the clock is paused under an approved reason, then pause start/end and duration are recorded and reportable.

### US6 — Resolve and report

As a service owner, I want a reliable closure record and operational measures so that I can review outcomes.

- Given a ticket is resolved, then resolution code, summary and restoration timestamp are required.
- Given a ticket is reopened, then the prior resolution and full assignment/status history remain available.
- Dashboard measures distinguish business-hours targets from raw elapsed time and exclude or flag incomplete records.

## 9. Measures

Track ticket volume; open backlog and age bands; time to first assignment/acceptance; first response; time to restore; target attainment by priority; unassigned time; handoffs per case; repeated team visits; requester-wait duration; reopen rate; and missing-field rate. Define denominator, clock, exclusions and date grain for each KPI before publication.
