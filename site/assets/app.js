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

let circle1 = null;
let circle2 = null;

const els = {
  search: document.getElementById('search'),
  cat: document.getElementById('filterCat'),
  deriv: document.getElementById('filterDeriv'),
  trans: document.getElementById('filterTrans'),
  reset: document.getElementById('resetFilters'),
  counter: document.getElementById('counter'),
  stats: document.getElementById('stats'),
  mount: document.getElementById('tableMount'),
  vowelPosition: document.getElementById('Vposition'),
};

const derivContainer = document.getElementById('derivContainer') || els.deriv?.parentElement;

let ALL = [];
let table = null;
let COLS = [];
const sort = { index: null, dir: 1 };
let allPatterns = [];

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

  // Show/hide deriv dropdown based on category selection
  function toggleDerivVisibility() {
    const cat = els.cat.value;
    if (derivContainer) {
      derivContainer.style.display = cat ? '' : 'none';
    } else {
      // Fallback: hide the select itself (label will remain)
      els.deriv.style.display = cat ? '' : 'none';
    }
  }

  els.cat.addEventListener('change', () => {
    if (!els.cat.value) {
      resetFilters();
    } else {
      updateList5();  
      updateList7();
      updateList8();
      applyFilters();
    }
    toggleDerivVisibility();
    updateControlBoxBorders();
  });

  els.deriv.addEventListener('change', () => {
    updateList7();
    updateList8();
    applyFilters();
    updateControlBoxBorders();
  });

  els.trans.addEventListener('change', applyFilters);
  els.reset.addEventListener('click', resetFilters);

  circle1 = await loadCircle1SVG();
  circle2 = await loadCircle2SVG();

  if (els.vowelPosition) {
    els.vowelPosition.addEventListener('change', updateSVGLineColors);
  }

  // Initial visibility
  toggleDerivVisibility();

  // Initial build
  updateList5();
  updateList7();
  applyFilters();
  updateControlBoxBorders();
}

// ----- Helper: populate letter dropdowns -----
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

// ----- Update list8 (pattern checkboxes) -----
function updateList8() {
  const container = document.getElementById('list8');
  if (!container) return;
  container.innerHTML = '';

  const cat = els.cat?.value || '';
  const deriv = els.deriv?.value || '';
  const plusOne = document.getElementById('plusOne')?.checked || false;
  const plusTwo = document.getElementById('plusTwo')?.checked || false;
  const plusThree = document.getElementById('plusThree')?.checked || false;

  function addCheckbox(value, index) {
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = value;
    cb.id = `pat${index}`;
    cb.checked = true;          // default checked
    label.appendChild(cb);
    label.appendChild(document.createTextNode(' ' + value));
    container.appendChild(label);
  }

  let hasOptions = false;

  if (cat === 'tri') {
    if (deriv === 'basic') {
      for (let i = 0; i <= 5; i++) addCheckbox(list8Options[i], i);
      hasOptions = true;
    }
    if (plusOne) {
      for (let i = 7; i <= 9; i++) addCheckbox(list8Options[i], i);
      hasOptions = true;
    }
    if (plusTwo) {
      for (let i = 10; i <= 14; i++) addCheckbox(list8Options[i], i);
      hasOptions = true;
    }
    if (plusThree) {
      for (let i = 15; i <= 18; i++) addCheckbox(list8Options[i], i);
      hasOptions = true;
    }
  } else if (cat === 'quadri') {
    if (deriv === 'basic') {
      hasOptions = true;
    }
    if (plusOne) {
      addCheckbox(list8Options[19], 19);
      hasOptions = true;
    }
    if (plusTwo) {
      for (let i = 20; i <= 21; i++) addCheckbox(list8Options[i], i);
      hasOptions = true;
    }
  }

  // Attach event listeners
  container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.removeEventListener('change', applyFilters);
    cb.addEventListener('change', applyFilters);
  });

  updateControlBoxBorders();
}

