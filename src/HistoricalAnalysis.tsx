import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowUpFromLine, CalendarDays, CheckCircle2, Clock3, Database, Download, FileText, History, RotateCcw } from 'lucide-react';
import { filterEventsByCases, importHistoricalFile, median, percentile, type HistoricalDataset, type HistoricalEvent } from './historical';

const dimensions = [
  { key: 'status', label: 'Status' },
  { key: 'sub_status', label: 'Sub-status' },
  { key: 'support_team', label: 'Support team' },
  { key: 'impact', label: 'Impact' },
  { key: 'product', label: 'Product' },
  { key: 'organization', label: 'Organization' },
] as const;
const time = (ms: number) => new Date(ms).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC';
const hoursLabel = (value: number | null) => value === null ? '—' : value < 24 ? `${value.toFixed(1)} h` : `${(value / 24).toFixed(1)} d`;
const valueFor = (event: HistoricalEvent, key: string) => String(event[key as keyof HistoricalEvent] ?? '').trim();

export default function HistoricalAnalysis() {
  const [dataset, setDataset] = useState<HistoricalDataset | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    async function loadReviewedExtract() {
      try {
        const response = await fetch('/data/historical-volvo.json.gz');
        if (!response.ok) throw new Error('The published historical extract is unavailable. You can still select the original CSV or XES file below.');
        const responseBytes = await response.arrayBuffer();
        const bytes = new Uint8Array(responseBytes);
        const isGzip = bytes[0] === 0x1f && bytes[1] === 0x8b;
        let reviewed: HistoricalDataset;
        if (isGzip) {
          if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot open the published compressed extract. Use a current browser or select the original XES file below.');
          const stream = new Blob([responseBytes]).stream().pipeThrough(new DecompressionStream('gzip'));
          reviewed = await new Response(stream).json() as HistoricalDataset;
        } else reviewed = JSON.parse(new TextDecoder().decode(responseBytes)) as HistoricalDataset;
        if (active) { setDataset(reviewed); setFilters({}); }
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : 'The published historical extract could not be read.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadReviewedExtract();
    return () => { active = false; };
  }, []);

  async function handleFile(file?: File) {
    if (!file) return;
    setLoading(true); setLoadError('');
    try {
      const imported = await importHistoricalFile(file);
      setDataset(imported); setFilters({});
    } catch (error) {
      setDataset(null);
      setLoadError(error instanceof Error ? error.message : 'The file could not be read.');
    } finally { setLoading(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  const dimensionOptions = useMemo(() => {
    if (!dataset) return [];
    return dimensions.flatMap(dimension => {
      if (!dataset.mapping[dimension.key]) return [];
      const values = [...new Set(dataset.events.map(event => valueFor(event, dimension.key)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
      return values.length > 1 ? [{ ...dimension, values }] : [];
    });
  }, [dataset]);

  const analysis = useMemo(() => {
    if (!dataset) return null;
    const scoped = filterEventsByCases(dataset.events, filters);
    const cases = new Map<string, HistoricalEvent[]>();
    for (const event of scoped) {
      const list = cases.get(event.case_id) ?? []; list.push(event); cases.set(event.case_id, list);
    }
    const caseDurations: number[] = [], statusTransitions = new Map<string, { count: number; cases: Set<string> }>();
    const teamTransitions = new Map<string, { count: number; cases: Set<string> }>();
    const statusIntervals = new Map<string, { milliseconds: number; count: number }>();
    let adjacentStatusPairs = 0, teamChanges = 0, casesWithTeam = 0, repeatTeamCases = 0;
    for (const [caseId, list] of cases) {
      if (list.length > 1) caseDurations.push(list[list.length - 1].event_time - list[0].event_time);
      const teams = list.map(event => event.support_team);
      if (teams.some(Boolean)) {
        casesWithTeam++;
        const seen = new Set<string>(); let previous: string | null = null, repeated = false;
        for (const team of teams) {
          if (!team) { previous = null; continue; }
          if (previous && previous !== team) {
            teamChanges++;
            const key = `${previous} → ${team}`, item = teamTransitions.get(key) ?? { count: 0, cases: new Set<string>() };
            item.count++; item.cases.add(caseId); teamTransitions.set(key, item);
          }
          if (previous && previous !== team && seen.has(team)) repeated = true;
          seen.add(team); previous = team;
        }
        if (repeated) repeatTeamCases++;
      }
      for (let i = 0; i < list.length - 1; i++) {
        const current = list[i], next = list[i + 1], elapsed = Math.max(0, next.event_time - current.event_time);
        if (current.status && next.status) {
          adjacentStatusPairs++;
          if (current.status !== next.status) {
            const key = `${current.status} → ${next.status}`, item = statusTransitions.get(key) ?? { count: 0, cases: new Set<string>() };
            item.count++; item.cases.add(caseId); statusTransitions.set(key, item);
          }
        }
        const state = current.sub_status || current.status;
        if (state) {
          const item = statusIntervals.get(state) ?? { milliseconds: 0, count: 0 };
          item.milliseconds += elapsed; item.count++; statusIntervals.set(state, item);
        }
      }
    }
    const transitionRows = [...statusTransitions.entries()].map(([transition, item]) => ({ transition, count: item.count, cases: item.cases.size })).sort((a, b) => b.count - a.count).slice(0, 8);
    const teamRows = [...teamTransitions.entries()].map(([transition, item]) => ({ transition, count: item.count, cases: item.cases.size })).sort((a, b) => b.count - a.count).slice(0, 8);
    const intervals = [...statusIntervals.entries()].map(([status, item]) => ({ status, hours: item.milliseconds / 3600000, intervals: item.count })).sort((a, b) => b.hours - a.hours).slice(0, 8);
    let dateMin: number | null = null, dateMax: number | null = null;
    for (const event of scoped) { dateMin = dateMin === null ? event.event_time : Math.min(dateMin, event.event_time); dateMax = dateMax === null ? event.event_time : Math.max(dateMax, event.event_time); }
    return {
      events: scoped.length, cases: cases.size, caseDurations, medianDuration: median(caseDurations), p90Duration: percentile(caseDurations, .9),
      transitionRows, teamRows, intervals, teamChanges, casesWithTeam, repeatTeamCases, adjacentStatusPairs,
      dateMin, dateMax,
    };
  }, [dataset, filters]);

  function downloadValidationReport() {
    if (!dataset) return;
    const issueRows = new Map<number, { reasons: string[]; source_fields: Record<string, string> }>();
    for (const row of dataset.rejected) issueRows.set(row.source_row, { reasons: [...row.reasons], source_fields: row.source_fields });
    const outOfOrder = new Set(dataset.out_of_order_rows);
    for (const row of dataset.rejected) if (outOfOrder.has(row.source_row)) issueRows.get(row.source_row)?.reasons.push('Also out of order in source file');
    for (const event of dataset.events) if (outOfOrder.has(event.source_row)) issueRows.set(event.source_row, { reasons: ['Out-of-order source row; accepted and sorted by timestamp'], source_fields: event.source_fields });
    const report = [...issueRows.entries()].sort((a, b) => a[0] - b[0]).map(([source_row, row]) => ({ source_row, ...row }));
    if (!report.length) return;
    const fields = [...new Set(report.flatMap(row => Object.keys(row.source_fields)))];
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const lines = [['Source row', 'Validation issues', ...fields].map(escape).join(','), ...report.map(row => [String(row.source_row), row.reasons.join('; '), ...fields.map(field => row.source_fields[field] ?? '')].map(escape).join(','))];
    const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'historical-import-rejected-rows.csv'; link.click(); URL.revokeObjectURL(url);
  }

  const issueCount = (phrase: string) => dataset?.rejected.filter(row => row.reasons.some(reason => reason.includes(phrase))).length ?? 0;

  return <section className="historical-page">
    <div className="page-heading historical-heading"><div><div className="eyebrow">SEPARATE HISTORICAL WORKSPACE <span className="pill-demo">NOT LIVE TICKETS</span></div><h1>Historical process analysis</h1><p>Explore observed event-log traces separately from the synthetic incident queue.</p></div><div className="historical-source-mark"><Database size={16}/>BPI CHALLENGE 2013 · INCIDENTS</div></div>
    <div className="historical-source-banner"><div className="source-icon"><History size={18}/></div><div><b>Historical Volvo event log</b><p>Dataset source: <a href="https://doi.org/10.4121/500573e6-accc-4b0c-9576-aa5468b10cee" target="_blank" rel="noreferrer">4TU.ResearchData - DOI 10.4121/500573e6-accc-4b0c-9576-aa5468b10cee</a>. Historical status and team transitions only; no first-response or contractual SLA measures.</p>{dataset?.source_delivery==='reviewed_extract'&&<p>Published extract: case IDs replaced with stable labels; <code>org:resource</code> omitted. Import the supplied XES locally to inspect all source attributes.</p>}</div><span className={`source-state ${dataset?'loaded':''}`}><i/>{dataset?(dataset.source_delivery==='reviewed_extract'?'Reviewed extract loaded':`${dataset.source_format} loaded - identity not verified`):'Source file not loaded'}</span></div>
    {!dataset ? <div className="panel import-panel"><div className="import-symbol"><FileText size={22}/></div><h2>{loading?'Reading and validating event log…':'Add the official incident file'}</h2><p>{loading?'Checking case IDs, timestamps, duplicate events, malformed attributes, and source order.':''}Choose a CSV, plain XES, or gzip-compressed XES (.xes.gz) file obtained from the official challenge source. The source file is not bundled or downloaded by this app.</p><input ref={fileRef} type="file" accept=".csv,.xes,.xes.gz,text/csv,application/xml,application/gzip" className="hidden-file-input" aria-label="Choose incident event log in CSV or XES format" onChange={event=>void handleFile(event.target.files?.[0])}/><button className="primary-btn import-button" disabled={loading} onClick={()=>fileRef.current?.click()}><ArrowUpFromLine size={16}/>{loading?'Validating…':'Choose CSV or XES file'}</button><div className="expected-schema"><b>Recognized source fields</b><span>CSV: <code>SR Number</code> (case), <code>Change Date+Time</code> (timestamp); status and team fields map when present.</span><span>XES: trace <code>concept:name</code> (case); event <code>time:timestamp</code> (time), <code>concept:name</code> (activity/status), <code>org:group</code> (team), and <code>impact</code>. Additional trace/event attributes are retained.</span><small>Based on published BPI Challenge 2013 field descriptions and XES conventions; mapping remains unverified against a local original file until import.</small></div>{loadError&&<div className="form-error import-error" role="alert"><AlertCircle size={15}/>{loadError}</div>}</div> : <>
      <div className="historical-file-row"><div className="file-chip"><FileText size={15}/><span><b>{dataset.file_name}</b><small>{dataset.row_count.toLocaleString()} source {dataset.source_format==='XES'?'events':'nonblank CSV rows'} - {dataset.source_delivery==='reviewed_extract'?'published minimized extract':'browser session only'}</small></span></div><button className="secondary-btn" onClick={()=>fileRef.current?.click()}><RotateCcw size={14}/>Replace file</button><input ref={fileRef} type="file" accept=".csv,.xes,.xes.gz,text/csv,application/xml,application/gzip" className="hidden-file-input" aria-label="Replace incident event log" onChange={event=>void handleFile(event.target.files?.[0])}/></div>
      {dataset.rejected.length>0&&<div className="validation-banner"><AlertCircle size={17}/><div><b>Partial import: {dataset.rejected.length.toLocaleString()} {dataset.source_format==='XES'?'event(s)':'row(s)'} need review</b><p>Rejected {dataset.source_format==='XES'?'events':'rows'} are excluded from metrics and remain available to download. Valid out-of-order rows were sorted by case and timestamp.</p></div><button className="text-btn" onClick={downloadValidationReport}><Download size={14}/> Download row report</button></div>}
      {dataset.out_of_order_rows.length>0&&<div className="validation-note"><AlertCircle size={14}/>{dataset.out_of_order_rows.length.toLocaleString()} row(s) were out of timestamp order in the source file; accepted events are sorted before analysis.<button className="text-btn" onClick={downloadValidationReport}><Download size={14}/> Row report</button></div>}
      <div className="validation-summary"><div><b>{dataset.row_count.toLocaleString()}</b><span>{dataset.source_format==='XES'?'Source events':'Nonblank CSV rows'}</span></div><div><b>{dataset.events.length.toLocaleString()}</b><span>Accepted events</span></div><div className={dataset.rejected.length?'warning':''}><b>{dataset.rejected.length.toLocaleString()}</b><span>Rejected {dataset.source_format==='XES'?'events':'rows'}</span></div><div className={issueCount('Missing case ID')?'warning':''}><b>{issueCount('Missing case ID').toLocaleString()}</b><span>Missing case IDs</span></div><div className={issueCount('Missing timestamp')?'warning':''}><b>{issueCount('Missing timestamp').toLocaleString()}</b><span>Missing timestamps</span></div><div className={issueCount('Invalid timestamp')?'warning':''}><b>{issueCount('Invalid timestamp').toLocaleString()}</b><span>Invalid timestamps</span></div><div className={dataset.duplicate_rows?'warning':''}><b>{dataset.duplicate_rows.toLocaleString()}</b><span>Exact duplicates</span></div><div><b>{dataset.out_of_order_rows.length.toLocaleString()}</b><span>Out of order</span></div></div>{dataset.blank_rows>0&&<div className="history-footnote">{dataset.blank_rows.toLocaleString()} blank CSV row(s) skipped. Rejected reasons may overlap because one row can have multiple issues.</div>}{dataset.rejected.length>0&&<div className="history-footnote">Rejected issue counts can overlap when an event has more than one validation problem.</div>}
      <div className="mapping-caption"><CheckCircle2 size={14}/><span>Required field mapping: <b>{dataset.mapping.case_id}</b> → case ID · <b>{dataset.mapping.event_time}</b> → event timestamp. Source identity and file integrity are not independently verified.</span></div>
      {dimensionOptions.length>0&&<div className="historical-filters"><span>Case filters</span>{dimensionOptions.map(dimension=><label key={dimension.key}>{dimension.label}<select aria-label={`Filter cases by ${dimension.label}`} value={filters[dimension.key]||''} onChange={event=>setFilters(current=>({...current,[dimension.key]:event.target.value}))}><option value="">All values</option>{dimension.values.map(value=><option key={value}>{value}</option>)}</select></label>)}{Object.values(filters).some(Boolean)&&<button className="text-btn" onClick={()=>setFilters({})}>Clear filters</button>}</div>}
      {analysis&&<><div className="historical-date-band"><CalendarDays size={15}/><span>Observed event range</span><b>{analysis.dateMin!==null?time(analysis.dateMin):'—'}</b><span>to</span><b>{analysis.dateMax!==null?time(analysis.dateMax):'—'}</b><small>UTC display; timezone-naive source timestamps are interpreted as UTC for consistent parsing.</small></div>
      <div className="historical-metrics">
        <HistoryMetric label="Cases" value={analysis.cases.toLocaleString()} definition="Distinct case IDs among accepted events after case filters." denominator={`${analysis.cases.toLocaleString()} cases`}/>
        <HistoryMetric label="Accepted events" value={analysis.events.toLocaleString()} definition="Accepted, nonduplicate source rows with case ID and valid timestamp." denominator={`${analysis.events.toLocaleString()} events`}/>
        <HistoryMetric label="Median case duration" value={hoursLabel(analysis.medianDuration===null?null:analysis.medianDuration/3600000)} definition="Raw elapsed time from first to last recorded event per case; median." denominator={`${analysis.caseDurations.length.toLocaleString()} cases with ≥2 events`}/>
        <HistoryMetric label="P90 case duration" value={hoursLabel(analysis.p90Duration===null?null:analysis.p90Duration/3600000)} definition="90th percentile raw elapsed time from first to last recorded event." denominator={`${analysis.caseDurations.length.toLocaleString()} cases with ≥2 events`}/>
      </div>
      <div className="history-grid"><HistoricalTable title="Status transitions" subtitle={`Changed status pairs · ${analysis.adjacentStatusPairs.toLocaleString()} adjacent event pairs with status values`} headers={['Transition','Events','Cases']} rows={analysis.transitionRows.map(row=>[row.transition,row.count.toLocaleString(),row.cases.toLocaleString()])} empty={dataset.mapping.status?'No status changes in this filtered case set.':'Status field not present in the imported file.'}/>
        <div className="panel history-table-panel"><div className="panel-head"><div><h2>Team changes & repeat visits</h2><p>Team changes are inferred from consecutive event rows; not verified handoffs.</p></div></div><div className="history-kpi-strip"><div><b>{analysis.teamChanges.toLocaleString()}</b><span>Team changes</span><small>Changed consecutive team values</small></div><div><b>{analysis.repeatTeamCases.toLocaleString()}</b><span>Cases with team revisit</span><small>Returned to a previously seen team</small></div></div><div className="history-denominator">Team-change denominator: {analysis.casesWithTeam.toLocaleString()} cases with at least one usable team value.</div><SimpleRows headers={['Team transition','Events','Cases']} rows={analysis.teamRows.map(row=>[row.transition,row.count.toLocaleString(),row.cases.toLocaleString()])} empty={dataset.mapping.support_team?'No observed team changes in this filtered case set.':'Support team field not present in the imported file.'}/></div>
      </div>
      <HistoricalTable title="Elapsed time in observed statuses" subtitle="Raw elapsed time between each event and the next event in its case; final event per case has no measured interval." headers={['Observed status / sub-status','Intervals','Raw elapsed hours']} rows={analysis.intervals.map(row=>[row.status,row.intervals.toLocaleString(),row.hours.toLocaleString(undefined,{maximumFractionDigits:1})])} empty={dataset.mapping.status||dataset.mapping.sub_status?'No status intervals available in this filtered case set.':'Status fields not present in the imported file.'}/>
      <div className="definition-note"><Clock3 size={15}/><p>All durations are <b>raw elapsed time between recorded events</b>, in hours or days. They are not business-hours calculations, response times, contractual SLA measures, or proof of restoration time. Status intervals are assigned to the status/sub-status on the earlier event; the final case event is excluded because its next-event time is unknown.</p></div>
      </>}
    </>}
    <div className="history-footnote">The analysis runs in this browser tab and is cleared when the page is refreshed. The import does not alter synthetic ticket records. Source fields are preserved for each accepted event and included with rejected rows in the downloadable review file.</div>
  </section>;
}

function HistoryMetric({label,value,definition,denominator}:{label:string;value:string;definition:string;denominator:string}){return <div className="history-metric"><span>{label}</span><b>{value}</b><p>{definition}</p><small>Denominator: {denominator}</small></div>}
function HistoricalTable({title,subtitle,headers,rows,empty}:{title:string;subtitle:string;headers:string[];rows:string[][];empty:string}){return <div className="panel history-table-panel"><div className="panel-head"><div><h2>{title}</h2><p>{subtitle}</p></div></div><SimpleRows headers={headers} rows={rows} empty={empty}/></div>}
function SimpleRows({headers,rows,empty}:{headers:string[];rows:string[][];empty:string}){return rows.length?<div className="table-wrap"><table className="history-table"><thead><tr>{headers.map(header=><th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row,index)=><tr key={`${row[0]}-${index}`}>{row.map((value,i)=><td key={i}>{value}</td>)}</tr>)}</tbody></table></div>:<div className="history-empty"><span>{empty}</span></div>}
