/* Onyx Binary Signal Bot — frontend app logic.
   FREE stack only. No secrets, no strategy logic, no method details here.
   The app only asks the server for finished signals and shows them.
   BETA: sample data is clearly marked SAMPLE / TEST DATA until the API is live.

   SCOPE (Nov 24, owner decision): REAL PAIRS ONLY for now.
   OTC is "coming soon" — no OTC signal is ever shown as live. Any OTC
   entry coming back from the API is filtered out of the feed and results.
*/

'use strict';

/* ---------- Config: API base URL in ONE place ----------
   Default: local backend. Override with ?api=https://your-render-url/api
   or by saving 'onyx_api_base' in localStorage. */
var ONYX_CONFIG = {
  API_BASE: 'http://localhost:8000/api',
  PRICE_USDT: 1.97,
  FREE_DAILY_SIGNALS: 10, // owner's call Nov 24: free = 10 signals/day (for now)
  PREMIUM_DAILY_SIGNALS: 5
};

(function resolveApiBase() {
  try {
    var params = new URLSearchParams(window.location.search);
    var q = params.get('api');
    var saved = window.localStorage.getItem('onyx_api_base');
    if (q) { ONYX_CONFIG.API_BASE = q.replace(/\/$/, ''); }
    else if (saved) { ONYX_CONFIG.API_BASE = saved.replace(/\/$/, ''); }
  } catch (e) { /* storage/query unavailable — keep default */ }
})();

/* ---------- Sample data (BETA / TEST DATA — never presented as live) ----------
   Real-market pairs ONLY. No OTC signals anywhere. */
var SAMPLE_SIGNALS = [
  { id: 's1', pair: 'EUR/USD', direction: 'CALL', entry_time: '14:30', expiry: '5 min', strategy: 'Elite', broker: 'Quotex', market: 'Real', time: '14:28' },
  { id: 's2', pair: 'GBP/USD', direction: 'PUT', entry_time: '14:45', expiry: '5 min', strategy: 'Turbo', broker: 'Pocket Option', market: 'Real', time: '14:41' },
  { id: 's3', pair: 'USD/JPY', direction: 'CALL', entry_time: '15:00', expiry: '15 min', strategy: 'Prime', broker: 'Olymp Trade', market: 'Real', time: '14:52' },
  { id: 's4', pair: 'EUR/JPY', direction: 'PUT', entry_time: '15:20', expiry: '5 min', strategy: 'Elite', broker: 'Quotex', market: 'Real', time: '15:05' },
  { id: 's5', pair: 'AUD/USD', direction: 'CALL', entry_time: '15:40', expiry: '1 min', strategy: 'Turbo', broker: 'Olymp Trade', market: 'Real', time: '15:31' }
];

var SAMPLE_RESULTS = [
  { id: 'r1', pair: 'EUR/USD', direction: 'CALL', strategy: 'Elite', broker: 'Quotex', market: 'Real', result: 'WIN', time: '13:15', day: 'today' },
  { id: 'r2', pair: 'GBP/USD', direction: 'PUT', strategy: 'Turbo', broker: 'Pocket Option', market: 'Real', result: 'LOSS', time: '12:40', day: 'today' },
  { id: 'r3', pair: 'USD/JPY', direction: 'CALL', strategy: 'Prime', broker: 'Olymp Trade', market: 'Real', result: 'WIN', time: '11:05', day: 'today' },
  { id: 'r4', pair: 'EUR/JPY', direction: 'PUT', strategy: 'Elite', broker: 'Quotex', market: 'Real', result: 'WIN', time: '10:20', day: 'today' },
  { id: 'r5', pair: 'AUD/USD', direction: 'PUT', strategy: 'Turbo', broker: 'Olymp Trade', market: 'Real', result: 'LOSS', time: '09:30', day: 'yesterday' },
  { id: 'r6', pair: 'EUR/USD', direction: 'PUT', strategy: 'Prime', broker: 'Quotex', market: 'Real', result: 'WIN', time: '16:10', day: 'yesterday' }
];

