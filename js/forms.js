// ===== Add/Edit/Delete Events =====
function openAddForm() {
  editingId = null;
  document.getElementById('modalTitle').textContent = '新增私人消息';
  const sel = document.getElementById('fmStock');
  sel.innerHTML = '<option value="">— 請選擇 —</option>';
  openStocks.forEach(s => {
    sel.innerHTML += `<option value="${s.symbol}">${s.name} (${s.symbol})</option>`;
  });
  if (activeTabIdx >= 0) sel.value = openStocks[activeTabIdx].symbol;
  // Populate category selector from config
  var catSel = document.getElementById('fmCategory');
  catSel.innerHTML = Object.entries(CATEGORIES).map(function(entry) {
    return '<option value="' + entry[0] + '">' + entry[1].label + '</option>';
  }).join('');
  catSel.value = 'insider_private';
  document.getElementById('fmTitle').value = '';
  document.getElementById('fmDesc').value = '';
  document.getElementById('fmDateRcv').value = new Date().toISOString().slice(0,10);
  document.getElementById('fmDateEvt').value = '';
  document.getElementById('fmDateEvt').disabled = false;
  document.getElementById('fmDateUnk').checked = false;
  document.getElementById('fmImpact').value = 'negative';
  document.getElementById('fmSrcLvl').value = '';
  document.getElementById('fmConf').value = 50;
  document.getElementById('fmConfV').textContent = '50%';
  document.getElementById('addModal').classList.add('open');
}

function closeAddForm() { document.getElementById('addModal').classList.remove('open'); }

function submitEvent() {
  const stock = document.getElementById('fmStock').value;
  const title = document.getElementById('fmTitle').value.trim();
  const desc = document.getElementById('fmDesc').value.trim();
  const dateRcv = document.getElementById('fmDateRcv').value;
  const dateEvt = document.getElementById('fmDateUnk').checked ? null : document.getElementById('fmDateEvt').value;
  const impact = document.getElementById('fmImpact').value;
  const conf = parseInt(document.getElementById('fmConf').value) / 100;
  const srcLvl = document.getElementById('fmSrcLvl').value;

  if (!stock) return alert('請選擇關聯股票');
  if (!title) return alert('請輸入事件標題');
  if (!desc) return alert('請輸入事件描述');
  if (!dateRcv) return alert('請選擇消息取得日期');

  const events = getUserEvents();
  if (editingId) {
    const idx = events.findIndex(e => e.event_id === editingId);
    if (idx < 0) return;
    events[idx] = { ...events[idx], date: dateEvt || dateRcv, date_received: dateRcv, date_event_estimated: dateEvt, title, description: desc, related_stocks: [stock], expected_impact: impact, confidence: conf, metadata: { ...events[idx].metadata, source_level: srcLvl, last_edited: new Date().toISOString() } };
    addLog('edit', editingId, { title });
    editingId = null;
  } else {
    const category = document.getElementById('fmCategory').value || 'insider_private';
    const sourceType = category === 'insider_private' ? 'private' : 'manual';
    const evt = { event_id: 'user_' + Date.now(), date: dateEvt || dateRcv, date_received: dateRcv, date_event_estimated: dateEvt, title, description: desc, category: category, source_type: sourceType, source_url: '', related_stocks: [stock], expected_impact: impact, confidence: conf, tags: ['user_input'], metadata: { source_level: srcLvl, created_at: new Date().toISOString() } };
    events.push(evt);
    addLog('create', evt.event_id, { title });
  }
  saveUserEvents(events);
  closeAddForm();
  if (activeTabIdx >= 0) { renderChart(openStocks[activeTabIdx]); buildEventList(openStocks[activeTabIdx]); }
}

function editEvent(id) {
  const events = getUserEvents();
  const evt = events.find(e => e.event_id === id);
  if (!evt) return;
  editingId = id;
  openAddForm();
  document.getElementById('modalTitle').textContent = '編輯事件';
  document.getElementById('fmStock').value = (evt.related_stocks||[])[0] || '';
  document.getElementById('fmCategory').value = evt.category || 'insider_private';
  document.getElementById('fmTitle').value = evt.title;
  document.getElementById('fmDesc').value = evt.description;
  document.getElementById('fmDateRcv').value = evt.date_received || evt.date;
  document.getElementById('fmDateEvt').value = evt.date_event_estimated || '';
  document.getElementById('fmDateUnk').checked = !evt.date_event_estimated;
  document.getElementById('fmDateEvt').disabled = !evt.date_event_estimated;
  document.getElementById('fmImpact').value = evt.expected_impact;
  document.getElementById('fmSrcLvl').value = (evt.metadata && evt.metadata.source_level) || '';
  document.getElementById('fmConf').value = Math.round(evt.confidence * 100);
  document.getElementById('fmConfV').textContent = Math.round(evt.confidence * 100) + '%';
}

function deleteEvent(id) {
  if (!confirm('確定刪除？')) return;
  let events = getUserEvents();
  const del = events.find(e => e.event_id === id);
  events = events.filter(e => e.event_id !== id);
  saveUserEvents(events);
  addLog('delete', id, del ? { title: del.title } : {});
  if (activeTabIdx >= 0) { renderChart(openStocks[activeTabIdx]); buildEventList(openStocks[activeTabIdx]); }
}

function clearUserEvents() {
  if (!confirm('確定清除所有私人消息？此操作不可逆。')) return;
  localStorage.setItem(LS_EVENTS, '[]');
  if (activeTabIdx >= 0) { renderChart(openStocks[activeTabIdx]); buildEventList(openStocks[activeTabIdx]); }
  renderAdminTab('events');
}
