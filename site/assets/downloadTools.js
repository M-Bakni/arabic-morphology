import { normalizeArabic } from './render.js';

let originalDataset = null;

async function loadOriginalData() {
  if (originalDataset) return originalDataset;

  try {
    const response = await fetch('./verbs.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

    const data = await response.json();
    console.log('Loaded JSON structure:', data);

    if (data.fields && data.rows && Array.isArray(data.rows)) {
      originalDataset = data.rows.map(row => {
        const obj = {};
        data.fields.forEach((field, index) => {
          obj[field] = row[index];
        });
        return obj;
      });
      console.log(`Converted ${originalDataset.length} rows to objects`);
      return originalDataset;
    }

    if (Array.isArray(data)) {
      originalDataset = data;
      console.log(`Loaded ${originalDataset.length} rows directly`);
      return originalDataset;
    }

    throw new Error('Unknown JSON format');
  } catch (error) {
    console.error('Could not load verbs.json:', error);
    return null;
  }
}

function getCurrentFilters() {
  // Normalize search term right away (matches original behaviour)
  const searchInput = document.getElementById('search')?.value || '';
  const search = normalizeArabic(searchInput).trim();

  const filterCat = document.getElementById('filterCat')?.value || '';
  const filterDeriv = document.getElementById('filterDeriv')?.value || '';
  const filterTrans = document.getElementById('filterTrans')?.value || '';

  // Pattern checkboxes (list8)
  const patternCheckboxes = document.querySelectorAll('#list8 input[type="checkbox"]:checked');
  const selectedPatterns = Array.from(patternCheckboxes).map(cb => cb.value);

  // Root letters
  const letter1 = document.getElementById('letter1')?.value || '';
  const letter2 = document.getElementById('letter2')?.value || '';
  const letter3 = document.getElementById('letter3')?.value || '';

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

  const vowelPosition = document.getElementById('vowelPositionSelect')?.value || '';
  const vowelType = document.getElementById('vowelTypeSelect')?.value || '';
  const vowelPattern = document.getElementById('vowelPatternSelect')?.value || '';

  const doubleToggle = document.getElementById('doubleToggle');
  const doubleChecked = doubleToggle ? doubleToggle.checked : false;

  const catMap = { 'ثلاثي': 'tri', 'رباعي': 'quad' };
  const derivMap = { 'مجرّد': 'basic', 'مزيد': 'deriv' };
  const transMap = { 'لازم': 'l', 'متعدٍّ': 'm', 'مشترك': 'k' };

  return {
    search,   // already normalized
    cat: catMap[filterCat] || filterCat,
    deriv: derivMap[filterDeriv] || filterDeriv,
    trans: transMap[filterTrans] || filterTrans,
    selectedPatterns,
    letter1, letter2, letter3,
    showVowelOnly,
    hamzahVal,
    nvTypeVal,
    hamzaSubVal,
    vowelPosition,
    vowelType,
    vowelPattern,
    doubleChecked,
  };
}

function applyFilters(data, filters) {
  if (!data || !Array.isArray(data)) return [];

  const {
    search, cat, deriv, trans,
    selectedPatterns,
    letter1, letter2, letter3,
    showVowelOnly,
    hamzahVal,
    nvTypeVal,
    hamzaSubVal,
    vowelPosition,
    vowelType,
    vowelPattern,
    doubleChecked,
  } = filters;

  // search is already normalized by getCurrentFilters()
  return data.filter(r => {
    // ----- Common filters -----
    if (cat && r.cat !== cat) return false;
    if (deriv && r.deriv !== deriv) return false;
    if (trans && r.trans !== trans) return false;

    if (search) {
      const verbNorm = normalizeArabic(r.verb || '');
      const rootNorm = normalizeArabic(r.root || '');
      if (!verbNorm.includes(search) && !rootNorm.includes(search)) return false;
    }

    if (selectedPatterns.length > 0 && !(selectedPatterns.includes(String(r.pattern)) &&  (cat == "quadri" || (cat === "tri" && (showVowelOnly === (r.root.includes("و") ||  r.root.includes("ي"))))))) return false;
    
    const root = r.root || '';
    const rootLength = root.length;

    // ----- Letter filters -----
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

    // ========== VOWEL LOGIC (toggle ON) ==========
    if (cat === 'tri' && showVowelOnly && rootLength === 3) {
      const isVowel = ch => /[وي]/.test(ch);
      const matchesType = ch => {
        if (!vowelType) return isVowel(ch);
        if (vowelType === 'o') return ch === 'و';
        if (vowelType === 'i') return ch === 'ي';
        return false;
      };
      const isVowelAt = pos => matchesType(root[pos]);
      const isNotVowelAt = pos => !isVowel(root[pos]);

      // Position-based filtering
      if (vowelPosition === 'start') {
        if (!isVowelAt(0) || !isNotVowelAt(1) || !isNotVowelAt(2)) return false;
      } else if (vowelPosition === 'middle') {
        if (!isNotVowelAt(0) || !isVowelAt(1) || !isNotVowelAt(2)) return false;
      } else if (vowelPosition === 'end') {
        if (!isNotVowelAt(0) || !isNotVowelAt(1) || !isVowelAt(2)) return false;
      } else if (vowelPosition === 'double') {
        const vowelCount = [0,1,2].filter(i => isVowelAt(i)).length;
        if (vowelCount < 2) return false;
        if (vowelPattern === 'grouped' && !isVowelAt(1)) return false;
        if (vowelPattern === 'seperate' && isVowelAt(1)) return false;
      } else {
        // Any vowel position – at least one vowel anywhere
        if (![0,1,2].some(i => isVowelAt(i))) return false;
      }

      // Hamzah / doubled sub‑filters (within vowel‑on)
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
}

function convertToCSV(data) {
  if (!data || data.length === 0) return '';

  const fields = Object.keys(data[0]);
  const rows = [fields.join(',')];

  data.forEach(item => {
    const row = fields.map(field => {
      let value = item[field];
      if (value === undefined || value === null) return '';
      value = String(value);
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    rows.push(row.join(','));
  });

  return rows.join('\n');
}

export async function downloadTableAsCSV() {

  try {
    const allData = await loadOriginalData();
    if (!allData || allData.length === 0) {
      alert('فشل تحميل البيانات');
      removeLoadingMessage(loadingMsg);
      return;
    }

    const filters = getCurrentFilters();
    console.log('Applied filters:', filters);

    const filteredData = applyFilters(allData, filters);
    console.log(`Total: ${allData.length}, Filtered: ${filteredData.length}`);

    if (filteredData.length === 0) {
      alert('لا توجد بيانات تطابق عوامل التصفية الحالية');
      removeLoadingMessage(loadingMsg);
      return;
    }

    let csvContent = convertToCSV(filteredData);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');

    csvContent += "\n\n# CSV LICENSE HERE"; //----------LICENSE!!!!!---------------

    downloadFile(csvContent, `arabic-verbs-${timestamp}.csv`, 'text/csv');
     alert('Number of verbs downloaded: ${filteredData.length}');
  } catch (error) {
    console.error('Download error:', error);
    alert('حدث خطأ: ' + error.message);
  } finally {
    removeLoadingMessage(loadingMsg);
  }
}

export async function downloadTableAsJSON() {
  const loadingMsg = showLoadingMessage('جاري تحميل البيانات...');

  try {
    const allData = await loadOriginalData();
    if (!allData || allData.length === 0) {
      alert('فشل تحميل البيانات');
      removeLoadingMessage(loadingMsg);
      return;
    }

    const filters = getCurrentFilters();
    const filteredData = applyFilters(allData, filters);

    if (filteredData.length === 0) {
      alert('لا توجد بيانات تطابق عوامل التصفية الحالية');
      removeLoadingMessage(loadingMsg);
      return;
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');

    const jsonData = {
      license: "license message contents here!!", //-------------License message placement------------
      exportDate: new Date().toISOString(),
      filters: {
        search: filters.search || 'لا يوجد',
        category: filters.cat || 'الكل',
        derivation: filters.deriv || 'الكل',
        pattern: filters.selectedPatterns.length ? filters.selectedPatterns.join(', ') : 'الكل',
        transitivity: filters.trans || 'الكل',
      },
      totalRows: filteredData.length,
      data: filteredData,
    };

    let jsonContent = JSON.stringify(jsonData, null, 2);

    downloadFile(jsonContent, `arabic-verbs-${timestamp}.json`, 'application/json');
    alert(`Number of verbs downloaded: ${filteredData.length}`);
  } catch (error) {
    alert('Error: ' + error.message);
  } finally {
    removeLoadingMessage(loadingMsg);
  }
}

export async function downloadTableAsTXT() {
  const loadingMsg = showLoadingMessage('جاري تحميل البيانات...');

  try {
    const allData = await loadOriginalData();
    if (!allData || allData.length === 0) {
      alert('فشل تحميل البيانات');
      removeLoadingMessage(loadingMsg);
      return;
    }

    const filters = getCurrentFilters();
    const filteredData = applyFilters(allData, filters);

    if (filteredData.length === 0) {
      alert('لا توجد بيانات تطابق عوامل التصفية الحالية');
      removeLoadingMessage(loadingMsg);
      return;
    }

    let txtContent = `Custom message slot\n`;
    txtContent += `Date and time: ${new Date().toLocaleString('ar')}\n`;
    txtContent += `Number of verbs: ${filteredData.length}\n`;
    txtContent += `${'='.repeat(70)}\n\n`;

    filteredData.forEach((item, index) => {
      txtContent += `${index + 1}. `;
      txtContent += `الفعل: ${item.verb || '-'} | `;
      txtContent += `الجذر: ${item.root || '-'} | `;
      txtContent += `الوزن: ${item.pattern || '-'}`;
      txtContent += '\n';
    });

    txtContent += `\n${'='.repeat(70)}\n`;

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    downloadFile(txtContent, `arabic-verbs-${timestamp}.txt`, 'text/plain');
    alert(`Number of verbs downloaded: ${filteredData.length} صف بنجاح`);
  } catch (error) {
    alert('حدث خطأ: ' + error.message);
  } finally {
    removeLoadingMessage(loadingMsg);
  }
}


function showLoadingMessage(text) {
  const div = document.createElement('div');
  div.textContent = text;
  div.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 20px 30px;
    border-radius: 12px;
    z-index: 9999;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    font-family: inherit;
    font-size: 1rem;
    direction: rtl;
    border: 1px solid #e3e1dc;
  `;
  document.body.appendChild(div);
  return div;
}

function removeLoadingMessage(element) {
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob(["\uFEFF" + content], { type: `${mimeType};charset=utf-8;` });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
