// Unified verbs table: load data, build filter controls, render virtual table.

import {
  FIELD, CAT_LABEL, DERIV_LABEL, TRANS_LABEL,
  loadVerbs, distinct,
} from './data.js';
import { VirtualTable, normalizeArabic } from './render.js';
import { downloadTableAsCSV, downloadTableAsJSON, downloadTableAsTXT } from './downloadTools.js';

// Western-Arabic (Latin) digits with thousands separators, per project convention.
const arNum = (n) => n.toLocaleString('en-US');

const list8Options = ['فعَل يفعُل', 'فعَل يفعِل', 'فعَل يفعَل', 'فعِل يفعَل', 'فعُل يفعُل', 'فعِل يفعِل', 'فعلل', 'أفعل', 'فعّل', 'فاعل', 'تفعّل', 'تفاعل', 'افتعل', 'انفعل', 'افعلّ', 'استفعل', 'افعوعل', 'افعوّل', 'افعالّ', 'تفعلل', 'افعنلل', 'افعللّ'];

const els = {
  search: document.getElementById('search'),
  cat: document.getElementById('filterCat'),
  deriv: document.getElementById('filterDeriv'),
  // pattern dropdown removed – using checkboxes in #list8
  trans: document.getElementById('filterTrans'),
  reset: document.getElementById('resetFilters'),
  counter: document.getElementById('counter'),
  stats: document.getElementById('stats'),
  mount: document.getElementById('tableMount'),
  vowelPosition: document.getElementById('Vposition'),
};

let ALL = [];
let table = null;
let COLS = [];
const sort = { index: null, dir: 1 };
let allPatterns = []; // Store all original patterns

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

  // Store all patterns from data (used when no category is selected)
  allPatterns = distinct(ALL, FIELD.pattern).map((p) => p);

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

  [els.cat, els.deriv].forEach((s) =>
    s.addEventListener('change', () => {
      updateList5();
      updateList7();
      updateList8();
      applyFilters();
      updateControlBoxBorders();
    }));

  // trans filter still uses dropdown
  els.trans.addEventListener('change', applyFilters);
  els.reset.addEventListener('click', resetFilters);

  await inlineSVG();

  if (els.vowelPosition) {
    els.vowelPosition.addEventListener('change', updateSVGLineColors);
  }

  // Initialize dynamic filters
  updateList5();
  updateList7();
  applyFilters();
  updateControlBoxBorders();
}

// Function to populate letter dropdowns
function populateLetterDropdowns() {
  const letters = ['أ','ب','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص','ض','ط','ظ','ع','غ','ف','ق','ك','ل','م','ن','ه','و','ي'];

  const letterSelects = ['letter1', 'letter2', 'letter3'];

  letterSelects.forEach(selectId => {
    const select = document.getElementById(selectId);
    if (select) {
      const currentValue = select.value;
      select.innerHTML = '<option value="">اختر حرفًا</option>';
      letters.forEach(letter => {
        const option = document.createElement('option');
        option.value = letter;
        option.textContent = letter;
        select.appendChild(option);
      });
      if (currentValue) select.value = currentValue;
    }
  });
}

// Function to populate list8 with checkboxes
function updateList8() {
  const container = document.getElementById('list8');
  if (!container) return;
  container.innerHTML = '';   // clear previous checkboxes

  const cat = els.cat?.value || '';
  const deriv = els.deriv?.value || '';
  const plusOne = document.getElementById('plusOne')?.checked || false;
  const plusTwo = document.getElementById('plusTwo')?.checked || false;
  const plusThree = document.getElementById('plusThree')?.checked || false;

  function addCheckbox(value) {
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = value;
    label.appendChild(cb);
    label.appendChild(document.createTextNode(' ' + value));
    container.appendChild(label);
    container.appendChild(document.createElement('br'));
  }

  let hasOptions = false;

  if (cat === 'tri') {
    if (deriv === 'basic') {
      for (let i = 0; i <= 5; i++) addCheckbox(list8Options[i]);
      hasOptions = true;
    }
    if (plusOne) {
      for (let i = 7; i <= 9; i++) addCheckbox(list8Options[i]);
      hasOptions = true;
    }
    if (plusTwo) {
      for (let i = 10; i <= 14; i++) addCheckbox(list8Options[i]);
      hasOptions = true;
    }
    if (plusThree) {
      for (let i = 15; i <= 18; i++) addCheckbox(list8Options[i]);
      hasOptions = true;
    }
  } else if (cat === 'quadri') {
    if (deriv === 'basic') {
      addCheckbox(list8Options[6]);
      hasOptions = true;
    }
    if (plusOne) {
      addCheckbox(list8Options[19]);
      hasOptions = true;
    }
    if (plusTwo) {
      for (let i = 20; i <= 21; i++) addCheckbox(list8Options[i]);
      hasOptions = true;
    }
  }
  // Add event listeners to new checkboxes
  container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.removeEventListener('change', applyFilters);
    cb.addEventListener('change', applyFilters);
  });

  updateControlBoxBorders();
}

