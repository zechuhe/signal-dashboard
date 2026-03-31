// ===== Event List =====
function toggleEvtList() {
  const p = document.getElementById('evtListPanel');
  p.classList.toggle('open');
  document.getElementById('evtListBtn').textContent = p.classList.contains('open') ? '收起' : '事件列表';
  // Resize chart after panel toggle
  setTimeout(() => { if (chart) chart.resize(); }, 50);
}

function buildEventList(stock) {
  const events = getMergedEvents(stock);
  const tbody = document.getElementById('evtListBody');
  document.getElementById('evtCount').textContent = `${events.length} 則事件`;

  if (!events.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-secondary);padding:10px">無事件</td></tr>';
    return;
  }
  const sorted = [...events].sort((a, b) => b.date.localeCompare(a.date));
  tbody.innerHTML = sorted.map(evt => {
    const cat = CATEGORIES[evt.category] || { label: evt.category, color: '#888' };
    const impLabel = evt.expected_impact === 'negative' ? '利空' : evt.expected_impact === 'positive' ? '利好' : '中性';
    const impColor = evt.expected_impact === 'negative' ? 'var(--up-color)' : evt.expected_impact === 'positive' ? 'var(--down-color)' : 'var(--text-secondary)';
    const isUser = (evt.event_id || '').startsWith('user_');
    const actions = isUser
      ? `<button class="btn-xs" onclick="editEvent('${evt.event_id}')">編輯</button> <button class="btn-xs" onclick="deleteEvent('${evt.event_id}')">刪除</button>`
      : `<span style="font-size:10px;color:var(--text-secondary)">${evt.source_type||'demo'}</span>`;
    return `<tr onclick="openSidePanel(JSON.parse(decodeURIComponent('${encodeURIComponent(JSON.stringify(evt))}')))" style="cursor:pointer">
      <td style="white-space:nowrap">${evt.date}</td>
      <td><span class="evt-dot" style="background:${cat.color}"></span>${cat.label}</td>
      <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${evt.title}">${evt.title}</td>
      <td style="color:${impColor}">${impLabel}</td>
      <td>${Math.round((evt.confidence||0)*100)}%</td>
      <td>${evt.source_type||''}</td>
      <td onclick="event.stopPropagation()" style="white-space:nowrap">${actions}</td>
    </tr>`;
  }).join('');
}

function filterEventList() {
  const q = document.getElementById('evtSearch').value.trim().toLowerCase();
  document.querySelectorAll('#evtListBody tr').forEach(tr => {
    tr.style.display = q ? (tr.textContent.toLowerCase().includes(q) ? '' : 'none') : '';
  });
}

// ===== Side Panel =====
function openSidePanel(evt) {
  const cat = CATEGORIES[evt.category] || { label: evt.category, color: '#888' };
  const impCls = evt.expected_impact === 'negative' ? 'background:rgba(240,72,72,0.15);color:#F04848'
    : evt.expected_impact === 'positive' ? 'background:rgba(0,176,124,0.15);color:#00B07C'
    : 'background:rgba(136,136,136,0.15);color:#888';
  const impLabel = evt.expected_impact === 'negative' ? '利空' : evt.expected_impact === 'positive' ? '利好' : '中性';

  document.getElementById('spTitle').textContent = evt.title;
  document.getElementById('spBody').innerHTML = `
    <div class="sp-field"><div class="sp-label">日期</div><div class="sp-value">${evt.date}</div></div>
    <div class="sp-field"><div class="sp-label">分類</div><div class="sp-value"><span style="color:${cat.color}">${cat.label}</span></div></div>
    <div class="sp-field"><div class="sp-label">預期影響</div><div class="sp-value"><span class="sp-impact" style="${impCls}">${impLabel}</span> 信心 ${Math.round((evt.confidence||0)*100)}%</div></div>
    <div class="sp-field"><div class="sp-label">描述</div><div class="sp-value">${evt.description||''}</div></div>
    <div class="sp-field"><div class="sp-label">來源</div><div class="sp-value">${evt.source_url ? `<a class="sp-link" href="${evt.source_url}" target="_blank">${evt.source_url}</a>` : '<span style="color:#888">私人消息</span>'}</div></div>
    <div class="sp-field"><div class="sp-label">標籤</div><div class="sp-value">${(evt.tags||[]).map(t=>`<span class="sp-tag">${t}</span>`).join('')}</div></div>
  `;
  document.getElementById('sidePanel').classList.add('open');
  document.getElementById('overlayBg').classList.add('open');
}

function closeSidePanel() {
  document.getElementById('sidePanel').classList.remove('open');
  if (!document.getElementById('adminPanel').classList.contains('open')) {
    document.getElementById('overlayBg').classList.remove('open');
  }
}

// ===== Import / Export =====
function importEvents(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      let events = [];
      if (Array.isArray(data)) events = data;
      else if (data.events) events = data.events;
      else if (data.cases) data.cases.forEach(c => events.push(...(c.events || [])));

      // Merge into current tab's events
      if (activeTabIdx >= 0) {
        openStocks[activeTabIdx].events = [...openStocks[activeTabIdx].events, ...events];
        renderChart(openStocks[activeTabIdx]);
        buildEventList(openStocks[activeTabIdx]);
      }
      alert(`已載入 ${events.length} 則事件`);
    } catch (err) { alert('解析失敗: ' + err.message); }
  };
  reader.readAsText(file);
  input.value = '';
}

function exportAll() {
  const userEvents = getUserEvents();
  const log = getLog();
  const output = { exported_at: new Date().toISOString(), user_events: userEvents, edit_log: log };
  const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `signal_dashboard_export_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
}

// ===== Demo Mode =====
async function loadDemo() {
  try {
    const eventsData = await (await fetch('data/events.json')).json();
    // Open first stock of first case
    const firstCase = eventsData.cases[0];
    const symbol = firstCase.related_stocks[0];
    const [exchange, code] = symbol.split(':');

    // Load price data
    const fname = `data/price_${exchange}_${code}.json`;
    const priceResp = await fetch(fname);
    if (!priceResp.ok) { alert('Demo 數據載入失敗'); return; }
    const priceJson = await priceResp.json();

    // Add all cases' events
    const allEvents = [];
    eventsData.cases.forEach(c => allEvents.push(...c.events));

    openStocks.push({
      symbol, name: priceJson.meta.name, exchange, code,
      priceData: priceJson.data,
      events: allEvents
    });
    switchTab(openStocks.length - 1);
    buildTabs();
  } catch (e) { alert('Demo 載入失敗: ' + e.message); }
}
