// Letter-size print layout for unit weekly evaluation report (RGM-style).
// Two fichas per page, each occupying half the printable area with a cut line between them.

export default `
@page {
  size: letter portrait;
  margin: 0.35in 0.4in;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 8.5pt;
  line-height: 1.25;
  color: #111827;
}

.unidad-report-document {
  width: 100%;
}

.unidad-report-page {
  display: flex;
  flex-direction: column;
  height: 10.3in;
  min-height: 10.3in;
  page-break-after: always;
}

.unidad-report-page-slot {
  flex: 1 1 50%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.unidad-report-cut-line {
  flex-shrink: 0;
  border-top: 1px dashed #6b7280;
  margin: 0;
}

.unidad-report-form {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  page-break-inside: avoid;
}

.unidad-report-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
  flex-shrink: 0;
}

.unidad-report-logos {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.unidad-report-logo {
  display: block;
  object-fit: contain;
}

.unidad-report-logo--tipo {
  width: 34px;
  height: 34px;
}

.unidad-report-logo--club {
  width: 38px;
  height: 38px;
}

.unidad-report-logo--empty {
  width: 34px;
  height: 34px;
}

.unidad-report-logo--club.unidad-report-logo--empty {
  width: 38px;
  height: 38px;
}

.unidad-report-title {
  flex: 1;
  margin: 0;
  font-size: 9.5pt;
  font-weight: 700;
  text-align: center;
  letter-spacing: 0.02em;
}

.unidad-report-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.unidad-report-meta {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 3px 10px;
  margin-bottom: 3px;
  font-size: 7.5pt;
  flex-shrink: 0;
}

.unidad-report-meta-line {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 3px 8px;
  margin-bottom: 4px;
  font-size: 7.5pt;
  flex-shrink: 0;
}

.unidad-report-field {
  white-space: nowrap;
}

.unidad-report-field-fill {
  display: inline-block;
  min-width: 48px;
  border-bottom: 1px solid #111827;
  vertical-align: bottom;
}

.unidad-report-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  flex-shrink: 0;
}

.unidad-report-table th,
.unidad-report-table td {
  border: 1px solid #111827;
  padding: 2px 3px;
  text-align: center;
  vertical-align: middle;
  font-size: 7.5pt;
}

.unidad-report-table th {
  font-weight: 700;
  background: #f3f4f6;
}

.unidad-report-col-num {
  width: 4%;
}

.unidad-report-col-name {
  width: 42%;
  text-align: left;
}

.unidad-report-col-vertical {
  width: 3.5%;
  padding: 3px 1px;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  white-space: nowrap;
  font-size: 6.5pt;
  line-height: 1;
  letter-spacing: 0.01em;
}

.unidad-report-col-score {
  width: 7%;
}

.unidad-report-score-cell {
  padding: 2px 1px;
}

.unidad-report-name-cell {
  text-align: left;
  font-size: 7pt;
  padding: 2px 4px;
}

.unidad-report-role-label {
  font-weight: 600;
  color: #374151;
}

.unidad-report-total-row td {
  font-weight: 700;
  background: #f9fafb;
}

.unidad-report-notes {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin-top: 4px;
}

.unidad-report-notes-label {
  margin: 0 0 3px;
  font-size: 7.5pt;
  font-weight: 700;
  flex-shrink: 0;
}

.unidad-report-notes-lines {
  flex: 1;
  min-height: 56px;
  border: 1px solid #111827;
}
`;