/* OTC pairs: shown ONLY as "Coming soon" — never as live signals. */
var OTC_COMING_SOON = [
  { pair: 'EUR/USD OTC', broker: 'Quotex' },
  { pair: 'GBP/USD OTC', broker: 'Pocket Option' },
  { pair: 'USD/JPY OTC', broker: 'Olymp Trade' },
  { pair: 'EUR/JPY OTC', broker: 'Quotex' }
];

/* TradingView symbols for real-market pairs only. */
var TV_SYMBOLS = {
  'EUR/USD': 'FX:EURUSD',
  'GBP/USD': 'FX:GBPUSD',
  'USD/JPY': 'FX:USDJPY',
  'EUR/JPY': 'FX:EURJPY',
  'AUD/USD': 'FX:AUDUSD',
  'USD/CAD': 'FX:USDCAD'
};

/* ---------- State ---------- */
var state = {
  plan: 'free',          // 'free' | 'premium' (preview toggle)
  theme: 'night',        // 'night' | 'day'
  broker: 'All',
  strategy: 'All',
  network: 'BSC',        // 'BSC' | 'Tron'
  signals: [],
  results: [],
  live: false            // true only when the API answered
};

try {
  state.plan = window.localStorage.getItem('onyx_plan') || 'free';
  state.theme = window.localStorage.getItem('onyx_theme') || 'night';
} catch (e) { /* keep defaults */ }

/* ---------- Helpers ---------- */
function $(id) { return document.getElementById(id); }
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function isRealMarket(item) {
  return String(item.market || 'Real').toLowerCase() !== 'otc';
}
function save(key, value) {
  try { window.localStorage.setItem(key, value); } catch (e) { /* ignore */ }
}

/* ---------- Navigation ---------- */
function showScreen(name) {
  var screens = document.querySelectorAll('.screen');
  screens.forEach(function (el) { el.classList.remove('active'); });
  var target = $('screen-' + name);
  if (target) { target.classList.add('active'); }
  var navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(function (btn) {
    btn.classList.toggle('active', btn.getAttribute('data-goto') === name);
  });
  window.scrollTo(0, 0);
}

document.addEventListener('click', function (e) {
  var gotoBtn = e.target.closest('[data-goto]');
  if (gotoBtn) { showScreen(gotoBtn.getAttribute('data-goto')); return; }
  var brokerLink = e.target.closest('[data-broker-link]');
  if (brokerLink) {
    setBrokerFilter(brokerLink.getAttribute('data-broker-link'));
    showScreen('signals');
    return;
  }
  var strategyLink = e.target.closest('[data-strategy-link]');
  if (strategyLink) {
    setStrategyFilter(strategyLink.getAttribute('data-strategy-link'));
    showScreen('signals');
  }
});

/* ---------- Theme ---------- */
function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  var btn = $('themeToggle');
  if (btn) { btn.textContent = state.theme === 'night' ? '☾ Night' : '☀ Day'; }
  save('onyx_theme', state.theme);
}
$('themeToggle').addEventListener('click', function () {
  state.theme = state.theme === 'night' ? 'day' : 'night';
  applyTheme();
});

/* ---------- Free / Premium preview toggle ---------- */
function applyPlan() {
  var btn = $('planToggle');
  if (btn) { btn.textContent = state.plan === 'premium' ? '★ Premium preview' : 'Free preview'; }
  save('onyx_plan', state.plan);
  // Premium removes ads; free shows the "Ad space" placeholders.
  var ads = document.querySelectorAll('[data-ad-slot]');
  ads.forEach(function (el) { el.classList.toggle('hidden', state.plan === 'premium'); });
  renderSignals();
  renderResults();
  updateTodayCount();
}
$('planToggle').addEventListener('click', function () {
  state.plan = state.plan === 'free' ? 'premium' : 'free';
  applyPlan();
});

