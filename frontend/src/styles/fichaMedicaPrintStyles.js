// Compact print-only styles for iframe ficha médica (letter size).
export default `
@page {
  size: letter portrait;
  margin: 0.45in;
}

html, body {
  margin: 0;
  padding: 0;
  background: #fff;
  color: #111827;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 10pt;
  line-height: 1.35;
}

.ficha-medica-document {
  width: 100%;
}

.ficha-medica-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  border-bottom: 2px solid #1a2744;
  padding-bottom: 8px;
  margin-bottom: 10px;
}

.ficha-medica-eyebrow {
  margin: 0 0 2px;
  font-size: 8pt;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #4338ca;
  font-weight: 700;
}

.ficha-medica-title {
  margin: 0;
  font-size: 16pt;
  line-height: 1.15;
  font-weight: 700;
  color: #1a2744;
}

.ficha-medica-printed-at {
  font-size: 8pt;
  color: #6b7280;
  text-align: right;
  max-width: 45%;
}

.ficha-medica-member-row {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 10px;
}

.ficha-medica-photo {
  width: 72px;
  height: 72px;
  border-radius: 4px;
  object-fit: cover;
}

.ficha-medica-photo-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  background: #f3f4f6;
  font-size: 22px;
  border-radius: 4px;
}

.ficha-medica-member-name {
  margin: 0 0 2px;
  font-size: 13pt;
  font-weight: 700;
  color: #1a2744;
}

.ficha-medica-clubs {
  margin: 0;
  color: #4b5563;
  font-size: 9pt;
}

.ficha-medica-block {
  margin-bottom: 10px;
  page-break-inside: avoid;
}

.ficha-medica-block-title {
  margin: 0 0 6px;
  font-size: 10.5pt;
  font-weight: 700;
  color: #1a2744;
  border-bottom: 1px solid #d1d5db;
  padding-bottom: 2px;
}

.ficha-medica-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 16px;
  row-gap: 4px;
}

.ficha-medica-field {
  padding: 2px 0;
  min-height: 0;
}

.ficha-medica-field-full {
  grid-column: 1 / -1;
}

.ficha-medica-label {
  margin: 0;
  font-size: 7.5pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #4338ca;
}

.ficha-medica-value {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 9.5pt;
  color: #111827;
}

.ficha-medica-contacts {
  width: 100%;
  border-collapse: collapse;
  font-size: 9pt;
}

.ficha-medica-contacts th {
  text-align: left;
  font-size: 8pt;
  font-weight: 700;
  color: #1a2744;
  padding: 4px 0;
  border-bottom: 1px solid #9ca3af;
}

.ficha-medica-contacts td {
  padding: 4px 8px 4px 0;
  vertical-align: top;
  border-bottom: 1px solid #e5e7eb;
}

.ficha-medica-empty {
  margin: 0;
  color: #6b7280;
  font-style: italic;
  font-size: 9pt;
}

.ficha-medica-footer {
  margin-top: 12px;
  padding-top: 6px;
  border-top: 1px solid #d1d5db;
  font-size: 7.5pt;
  color: #6b7280;
}

.ficha-medica-footer p {
  margin: 0;
}
`;
