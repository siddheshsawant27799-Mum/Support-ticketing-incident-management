# Historical incident event-log import

## Dataset status in this workspace

No incident source file is currently present here. The importer is built against the documented original CSV field names and remains **unverified against a locally supplied data file**. The application therefore opens with the existing synthetic demo workflow and an empty historical analysis view. No Volvo event-log findings are shown until a file is imported.

## Obtain and place the file

Use the official [BPI Challenge 2013 page](https://ais.win.tue.nl/bpi/2013/challenge.html), which links the incident management log and source CSV files. The incident-log DOI is [10.4121/500573e6-accc-4b0c-9576-aa5468b10cee](https://doi.org/10.4121/500573e6-accc-4b0c-9576-aa5468b10cee). The app does not download or redistribute any dataset.

Place the original incident source CSV in `data/source/` (that directory is Git-ignored), then run the app and select the file in **Historical process analysis → Choose incident CSV**. The importer currently supports CSV with comma, semicolon, or tab delimiters, quoted values, and quoted newlines. It does not import XES, ZIP, or spreadsheet files. Use the source CSV, not the problem logs or a merged archive.

The browser reads the selected file locally. Imported records and analysis remain in memory for the current tab and are cleared on refresh. Re-select the file after refreshing. The file is not uploaded to the app server.

## Documented CSV fields and mapping

The published VINST data description shows the following source fields in its incident/process data table. Exact header spelling should still be confirmed against the supplied CSV during import:

| App field | Documented source CSV header | Use |
|---|---|---|
| `case_id` | `SR Number` | Required case identifier. |
| `event_time` | `Change Date+Time` | Required event timestamp. |
| `status` | `Status` | Observed status after the logged change. |
| `sub_status` | `Sub Status` | Observed sub-status after the logged change. |
| `support_team` | `Involved ST` | Team associated with the event. Team changes are a proxy, not proof of a formal handoff. |
| `impact` | `SR Latest Impact` | Source impact value when populated. |
| `product` | `Product` | Source product value when populated. |
| `organization` | `Involved Org line 3` | Source organization value as labeled in the data description. |
| `organization_country` | `Country` | Preserved source field; not used as a filter by default. |
| `owner_country` | `Owner Country` | Preserved source field; not used as a filter by default. |
| `function_division` | `Involved ST Function Div` | Preserved source field; not used as a filter by default. |

Any additional input columns are retained verbatim in each event's `source_fields`. Rows rejected from metrics are available through the in-app download with their original fields and validation reasons. Only columns actually found in the header are mapped; optional missing fields remain empty and their charts/filters show an unavailable state.

## Validation and counting rules

- Case ID and event timestamp are required. Rows with missing identifiers, missing timestamps, invalid timestamps, duplicate full rows, or mismatched column counts are rejected from analysis and retained in the rejected-row download.
- Exact duplicates mean all parsed source field values match; later copies are quarantined and counted. Repeated status values alone are not deduplicated.
- Source order is checked within each case. Valid out-of-order rows are flagged, then sorted by parsed event time and source row before analysis. Equal timestamps retain source-row order.
- Empty source rows are counted separately as blank rows.
- Timestamp parsing accepts ISO-like `YYYY-MM-DD HH:mm:ss` or `YYYY-MM-DDTHH:mm:ss` values, optional fractional seconds, and optional explicit timezone offsets. Explicit offsets are preserved. Timezone-naive values are parsed as UTC for consistent display; this is a parsing assumption, not evidence that VINST stored UTC. Other date formats are reported as invalid rather than guessed.
- The importer requires `SR Number` (or a documented generic case-ID header) and `Change Date+Time` (or a documented generic timestamp header). If required fields are not found, the whole file is rejected with the detected headers shown.

## Analytical boundaries

The view is a historical event-log analysis, never the live or synthetic ticket queue. The imported file's source identity and integrity are not independently verified by the browser app. Metrics describe accepted records from the selected file only. Raw elapsed durations are between recorded event timestamps; they are not business-hours SLA clocks, response times, contractual SLA attainment, or verified restoration times. A team transition is only a proxy for a handoff. The last event per case has no observed next-event time and is excluded from status-interval duration. No measured findings are available until an actual source file has been loaded and checked.

Source field descriptions: [VINST dataset description](https://ais.win.tue.nl/bpi/2013/vinst_data_set.pdf). Challenge and source-file links: [BPI Challenge 2013](https://ais.win.tue.nl/bpi/2013/challenge.html).
