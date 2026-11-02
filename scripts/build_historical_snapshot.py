#!/usr/bin/env python3
"""Validate BPIC'13 incident XES and produce a privacy-minimized web snapshot.

Usage: python scripts/build_historical_snapshot.py input.xes public/data/historical-volvo.json
The output omits org:resource and replaces original trace IDs with stable CASE labels.
"""
import gzip
import json
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path


def local_name(tag):
    return tag.rsplit("}", 1)[-1].split(":")[-1]


def attributes(element):
    result = []
    problems = []
    seen = set()
    for child in list(element):
        kind = local_name(child.tag)
        key = child.attrib.get("key", "").strip()
        if kind not in {"string", "date", "int", "float", "boolean", "id", "list", "container"}:
            continue
        if not key:
            problems.append("XES attribute is missing its key")
            continue
        if key in seen:
            problems.append(f"Duplicate XES attribute key: {key}")
        seen.add(key)
        value = child.attrib.get("value", "").strip()
        result.append((key, kind, value))
    return result, problems


def values(items):
    return {key: value for key, _kind, value in items}


def parse_timestamp(value):
    if not value:
        return None
    try:
        timestamp = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)
        return int(timestamp.timestamp() * 1000)
    except ValueError:
        return None


def build(source, output):
    root = ET.parse(source).getroot()
    if local_name(root.tag).lower() != "log":
        raise ValueError("Expected an XES <log> root element")
    traces = [child for child in list(root) if local_name(child.tag).lower() == "trace"]
    if not traces:
        raise ValueError("No XES trace elements found")

    events = []
    rejected = []
    out_of_order = 0
    duplicates = 0
    signatures = set()
    last_time = {}
    row = 0
    case_labels = {}

    for trace in traces:
        trace_items, trace_problems = attributes(trace)
        trace_values = values(trace_items)
        original_case_id = trace_values.get("concept:name") or trace_values.get("case_id") or ""
        case_id = original_case_id.strip()
        if case_id and case_id not in case_labels:
            case_labels[case_id] = f"CASE-{len(case_labels) + 1:05d}"
        for element in list(trace):
            if local_name(element.tag).lower() != "event":
                continue
            row += 1
            event_items, event_problems = attributes(element)
            event_values = values(event_items)
            event_time_text = event_values.get("time:timestamp") or event_values.get("Timestamp") or ""
            event_time = parse_timestamp(event_time_text)
            activity = event_values.get("concept:name") or event_values.get("Status") or event_values.get("status") or ""
            reasons = list(trace_problems) + list(event_problems)
            if not case_id:
                reasons.append("Missing case ID on trace")
            if not event_time_text:
                reasons.append("Missing timestamp")
            elif event_time is None:
                reasons.append("Invalid timestamp")
            if not activity.strip():
                reasons.append("Missing activity/status")
            signature = (case_id, tuple(trace_items), tuple(event_items))
            if signature in signatures:
                duplicates += 1
                reasons.append("Exact duplicate XES event")
            signatures.add(signature)
            if case_id and event_time is not None:
                previous = last_time.get(case_id)
                if previous is not None and event_time < previous:
                    out_of_order += 1
                last_time[case_id] = max(previous or event_time, event_time)
            if reasons:
                rejected.append({"source_event": row, "reasons": reasons})
                continue
            events.append({
                "case_id": case_labels[case_id],
                "event_time": event_time,
                "status": activity.strip(),
                "sub_status": event_values.get("Sub Status") or event_values.get("sub_status") or None,
                "support_team": event_values.get("org:group") or event_values.get("Involved ST") or None,
                "impact": event_values.get("impact") or event_values.get("SR Latest Impact") or None,
                "product": event_values.get("product") or None,
                "organization": event_values.get("organization involved") or event_values.get("Involved Org line 3") or None,
                "owner_country": None,
                "organization_country": event_values.get("organization country") or event_values.get("Country") or None,
                "function_division": None,
                "source_row": row,
                "source_fields": {},
            })

    if row == 0:
        raise ValueError("No XES events found")
    if rejected:
        sample = "; ".join(f"event {item['source_event']}: {', '.join(item['reasons'])}" for item in rejected[:5])
        raise ValueError(f"Refusing to publish a partial snapshot: {len(rejected)} invalid events. {sample}")
    events.sort(key=lambda item: (item["case_id"], item["event_time"], item["source_row"]))
    event_times = [item["event_time"] for item in events]
    payload = {
        "file_name": source.name,
        "source_format": "XES",
        "source_delivery": "reviewed_extract",
        "events": events,
        "rejected": [],
        "out_of_order_rows": [],
        "duplicate_rows": duplicates,
        "blank_rows": 0,
        "row_count": row,
        "mapping": {
            "case_id": "trace:string:concept:name (pseudonymized for published extract)",
            "event_time": "event:date:time:timestamp",
            "status": "event:string:concept:name",
            "support_team": "event:string:org:group",
            "impact": "event:string:impact",
            "product": "event:string:product",
            "organization": "event:string:organization involved",
        },
        "published_extract_note": "Case IDs replaced with stable CASE labels; org:resource omitted. Original trace/event attributes remain available through local upload of the supplied XES file.",
        "validation_summary": {
            "traces": len(case_labels),
            "source_events": row,
            "accepted_events": len(events),
            "rejected_events": 0,
            "missing_case_ids": 0,
            "missing_timestamps": 0,
            "invalid_timestamps": 0,
            "missing_activity_status": 0,
            "duplicate_events": duplicates,
            "out_of_order_events": out_of_order,
            "date_start_utc": datetime.fromtimestamp(min(event_times) / 1000, timezone.utc).isoformat(),
            "date_end_utc": datetime.fromtimestamp(max(event_times) / 1000, timezone.utc).isoformat(),
        },
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    serialized = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    if output.suffix == ".gz":
        with gzip.open(output, "wb", compresslevel=9) as compressed:
            compressed.write(serialized)
    else:
        output.write_bytes(serialized)
    print(json.dumps({"output": str(output), "bytes": output.stat().st_size, **payload["validation_summary"]}))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: python scripts/build_historical_snapshot.py input.xes output.json")
    try:
        build(Path(sys.argv[1]), Path(sys.argv[2]))
    except Exception as error:
        raise SystemExit(str(error))
