// ===== Constants =====
const CATEGORIES = {
  insider_private: { label: '私人消息', color: '#FF6B6B' },
  public_corporate: { label: '企業公告', color: '#4ECDC4' },
  public_macro: { label: '宏觀事件', color: '#FFD93D' },
  public_policy: { label: '政策法規', color: '#6C5CE7' },
  public_legal: { label: '法律訴訟', color: '#FF9500' }
};
const LS_EVENTS = 'sd_user_events';
const LS_LOG = 'sd_edit_log';

// ===== Utility Functions =====
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

function getMergedEvents(stock) {
  const user = getUserEvents().filter(e => (e.related_stocks || []).includes(stock.symbol));
  // TODO: also merge imported events and auto-fetched events
  return [...(stock.events || []), ...user];
}

function closeAllPanels() {
  document.getElementById('sidePanel').classList.remove('open');
  document.getElementById('adminPanel').classList.remove('open');
  document.getElementById('overlayBg').classList.remove('open');
}