/* ---------- Filters (real-market signals only) ---------- */
function setBrokerFilter(broker) {
  state.broker = broker;
  var btns = document.querySelectorAll('#brokerFilter .filter-btn');
  btns.forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-broker') === broker); });
  renderSignals();
}
function setStrategyFilter(strategy) {
  state.strategy = strategy;
  var btns = document.querySelectorAll('#strategyFilter .filter-btn');
  btns.forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-strategy') === strategy); });
  renderSignals();
}
$('brokerFilter').addEventListener('click', function (e) {
  var btn = e.target.closest('[data-broker]');
  if (btn) { setBrokerFilter(btn.getAttribute('data-broker')); }
});
$('strategyFilter').addEventListener('click', function (e) {
  var btn = e.target.closest('[data-strategy]');
  if (btn) { setStrategyFilter(btn.getAttribute('data-strategy')); }
});

function filteredSignals() {
  return state.signals.filter(function (s) {
    if (!isRealMarket(s)) { return false; } // OTC never reaches the feed
    if (state.broker !== 'All' && s.broker !== state.broker) { return false; }
    if (state.strategy !== 'All' && s.strategy !== state.strategy) { return false; }
    return true;
  });
}

/* ---------- Signal feed ---------- */
function signalCardHtml(s) {
  var dirClass = s.direction === 'CALL' ? 'call' : 'put';
  var marketBadge = s.strategy === 'Prime'
    ? '<span class="badge real">REAL MARKET ONLY</span>'
    : '<span class="badge otc">' + esc(s.market) + ' Market</span>';
  return '<article class="card signal-card" data-pair="' + esc(s.pair) + '">' +
    '<div class="signal-top"><div><span class="badge beta">SAMPLE</span> ' +
    '<span class="badge">NEW SIGNAL — ' + esc(s.strategy.toUpperCase()) + '</span></div>' +
    '<span class="direction ' + dirClass + '">' + esc(s.direction) + '</span></div>' +
    '<div class="signal-top" style="margin-top:6px;"><span class="pair">' + esc(s.pair) + '</span>' + marketBadge + '</div>' +
    '<div class="signal-rows">' +
    '<div><span>Direction</span><strong>' + esc(s.direction) + '</strong></div>' +
    '<div><span>Entry Time</span><strong>' + esc(s.entry_time) + '</strong></div>' +
    '<div><span>Expiry</span><strong>' + esc(s.expiry) + '</strong></div>' +
    '<div><span>Broker</span><strong>' + esc(s.broker) + '</strong></div>' +
    '<div><span>Strategy</span><strong>' + esc(s.strategy) + '</strong></div>' +
    '<div><span>Time</span><strong>' + esc(s.time) + '</strong></div>' +
    '</div>' +
    '<p class="risk-note">Risk note: Use fixed, small risk. No signal is 100%. Skip if the entry time has passed.</p>' +
    '<button class="btn small secondary" type="button" data-chart-pair="' + esc(s.pair) + '">View chart</button>' +
    '</article>';
}

function lockedCardHtml() {
  return '<article class="card signal-card locked-card">' +
    '<div class="lock-icon">🔒</div>' +
    '<p><strong>Premium Signal — Locked</strong></p>' +
    '<span class="badge locked">Locked</span>' +
    '<p class="small">This signal passed all our private checks. Unlock all signals, entry times and expiry with Premium — 1.97 USDT/month, paid in USDT.</p>' +
    '<button class="btn small" type="button" data-goto="premium">Unlock With Premium</button>' +
    '</article>';
}

