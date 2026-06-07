// Generic virtual-scrolled table. Renders only the rows visible in the viewport
// (plus a small buffer) so it stays smooth over tens of thousands of rows.

export const ROW_H = 38; // px, must match .table-row height in styles.css
const BUFFER = 6;

// Fold Arabic text so search ignores diacritics and alif/hamza/ta-marbuta variants.
export function normalizeArabic(s) {
  return String(s == null ? '' : s)
    .replace(/[ً-ْٰ]/g, '')          // tashkeel + superscript alef
    .replace(/[آأإٱ]/g, 'ا') // آ أ إ ٱ -> ا
    .replace(/ى/g, 'ي')                    // ى -> ي
    .replace(/ئ/g, 'ي')                    // ئ -> ي
    .replace(/ؤ/g, 'و')                    // ؤ -> و
    .replace(/ة/g, 'ه')                    // ة -> ه
    .trim();
}

// columns: [{ label, width, cls?, sticky?, sortable?, cell(row) -> { text, className?, title? } }]
// Column widths may be CSS values (incl. var()/minmax); the grid's min-width
// (horizontal-scroll floor) is owned by styles.css, not computed here.
export class VirtualTable {
  constructor(mountEl, columns) {
    this.columns = columns;
    this.rows = [];
    this.lastStart = -1;
    this.onSort = null; // (colIndex) => void
    this.headCells = [];
    this.template = columns.map((c) => c.width).join(' ');

    mountEl.innerHTML = '';
    mountEl.classList.add('table-view');

    this.viewport = document.createElement('div');
    this.viewport.className = 'table-viewport';

    const grid = document.createElement('div');
    grid.className = 'table-grid';

    this.head = document.createElement('div');
    this.head.className = 'table-row table-head';
    this.head.style.gridTemplateColumns = this.template;
    columns.forEach((c, i) => {
      const el = document.createElement('div');
      el.className = 'cell' + (c.cls ? ' ' + c.cls : '') + (c.sticky ? ' col-sticky' : '') +
        (c.sortable ? ' sortable' : '');
      el.textContent = c.label;
      el.title = c.sortable ? `${c.label} — اضغط للترتيب` : c.label;
      if (c.sortable) el.addEventListener('click', () => this.onSort && this.onSort(i));
      this.headCells.push(el);
      this.head.appendChild(el);
    });

    this.spacer = document.createElement('div');
    this.spacer.className = 'table-spacer';
    this.body = document.createElement('div');
    this.body.className = 'table-body';
    this.spacer.appendChild(this.body);

    grid.append(this.head, this.spacer);
    this.viewport.appendChild(grid);
    mountEl.appendChild(this.viewport);

    this.viewport.addEventListener('scroll', () => this.renderWindow());
  }

  setRows(rows) {
    this.rows = rows;
    this.lastStart = -1;
    this.spacer.style.height = rows.length * ROW_H + 'px';
    this.viewport.scrollTop = 0;
    this.renderWindow(true);
  }

  // dir: 1 ascending, -1 descending; index null clears the indicator.
  setSortIndicator(index, dir) {
    this.headCells.forEach((el, i) => {
      el.classList.toggle('sorted-asc', i === index && dir > 0);
      el.classList.toggle('sorted-desc', i === index && dir < 0);
    });
  }

  renderWindow(force = false) {
    const start = Math.max(0, Math.floor(this.viewport.scrollTop / ROW_H) - BUFFER);
    if (!force && start === this.lastStart) return;
    this.lastStart = start;

    const visible = Math.ceil(this.viewport.clientHeight / ROW_H) + 2 * BUFFER;
    const end = Math.min(this.rows.length, start + visible);

    const frag = document.createDocumentFragment();
    for (let i = start; i < end; i++) {
      const row = this.rows[i];
      const el = document.createElement('div');
      el.className = 'table-row';
      el.style.gridTemplateColumns = this.template;
      for (const col of this.columns) {
        const spec = col.cell(row);
        const cell = document.createElement('div');
        cell.className =
          'cell' + (col.cls ? ' ' + col.cls : '') + (col.sticky ? ' col-sticky' : '') +
          (spec.className ? ' ' + spec.className : '');
        if (spec.text) cell.textContent = spec.text;
        if (spec.title) cell.title = spec.title;
        el.appendChild(cell);
      }
      frag.appendChild(el);
    }

    this.body.style.transform = `translateY(${start * ROW_H}px)`;
    this.body.replaceChildren(frag);
  }
}