// ----- Update list5 (root letters and vowel toggle) -----
function updateList5() {
  const cat = els.cat?.value || '';
  const list5 = document.getElementById('list5');
  const list6 = document.getElementById('list6');
  if (!list5) return;

  // Clear list6 for a fresh start
  if (list6) list6.innerHTML = '';

  if (cat === 'tri') {
    list5.innerHTML = `
      <section id="list1">
        <p>الحرف الأول <select id="letter1"></select></p>
        <p>الحرف الأوسط <select id="letter2"></select></p>
        <p>الحرف الأخير <select id="letter3"></select></p>
      </section>
      <section id="list2">
        <label class="switch">
          <input type="checkbox" id="vowelToggle">
          <span class="slider"></span>
        </label>
      </section>
    `;
    populateLetterDropdowns();

    // Attach listener to vowel toggle
    const vowelToggle = document.getElementById('vowelToggle');
    if (vowelToggle) {
      vowelToggle.removeEventListener('change', updateList6);
      vowelToggle.addEventListener('change', updateList6);
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
      doubleToggle.removeEventListener('change', applyFilters);
      doubleToggle.addEventListener('change', applyFilters);
    }

    // For quadri, list6 is empty
    if (list6) list6.innerHTML = '';

  } else {
    list5.innerHTML = '';
    if (list6) list6.innerHTML = '';
    return;
  }

  attachLetterListeners();
}

