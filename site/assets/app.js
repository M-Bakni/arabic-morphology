// Unified verbs table: load data, build filter controls, render virtual table.

import {
  FIELD, CAT_LABEL, DERIV_LABEL, TRANS_LABEL,
  loadVerbs, distinct,
} from './data.js';
import { VirtualTable, normalizeArabic } from './render.js';

// Western-Arabic (Latin) digits with thousands separators, per project convention.
const arNum = (n) => n.toLocaleString('en-US');

const els = {
  search: document.getElementById('search'),
  cat: document.getElementById('filterCat'),
  deriv: document.getElementById('filterDeriv'),
  pattern: document.getElementById('filterPattern'),
  trans: document.getElementById('filterTrans'),
  reset: document.getElementById('resetFilters'),
  counter: document.getElementById('counter'),
  stats: document.getElementById('stats'),
  mount: document.getElementById('tableMount'),
};

let ALL = [];
let table = null;
let COLS = [];
const sort = { index: null, dir: 1 }; // dir: 1 asc, -1 desc

init();

async function init() {
  try {
    ALL = await loadVerbs();
  } catch (err) {
    els.stats.textContent = '';
    els.mount.innerHTML = `<p class="error">تعذّر تحميل الأفعال: ${err.message}</p>`;
    return;
  }

  renderStats(ALL);
  fillSelect(els.cat, Object.entries(CAT_LABEL).map(([v, l]) => [v, l]));
  fillSelect(els.deriv, Object.entries(DERIV_LABEL).map(([v, l]) => [v, l]));
  fillSelect(els.trans, Object.entries(TRANS_LABEL).map(([v, l]) => [v, l]));
  fillSelect(els.pattern, distinct(ALL, FIELD.pattern).map((p) => [p, p]));

  COLS = columns();
  table = new VirtualTable(els.mount, COLS);
  table.onSort = (i) => {
    if (sort.index === i) sort.dir *= -1;
    else { sort.index = i; sort.dir = 1; }
    table.setSortIndicator(sort.index, sort.dir);
    applyFilters();
  };

  const onChange = debounce(applyFilters, 120);
  els.search.addEventListener('input', onChange);
  // cat/deriv also re-link the الوزن options before filtering
  [els.cat, els.deriv].forEach((s) =>
    s.addEventListener('change', () => { linkPatternOptions(); applyFilters(); }));
  [els.pattern, els.trans].forEach((s) => s.addEventListener('change', applyFilters));
  els.reset.addEventListener('click', resetFilters);

  applyFilters();
}

function columns() {
  return [
    { label: 'الفعل', width: 'var(--w-verb)', cls: 'col-verb', sticky: true, sortable: true,
      sortKey: (r) => normalizeArabic(r[FIELD.verb]),
      cell: (r) => ({ text: r[FIELD.verb] }) },
    { label: 'الجذر', width: 'var(--w-root)', cls: 'col-root2', sortable: true,
      sortKey: (r) => r[FIELD.root],
      cell: (r) => ({ text: r[FIELD.root] }) },
    { label: 'ثلاثي/رباعي', width: 'var(--w-cat)', cls: 'col-cat', sortable: true,
      sortKey: (r) => CAT_LABEL[r[FIELD.cat]] || '',
      cell: (r) => ({ text: CAT_LABEL[r[FIELD.cat]] || '' }) },
    { label: 'مجرّد/مزيد', width: 'var(--w-deriv)', cls: 'col-deriv', sortable: true,
      sortKey: (r) => DERIV_LABEL[r[FIELD.deriv]] || '',
      cell: (r) => ({ text: DERIV_LABEL[r[FIELD.deriv]] || '' }) },
    { label: 'الوزن', width: 'var(--w-pattern)', cls: 'col-pattern2', sortable: true,
      sortKey: (r) => r[FIELD.pattern],
      cell: (r) => ({ text: r[FIELD.pattern] }) },
    { label: 'التعدية', width: 'var(--w-trans)', cls: 'col-trans', sortable: true,
      sortKey: (r) => TRANS_LABEL[r[FIELD.trans]] || '',
      cell: (r) => ({ text: TRANS_LABEL[r[FIELD.trans]] || '' }) },
  ];
}

function applyFilters() {
  const q = normalizeArabic(els.search.value);
  const cat = els.cat.value;
  const deriv = els.deriv.value;
  const pattern = els.pattern.value;
  const trans = els.trans.value;

  const filtered = ALL.filter((r) => {
    if (cat && r[FIELD.cat] !== cat) return false;
    if (deriv && r[FIELD.deriv] !== deriv) return false;
    if (pattern && r[FIELD.pattern] !== pattern) return false;
    if (trans && r[FIELD.trans] !== trans) return false;
    if (q &&
        !normalizeArabic(r[FIELD.verb]).includes(q) &&
        !normalizeArabic(r[FIELD.root]).includes(q)) return false;
    return true;
  });

  if (sort.index != null) {
    const key = COLS[sort.index].sortKey;
    filtered.sort((a, b) =>
      sort.dir * String(key(a)).localeCompare(String(key(b)), 'ar', { numeric: true }));
  }

  table.setRows(filtered);
  els.counter.textContent = `عرض ${arNum(filtered.length)} من ${arNum(ALL.length)}`;
}

// Disable الوزن options that don't exist for the current ثلاثي/رباعي + مجرّد/مزيد
// selection; if the chosen وزن becomes invalid, fall back to "all".
function linkPatternOptions() {
  const cat = els.cat.value;
  const deriv = els.deriv.value;
  const valid = new Set();
  for (const r of ALL) {
    if (cat && r[FIELD.cat] !== cat) continue;
    if (deriv && r[FIELD.deriv] !== deriv) continue;
    valid.add(r[FIELD.pattern]);
  }
  for (const opt of els.pattern.options) {
    if (opt.value === '') continue;
    opt.disabled = !valid.has(opt.value);
  }
  if (els.pattern.value && !valid.has(els.pattern.value)) els.pattern.value = '';
}

function resetFilters() {
  els.search.value = '';
  [els.cat, els.deriv, els.pattern, els.trans].forEach((s) => (s.value = ''));
  sort.index = null;
  table.setSortIndicator(null, 1);
  linkPatternOptions();
  applyFilters();
}

function renderStats(rows) {
  let l = 0, m = 0, k = 0;
  for (const r of rows) {
    const t = r[FIELD.trans];
    if (t === 'l') l++; else if (t === 'm') m++; else if (t === 'k') k++;
  }
  els.stats.innerHTML =
    `إجمالي الأفعال: <strong>${arNum(rows.length)}</strong> ` +
    `(لازم ${arNum(l)} · متعدٍّ ${arNum(m)} · مشترك ${arNum(k)})`;
}

function fillSelect(select, pairs) {
  for (const [value, label] of pairs) {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    select.appendChild(opt);
  }
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
