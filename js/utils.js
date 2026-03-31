// ===== App Config (loaded from config/app.json) =====
let APP_CONFIG = null;
let CATEGORIES = {};
let LS_EVENTS = 'sd_user_events';
let LS_LOG = 'sd_edit_log';

async function loadAppConfig() {
  try {
    const resp = await fetch('config/app.json');
    APP_CONFIG = await resp.json();
    CATEGORIES = APP_CONFIG.categories || {};
    LS_EVENTS = (APP_CONFIG.storage && APP_CONFIG.storage.eventsKey) || 'sd_user_events';
    LS_LOG = (APP_CONFIG.storage && APP_CONFIG.storage.logKey) || 'sd_edit_log';
  } catch (e) {
    console.warn('Failed to load config/app.json, using defaults:', e);
    CATEGORIES = {
      insider_private: { label: '私人消息', color: '#FF6B6B' },
      public_corporate: { label: '企業公告', color: '#4ECDC4' },
      public_macro: { label: '宏觀事件', color: '#FFD93D' },
      public_policy: { label: '政策法規', color: '#6C5CE7' },
      public_legal: { label: '法律訴訟', color: '#FF9500' }
    };
  }
}

// ===== Impact Style Helper (single source of truth) =====
function getImpactStyle(impact) {
  if (APP_CONFIG && APP_CONFIG.impact && APP_CONFIG.impact[impact]) {
    const cfg = APP_CONFIG.impact[impact];
    return { label: cfg.label, color: cfg.color, marker: cfg.marker, offset: cfg.markerOffset };
  }
  // Fallback
  const map = {
    positive: { label: '利好', color: '#F04848', marker: '▲', offset: 18 },
    negative: { label: '利空', color: '#00B07C', marker: '▼', offset: -18 },
    neutral:  { label: '中性', color: '#888888', marker: '◆', offset: 0 }
  };
  return map[impact] || map.neutral;
}

// ===== Config Accessors =====
function getChartConfig() {
  return (APP_CONFIG && APP_CONFIG.chart) || {
    theme: 'dark',
    candle: { upColor: '#F04848', downColor: '#00B07C', noChangeColor: '#76808F' },
    crosshair: { lineColor: '#555', textBg: '#373a40' },
    indicators: { MA: { periods: [5, 10, 20, 60] }, VOL: { height: 80 } },
    marker: { fontSize: 14, fontFamily: 'Arial', priceOffsetRatio: { positive: 0.99, negative: 1.01 } }
  };
}

function getTimeRanges() {
  return (APP_CONFIG && APP_CONFIG.timeRanges) || [
    { label: '3M', tradingDays: 63 }, { label: '6M', tradingDays: 126 },
    { label: '1Y', tradingDays: 252 }, { label: '3Y', tradingDays: 756 },
    { label: '全部', tradingDays: -1 }
  ];
}

function getSearchConfig() {
  return (APP_CONFIG && APP_CONFIG.search) || { maxResults: 15, stockListUrl: 'data/stock_list.json', fallbackStocks: [] };
}

function getExchanges() {
  return (APP_CONFIG && APP_CONFIG.exchanges) || {};
}

// ===== Storage Utilities =====
function getUserEvents() {
  try { return JSON.parse(localStorage.getItem(LS_EVENTS) || '[]'); } catch { return []; }
}
function saveUserEvents(evts) { localStorage.setItem(LS_EVENTS, JSON.stringify(evts)); }
function getLog() { try { return JSON.parse(localStorage.getItem(LS_LOG) || '[]'); } catch { return []; } }
function addLog(action, id, changes) {
  const log = getLog();
  log.push({ action, event_id: id, timestamp: new Date().toISOString(), changes });
  localStorage.setItem(LS_LOG, JSON.stringify(log));
}

// ===== Event Merging =====
function getMergedEvents(stock) {
  const user = getUserEvents().filter(e => (e.related_stocks || []).includes(stock.symbol));
  return [...(stock.events || []), ...user];
}

// ===== Panel Control =====
function closeAllPanels() {
  document.getElementById('sidePanel').classList.remove('open');
  document.getElementById('adminPanel').classList.remove('open');
  document.getElementById('overlayBg').classList.remove('open');
}
