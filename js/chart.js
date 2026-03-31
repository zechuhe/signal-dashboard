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
      var style = getImpactStyle(data.impact);
      var chartCfg = getChartConfig();
      return [{
        type: 'text',
        attrs: {
          x: coord.x,
          y: coord.y + style.offset,
          text: style.marker,
          align: 'center',
          baseline: 'middle'
        },
        styles: {
          color: data.color || style.color,
          size: chartCfg.marker.fontSize,
          family: chartCfg.marker.fontFamily
        }
      }];
    }
  });
}

// ===== Render Chart =====
function renderChart(stock) {
  var chartCfg = getChartConfig();

  // Convert data to KLineChart format
  var kData = stock.priceData.map(function(d) {
    return {
      timestamp: new Date(d.date).getTime(),
      open: d.open, high: d.high, low: d.low, close: d.close,
      volume: d.volume || 0
    };
  });

  chart.applyNewData(kData);
  chart.removeOverlay();

  // Add event markers
  var events = getMergedEvents(stock);
  var offsetRatio = chartCfg.marker.priceOffsetRatio;

  events.filter(function(e) { return activeCategories.has(e.category); }).forEach(function(evt) {
    var candle = stock.priceData.find(function(d) { return d.date >= evt.date; }) || stock.priceData[stock.priceData.length - 1];
    if (!candle) return;

    var catInfo = CATEGORIES[evt.category] || { color: '#FF9500' };
    var isUp = evt.expected_impact === 'positive';
    var ratio = isUp ? (offsetRatio.positive || 0.99) : (offsetRatio.negative || 1.01);
    var val = isUp ? candle.low * ratio : candle.high * ratio;

    chart.createOverlay({
      name: 'signalMarker',
      lock: true,
      points: [{ timestamp: new Date(candle.date).getTime(), value: val }],
      extendData: { impact: evt.expected_impact, color: catInfo.color, event: evt },
      onClicked: function() { openSidePanel(evt); }
    });
  });
}

// ===== Time Range =====
function setTimeRange(label, btn) {
  document.querySelectorAll('.time-btn').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  if (activeTabIdx < 0) return;
  var total = openStocks[activeTabIdx].priceData.length;
  var ranges = getTimeRanges();
  var range = ranges.find(function(r) { return r.label === label; });
  var days = (range && range.tradingDays > 0) ? range.tradingDays : total;
  chart.scrollByDistance(days < total ? -99999 : 99999, 300);
}

// ===== Category Toggle =====
function toggleCat(cat, on) {
  if (on) activeCategories.add(cat); else activeCategories.delete(cat);
  var el = document.querySelector('.filter-item[data-cat="' + cat + '"]');
  if (el) el.classList.toggle('off', !on);
  if (activeTabIdx >= 0) renderChart(openStocks[activeTabIdx]);
}

// ===== Filter Bar =====
function buildFilterBar() {
  var el = document.getElementById('filterBar');
  var cats = Object.entries(CATEGORIES).map(function(entry) {
    var k = entry[0], v = entry[1];
    return '<label class="filter-item" data-cat="' + k + '">' +
      '<input type="checkbox" checked onchange="toggleCat(\'' + k + '\',this.checked)">' +
      '<span class="filter-dot" style="background:' + v.color + '"></span>' + v.label +
      '</label>';
  }).join('');

  var ranges = getTimeRanges();
  var timeBtns = ranges.map(function(r) {
    var isDefault = r.tradingDays === -1;
    return '<button class="time-btn ' + (isDefault ? 'active' : '') + '" onclick="setTimeRange(\'' + r.label + '\',this)">' + r.label + '</button>';
  }).join('');

  el.innerHTML = cats + '<div class="time-btns">' + timeBtns + '</div>';
}
