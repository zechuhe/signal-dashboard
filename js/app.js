// ===== State =====
let chart = null;
let openStocks = [];      // [{symbol, name, exchange, priceData, events}]
let activeTabIdx = -1;
let activeCategories = new Set(Object.keys(CATEGORIES));
let editingId = null;
let stockList = [];        // [{code, name, exchange, yahooSuffix}]

// ===== Init =====
async function init() {
  // Register overlay
  registerSignalOverlay();

  // Init chart
  chart = klinecharts.init('chart-area', { styles: 'dark' });

  // Custom styles
  chart.setStyles({
    candle: {
      bar: {
        upColor: '#F04848', downColor: '#00B07C', noChangeColor: '#76808F',
        upBorderColor: '#F04848', downBorderColor: '#00B07C',
        upWickColor: '#F04848', downWickColor: '#00B07C'
      },
      tooltip: { showRule: 'always', showType: 'standard' }
    },
    indicator: {
      tooltip: { showRule: 'always' }
    },
    crosshair: {
      horizontal: { line: { color: '#555', style: 'dash' }, text: { backgroundColor: '#373a40' } },
      vertical: { line: { color: '#555', style: 'dash' }, text: { backgroundColor: '#373a40' } }
    }
  });

  // Add MA + Volume
  chart.createIndicator('MA', false, { id: 'candle_pane' });
  chart.overrideIndicator({ name: 'MA', calcParams: [5, 10, 20, 60] }, 'candle_pane');
  chart.createIndicator('VOL', false, { height: 80 });

  // Build filter bar
  buildFilterBar();

  // Setup search
  setupSearch();

  // Load stock list
  await loadStockList();
}

// ===== Keyboard =====
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeSidePanel(); closeAddForm(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); document.getElementById('searchInput').focus(); }
});

// ===== Go =====
init().catch(err => console.error('Init failed:', err));
