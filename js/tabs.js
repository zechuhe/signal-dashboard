// ===== Open Stock (new tab) =====
async function openStock(exchange, code, name) {
  document.getElementById('searchInput').value = '';
  document.getElementById('searchDropdown').classList.remove('open');

  const symbol = `${exchange}:${code}`;

  // Check if already open
  const existing = openStocks.findIndex(s => s.symbol === symbol);
  if (existing >= 0) { switchTab(existing); return; }

  // Try to load price data
  let priceData = null;
  const fname = `data/price_${exchange}_${code}.json`;
  try {
    const resp = await fetch(fname);
    if (resp.ok) {
      const json = await resp.json();
      priceData = json.data || [];
    }
  } catch (e) {}

  if (!priceData || !priceData.length) {
    alert(`找不到 ${symbol} 的股價數據。\n請先用 fetch_prices.py 拉取或上傳對應 JSON。`);
    return;
  }

  // Add to open stocks
  openStocks.push({ symbol, name, exchange, code, priceData, events: [] });
  switchTab(openStocks.length - 1);
  buildTabs();
}

// ===== Tab Management =====
function buildTabs() {
  const el = document.getElementById('stockTabs');
  if (!openStocks.length) {
    el.innerHTML = '<div style="padding:7px 14px;font-size:12px;color:var(--text-secondary)">搜尋股票以開始...</div>';
    return;
  }
  el.innerHTML = openStocks.map((s, i) => {
    const last = s.priceData[s.priceData.length - 1];
    const cls = i === activeTabIdx ? 'active' : '';
    const priceCls = last && last.change >= 0 ? 'tab-price-up' : 'tab-price-down';
    return `<div class="stock-tab ${cls}" onclick="switchTab(${i})">
      <span>${s.code}</span>
      <span class="tab-price ${priceCls}">${last ? last.close.toFixed(2) : ''}</span>
      <span class="tab-close" onclick="event.stopPropagation();closeTab(${i})">&times;</span>
    </div>`;
  }).join('');
}

function switchTab(idx) {
  activeTabIdx = idx;
  const stock = openStocks[idx];
  buildTabs();
  updateStockInfo(stock);
  renderChart(stock);
  buildEventList(stock);
}

function closeTab(idx) {
  openStocks.splice(idx, 1);
  if (activeTabIdx >= openStocks.length) activeTabIdx = openStocks.length - 1;
  if (openStocks.length) switchTab(activeTabIdx);
  else {
    activeTabIdx = -1;
    buildTabs();
    document.getElementById('stockInfoBar').innerHTML = '';
    chart.applyNewData([]);
  }
}

// ===== Stock Info Bar =====
function updateStockInfo(stock) {
  const last = stock.priceData[stock.priceData.length - 1];
  if (!last) return;
  const up = last.change >= 0;
  const cls = up ? 'tab-price-up' : 'tab-price-down';
  const sign = up ? '+' : '';
  document.getElementById('stockInfoBar').innerHTML = `
    <span class="si-name">${stock.name}</span>
    <span class="si-code">${stock.symbol}</span>
    <span class="si-price ${cls}">${last.close.toFixed(2)}</span>
    <span class="si-change ${cls}">${sign}${last.change.toFixed(2)} (${sign}${last.change_pct}%)</span>
    <span class="si-meta">${last.date}</span>
  `;
}
