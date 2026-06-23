import FICHA_PRINT_CSS from '../styles/fichaMedicaPrintStyles.js';

const PRINT_SOURCE_SELECTOR = '.ficha-medica-print-source .ficha-medica-document';

export function printFichaMedica() {
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
  <title>Ficha médica</title>
  <style>${FICHA_PRINT_CSS}</style>
</head>
<body></body>
</html>`);
  doc.close();

  doc.body.appendChild(source.cloneNode(true));

  const cleanup = () => {
    iframe.remove();
    win.removeEventListener('afterprint', cleanup);
  };

  win.addEventListener('afterprint', cleanup);
  window.setTimeout(cleanup, 5000);

  win.focus();
  win.print();
}