// UpdateList5 function
function updateList5() {
  const cat = els.cat?.value || '';
  const list5 = document.getElementById('list5');
  const list6 = document.getElementById('list6');

  if (!list5) return;

  if (list6) list6.innerHTML = '';

  if (cat === 'tri') {
    list5.innerHTML = `
      <p>الحرف الأول <select id="letter1"></select></p>
      <p>الحرف الأوسط <select id="letter2"></select></p>
      <p>الحرف الأخير <select id="letter3"></select></p>
      <label class="switch">
        <input type="checkbox" id="vowelToggle">
        <span class="slider"></span>
      </label>
    `;
    populateLetterDropdowns();

    const vowelToggle = document.getElementById('vowelToggle');
    if (vowelToggle) {
      const newToggle = vowelToggle.cloneNode(true);
      vowelToggle.parentNode.replaceChild(newToggle, vowelToggle);
      newToggle.addEventListener('change', updateList6);
    }
    updateList6();

  } else if (cat === 'quadri') {
    list5.innerHTML = `
      <p>الحرف الأول <select id="letter1"></select></p>
      <p>الحرف الأخير <select id="letter3"></select></p>
      <label>
        <input type="checkbox" id="doubleToggle">مضاعَف؟
      </label>
    `;
    populateLetterDropdowns();

    const doubleToggle = document.getElementById('doubleToggle');
    if (doubleToggle) {
      const newDoubleToggle = doubleToggle.cloneNode(true);
      doubleToggle.parentNode.replaceChild(newDoubleToggle, doubleToggle);
      newDoubleToggle.addEventListener('change', applyFilters);
    }
    if (list6) list6.innerHTML = '';

  } else {
    list5.innerHTML = '';
    return;
  }

  attachLetterListeners();
}

