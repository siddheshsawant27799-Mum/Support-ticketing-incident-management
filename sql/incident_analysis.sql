-- Volvo IT BPI Challenge 2013 incident event log analysis patterns.
-- Load source events into incident_events first. Adapt column names/types to the
-- official file's data dictionary; these are normalized analytical fields.
-- Do not interpret elapsed time as SLA compliance: contractual targets and
-- business-hours calendars are not established by this event log alone.

-- Suggested normalized relation:
-- incident_events(case_id, event_time, status, sub_status, support_team,
--                 impact, product, organization, owner_country, event_order)
-- Expected raw incident CSV headers from the published VINST data description:
-- SR Number -> case_id; Change Date+Time -> event_time; Status -> status;
-- Sub Status -> sub_status; Involved ST -> support_team;
-- SR Latest Impact -> impact; Product -> product;
-- Involved Org line 3 -> organization; Owner Country -> owner_country.
-- Confirm exact source headers against the supplied CSV before mapping; the
-- source file is not bundled and this mapping has not been locally validated.

-- 1. Basic data profile and event coverage
SELECT COUNT(*) AS event_rows,
       COUNT(DISTINCT case_id) AS incident_cases,
       COUNT(*) FILTER (WHERE event_time IS NULL) AS missing_event_time,
       COUNT(*) FILTER (WHERE case_id IS NULL) AS missing_case_id
FROM incident_events;

-- 2. Cases with first/last event and raw elapsed duration
WITH case_bounds AS (
  SELECT case_id, MIN(event_time) AS first_event, MAX(event_time) AS last_event,
         COUNT(*) AS event_count
  FROM incident_events
  WHERE case_id IS NOT NULL AND event_time IS NOT NULL
  GROUP BY case_id
)
SELECT COUNT(*) AS cases,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (last_event-first_event))/3600) AS median_elapsed_hours,
       percentile_cont(0.9) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (last_event-first_event))/3600) AS p90_elapsed_hours,
       AVG(event_count) AS avg_events_per_case
FROM case_bounds;

-- 3. Status transition counts (status changes are events; validate source order)
WITH ordered AS (
  SELECT *, LAG(status) OVER (PARTITION BY case_id ORDER BY event_time, event_order) AS prior_status
  FROM incident_events
)
SELECT prior_status, status, COUNT(*) AS transitions
FROM ordered
WHERE prior_status IS DISTINCT FROM status
GROUP BY prior_status, status
ORDER BY transitions DESC;

-- 4. Repeated team visits / handoff proxy. Multiple consecutive events on the
-- same team count as one visit. Team changes are only a proxy for handoffs.
WITH team_steps AS (
  SELECT case_id, event_time, support_team,
         LAG(support_team) OVER (PARTITION BY case_id ORDER BY event_time, event_order) AS prior_team
  FROM incident_events
), visits AS (
  SELECT case_id, SUM(CASE WHEN support_team IS DISTINCT FROM prior_team THEN 1 ELSE 0 END) AS team_visits,
         COUNT(DISTINCT support_team) AS distinct_teams
  FROM team_steps
  GROUP BY case_id
)
SELECT team_visits, COUNT(*) AS cases
FROM visits
GROUP BY team_visits
ORDER BY team_visits;

-- 5. Most common directed team transitions
WITH ordered AS (
  SELECT case_id, event_time, support_team,
         LAG(support_team) OVER (PARTITION BY case_id ORDER BY event_time, event_order) AS prior_team
  FROM incident_events
)
SELECT prior_team, support_team AS next_team, COUNT(*) AS transitions,
       COUNT(DISTINCT case_id) AS cases
FROM ordered
WHERE prior_team IS NOT NULL AND support_team IS NOT NULL AND prior_team <> support_team
GROUP BY prior_team, support_team
ORDER BY transitions DESC;

-- 6. Time spent in each observed sub-status using next event time. The final
-- event has unknown end time and is omitted. This is elapsed duration, not SLA clock.
WITH ordered AS (
  SELECT case_id, event_time, sub_status,
         LEAD(event_time) OVER (PARTITION BY case_id ORDER BY event_time, event_order) AS next_time
  FROM incident_events
)
SELECT sub_status,
       COUNT(*) AS intervals,
       SUM(EXTRACT(EPOCH FROM (next_time-event_time))/3600) AS elapsed_hours,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (next_time-event_time))/3600) AS median_interval_hours
FROM ordered
WHERE next_time IS NOT NULL AND next_time >= event_time
GROUP BY sub_status
ORDER BY elapsed_hours DESC;

-- 7. Case-level profile by impact (if impact is populated consistently)
WITH case_summary AS (
  SELECT case_id, MIN(event_time) AS first_event, MAX(event_time) AS last_event,
         MAX(impact) AS impact, COUNT(*) AS event_count,
         COUNT(DISTINCT support_team) AS distinct_teams
  FROM incident_events
  GROUP BY case_id
)
SELECT impact, COUNT(*) AS cases,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (last_event-first_event))/3600) AS median_elapsed_hours,
       AVG(event_count) AS avg_events, AVG(distinct_teams) AS avg_distinct_teams
FROM case_summary
WHERE first_event IS NOT NULL AND last_event IS NOT NULL
GROUP BY impact
ORDER BY cases DESC;