// ----- Update list6 (vowel‑related controls) -----
function updateList6() {
  const vowelToggle = document.getElementById('vowelToggle');
  const list6 = document.getElementById('list6');
  if (!list6) return;

  // ---------- Vowel toggle OFF ----------
  if (!vowelToggle || !vowelToggle.checked) {
    list6.innerHTML = `
      <div id="noVowelControls">
        <p>
          <select id="NVType">
            <option value="">اختر نوع الفعل الصحيح</option>
            <option value="opt3">سالم</option>
            <option value="opt1">مهموز</option>
            <option value="opt2">مُضعَّف</option>
          </select>
        </p>
        <div id="hamzaSubOptions" style="display:none;">
          <div><label><input type="radio" name="hamzaSub" value="" checked> الكل</label></div>
          <div><label><input type="radio" name="hamzaSub" value="sub1">مهموز الفاء واللام</label></div>
          <div><label><input type="radio" name="hamzaSub" value="sub2">مهموز الفاء</label></div>
          <div><label><input type="radio" name="hamzaSub" value="sub3">مهموز الفاء مُضعَّف</label></div>
          <div><label><input type="radio" name="hamzaSub" value="sub4">مهموز العين</label></div>
          <div><label><input type="radio" name="hamzaSub" value="sub5">مهموز اللام</label></div>
        </div>
      </div>
    `;

    const nvSelect = document.getElementById('NVType');
    const subOptions = document.getElementById('hamzaSubOptions');

    if (nvSelect) {
      nvSelect.removeEventListener('change', handleNVTypeChange);
      nvSelect.addEventListener('change', handleNVTypeChange);
      // Initial visibility
      if (nvSelect.value === 'opt1') {
        subOptions.style.display = '';
      } else {
        subOptions.style.display = 'none';
      }
    }

    if (subOptions) {
      subOptions.removeEventListener('change', handleSubChange);
      subOptions.addEventListener('change', handleSubChange);
    }

    function handleNVTypeChange() {
      if (this.value === 'opt1') {
        subOptions.style.display = '';
      } else {
        subOptions.style.display = 'none';
        const noneRadio = document.querySelector('input[name="hamzaSub"][value=""]');
        if (noneRadio) noneRadio.checked = true;
      }
      applyFilters();
    }

    function handleSubChange(e) {
      if (e.target.matches('input[name="hamzaSub"]')) {
        applyFilters();
      }
    }

    applyFilters();
    updateControlBoxBorders();
    return;
  }

  // ---------- Vowel toggle ON ----------
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
    <div id="vowelTypeContainer" style="display:none;">
      <p>
        حرف العلة  
        <select id="vowelTypeSelect">
          <option value="">اختر حرفًا</option>
          <option value="o">الواو</option>
          <option value="i">الياء</option>
        </select>
      </p>
      <div id="hamzahDoubleGroup" style="display:none;">
        <div><label><input type="radio" name="hamzahDouble" value="" checked>الكل</label></div>
        <div id="wrapOpt40"><label><input type="radio" name="hamzahDouble" value="opt40"> مهموز الفاء</label></div>
        <div id="wrapOpt41"><label><input type="radio" name="hamzahDouble" value="opt41"> مهموز العين</label></div>
        <div id="wrapOpt42"><label><input type="radio" name="hamzahDouble" value="opt42"> مهموز اللام</label></div>
        <div id="wrapOpt43"><label><input type="radio" name="hamzahDouble" value="opt43"> مُضعَّف</label></div>
      </div>
    </div>
    <div id="patternContainer" style="display: none;">
      <p>نوع اللفيف 
        <select id="vowelPatternSelect">
          <option value="">اختر نوعًا</option>
          <option value="grouped">مقرون</option>
          <option value="seperate">مفروق</option>
        </select>
      </p>
      <div id="hamzahDoubleGroupPattern" style="display:none;">
        <div><label><input type="radio" name="hamzahDouble" value="" checked>الكل</label></div>
        <div id="wrapOpt40p"><label><input type="radio" name="hamzahDouble" value="opt40"> مهموز الفاء</label></div>
        <div id="wrapOpt41p"><label><input type="radio" name="hamzahDouble" value="opt41"> مهموز العين</label></div>
      </div>
    </div>
  `;

  // ----- Grab elements -----
  const vowelPosition = document.getElementById('vowelPositionSelect');
  const vowelTypeContainer = document.getElementById('vowelTypeContainer');
  const patternContainer = document.getElementById('patternContainer');
  const vowelType = document.getElementById('vowelTypeSelect');
  const vowelPattern = document.getElementById('vowelPatternSelect');

  // Helper: update visibility of radio wrappers in vowel‑type group
  function updateVowelRadioVisibility() {
    const pos = vowelPosition ? vowelPosition.value : '';
    const typeVal = vowelType ? vowelType.value : '';
    const group = document.getElementById('hamzahDoubleGroup');
    if (!group) return;

    if (pos && pos !== 'double' && typeVal) {
      group.style.display = '';
      const w40 = document.getElementById('wrapOpt40');
      const w41 = document.getElementById('wrapOpt41');
      const w42 = document.getElementById('wrapOpt42');
      const w43 = document.getElementById('wrapOpt43');
      [w40, w41, w42, w43].forEach(el => { if (el) el.style.display = 'none'; });
      if (pos === 'start') {
        if (w41) w41.style.display = '';
        if (w42) w42.style.display = (typeVal === 'o') ? '' : 'none';
        if (w43) w43.style.display = '';
      } else if (pos === 'middle') {
        if (w40) w40.style.display = '';
        if (w42) w42.style.display = '';
      } else if (pos === 'end') {
        if (w40) w40.style.display = '';
        if (w41) w41.style.display = '';
      }
      const checkedRadio = document.querySelector('input[name="hamzahDouble"]:checked');
      if (checkedRadio) {
        const wrapper = checkedRadio.closest('div[id^="wrapOpt"]');
        if (wrapper && wrapper.style.display === 'none') {
          const noneRadio = document.querySelector('input[name="hamzahDouble"][value=""]');
          if (noneRadio) noneRadio.checked = true;
        }
      }
    } else {
      group.style.display = 'none';
      const noneRadio = document.querySelector('input[name="hamzahDouble"][value=""]');
      if (noneRadio) noneRadio.checked = true;
    }
  }

  function updatePatternRadioVisibility() {
    const pos = vowelPosition ? vowelPosition.value : '';
    const patVal = vowelPattern ? vowelPattern.value : '';
    const group = document.getElementById('hamzahDoubleGroupPattern');
    if (!group) return;

    if (pos === 'double' && patVal) {
      group.style.display = '';
      const w40p = document.getElementById('wrapOpt40p');
      const w41p = document.getElementById('wrapOpt41p');
      if (w40p) w40p.style.display = 'none';
      if (w41p) w41p.style.display = 'none';
      if (patVal === 'grouped' && w40p) w40p.style.display = '';
      else if (patVal === 'seperate' && w41p) w41p.style.display = '';
      const checkedRadio = document.querySelector('input[name="hamzahDouble"]:checked');
      if (checkedRadio) {
        const wrapper = checkedRadio.closest('div[id^="wrapOpt"]');
        if (wrapper && wrapper.style.display === 'none') {
          const noneRadio = document.querySelector('input[name="hamzahDouble"][value=""]');
          if (noneRadio) noneRadio.checked = true;
        }
      }
    } else {
      group.style.display = 'none';
      const noneRadio = document.querySelector('input[name="hamzahDouble"][value=""]');
      if (noneRadio) noneRadio.checked = true;
    }
  }

  function handlePositionChange() {
    const val = vowelPosition ? vowelPosition.value : '';
    if (vowelTypeContainer) {
      vowelTypeContainer.style.display = (val && val !== 'double') ? '' : 'none';
    }
    if (patternContainer) {
      patternContainer.style.display = (val === 'double') ? 'block' : 'none';
    }
    updateVowelRadioVisibility();
    updatePatternRadioVisibility();
    applyFilters();
  }

  function onVowelTypeChange() {
    updateVowelRadioVisibility();
    applyFilters();
  }

  function onPatternChange() {
    updatePatternRadioVisibility();
    applyFilters();
  }

  if (vowelPosition) {
    vowelPosition.removeEventListener('change', handlePositionChange);
    vowelPosition.addEventListener('change', handlePositionChange);
    handlePositionChange();
  }
  if (vowelType) {
    vowelType.removeEventListener('change', onVowelTypeChange);
    vowelType.addEventListener('change', onVowelTypeChange);
  }
  if (vowelPattern) {
    vowelPattern.removeEventListener('change', onPatternChange);
    vowelPattern.addEventListener('change', onPatternChange);
  }

  list6.querySelectorAll('input[name="hamzahDouble"]').forEach(radio => {
    radio.removeEventListener('change', applyFilters);
    radio.addEventListener('change', applyFilters);
  });

  updateControlBoxBorders();
}

// ----- Update list7 -----
function updateList7() {
  const deriv = els.deriv?.value;
  const cat = els.cat?.value;
  const list7 = document.getElementById("list7");
  if (!list7) return;

  let html = '';
  if (deriv === "deriv") {
    html = `
      <p><input type="checkbox" id="plusOne" checked>بحرف</p>
      <p><input type="checkbox" id="plusTwo" checked>بحرفين</p>
    `;
    if (cat === "tri") {
      html += `<p><input type="checkbox" id="plusThree" checked>بثلاثة أحرف</p>`;
    }
  }
  list7.innerHTML = html;

  const plusOne = document.getElementById('plusOne');
  const plusTwo = document.getElementById('plusTwo');
  const plusThree = document.getElementById('plusThree');

  if (plusOne) {
    plusOne.removeEventListener('change', handlePlusChange);
    plusOne.addEventListener('change', handlePlusChange);
  }
  if (plusTwo) {
    plusTwo.removeEventListener('change', handlePlusChange);
    plusTwo.addEventListener('change', handlePlusChange);
  }
  if (plusThree) {
    plusThree.removeEventListener('change', handlePlusChange);
    plusThree.addEventListener('change', handlePlusChange);
  }

  function handlePlusChange() {
    updateList8();
    applyFilters();
  }
}

// ----- Attach letter listeners -----
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

// ----- Hide empty boxes -----
function updateControlBoxBorders() {
  ['list5', 'list6', 'list7', 'list8'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const isEmpty = el.children.length === 0 && el.innerText.trim() === '';
      el.style.border = isEmpty ? 'none' : '';
    }
  });
}

// ----- Columns definition -----
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

// ----- Main filter function -----
function applyFilters() {
  SVGFilters();

  const q = normalizeArabic(els.search.value);
  const cat = els.cat.value;
  const deriv = els.deriv.value;
  const trans = els.trans.value;

  const vowelToggle = document.getElementById('vowelToggle');
  const showVowelOnly = vowelToggle ? vowelToggle.checked : false;

  const hamzahRadio = document.querySelector('input[name="hamzahDouble"]:checked');
  const hamzahVal = hamzahRadio ? hamzahRadio.value : '';

  let nvTypeVal = '';
  let hamzaSubVal = '';
  if (!showVowelOnly) {
    const nvSelect = document.getElementById('NVType');
    nvTypeVal = nvSelect ? nvSelect.value : '';
    const subRadio = document.querySelector('input[name="hamzaSub"]:checked');
    hamzaSubVal = subRadio ? subRadio.value : '';
  }

  const selectedPatterns = Array.from(document.querySelectorAll('#list8 input[type="checkbox"]:checked'))
                                 .map(cb => cb.value);

  const letter1 = document.getElementById('letter1')?.value || '';
  const letter2 = document.getElementById('letter2')?.value || '';
  const letter3 = document.getElementById('letter3')?.value || '';

  const doubleToggle = document.getElementById('doubleToggle');
  const doubleChecked = doubleToggle ? doubleToggle.checked : false;

  const vowelPosition = document.getElementById('vowelPositionSelect')?.value || '';
  const vowelType = document.getElementById('vowelTypeSelect')?.value || '';
  const vowelPattern = document.getElementById('vowelPatternSelect')?.value || '';

  const filtered = ALL.filter((r) => {
    // ----- Common filters -----
    if (cat && r[FIELD.cat] !== cat) return false;
    if (deriv && r[FIELD.deriv] !== deriv) return false;
    if (trans && r[FIELD.trans] !== trans) return false;
    if (q && !normalizeArabic(r[FIELD.verb]).includes(q) && !normalizeArabic(r[FIELD.root]).includes(q)) return false;
    if (selectedPatterns.length > 0 && !(selectedPatterns.includes(String(r[FIELD.pattern])) &&  (cat == "quadri" || (cat === "tri" && (showVowelOnly === (r[FIELD.root].includes("و") ||  r[FIELD.root].includes("ي"))))))) return false;

  const root = r[FIELD.root];
  const rootLength = root.length;

    // ----- Letter filters  -----
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

    // ========== VOWEL LOGIC ==========
    if (cat === 'tri' && showVowelOnly) {
      // ----- Helper functions -----
      const isVowel = (ch) => /[وي]/.test(ch);
      const matchesType = (ch) => {
        if (!vowelType) return isVowel(ch);
        if (vowelType === 'o') return ch === 'و';
        if (vowelType === 'i') return ch === 'ي';
        return false;
      };

      const isVowelAt = (pos) => matchesType(root[pos]);

      const isNotVowelAt = (pos) => !isVowel(root[pos]);

      // ----- Position‑based filtering-----
      if (vowelPosition === 'start') {
        if (!isVowelAt(0) || !isNotVowelAt(1) || !isNotVowelAt(2)) return false;
      } else if (vowelPosition === 'middle') {
        if (!isNotVowelAt(0) || !isVowelAt(1) || !isNotVowelAt(2)) return false;
      } else if (vowelPosition === 'end') {
        if (!isNotVowelAt(0) || !isNotVowelAt(1) || !isVowelAt(2)) return false;
      } else if (vowelPosition === 'double') {
        // At least two vowels are required
        const vowelCount = [0, 1, 2].filter(i => isVowelAt(i)).length;
        if (vowelCount < 2) return false;
        if (vowelPattern === 'grouped' && !isVowelAt(1)) return false;
        if (vowelPattern === 'seperate' && !isNotVowelAt(1)) return false;
      } else {
        // Any vowel position – at least one vowel anywhere
        if (![0, 1, 2].some(i => isVowelAt(i))) return false;
      }

      // ----- Hamzah / doubled sub‑filters -----
      if (hamzahVal === 'opt40' && root[0] !== 'أ') return false;
      if (hamzahVal === 'opt41' && root[1] !== 'أ') return false;
      if (hamzahVal === 'opt42' && root[2] !== 'أ') return false;
      if (hamzahVal === 'opt43' && root[1] !== root[2]) return false;
    }

    // ========== NO‑VOWEL LOGIC ==========
    if (cat === 'tri' && !showVowelOnly && rootLength === 3) {
      const r0 = root[0], r1 = root[1], r2 = root[2];
      if (nvTypeVal === 'opt1') {
        if (!root.includes('أ')) return false;
      } else if (nvTypeVal === 'opt2') {
        if (root.includes('أ') || r1 !== r2) return false;
      } else if (nvTypeVal === 'opt3') {
        if (root.includes('أ') || r1 === r2) return false;
      }

      if (nvTypeVal === 'opt1' && hamzaSubVal) {
        switch (hamzaSubVal) {
          case 'sub1': if (!(r0 === 'أ' && r2 === 'أ')) return false; break;
          case 'sub2': if (r0 !== 'أ' || r1 === 'أ' || r2 === 'أ') return false; break;
          case 'sub3': if (!(r0 === 'أ' && r1 === r2)) return false; break;
          case 'sub4': if (r0 === 'أ' || r1 !== 'أ'|| r2 === 'أ') return false; break;
          case 'sub5': if (r0 === 'أ' || r1 === 'أ' ||r2 !== 'أ') return false; break;
        }
      }
    }

    return true;
  });

  // ----- Sorting and rendering -----
  if (sort.index != null) {
    const key = COLS[sort.index].sortKey;
    filtered.sort((a, b) => sort.dir * String(key(a)).localeCompare(String(key(b)), 'ar', { numeric: true }));
  }

  table.setRows(filtered);
  els.counter.textContent = `عرض ${arNum(filtered.length)} من ${arNum(ALL.length)}`;
}

// ----- Reset filters -----
function resetFilters() {
  els.search.value = '';
  [els.cat, els.deriv, els.trans].forEach((s) => (s.value = ''));

  const plusOne = document.getElementById('plusOne');
  const plusTwo = document.getElementById('plusTwo');
  const plusThree = document.getElementById('plusThree');
  if (plusOne) plusOne.checked = false;
  if (plusTwo) plusTwo.checked = false;
  if (plusThree) plusThree.checked = false;

  const letterSelects = ['letter1', 'letter2', 'letter3', 'letter4'];
  letterSelects.forEach(id => {
    const select = document.getElementById(id);
    if (select) select.value = '';
  });

  const vowelToggle = document.getElementById('vowelToggle');
  if (vowelToggle) vowelToggle.checked = false;
  const doubleToggle = document.getElementById('doubleToggle');
  if (doubleToggle) doubleToggle.checked = false;

  const nvSelect = document.getElementById('NVType');
  if (nvSelect) nvSelect.value = '';
  const subOptions = document.getElementById('hamzaSubOptions');
  if (subOptions) subOptions.style.display = 'none';
  const noneSub = document.querySelector('input[name="hamzaSub"][value=""]');
  if (noneSub) noneSub.checked = true;

  const defaultRadio = document.querySelector('input[name="hamzahDouble"][value=""]');
  if (defaultRadio) defaultRadio.checked = true;

  const list6 = document.getElementById('list6');
  if (list6) list6.innerHTML = '';

  updateList8();

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

// ----- Stats -----
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

// ----- Download modal -----
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

// ----- SVG functions -----
async function loadCircle1SVG() {
  try {
    const response = await fetch('Circle 1.svg');
    const svgText = await response.text();
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
    const svg = svgDoc.documentElement;
    const imageContainer = document.querySelector('.image-container');
    if (imageContainer) {
      const imgTag = imageContainer.querySelector('img[src="Circle 1.svg"]');
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
    console.error('Error loading Circle 1.svg:', error);
    return null;
  }
}

async function loadCircle2SVG() {
  try {
    const response = await fetch('Circle 2.svg');
    const svgText = await response.text();
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
    const svg = svgDoc.documentElement;
    const imageContainer = document.querySelector('.image-container');
    if (imageContainer) {
      const imgTag = imageContainer.querySelector('img[src="Circle 2.svg"]');
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
    console.error('Error loading Circle 2.svg:', error);
    return null;
  }
}

function setOpacityByID(svg, id) {
  if (!svg) return;
  const element = svg.getElementById(id);
  if (!element) {
    console.warn(`No element found with id="${id}"`);
    return;
  }
  element.style.opacity = 1;
}

function resetGroupOpacity(svg, groupId) {
  if (!svg) return;
  const group = svg.getElementById(groupId);
  if (!group) return;
  const children = group.children;
  for (let i = 0; i < children.length; i++) {
    children[i].style.opacity = 0;
  }
}

// ----- SVG filter (uses the same values as applyFilters) -----
function SVGFilters() {
  resetGroupOpacity(circle1, "Highlight");
  resetGroupOpacity(circle2, "Highlight");

  const cat = els.cat.value;
  const deriv = els.deriv.value;
  const vowelToggle = document.getElementById('vowelToggle');
  const showVowelOnly = vowelToggle ? vowelToggle.checked : false;
  const plusOne = document.getElementById('plusOne')?.checked || false;
  const plusTwo = document.getElementById('plusTwo')?.checked || false;
  const plusThree = document.getElementById('plusThree')?.checked || false;

  const hamzahRadio = document.querySelector('input[name="hamzahDouble"]:checked');
  const hamzahVal = hamzahRadio ? hamzahRadio.value : '';

  let nvTypeVal = '';
  let hamzaSubVal = '';
  if (!showVowelOnly) {
    const nvSelect = document.getElementById('NVType');
    nvTypeVal = nvSelect ? nvSelect.value : '';
    const subRadio = document.querySelector('input[name="hamzaSub"]:checked');
    hamzaSubVal = subRadio ? subRadio.value : '';
  }

  const vowelPosition = document.getElementById('vowelPositionSelect')?.value || '';
  const vowelType = document.getElementById('vowelTypeSelect')?.value || '';
  const vowelPattern = document.getElementById('vowelPatternSelect')?.value || '';
  const patternStates = {};

  document.querySelectorAll('#list8 input[type="checkbox"]').forEach(cb => {
    patternStates[cb.id] = cb.checked;
  });

  if (cat === "tri") {
    if (showVowelOnly) {
      setOpacityByID(circle2, "Vowel");
      setOpacityByID(circle2, "Vtext0");
      if (vowelPosition === 'start') {
        setOpacityByID(circle2, "V1");
        setOpacityByID(circle2, "Vtext1");
        if (vowelType === 'o') {
          setOpacityByID(circle2, "V1-1");
          if (hamzahVal === 'opt42') setOpacityByID(circle2, "V1-1-1");
          else if (hamzahVal === 'opt43') setOpacityByID(circle2, "V1-1-2");
          else if (hamzahVal === 'opt41') setOpacityByID(circle2, "V1-1-3");
        } else if (vowelType === 'i') {
          setOpacityByID(circle2, "V1-2");
          if (hamzahVal === 'opt43') setOpacityByID(circle2, "V1-2-1");
          else if (hamzahVal === 'opt41') setOpacityByID(circle2, "V1-2-2");
        }
      } else if (vowelPosition === 'middle') {
        setOpacityByID(circle2, "V2");
        setOpacityByID(circle2, "Vtext2");
        if (vowelType === 'o') {
          setOpacityByID(circle2, "V2-1");
          if (hamzahVal === 'opt42') setOpacityByID(circle2, "V2-1-1");
          else if (hamzahVal === 'opt40') setOpacityByID(circle2, "V2-1-2");
        } else if (vowelType === 'i') {
          setOpacityByID(circle2, "V2-2");
          if (hamzahVal === 'opt42') setOpacityByID(circle2, "V2-2-2");
          else if (hamzahVal === 'opt40') setOpacityByID(circle2, "V2-2-1");
        }
      } else if (vowelPosition === 'end') {
        setOpacityByID(circle2, "V3");
        setOpacityByID(circle2, "Vtext3");
        if (vowelType === 'o') {
          setOpacityByID(circle2, "V3-1");
          if (hamzahVal === 'opt40') setOpacityByID(circle2, "V3-1-1");
          else if (hamzahVal === 'opt41') setOpacityByID(circle2, "V3-1-2");
        } else if (vowelType === 'i') {
          setOpacityByID(circle2, "V3-2");
          if (hamzahVal === 'opt40') setOpacityByID(circle2, "V3-2-1");
          else if (hamzahVal === 'opt41') setOpacityByID(circle2, "V3-2-2");
        }
      } else if (vowelPosition === 'double') {
        setOpacityByID(circle2, "V4");
        setOpacityByID(circle2, "Vtext4");
        if (vowelPattern === "seperate") {
          setOpacityByID(circle2, "V4-1");
          if (hamzahVal === 'opt41') setOpacityByID(circle2, "V4-1-1");
        } else if (vowelPattern === "grouped") {
          setOpacityByID(circle2, "V4-2");
          if (hamzahVal === 'opt40') setOpacityByID(circle2, "V4-2-1");
        }
      }
    } else {
      setOpacityByID(circle2, "No-vowel");
      setOpacityByID(circle2, "NVtext0");
      if (nvTypeVal !== '') {
        if (nvTypeVal === 'opt1'){
          setOpacityByID(circle2, "NV2");
          setOpacityByID(circle2, "NVtext2");
          if (hamzaSubVal === 'sub1') {
            setOpacityByID(circle2, "NV2-4")
          } else if (hamzaSubVal === 'sub2') {
            setOpacityByID(circle2, "NV2-3")
          } else if (hamzaSubVal === 'sub3') {
            setOpacityByID(circle2, "NV2-3")
            setOpacityByID(circle2, "NV2-3-1")
          } else if (hamzaSubVal === 'sub4') {
            setOpacityByID(circle2, "NV2-2")
          } else if (hamzaSubVal === 'sub5') {
            setOpacityByID(circle2, "NV2-1")
          } 
        }
        else if (nvTypeVal === 'opt2') {
          setOpacityByID(circle2, "NV1")
          setOpacityByID(circle2, "NVtext3");
        }
        else if (nvTypeVal === 'opt3') {
          setOpacityByID(circle2, "NV3")
          setOpacityByID(circle2, "NVtext1");
        }
      }
    }
  }

  if (deriv === "basic") {
    setOpacityByID(circle1, "NoAdd");
    setOpacityByID(circle1, "NAtext0");
    if (cat === "tri"){
      setOpacityByID(circle1, "NA-1");
      setOpacityByID(circle1, "NAtext1");

      if (patternStates['pat0']){setOpacityByID(circle1, "NA-1-1")};
      if (patternStates['pat1']){setOpacityByID(circle1, "NA-1-2")};
      if (patternStates['pat2']){setOpacityByID(circle1, "NA-1-3")};
      if (patternStates['pat3']){setOpacityByID(circle1, "NA-1-4")};
      if (patternStates['pat4']){setOpacityByID(circle1, "NA-1-5")};
      if (patternStates['pat5']){setOpacityByID(circle1, "NA-1-6")};
    }
    if (cat === "quadri"){
      setOpacityByID(circle1, "NA-2");
      setOpacityByID(circle1, "NAtext2");
      setOpacityByID(circle1, "NA-2-1");
    }
  } else if (deriv === "deriv"){
    setOpacityByID(circle1, "Add");
    setOpacityByID(circle1, "Atext0");

    if (cat === "tri"){
      setOpacityByID(circle1, "AT");
      setOpacityByID(circle1,"Atext1")

      if (plusOne){
        setOpacityByID(circle1, "AT+1");
        if (patternStates['pat7']){setOpacityByID(circle1, "AT+1-1")};
        if (patternStates['pat8']){setOpacityByID(circle1, "AT+1-2")};
        if (patternStates['pat9']){setOpacityByID(circle1, "AT+1-3")};
      }
      if (plusTwo){
        setOpacityByID(circle1, "AT+2");
        if (patternStates['pat10']){setOpacityByID(circle1, "AT+2-1")};
        if (patternStates['pat11']){setOpacityByID(circle1, "AT+2-2")};
        if (patternStates['pat12']){setOpacityByID(circle1, "AT+2-3")};
        if (patternStates['pat13']){setOpacityByID(circle1, "AT+2-4")};
        if (patternStates['pat14']){setOpacityByID(circle1, "AT+2-5")};
      }
      if (plusThree){
        setOpacityByID(circle1, "AT+3");
        if (patternStates['pat15']){setOpacityByID(circle1, "AT+3-1")};
        if (patternStates['pat16']){setOpacityByID(circle1, "AT+3-2")};
        if (patternStates['pat17']){setOpacityByID(circle1, "AT+3-3")};
        if (patternStates['pat18']){setOpacityByID(circle1, "AT+3-4")};
      }
    }
    if (cat === "quadri"){
      setOpacityByID(circle1, "AQ");
      setOpacityByID(circle1, "Atext2")
      if (plusOne){
        setOpacityByID(circle1, "AQ+1");
        setOpacityByID(circle1, "AQ+1-1")
      }
      if (plusTwo){
        setOpacityByID(circle1, "AQ+2");
        if (patternStates['pat20']){setOpacityByID(circle1, "AQ+2-1")};
        if (patternStates['pat21']){setOpacityByID(circle1, "AQ+2-2")};
      }
    }
  }
}