// UpdateList6 function
function updateList6() {
  const vowelToggle = document.getElementById('vowelToggle');
  if (!vowelToggle) {
    const list6 = document.getElementById('list6');
    if (list6) list6.innerHTML = '';
    applyFilters();
    updateControlBoxBorders();
    return;
  }
  const isChecked = vowelToggle.checked;
  const list6 = document.getElementById('list6');
  if (!list6) return;

  if (isChecked) {
    list6.innerHTML = `
      <p>موقع حرف العلة 
        <select id="vowelPositionSelect">
          <option value="">اختر موقعًا</option>
          <option value="start">مثال (أول الجذر)</option>
          <option value="middle">أجوف (وسط الجذر)</option>
          <option value="end">ناقص (آخر الجذر)</option>
          <option value="double">لفيف (فيه حرفا علة)</option>
        </select>
      </p>
      <p id="vowelTypeContainer">
        حرف العلة  
        <select id="vowelTypeSelect">
          <option value="">اختر حرفًا</option>
          <option value="o">الواو</option>
          <option value="i">الياء</option>
        </select><br>
        <label><input type="checkbox" id="Opt40">مهموز الفاء</label><br>
        <label><input type="checkbox" id="Opt41">مهموز العين</label><br>
        <label><input type="checkbox" id="Opt42">مهموز اللام</label><br>
        <label><input type="checkbox" id="Opt43">مُضعَّف</label>
      </p>
      <div id="patternContainer" style="display: none;">
        <p>نوع اللفيف 
          <select id="vowelPatternSelect">
            <option value="">اختر نوعًا</option>
            <option value="grouped">مقرون</option>
            <option value="seperate">مفروق</option>
          </select>
        </p>
      </div>
    `;

    const vowelPosition = document.getElementById('vowelPositionSelect');
    const vowelTypeContainer = document.getElementById('vowelTypeContainer');
    const patternContainer = document.getElementById('patternContainer');

    function handlePositionChange() {
      const isDouble = vowelPosition.value === 'double';
      if (vowelTypeContainer) {
        vowelTypeContainer.style.display = isDouble ? 'none' : '';
      }
      if (patternContainer) {
        patternContainer.style.display = isDouble ? 'block' : 'none';
      }
      applyFilters();
    }

    if (vowelPosition) {
      vowelPosition.addEventListener('change', handlePositionChange);
      handlePositionChange();
    }

    const vowelType = document.getElementById('vowelTypeSelect');
    const vowelPattern = document.getElementById('vowelPatternSelect');

    if (vowelType) vowelType.addEventListener('change', applyFilters);
    if (vowelPattern) vowelPattern.addEventListener('change', applyFilters);
    updateControlBoxBorders();
  } else {
    list6.innerHTML = `
      <label><input type="checkbox" id="Opt40">مهموز الفاء</label><br>
      <label><input type="checkbox" id="Opt41">مهموز العين</label><br>
      <label><input type="checkbox" id="Opt42">مهموز اللام</label><br>
      <label><input type="checkbox" id="Opt43">مُضعَّف</label>
    `;
    updateControlBoxBorders();
    
  }

  const opt40 = document.getElementById('Opt40');
  const opt41 = document.getElementById('Opt41');
  const opt42 = document.getElementById('Opt42');
  const opt43 = document.getElementById('Opt43');
  
  if (opt40) opt40.addEventListener('change', applyFilters);
  if (opt41) opt41.addEventListener('change', applyFilters);
  if (opt42) opt42.addEventListener('change', applyFilters);
  if (opt43) opt43.addEventListener('change', applyFilters);

  applyFilters();
}

// Update list7 
function updateList7() {
  const deriv = els.deriv?.value;
  const cat = els.cat?.value;
  const list7 = document.getElementById("list7");

  if (!list7) return;

  let html = '';

  if (deriv === "deriv") {
    html = `
      <p>
        <input type="checkbox" id="plusOne">بحرف
      </p>
      <p>
        <input type="checkbox" id="plusTwo">بحرفين
      </p>
    `;

    if (cat === "tri") {
      html += `
        <p>
          <input type="checkbox" id="plusThree">بثلاثة أحرف
        </p>
      `;
    }
  }

  list7.innerHTML = html;

  const plusOne = document.getElementById('plusOne');
  const plusTwo = document.getElementById('plusTwo');
  const plusThree = document.getElementById('plusThree');

  if (plusOne) plusOne.addEventListener('change', () => { updateList8(); applyFilters(); });
  if (plusTwo) plusTwo.addEventListener('change', () => { updateList8(); applyFilters(); });
  if (plusThree) plusThree.addEventListener('change', () => { updateList8(); applyFilters(); });
}

// Attach letter listeners
function attachLetterListeners() {
  const letterSelects = ['letter1', 'letter2', 'letter3'];
  letterSelects.forEach(selectId => {
    const select = document.getElementById(selectId);
    if (select) {
      select.removeEventListener('change', applyFilters);
      select.addEventListener('change', applyFilters);
    }
  });
}

