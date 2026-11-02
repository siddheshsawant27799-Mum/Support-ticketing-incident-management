export type HistoricalEvent = {
  case_id: string;
  event_time: number;
  status: string | null;
  sub_status: string | null;
  support_team: string | null;
  impact: string | null;
  product: string | null;
  organization: string | null;
  owner_country: string | null;
  organization_country: string | null;
  function_division: string | null;
  source_row: number;
  source_fields: Record<string, string>;
};

export type RejectedRow = { source_row: number; reasons: string[]; source_fields: Record<string, string> };
export type HistoricalDataset = {
  file_name: string;
  events: HistoricalEvent[];
  rejected: RejectedRow[];
  out_of_order_rows: number[];
  duplicate_rows: number;
  blank_rows: number;
  row_count: number;
  mapping: Record<string, string>;
};

const fieldAliases: Record<string, string[]> = {
  case_id: ['SR Number', 'case_id', 'case id', 'case:concept:name'],
  event_time: ['Change Date+Time', 'event_time', 'timestamp', 'time:timestamp'],
  status: ['Status', 'status', 'concept:name'],
  sub_status: ['Sub Status', 'Sub-Status', 'sub_status', 'substatus'],
  support_team: ['Involved ST', 'Support Team', 'support_team', 'org:group'],
  impact: ['SR Latest Impact', 'Impact', 'impact'],
  product: ['Product', 'product'],
  organization: ['Involved Org line 3', 'Involved Organization', 'organization'],
  owner_country: ['Owner Country', 'owner_country'],
  organization_country: ['Country', 'Organization Country', 'organization_country'],
  function_division: ['Involved ST Function Div', 'Involved ST Functional Division', 'Function Division', 'function_division'],
};

const headerKey = (value: string) => value.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/\s+/g, ' ');
const clean = (value: string | undefined) => value?.trim() || null;

function chooseDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const counts = [',', ';', '\t'].map(delimiter => {
    let count = 0, quoted = false;
    for (let i = 0; i < firstLine.length; i++) {
      if (firstLine[i] === '"') {
        if (quoted && firstLine[i + 1] === '"') i++;
        else quoted = !quoted;
      } else if (!quoted && firstLine[i] === delimiter) count++;
    }
    return { delimiter, count };
  });
  return counts.sort((a, b) => b.count - a.count)[0].delimiter;
}

function parseDelimited(text: string, delimiter: string): string[][] {
  const records: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && char === delimiter) {
      row.push(cell); cell = '';
    } else if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); records.push(row); row = []; cell = '';
    } else cell += char;
  }
  if (cell.length || row.length || text.endsWith(delimiter)) { row.push(cell); records.push(row); }
  return records;
}

function parseTimestamp(raw: string | undefined): number | null {
  const value = raw?.trim();
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?)?(Z|[+-]\d{2}:?\d{2})?$/i.exec(value);
  if (!match) return null;
  if (!match[4]) return null;
  const [, yearText, monthText, dayText, hourText = '0', minuteText = '0', secondText = '0', , zone = ''] = match;
  const [year, month, day, hour, minute, second] = [yearText, monthText, dayText, hourText, minuteText, secondText].map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day || hour > 23 || minute > 59 || second > 59) return null;
  // Preserve explicit offsets; interpret timezone-naive source values as UTC.
  const normalized = `${value.replace(' ', 'T')}${zone ? '' : 'Z'}`;
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function sourceObject(headers: string[], values: string[]): Record<string, string> {
  const source: Record<string, string> = {};
  headers.forEach((header, i) => { source[header || `__blank_header_${i + 1}`] = values[i] ?? ''; });
  for (let i = headers.length; i < values.length; i++) source[`__extra_column_${i - headers.length + 1}`] = values[i];
  return source;
}

