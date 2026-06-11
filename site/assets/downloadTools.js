let originalDataset = null;

// Fetch the original JSON data from root
async function loadOriginalData() {
  if (originalDataset) return originalDataset;
  
  try {
    const response = await fetch('./verbs.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    
    const data = await response.json();
    console.log('Loaded JSON structure:', data);
    
    // Handle the {fields: [], rows: []} format
    if (data.fields && data.rows && Array.isArray(data.rows)) {
      // Convert rows array to array of objects using fields as keys
      originalDataset = data.rows.map(row => {
        const obj = {};
        data.fields.forEach((field, index) => {
          obj[field] = row[index];
        });
        return obj;
      });
      console.log(`Converted ${originalDataset.length} rows to objects`);
      console.log('Sample object:', originalDataset[0]);
      return originalDataset;
    }
    
    // Handle if it's already an array
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

// Get current filter values (only real values, skip placeholders)
function getCurrentFilters() {
  const search = document.getElementById('search')?.value || '';
  const filterCat = document.getElementById('filterCat')?.value || '';
  const filterDeriv = document.getElementById('filterDeriv')?.value || '';
  const filterPattern = document.getElementById('filterPattern')?.value || '';
  const filterTrans = document.getElementById('filterTrans')?.value || '';
  
  // Placeholder values to skip
  const placeholderValues = ['', 'Default 1', 'Default 2', 'Default 3', 'Default 4', 
                              'Def5', 'Def6', 'Def7', 'Def8', 'Def9', 'الكل', 'all'];
  
  // Map display values to actual data values
  let mappedCat = '';
  if (filterCat === 'ثلاثي') mappedCat = 'tri';
  else if (filterCat === 'رباعي') mappedCat = 'quad';
  else mappedCat = placeholderValues.includes(filterCat) ? '' : filterCat;
  
  let mappedDeriv = '';
  if (filterDeriv === 'مجرّد') mappedDeriv = 'basic';
  else if (filterDeriv === 'مزيد') mappedDeriv = 'deriv';
  else mappedDeriv = placeholderValues.includes(filterDeriv) ? '' : filterDeriv;
  
  let mappedTrans = '';
  if (filterTrans === 'لازم') mappedTrans = 'l';
  else if (filterTrans === 'متعدٍّ') mappedTrans = 'm';
  else if (filterTrans === 'مشترك') mappedTrans = 'k';
  else mappedTrans = placeholderValues.includes(filterTrans) ? '' : filterTrans;
  
  return {
    search: search.trim(),
    cat: mappedCat,
    deriv: mappedDeriv,
    pattern: placeholderValues.includes(filterPattern) ? '' : filterPattern,
    trans: mappedTrans
  };
}

// Apply filters to the dataset
function applyFilters(data, filters) {
  if (!data || !Array.isArray(data)) return [];
  
  // If no active filters, return all data
  const hasActiveFilters = filters.search || filters.cat || filters.deriv || filters.pattern || filters.trans;
  if (!hasActiveFilters) return data;
  
  return data.filter(item => {
    // Search filter (search in verb and root)
    if (filters.search && filters.search !== '') {
      const searchLower = filters.search.toLowerCase();
      const verb = (item.verb || '').toLowerCase();
      const root = (item.root || '').toLowerCase();
      if (!verb.includes(searchLower) && !root.includes(searchLower)) return false;
    }
    
    // Category filter (cat field: 'tri' or 'quad')
    if (filters.cat && filters.cat !== '') {
      if (item.cat !== filters.cat) return false;
    }
    
    // Derivation filter (deriv field: 'basic' or 'deriv')
    if (filters.deriv && filters.deriv !== '') {
      if (item.deriv !== filters.deriv) return false;
    }
    
    // Pattern filter (pattern field)
    if (filters.pattern && filters.pattern !== '') {
      if (item.pattern !== filters.pattern) return false;
    }
    
    // Transitivity filter (trans field: 'l', 'm', 'k')
    if (filters.trans && filters.trans !== '') {
      if (item.trans !== filters.trans) return false;
    }
    
    return true;
  });
}

// Convert data to CSV using original format
function convertToCSV(data) {
  if (!data || data.length === 0) return '';
  
  // Get all field names from first object
  const fields = Object.keys(data[0]);
  const rows = [fields.join(',')];
  
  data.forEach(item => {
    const row = fields.map(field => {
      let value = item[field];
      if (value === undefined || value === null) return '';
      value = String(value);
      
      // Escape quotes and commas
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    rows.push(row.join(','));
  });
  
  return rows.join('\n');
}

// Main download functions
export async function downloadTableAsCSV() {
  const loadingMsg = showLoadingMessage('جاري تحميل البيانات...');
  
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
    
    const csvContent = convertToCSV(filteredData);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    downloadFile(csvContent, `arabic-verbs-${timestamp}.csv`, 'text/csv');
    alert(`تم تحميل ${filteredData.length} صف بنجاح`);
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
    const jsonContent = JSON.stringify({
      exportDate: new Date().toISOString(),
      filters: {
        search: filters.search || 'لا يوجد',
        category: filters.cat || 'الكل',
        derivation: filters.deriv || 'الكل',
        pattern: filters.pattern || 'الكل',
        transitivity: filters.trans || 'الكل'
      },
      totalRows: filteredData.length,
      data: filteredData
    }, null, 2);
    
    downloadFile(jsonContent, `arabic-verbs-${timestamp}.json`, 'application/json');
    alert(`تم تحميل ${filteredData.length} صف بنجاح`);
  } catch (error) {
    alert('حدث خطأ: ' + error.message);
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
    
    let txtContent = `قاعدة بيانات الأفعال العربية - تصدير مفلتر\n`;
    txtContent += `تاريخ التصدير: ${new Date().toLocaleString('ar')}\n`;
    txtContent += `إجمالي الأفعال: ${filteredData.length}\n`;
    txtContent += `${'='.repeat(70)}\n\n`;
    
    filteredData.forEach((item, index) => {
      txtContent += `${index + 1}. `;
      txtContent += `الفعل: ${item.verb || '-'} | `;
      txtContent += `الجذر: ${item.root || '-'} | `;
      txtContent += `الوزن: ${item.pattern || '-'}`;
      txtContent += '\n';
    });
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    downloadFile(txtContent, `arabic-verbs-${timestamp}.txt`, 'text/plain');
    alert(`تم تحميل ${filteredData.length} صف بنجاح`);
  } catch (error) {
    alert('حدث خطأ: ' + error.message);
  } finally {
    removeLoadingMessage(loadingMsg);
  }
}

// Helper functions
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
