// ===== State =====
let chart = null;
let openStocks = [];
let activeTabIdx = -1;
let activeCategories = new Set();
let editingId = null;
let stockList = [];

// ===== Init =====
async function init() {
  // 1. Load config first
  await loadAppConfig();
  activeCategories = new Set(Object.keys(CATEGORIES));

  // 2. Register overlay
  registerSignalOverlay();

  // 3. Init chart with config
  var chartCfg = getChartConfig();
  chart = klinecharts.init('chart-area', { styles: chartCfg.theme || 'dark' });

  var candle = chartCfg.candle || {};
  var cross = chartCfg.crosshair || {};
  chart.setStyles({
    candle: {
      bar: {
        upColor: candle.upColor || '#F04848',
        downColor: candle.downColor || '#00B07C',
        noChangeColor: candle.noChangeColor || '#76808F',
        upBorderColor: candle.upColor || '#F04848',
        downBorderColor: candle.downColor || '#00B07C',
        upWickColor: candle.upColor || '#F04848',
        downWickColor: candle.downColor || '#00B07C'
      },
      tooltip: { showRule: 'always', showType: 'standard' }
    },
    indicator: { tooltip: { showRule: 'always' } },
    crosshair: {
      horizontal: { line: { color: cross.lineColor || '#555', style: 'dash' }, text: { backgroundColor: cross.textBg || '#373a40' } },
      vertical: { line: { color: cross.lineColor || '#555', style: 'dash' }, text: { backgroundColor: cross.textBg || '#373a40' } }
    }
  });

  // 4. Add indicators from config
  var indicators = chartCfg.indicators || {};
  var maCfg = indicators.MA || { periods: [5, 10, 20, 60] };
  var volCfg = indicators.VOL || { height: 80 };

  chart.createIndicator('MA', false, { id: 'candle_pane' });
  chart.overrideIndicator({ name: 'MA', calcParams: maCfg.periods }, 'candle_pane');
  chart.createIndicator('VOL', false, { height: volCfg.height });

  // 5. Build UI
  buildFilterBar();
  setupSearch();
  await loadStockList();
}

// ===== Keyboard =====
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') { closeSidePanel(); closeAddForm(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); document.getElementById('searchInput').focus(); }
});

// ===== Go =====
init().catch(function(err) { console.error('Init failed:', err); });
