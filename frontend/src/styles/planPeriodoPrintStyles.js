// Letter-size print styles for period planning agenda.

export default `
@page {
  size: letter portrait;
  margin: 0.55in 0.6in;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 11pt;
  line-height: 1.45;
  color: #111827;
}

.plan-periodo-document {
  width: 100%;
}

.plan-periodo-header {
  border-bottom: 2px solid #1e40af;
  padding-bottom: 10px;
  margin-bottom: 16px;
}

.plan-periodo-title {
  margin: 0 0 4px;
  font-size: 18pt;
  color: #1e3a8a;
}

.plan-periodo-meta {
  margin: 0;
  font-size: 10pt;
  color: #4b5563;
}

.plan-periodo-meta + .plan-periodo-meta {
  margin-top: 2px;
}

.plan-periodo-empty {
  margin: 20px 0;
  padding: 12px;
  border: 1px dashed #d1d5db;
  border-radius: 6px;
  color: #6b7280;
  font-size: 10pt;
}

.plan-periodo-day {
  margin-bottom: 18px;
  page-break-inside: avoid;
}

.plan-periodo-day-date {
  margin: 0 0 8px;
  padding: 4px 0;
  font-size: 12pt;
  font-weight: 700;
  color: #1d4ed8;
  border-bottom: 1px solid #dbeafe;
}

.plan-periodo-entry {
  margin: 0 0 12px 14px;
  padding-left: 10px;
  border-left: 3px solid #e5e7eb;
  page-break-inside: avoid;
}

.plan-periodo-entry--meeting {
  border-left-color: #2563eb;
}

.plan-periodo-entry--event {
  border-left-color: #9ca3af;
}

.plan-periodo-entry-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 4px;
}

.plan-periodo-entry-time {
  font-size: 10pt;
  font-weight: 700;
  color: #374151;
}

.plan-periodo-entry-title {
  margin: 0;
  font-size: 11pt;
  font-weight: 700;
}

.plan-periodo-entry-kind {
  font-size: 8pt;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6b7280;
}

.plan-periodo-entry-subtitle {
  margin: 0 0 4px;
  font-size: 9pt;
  color: #4338ca;
  font-weight: 600;
}

.plan-periodo-entry-description {
  margin: 0 0 6px;
  font-size: 10pt;
  color: #374151;
  white-space: pre-wrap;
}

.plan-periodo-reqs {
  margin: 6px 0 0;
  padding-left: 18px;
}

.plan-periodo-reqs li {
  margin-bottom: 4px;
  font-size: 10pt;
}

.plan-periodo-req-clase {
  display: block;
  font-size: 8pt;
  color: #6b7280;
}

.plan-periodo-no-reqs {
  margin: 4px 0 0;
  font-size: 9pt;
  color: #9ca3af;
  font-style: italic;
}

.plan-periodo-footer {
  margin-top: 20px;
  padding-top: 8px;
  border-top: 1px solid #e5e7eb;
  font-size: 8pt;
  color: #9ca3af;
}
`;
