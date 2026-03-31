// ===== Stock List =====
async function loadStockList() {
  // Try to load pre-built stock list, fallback to basic demo list
  try {
    const resp = await fetch('data/stock_list.json');
    if (resp.ok) { stockList = await resp.json(); return; }
  } catch (e) {}

  // Fallback: basic list from our demo data
  stockList = [
    { code: '0001', name: 'CK Hutchison 長和', exchange: 'HKEX' },
    { code: '0700', name: 'Tencent 騰訊', exchange: 'HKEX' },
    { code: '0388', name: 'HKEX 港交所', exchange: 'HKEX' },
    { code: '0939', name: 'CCB 建設銀行', exchange: 'HKEX' },
    { code: '1113', name: 'CK Asset 長實地產', exchange: 'HKEX' },
    { code: '1205', name: 'CITIC Resources 中信資源', exchange: 'HKEX' },
    { code: 'AAPL', name: 'Apple', exchange: 'NASDAQ' },
    { code: 'MSFT', name: 'Microsoft', exchange: 'NASDAQ' },
    { code: '2330', name: 'TSMC 台積電', exchange: 'TWSE' },
    { code: '600519', name: 'Kweichow Moutai 貴州茅台', exchange: 'SSE' }
  ];
}

// ===== Search =====
function setupSearch() {
  const input = document.getElementById('searchInput');
  const dropdown = document.getElementById('searchDropdown');

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 1) { dropdown.classList.remove('open'); return; }

    const results = stockList.filter(s =>
      s.code.toLowerCase().startsWith(q) ||
      s.name.toLowerCase().includes(q)
    ).slice(0, 15);

    if (!results.length) {
      dropdown.innerHTML = '<div class="search-item" style="color:var(--text-secondary)">無結果</div>';
    } else {
      dropdown.innerHTML = results.map(s =>
        `<div class="search-item" onclick="openStock('${s.exchange}','${s.code}','${s.name.replace(/'/g,"\\'")}')">
          <span><span class="code">${s.code}</span> <span class="name">${s.name}</span></span>
          <span class="market-tag">${s.exchange}</span>
        </div>`
      ).join('');
    }
    dropdown.classList.add('open');
  });

  input.addEventListener('blur', () => setTimeout(() => dropdown.classList.remove('open'), 200));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { dropdown.classList.remove('open'); input.blur(); }
  });
}
