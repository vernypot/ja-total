import PRINT_CSS from '../styles/unidadWeeklyReportPrintStyles.js';

const PRINT_SOURCE_SELECTOR = '.unidad-report-print-source .unidad-report-document';

function waitForPrintImages(container, timeoutMs = 8000) {
  if (!container) return Promise.resolve();
  const images = Array.from(container.querySelectorAll('img'));
  if (!images.length) return Promise.resolve();

  return Promise.all(images.map(img => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise(resolve => {
      const done = () => {
        img.removeEventListener('load', done);
        img.removeEventListener('error', done);
        resolve();
      };
      img.addEventListener('load', done);
      img.addEventListener('error', done);
      window.setTimeout(done, timeoutMs);
    });
  }));
}

export async function printUnidadWeeklyReport() {
  const source = document.querySelector(PRINT_SOURCE_SELECTOR);
  if (!source) return;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = win.document;

  doc.open();
  doc.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Unit weekly report</title>
  <style>${PRINT_CSS}</style>
</head>
<body></body>
</html>`);
  doc.close();

  doc.body.appendChild(source.cloneNode(true));

  await waitForPrintImages(doc.body);

  const cleanup = () => {
    iframe.remove();
    win.removeEventListener('afterprint', cleanup);
  };

  win.addEventListener('afterprint', cleanup);
  window.setTimeout(cleanup, 5000);

  win.focus();
  win.print();
}