function renderSignals() {
  var feed = $('signalFeed');
  var empty = $('emptyState');
  var note = $('freeLimitNote');
  if (!feed) { return; }
  var list = filteredSignals();
  var visibleLimit = state.plan === 'premium' ? list.length : ONYX_CONFIG.FREE_DAILY_SIGNALS;

  if (state.plan === 'free') {
    note.textContent = 'Free plan: ' + ONYX_CONFIG.FREE_DAILY_SIGNALS + ' sample signals a day. Premium unlocks up to ' + ONYX_CONFIG.PREMIUM_DAILY_SIGNALS + ' signals a day with full details.';
  } else {
    note.textContent = 'Premium preview: all signals unlocked, up to ' + ONYX_CONFIG.PREMIUM_DAILY_SIGNALS + ' signals a day, no ads.';
  }

  if (list.length === 0) {
    feed.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  var html = '';
  list.forEach(function (s, i) {
    if (i < visibleLimit) {
      html += signalCardHtml(s);
      // Owner's call (Nov 24): free tier shows an ad on EACH signal.
      if (state.plan === 'free') { html += '<div class="ad-slot" data-ad-slot>Ad space</div>'; }
    }
    else { html += lockedCardHtml(); }
  });
  feed.innerHTML = html;
}

/* Tap a signal's "View chart" button to load its pair in TradingView. */
$('signalFeed').addEventListener('click', function (e) {
  var btn = e.target.closest('[data-chart-pair]');
  if (btn) { loadChart(btn.getAttribute('data-chart-pair')); }
});

/* ---------- OTC "Coming soon" section ---------- */
function renderOtcComingSoon() {
  var box = $('otcComingSoon');
  if (!box) { return; }
  var html = '';
  OTC_COMING_SOON.forEach(function (item) {
    html += '<div class="broker-card"><div><strong>' + esc(item.pair) + '</strong>' +
      '<span>' + esc(item.broker) + ' · OTC</span></div>' +
      '<span class="badge beta">Coming soon</span></div>';
  });
  box.innerHTML = html;
}

/* ---------- Results ---------- */
function renderResults() {
  var list = $('resultsList');
  var note = $('resultsNote');
  if (!list) { return; }
  var rows = state.results.filter(isRealMarket); // OTC never reaches results
  if (state.plan === 'free') {
    rows = rows.filter(function (r) { return r.day === 'today'; });
    note.textContent = 'Free plan: today only. Premium shows the full history.';
  } else {
    note.textContent = 'Premium preview: full history shown.';
  }
  if (rows.length === 0) {
    list.innerHTML = '<p class="small">No results yet today.</p>';
    return;
  }
  var html = '';
  rows.forEach(function (r) {
    var badge = r.result === 'WIN' ? 'win' : (r.result === 'LOSS' ? 'loss' : 'pending');
    html += '<div class="result-row"><div><span class="pair">' + esc(r.pair) + '</span> ' +
      '<span class="badge beta">SAMPLE</span><br>' +
      '<span class="meta">' + esc(r.strategy) + ' · ' + esc(r.direction) + ' · ' + esc(r.broker) +
      ' · Real Market · ' + esc(r.time) + ' · ' + esc(r.day) + '</span></div>' +
      '<span class="badge ' + badge + '">' + esc(r.result) + '</span></div>';
  });
  list.innerHTML = html;
}

/* ---------- Today's count (Home) ---------- */
function updateTodayCount() {
  var el = $('todayCount');
  if (!el) { return; }
  var n = filteredSignals().length;
  el.textContent = state.live
    ? "Today's signals: " + n + ' (live)'
    : "Today's signals: " + n + ' (sample data — BETA)';
}

/* ---------- TradingView widget (free embed, real-market pairs only) ---------- */
var tvLoaded = false;
function loadChart(pair) {
  var symbol = TV_SYMBOLS[pair];
  var container = $('tvWidget');
  var note = $('chartNote');
  if (!symbol || !container) {
    if (note) { note.textContent = 'Chart is available for real-market pairs only.'; }
    return;
  }
  container.innerHTML = '';
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.async = true;
  script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
  script.textContent = JSON.stringify({
    autosize: true,
    symbol: symbol,
    interval: '5',
    timezone: 'Etc/UTC',
    theme: state.theme === 'night' ? 'dark' : 'light',
    style: '1',
    locale: 'en',
    hide_side_toolbar: false,
    allow_symbol_change: true,
    support_host: 'https://www.tradingview.com'
  });
  container.appendChild(script);
  if (note) { note.textContent = 'Showing ' + pair + ' (real market).'; }
  tvLoaded = true;
}

/* ---------- Premium: network selector (placeholder wallets only) ---------- */
$('networkPicker').addEventListener('click', function (e) {
  var btn = e.target.closest('[data-network]');
  if (!btn) { return; }
  state.network = btn.getAttribute('data-network');
  var btns = document.querySelectorAll('#networkPicker .filter-btn');
  btns.forEach(function (b) { b.classList.toggle('active', b === btn); });
  $('networkLabel').textContent = state.network === 'BSC' ? 'BSC (BEP20)' : 'Tron (TRC20)';
});
$('premiumCta').addEventListener('click', function () {
  var txid = $('txidInput');
  if (txid) { txid.focus(); }
  window.scrollTo(0, document.querySelector('#screen-premium .wallet-box').offsetTop - 80);
});

/* ---------- TXID submit: POST to API, degrade gracefully when down ---------- */
$('txidSubmit').addEventListener('click', function () {
  var input = $('txidInput');
  var status = $('txidStatus');
  var txid = (input.value || '').trim();
  if (!txid) {
    status.textContent = 'Please paste your TXID first.';
    status.className = 'status error';
    return;
  }
  status.textContent = 'Checking your TXID…';
  status.className = 'status';
  fetch(ONYX_CONFIG.API_BASE + '/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ txid: txid, network: state.network, amount: ONYX_CONFIG.PRICE_USDT })
  })
    .then(function (res) {
      if (!res.ok) { throw new Error('HTTP ' + res.status); }
      return res.json();
    })
    .then(function () {
      status.textContent = 'Payment received. Welcome to Premium. All 3 strategies are now unlocked — Elite, Turbo and Prime (Real Market only). Up to 5 best signals a day, full entry time and expiry, no ads. Your Premium is active for 30 days from today.';
      status.className = 'status ok';
    })
    .catch(function () {
      // Content-pack wording + honest beta note. Nothing is faked as paid.
      status.textContent = 'We could not verify this TXID yet. Please check: 1) You sent USDT, 2) The network matches — BSC or Tron, 3) The TXID is pasted fully and correctly. Wait a few minutes and try again, or contact support with your TXID. (Server not reachable right now — your TXID was not sent. Wallet address not set yet — premium checkout is disabled in this beta build.)';
      status.className = 'status error';
    });
});