export async function importIncidentCsv(file: File): Promise<HistoricalDataset> {
  if (!file.name.toLowerCase().endsWith('.csv')) throw new Error('Choose the original incident CSV file. This importer does not accept XES, XLSX, or ZIP files.');
  const text = await file.text();
  const delimiter = chooseDelimiter(text);
  const table = parseDelimited(text, delimiter);
  while (table.length && table[table.length - 1].every(value => !value.trim())) table.pop();
  if (table.length < 2) throw new Error('The CSV has a header but no event rows.');
  const headers = table[0].map((header, i) => header.replace(/^\uFEFF/, '').trim() || `__blank_header_${i + 1}`);
  const normalized = headers.map(headerKey);
  const mapping: Record<string, string> = {};
  for (const [field, aliases] of Object.entries(fieldAliases)) {
    const match = aliases.map(headerKey).map(alias => normalized.indexOf(alias)).find(index => index >= 0);
    if (match !== undefined) mapping[field] = headers[match];
  }
  if (!mapping.case_id || !mapping.event_time) {
    throw new Error(`Required columns not found. Need an incident identifier (expected “SR Number”) and event timestamp (expected “Change Date+Time”). Found: ${headers.join(', ')}`);
  }
  const columnIndex = (field: string) => mapping[field] === undefined ? -1 : headers.indexOf(mapping[field]);
  const events: HistoricalEvent[] = [], rejected: RejectedRow[] = [], outOfOrder: number[] = [];
  const signatures = new Set<string>();
  const lastTimeByCase = new Map<string, number>();
  let duplicateRows = 0, blankRows = 0, nonblankRows = 0, sourceRow = 1;
  for (const values of table.slice(1)) {
    sourceRow++;
    if (values.every(value => !value.trim())) { blankRows++; continue; }
    nonblankRows++;
    const source_fields = sourceObject(headers, values);
    const reasons: string[] = [];
    if (values.length !== headers.length) reasons.push(`Column count mismatch (expected ${headers.length}, found ${values.length})`);
    const caseId = clean(values[columnIndex('case_id')]);
    const rawTime = values[columnIndex('event_time')];
    const eventTime = parseTimestamp(rawTime);
    if (!caseId) reasons.push('Missing case ID');
    if (!clean(rawTime)) reasons.push('Missing timestamp');
    else if (eventTime === null) reasons.push('Invalid timestamp');
    const signature = JSON.stringify(headers.map((_, i) => values[i] ?? ''));
    if (signatures.has(signature)) { duplicateRows++; reasons.push('Exact duplicate event row'); }
    else signatures.add(signature);
    if (caseId && eventTime !== null) {
      const previous = lastTimeByCase.get(caseId);
      if (previous !== undefined && eventTime < previous) outOfOrder.push(sourceRow);
      lastTimeByCase.set(caseId, Math.max(previous ?? eventTime, eventTime));
    }
    if (reasons.length) { rejected.push({ source_row: sourceRow, reasons, source_fields }); continue; }
    const get = (field: string) => clean(values[columnIndex(field)]);
    events.push({
      case_id: caseId!, event_time: eventTime!, status: get('status'), sub_status: get('sub_status'),
      support_team: get('support_team'), impact: get('impact'), product: get('product'),
      organization: get('organization'), owner_country: get('owner_country'),
      organization_country: get('organization_country'), function_division: get('function_division'),
      source_row: sourceRow, source_fields,
    });
  }
  if (!events.length) throw new Error(`No usable event rows. ${rejected.length} row(s) were rejected. Check the imported file's column mapping and timestamp values.`);
  events.sort((a, b) => a.case_id.localeCompare(b.case_id) || a.event_time - b.event_time || a.source_row - b.source_row);
  return { file_name: file.name, events, rejected, out_of_order_rows: outOfOrder, duplicate_rows: duplicateRows, blank_rows: blankRows, row_count: nonblankRows, mapping };
}

export type AnalysisFilter = Record<string, string>;
export function filterEventsByCases(events: HistoricalEvent[], filters: AnalysisFilter): HistoricalEvent[] {
  const activeFilters = Object.entries(filters).filter(([, value]) => Boolean(value));
  if (!activeFilters.length) return events;
  const matchingCases = new Set(events.filter(event => activeFilters.every(([field, value]) => String(event[field as keyof HistoricalEvent] ?? '') === value)).map(event => event.case_id));
  return events.filter(event => matchingCases.has(event.case_id));
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b), middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
}