//Hides the boxes if empty
function updateControlBoxBorders() {
  ['list5', 'list6', 'list7', 'list8'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const isEmpty = el.children.length === 0 && el.innerText.trim() === '';
      el.style.border = isEmpty ? 'none' : '';
    }
  });
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
  const trans = els.trans.value;

  const selectedPatterns = Array.from(document.querySelectorAll('#list8 input[type="checkbox"]:checked'))
                                 .map(cb => cb.value);

  const letter1 = document.getElementById('letter1')?.value || '';
  const letter2 = document.getElementById('letter2')?.value || '';
  const letter3 = document.getElementById('letter3')?.value || '';

  const vowelToggle = document.getElementById('vowelToggle');
  const showVowelOnly = vowelToggle ? vowelToggle.checked : false;

  const doubleToggle = document.getElementById('doubleToggle');
  const doubleChecked = doubleToggle ? doubleToggle.checked : false;

  const vowelPosition = document.getElementById('vowelPositionSelect')?.value || '';
  const vowelType = document.getElementById('vowelTypeSelect')?.value || '';
  const vowelPattern = document.getElementById('vowelPatternSelect')?.value || '';

  const opt40 = document.getElementById('Opt40')?.checked || false;
  const opt41 = document.getElementById('Opt41')?.checked || false;
  const opt42 = document.getElementById('Opt42')?.checked || false;
  const opt43 = document.getElementById('Opt43')?.checked || false;

  const filtered = ALL.filter((r) => {
    if (cat && r[FIELD.cat] !== cat) return false;
    if (deriv && r[FIELD.deriv] !== deriv) return false;
    if (trans && r[FIELD.trans] !== trans) return false;
    if (q && !normalizeArabic(r[FIELD.verb]).includes(q) && !normalizeArabic(r[FIELD.root]).includes(q)) return false;
    if (selectedPatterns.length > 0 && !selectedPatterns.includes(String(r[FIELD.pattern]))) return false;

    const root = r[FIELD.root];
    const rootLength = root.length;

    if (cat === 'tri' && rootLength === 3) {
      if (letter1 && root[0] !== letter1) return false;
      if (letter2 && root[1] !== letter2) return false;
      if (letter3 && root[2] !== letter3) return false;
    }

    if (cat === 'quadri' && rootLength === 4) {
      if (letter1 && root[0] !== letter1) return false;
      if (letter3 && root[3] !== letter3) return false;
      if (doubleChecked) {
        const firstHalf = root.substring(0, 2);
        const secondHalf = root.substring(2, 4);
        if (firstHalf !== secondHalf) return false;
      }
    }

    // Vowel filter (only for trilateral)
    if (cat === 'tri' && showVowelOnly) {
      const isVowel = (ch) => /[وي]/.test(ch);
      const matchesType = (ch) => {
        if (!vowelType) return isVowel(ch);
        if (vowelType === 'o') return ch === 'و';
        if (vowelType === 'i') return ch === 'ي';
        return false;
      };

      function isOnlyVowelAt(pos) {
        const vowelPositions = [0, 1, 2].filter(i => isVowel(root[i]));
        if (vowelPositions.length !== 1) return false;
        return vowelPositions[0] === pos && matchesType(root[pos]);
      }

      if (vowelPosition === 'start') {
        if (!isOnlyVowelAt(0)) return false;
      }
      else if (vowelPosition === 'middle') {
        if (!isOnlyVowelAt(1)) return false;
      }
      else if (vowelPosition === 'end') {
        if (!isOnlyVowelAt(2)) return false;
      }
      else if (vowelPosition === 'double') {
        const vowelCount = [root[0], root[1], root[2]].filter(isVowel).length;
        if (vowelCount < 2) return false;
        const middleIsVowel = isVowel(root[1]);
        if (vowelPattern === 'grouped') {
          if (!middleIsVowel) return false;
        } else if (vowelPattern === 'seperate') {
          if (middleIsVowel) return false;
        }
      }
      else {
        if (!/[وي]/.test(root)) return false;
      }
    }

    if (rootLength >= 3) {
      if (opt40 && root[0] !== 'أ') return false;
      if (opt41 && root[1] !== 'أ') return false;
      if (opt42 && root[2] !== 'أ') return false;
      if (opt43 && root[1] !== root[2]) return false;
    }

    return true;
  });

  if (sort.index != null) {
    const key = COLS[sort.index].sortKey;
    filtered.sort((a, b) => sort.dir * String(key(a)).localeCompare(String(key(b)), 'ar', { numeric: true }));
  }

  table.setRows(filtered);
  els.counter.textContent = `عرض ${arNum(filtered.length)} من ${arNum(ALL.length)}`;
}