/* ---------- Data loading: API first, marked SAMPLE fallback ---------- */
function setStatus(el, text, kind) {
  if (!el) { return; }
  el.textContent = text;
  el.className = 'status' + (kind ? ' ' + kind : '');
}

function loadFromApi() {
  var timeoutMs = 6000;
  function fetchJson(path) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, timeoutMs);
    return fetch(ONYX_CONFIG.API_BASE + path, { signal: controller.signal })
      .finally(function () { clearTimeout(timer); })
      .then(function (res) {
        if (!res.ok) { throw new Error('HTTP ' + res.status); }
        return res.json();
      });
  }
  return Promise.all([fetchJson('/signals'), fetchJson('/results')])
    .then(function (parts) {
      var signals = Array.isArray(parts[0]) ? parts[0] : (parts[0].signals || []);
      var results = Array.isArray(parts[1]) ? parts[1] : (parts[1].results || []);
      // Real pairs only: drop any OTC entry the server may still send.
      state.signals = signals.filter(isRealMarket);
      state.results = results.filter(isRealMarket);
      state.live = true;
      setStatus($('signalsStatus'), 'Live signals loaded from the server.', 'ok');
      setStatus($('resultsStatus'), 'Live results loaded from the server.', 'ok');
    })
    .catch(function () {
      state.signals = SAMPLE_SIGNALS.slice();
      state.results = SAMPLE_RESULTS.slice();
      state.live = false;
      setStatus($('signalsStatus'), 'Server not reachable — showing SAMPLE signals for testing only (BETA).', 'error');
      setStatus($('resultsStatus'), 'Server not reachable — showing SAMPLE results for testing only (BETA).', 'error');
    })
    .then(function () {
      renderSignals();
      renderResults();
      updateTodayCount();
    });
}

/* ---------- Boot ---------- */
applyTheme();
applyPlan();
renderOtcComingSoon();
loadChart('EUR/USD');
loadFromApi();
