// ===== Signal Marker Overlay =====
function registerSignalOverlay() {
  klinecharts.registerOverlay({
    name: 'signalMarker',
    totalStep: 2,
    needDefaultPointFigure: false,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,
    createPointFigures: function(params) {
      var overlay = params.overlay;
      var coord = params.coordinates[0];
      if (!coord) return [];
      var data = overlay.extendData || {};
      var isUp = data.impact === 'positive';
      var isDown = data.impact === 'negative';
      var symbol = isUp ? '\u25B2' : isDown ? '\u25BC' : '\u25C6';
      var color = data.color || (isUp ? '#F04848' : isDown ? '#00B07C' : '#888');
      var yOff = isUp ? 18 : isDown ? -18 : 0;
      return [{
        type: 'text',
        attrs: { x: coord.x, y: coord.y + yOff, text: symbol, align: 'center', baseline: 'middle' },
        styles: { color: color, size: 14, family: 'Arial' }
      }];
    }
  });
}

// ===== Render Chart =====
function renderChart(stock) {
  // Convert data to KLineChart format
  const kData = stock.priceData.map(d => ({
    timestamp: new Date(d.date).getTime(),
    open: d.open, high: d.high, low: d.low, close: d.close,
    volume: d.volume || 0
  }));

  chart.applyNewData(kData);

  // Remove old overlays
  chart.removeOverlay();

  // Add event markers
  const events = getMergedEvents(stock);
  events.filter(e => activeCategories.has(e.category)).forEach(evt => {
    const ts = new Date(evt.date).getTime();
    // Find nearest candle
    const candle = stock.priceData.find(d => d.date >= evt.date) || stock.priceData[stock.priceData.length - 1];
    if (!candle) return;

    const catInfo = CATEGORIES[evt.category] || { color: '#FF9500' };
    const isUp = evt.expected_impact === 'positive';
    const val = isUp ? candle.low * 0.99 : candle.high * 1.01;

    chart.createOverlay({
      name: 'signalMarker',
      lock: true,
      points: [{ timestamp: new Date(candle.date).getTime(), value: val }],
      extendData: { impact: evt.expected_impact, color: catInfo.color, event: evt },
      onClicked: () => openSidePanel(evt)
    });
  });
}

// ===== Time Range =====
function setTimeRange(label, btn) {
  document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (activeTabIdx < 0) return;
  const total = openStocks[activeTabIdx].priceData.length;
  const map = { '3M': 63, '6M': 126, '1Y': 252, '3Y': 756, '全部': total };
  const days = map[label] || total;
  const from = Math.max(0, total - days);
  chart.scrollByDistance(from > 0 ? -99999 : 99999, 300);
}

// ===== Category Toggle =====
function toggleCat(cat, on) {
  if (on) activeCategories.add(cat); else activeCategories.delete(cat);
  document.querySelector(`.filter-item[data-cat="${cat}"]`).classList.toggle('off', !on);
  if (activeTabIdx >= 0) renderChart(openStocks[activeTabIdx]);
}

// ===== Filter Bar =====
function buildFilterBar() {
  const el = document.getElementById('filterBar');
  const cats = Object.entries(CATEGORIES).map(([k, v]) =>
    `<label class="filter-item" data-cat="${k}">
      <input type="checkbox" checked onchange="toggleCat('${k}',this.checked)">
      <span class="filter-dot" style="background:${v.color}"></span>${v.label}
    </label>`
  ).join('');

  const timeBtns = ['3M','6M','1Y','3Y','全部'].map((l, i) =>
    `<button class="time-btn ${l==='全部'?'active':''}" onclick="setTimeRange('${l}',this)">${l}</button>`
  ).join('');

  el.innerHTML = cats + `<div class="time-btns">${timeBtns}</div>`;
}