function resetFilters() {
  els.search.value = '';
  [els.cat, els.deriv, els.trans].forEach((s) => (s.value = ''));

  // Reset plus checkboxes
  const plusOne = document.getElementById('plusOne');
  const plusTwo = document.getElementById('plusTwo');
  const plusThree = document.getElementById('plusThree');
  if (plusOne) plusOne.checked = false;
  if (plusTwo) plusTwo.checked = false;
  if (plusThree) plusThree.checked = false;

  // Reset letter selects
  const letterSelects = ['letter1', 'letter2', 'letter3', 'letter4'];
  letterSelects.forEach(selectId => {
    const select = document.getElementById(selectId);
    if (select) select.value = '';
  });

  // Reset vowel and double toggles
  const vowelToggle = document.getElementById('vowelToggle');
  if (vowelToggle) vowelToggle.checked = false;
  const doubleToggle = document.getElementById('doubleToggle');
  if (doubleToggle) doubleToggle.checked = false;

  // Clear list6
  const list6 = document.getElementById('list6');
  if (list6) list6.innerHTML = '';

  // Rebuild pattern checkboxes
  updateList8();

  // Uncheck any pattern checkboxes
  const list8 = document.getElementById('list8');
  if (list8) {
    list8.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
  }

  sort.index = null;
  table.setSortIndicator(null, 1);
  updateList5();
  updateList7();
  applyFilters();
}

function renderStats(rows) {
  let l = 0, m = 0, k = 0;
  for (const r of rows) {
    const t = r[FIELD.trans];
    if (t === 'l') l++;
    else if (t === 'm') m++;
    else if (t === 'k') k++;
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

// Download modal functionality
const modal = document.getElementById('downloadModal');
const downloadBtn = document.getElementById('download');

if (downloadBtn) {
  downloadBtn.addEventListener('click', function(e) {
    e.preventDefault();
    if (modal) modal.style.display = 'flex';
  });
}

const closeModal = document.querySelector('.close-modal');
if (closeModal) {
  closeModal.addEventListener('click', function() {
    if (modal) modal.style.display = 'none';
  });
}

window.addEventListener('click', function(e) {
  if (modal && e.target === modal) {
    modal.style.display = 'none';
  }
});

document.querySelectorAll('.modal-option').forEach(button => {
  button.addEventListener('click', function() {
    const format = this.getAttribute('data-format');
    if (modal) modal.style.display = 'none';
    switch(format) {
      case 'csv': downloadTableAsCSV(); break;
      case 'json': downloadTableAsJSON(); break;
      case 'txt': downloadTableAsTXT(); break;
    }
  });
});










// SVG functions
async function inlineSVG() {
  try {
    const response = await fetch('Cir 2.svg');
    const svgText = await response.text();
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
    const svg = svgDoc.documentElement;

    const imageContainer = document.querySelector('.image-container');
    if (imageContainer) {
      const imgTag = imageContainer.querySelector('img[src="Cir 2.svg"]');
      if (imgTag) {
        const originalWidth = imgTag.getAttribute('width');
        const originalHeight = imgTag.getAttribute('height');
        if (originalWidth) svg.setAttribute('width', originalWidth);
        if (originalHeight) svg.setAttribute('height', originalHeight);
        imgTag.replaceWith(svg);
      } else {
        imageContainer.appendChild(svg);
      }
    }
    return svg;
  } catch (error) {
    console.error('Error loading SVG:', error);
    return null;
  }
}

function updateSVGLineColors() {
  const path4488 = document.getElementById('path4488');
  const path4486 = document.getElementById('path4486');
  if (els.vowelPosition && els.vowelPosition.value === 'middle') {
    if (path4488) path4488.style.stroke = '#ffff00';
    if (path4486) path4486.style.stroke = '#ffff00';
  } else {
    if (path4488) path4488.style.stroke = '#000000';
    if (path4486) path4486.style.stroke = '#000000';
  }
}
