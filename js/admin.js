// ===== Admin Panel =====
let currentAdminTab = 'events';

function toggleAdmin() {
  const panel = document.getElementById('adminPanel');
  const overlay = document.getElementById('overlayBg');
  panel.classList.toggle('open');
  overlay.classList.toggle('open', panel.classList.contains('open'));
  if (panel.classList.contains('open')) renderAdminTab(currentAdminTab);
}

function switchAdminTab(tab, el) {
  currentAdminTab = tab;
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  renderAdminTab(tab);
}

function renderAdminTab(tab) {
  const body = document.getElementById('adminBody');
  if (tab === 'events') renderAdminEvents(body);
  else if (tab === 'log') renderAdminLog(body);
  else if (tab === 'config') renderAdminConfig(body);
}

function renderAdminEvents(body) {
  const userEvents = getUserEvents();
  // Also gather loaded events from open tabs
  let allEvts = [...userEvents];
  openStocks.forEach(s => { if (s.events) allEvts.push(...s.events); });

  // Deduplicate by event_id
  const seen = new Set();
  allEvts = allEvts.filter(e => { if (seen.has(e.event_id)) return false; seen.add(e.event_id); return true; });
  allEvts.sort((a, b) => b.date.localeCompare(a.date));

  if (!allEvts.length) {
    body.innerHTML = '<div style="text-align:center;color:var(--text-secondary);padding:30px;">暫無事件。使用「+ 私人消息」新增或「載入事件」匯入。</div>';
    return;
  }

  body.innerHTML = `<div class="admin-section"><h4>全部事件 (${allEvts.length})</h4></div>` +
    allEvts.map(evt => {
      const cat = CATEGORIES[evt.category] || { label: '?', color: '#888' };
      const isUser = (evt.event_id || '').startsWith('user_');
      const srcLabel = isUser ? '私人' : (evt.source_type || 'demo');
      const srcClass = isUser ? 'background:rgba(255,107,107,0.15);color:#FF6B6B' : '';
      return `<div class="admin-evt-row">
        <span class="evt-date">${evt.date}</span>
        <span class="evt-dot" style="background:${cat.color}"></span>
        <span class="evt-title" title="${evt.title}">${evt.title}</span>
        <span class="evt-src" style="${srcClass}">${srcLabel}</span>
        <div class="admin-evt-actions">
          ${isUser ? `<button class="btn-xs" onclick="editEvent('${evt.event_id}');toggleAdmin()">編輯</button><button class="btn-xs" onclick="deleteEvent('${evt.event_id}')">刪除</button>` : ''}
          <button class="btn-xs" onclick="openSidePanel(JSON.parse(decodeURIComponent('${encodeURIComponent(JSON.stringify(evt))}')));toggleAdmin()">詳情</button>
        </div>
      </div>`;
    }).join('');
}

function renderAdminLog(body) {
  const log = getLog();
  if (!log.length) {
    body.innerHTML = '<div style="text-align:center;color:var(--text-secondary);padding:30px;">暫無操作紀錄。</div>';
    return;
  }

  const sorted = [...log].reverse();
  body.innerHTML = `<div class="admin-section"><h4>操作日誌 (${sorted.length})</h4></div>` +
    sorted.map(l => {
      const actionCls = l.action === 'create' ? 'log-create' : l.action === 'edit' ? 'log-edit' : 'log-delete';
      const actionLabel = l.action === 'create' ? '新增' : l.action === 'edit' ? '編輯' : '刪除';
      const time = l.timestamp ? l.timestamp.slice(0, 19).replace('T', ' ') : '';
      const detail = l.changes ? (l.changes.title || l.changes.new_title || l.changes.old_title || '') : '';
      return `<div class="log-entry">
        <span class="log-action ${actionCls}">${actionLabel}</span>
        <span class="log-time">${time}</span>
        <span class="log-detail">${detail}</span>
      </div>`;
    }).join('') +
    `<div style="margin-top:12px;"><button class="btn" onclick="clearLog()">清除日誌</button></div>`;
}

function clearLog() {
  if (!confirm('確定清除所有操作日誌？')) return;
  localStorage.setItem(LS_LOG, '[]');
  renderAdminTab('log');
}

function renderAdminConfig(body) {
  const sources = [
    { name: 'HKEX News', desc: '港交所公告', key: 'hkex', status: true },
    { name: 'Google News', desc: '財經新聞 RSS', key: 'google_news', status: true },
    { name: 'Eastmoney', desc: '東方財富', key: 'eastmoney', status: true }
  ];

  body.innerHTML = `
    <div class="admin-section"><h4>數據來源狀態</h4></div>
    ${sources.map(s => `<div class="config-item">
      <div>
        <div class="cfg-name">${s.name}</div>
        <div style="font-size:10px;color:var(--text-secondary)">${s.desc}</div>
      </div>
      <span class="cfg-status ${s.status ? 'cfg-on' : 'cfg-off'}">${s.status ? '啟用' : '停用'}</span>
    </div>`).join('')}
    <div class="admin-section" style="margin-top:16px;"><h4>數據管理</h4></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn" onclick="exportAll()">匯出全部數據</button>
      <button class="btn" onclick="clearUserEvents()">清除私人消息</button>
      <button class="btn" onclick="clearLog()">清除日誌</button>
    </div>
    <div class="admin-section" style="margin-top:16px;"><h4>使用說明</h4></div>
    <div style="font-size:11px;color:var(--text-secondary);line-height:1.6;">
      <p>1. 搜尋框輸入代碼或名稱 → 開 tab 查看 K 線圖</p>
      <p>2. 「+ 私人消息」新增事件 → 自動標記在圖表上</p>
      <p>3. 「載入事件」匯入 fetch_news.py 產出的 JSON</p>
      <p>4. 事件列表可搜尋/編輯/刪除</p>
      <p>5. ▲ 利多 / ▼ 利空 / ◆ 中性</p>
    </div>
  `;
}
