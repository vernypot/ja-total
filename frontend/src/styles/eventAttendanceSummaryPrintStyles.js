export default `
@page {
  size: letter portrait;
  margin: 0.6in;
}

body {
  margin: 0;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  color: #111827;
  font-size: 11pt;
  line-height: 1.45;
}

.event-summary-print-document h1 {
  margin: 0 0 4px;
  font-size: 18pt;
}

.event-summary-print-document__meta {
  margin: 0 0 16px;
  color: #4b5563;
  font-size: 10pt;
}

.event-summary-print-document__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin: 0 0 18px;
}

.event-summary-print-stat {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 10px;
}

.event-summary-print-stat strong {
  display: block;
  font-size: 14pt;
}

.event-summary-print-stat span {
  font-size: 9pt;
  color: #6b7280;
}

.event-summary-print-group {
  margin: 0 0 14px;
  break-inside: avoid;
}

.event-summary-print-group h2 {
  margin: 0 0 6px;
  font-size: 12pt;
  border-bottom: 1px solid #d1d5db;
  padding-bottom: 4px;
}

.event-summary-print-group ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.event-summary-print-group li {
  padding: 4px 0;
  border-bottom: 1px solid #f3f4f6;
}

.event-summary-print-group li:last-child {
  border-bottom: none;
}

.event-summary-print-member {
  line-height: 1.35;
}

.event-summary-print-member-name {
  font-weight: 600;
}

.event-summary-print-member-meta {
  color: #4b5563;
  font-size: 10pt;
  font-weight: 400;
}

.event-summary-print-document__footer {
  margin-top: 18px;
  font-size: 9pt;
  color: #6b7280;
}
`;
