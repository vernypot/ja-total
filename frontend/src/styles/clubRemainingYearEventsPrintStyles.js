// Compact letter-size print layout for remaining year events (target: 1–2 pages).

export default `
@page {
  size: letter portrait;
  margin: 0.45in 0.5in;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 9pt;
  line-height: 1.3;
  color: #111827;
}

.club-events-year-document {
  width: 100%;
}

.club-events-year-header {
  border-bottom: 2px solid #0f766e;
  padding-bottom: 8px;
  margin-bottom: 10px;
}

.club-events-year-header-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.club-events-year-logos {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.club-events-year-logo {
  display: block;
  max-height: 36px;
  max-width: 72px;
  object-fit: contain;
}

.club-events-year-logo--tipo {
  max-height: 32px;
  max-width: 64px;
}

.club-events-year-header-text {
  flex: 1;
  min-width: 0;
}

.club-events-year-title {
  margin: 0 0 3px;
  font-size: 14pt;
  color: #0d1b2a;
}

.club-events-year-dates {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin-bottom: 4px;
}

.club-events-year-date-line {
  margin: 0;
  font-size: 8pt;
  color: #374151;
}

.club-events-year-subtitle {
  margin-top: 2px;
}

.club-events-year-meta {
  margin: 0;
  font-size: 9pt;
  color: #4b5563;
}

.club-events-year-meta + .club-events-year-meta {
  margin-top: 2px;
}

.club-events-year-empty {
  margin: 16px 0;
  padding: 10px;
  border: 1px dashed #d1d5db;
  border-radius: 4px;
  color: #6b7280;
  font-size: 9pt;
}

.club-events-year-month {
  margin-bottom: 10px;
  page-break-inside: avoid;
}

.club-events-year-month-title {
  margin: 0 0 4px;
  padding: 2px 0;
  font-size: 10pt;
  font-weight: 700;
  color: #0f766e;
  border-bottom: 1px solid #dbeafe;
}

.club-events-year-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.club-events-year-table th,
.club-events-year-table td {
  padding: 2px 4px;
  vertical-align: top;
  text-align: left;
  border-bottom: 1px solid #f3f4f6;
  font-size: 8.5pt;
}

.club-events-year-table th {
  font-size: 7.5pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #6b7280;
  border-bottom: 1px solid #d1d5db;
}

.club-events-year-col-date {
  width: 16%;
  white-space: nowrap;
}

.club-events-year-date-cell {
  font-weight: 600;
}

.club-events-year-col-time {
  width: 9%;
}

.club-events-year-col-event {
  width: 41%;
}

.club-events-year-col-place {
  width: 22%;
}

.club-events-year-col-type {
  width: 13%;
}

.club-events-year-event-name {
  font-weight: 600;
  color: #111827;
}
`;
