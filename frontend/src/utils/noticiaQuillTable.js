export const NOTICIA_TABLE_EMBED_CLASS = 'noticia-quill-table-embed';
export const NOTICIA_TABLE_CLASS = 'noticia-html-table';
export const NOTICIA_TABLE_TOOLBAR = 'noticiaTable';

let blotRegistered = false;
let iconRegistered = false;

export function defaultNoticiaTableHtml() {
  return [
    `<table class="${NOTICIA_TABLE_CLASS}">`,
    '<thead><tr><th></th><th></th></tr></thead>',
    '<tbody><tr><td></td><td></td></tr><tr><td></td><td></td></tr></tbody>',
    '</table>',
  ].join('');
}

function wrapTablesWithRegex(html) {
  return html.replace(/<table\b[\s\S]*?<\/table>/gi, match => {
    if (match.includes(NOTICIA_TABLE_EMBED_CLASS)) return match;
    return `<div class="${NOTICIA_TABLE_EMBED_CLASS}">${match}</div>`;
  });
}

function unwrapTablesWithRegex(html) {
  const embedPattern = new RegExp(
    `<div class="${NOTICIA_TABLE_EMBED_CLASS}"[^>]*>([\\s\\S]*?)<\\/div>`,
    'gi'
  );
  return html.replace(embedPattern, (_, inner) => {
    const tableMatch = inner.match(/<table[\s\S]*?<\/table>/i);
    return tableMatch ? tableMatch[0] : inner;
  });
}

export function prepareNoticiaHtmlForQuill(html) {
  if (!html) return html || '';
  if (!/<table[\s>]/i.test(html)) return html;

  if (typeof document === 'undefined') {
    return wrapTablesWithRegex(html);
  }

  const root = document.createElement('div');
  root.innerHTML = html;

  root.querySelectorAll('table').forEach(table => {
    if (table.closest(`.${NOTICIA_TABLE_EMBED_CLASS}`)) return;

    const embed = document.createElement('div');
    embed.className = NOTICIA_TABLE_EMBED_CLASS;
    table.replaceWith(embed);
    embed.appendChild(table);
  });

  return root.innerHTML;
}

export function normalizeNoticiaHtmlFromQuill(html) {
  if (!html) return html || '';

  if (typeof document === 'undefined') {
    return unwrapTablesWithRegex(html);
  }

  const root = document.createElement('div');
  root.innerHTML = html;

  root.querySelectorAll(`.${NOTICIA_TABLE_EMBED_CLASS}`).forEach(embed => {
    const table = embed.querySelector('table');
    if (table) {
      embed.replaceWith(table);
      return;
    }
    embed.remove();
  });

  return root.innerHTML;
}

export function registerNoticiaTableBlot(Quill) {
  if (!Quill || blotRegistered) return;

  const BlockEmbed = Quill.import('blots/block/embed');

  class NoticiaTableBlot extends BlockEmbed {
    static create(value) {
      const node = super.create();
      node.innerHTML = typeof value === 'string' ? value : defaultNoticiaTableHtml();
      return node;
    }

    static value(node) {
      const table = node.querySelector('table');
      return table ? table.outerHTML : node.innerHTML;
    }
  }

  NoticiaTableBlot.blotName = NOTICIA_TABLE_TOOLBAR;
  NoticiaTableBlot.tagName = 'DIV';
  NoticiaTableBlot.className = NOTICIA_TABLE_EMBED_CLASS;

  Quill.register(NoticiaTableBlot);
  blotRegistered = true;
}

export function registerNoticiaTableIcon(Quill) {
  if (!Quill || iconRegistered) return;

  const icons = Quill.import('ui/icons');
  icons[NOTICIA_TABLE_TOOLBAR] = [
    '<svg viewBox="0 0 18 18">',
    '<rect class="ql-stroke" height="12" width="12" x="3" y="3"></rect>',
    '<line class="ql-stroke" x1="3" x2="15" y1="8" y2="8"></line>',
    '<line class="ql-stroke" x1="9" x2="9" y1="3" y2="15"></line>',
    '</svg>',
  ].join('');
  iconRegistered = true;
}

export function registerNoticiaTableSupport(Quill) {
  registerNoticiaTableBlot(Quill);
  registerNoticiaTableIcon(Quill);
}
