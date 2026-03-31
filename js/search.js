// ===== Stock List =====
async function loadStockList() {
  var cfg = getSearchConfig();
  try {
    var resp = await fetch(cfg.stockListUrl || 'data/stock_list.json');
    if (resp.ok) { stockList = await resp.json(); return; }
  } catch (e) {}

  // Fallback from config
  stockList = cfg.fallbackStocks || [];
}

// ===== Search =====
function setupSearch() {
  var input = document.getElementById('searchInput');
  var dropdown = document.getElementById('searchDropdown');
  var cfg = getSearchConfig();
  var maxResults = cfg.maxResults || 15;

  input.addEventListener('input', function() {
    var q = input.value.trim().toLowerCase();
    if (q.length < 1) { dropdown.classList.remove('open'); return; }

    var results = stockList.filter(function(s) {
      return s.code.toLowerCase().startsWith(q) || s.name.toLowerCase().includes(q);
    }).slice(0, maxResults);

    if (!results.length) {
      dropdown.innerHTML = '<div class="search-item" style="color:var(--text-secondary)">無結果</div>';
    } else {
      dropdown.innerHTML = results.map(function(s) {
        return '<div class="search-item" onclick="openStock(\'' + s.exchange + '\',\'' + s.code + '\',\'' + s.name.replace(/'/g, "\\'") + '\')">' +
          '<span><span class="code">' + s.code + '</span> <span class="name">' + s.name + '</span></span>' +
          '<span class="market-tag">' + s.exchange + '</span>' +
          '</div>';
      }).join('');
    }
    dropdown.classList.add('open');
  });

  input.addEventListener('blur', function() { setTimeout(function() { dropdown.classList.remove('open'); }, 200); });
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { dropdown.classList.remove('open'); input.blur(); }
  });
}
