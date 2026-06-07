// Loads and describes the unified verbs dataset (site/verbs.json).
//
// verbs.json is array-of-arrays for compactness:
//   { fields: ["verb","root","cat","deriv","pattern","trans","type"], rows: [[...], ...] }

export const FIELD = { verb: 0, root: 1, cat: 2, deriv: 3, pattern: 4, trans: 5, type: 6 };

export const CAT_LABEL = { tri: 'ثلاثي', quadri: 'رباعي' };
export const DERIV_LABEL = { basic: 'مجرد', deriv: 'مزيد' };
export const TRANS_LABEL = { l: 'لازم', m: 'متعدٍّ', k: 'مشترك' };

let cache = null;

export async function loadVerbs() {
  if (cache) return cache;
  const res = await fetch('verbs.json');
  if (!res.ok) throw new Error(`HTTP ${res.status} أثناء تحميل الأفعال`);
  const data = await res.json();
  cache = data.rows;
  return cache;
}

// Distinct non-empty values of one field, preserving first-seen order.
export function distinct(rows, idx) {
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const v = r[idx];
    if (v && !seen.has(v)) { seen.add(v); out.push(v); }
  }
  return out;
}
