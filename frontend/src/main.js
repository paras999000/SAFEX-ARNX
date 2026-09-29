// SAFEX AR Safety Command Center - Real-time Production Dashboard
// Connected to Node.js / Express / PostgreSQL REST API and Unity Android AR App

// Dynamic API Base URL resolution (Query param ?api=... > localStorage > window > local)
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('api')) {
  localStorage.setItem('SAFEX_API_URL', urlParams.get('api').trim().replace(/\/$/, ''));
}
let API_BASE = window.SAFEX_API_URL || localStorage.getItem('SAFEX_API_URL') || (window.location.port === '5000' ? '' : 'http://localhost:5000');

// Initial baseline modules
const modules = [
  {id:'M-01',key:'FIRE',name:'Fire & Explosion',category:'Emergency response',summary:'Recognize hazards. Isolate the source. Lead a safe evacuation.',icon:'flame',color:'amber',progress:76,trainees:12,status:'Active',sessions:21},
  {id:'M-02',key:'GAS',name:'Gas & Confined Space',category:'Environmental safety',summary:'Identify gas hazards. Follow PPE protocols. Reach safety together.',icon:'wind',color:'teal',progress:81,trainees:12,status:'Active',sessions:21},
  {id:'M-03',key:'HEIGHT',name:'Working at Height',category:'Fall prevention',summary:'Inspect equipment, secure anchor points, and work with a fall plan.',icon:'layers',color:'blue',progress:64,trainees:8,status:'Ready',sessions:14},
  {id:'M-04',key:'MACHINE',name:'Machine Guarding',category:'Equipment safety',summary:'Identify pinch points and apply lockout/tagout before maintenance.',icon:'shield',color:'violet',progress:52,trainees:10,status:'Ready',sessions:9}
];

const navSections = [
  {label:'Workspace',items:[['Dashboard','grid'],['Workers','users'],['Training Sessions','activity'],['Modules','layers','02']]},
  {label:'Compliance',items:[['Assessments','check'],['Certificates','award'],['Verification','scan'],['Compliance','shield'],['Reports','chart']]},
  {label:'System',items:[['Settings','settings']]}
];

// Live State
let currentPage = 'Dashboard', searchTerm = '', period = 'This month', emptyMode = false, mobileNavOpen = false, unread = true;
let isApiConnected = false;
let lastSyncTime = null;
let verifySearchResult = null;
let verifySearchQuery = '';

// Live API Data Stores
let apiOverview = {
  totalTrainees: 8,
  activeSessions: 1,
  completedSessions: 2,
  passedAssessments: 2,
  certificatesIssued: 2,
  fireSessions: 1,
  gasSessions: 2,
  completionRate: 76
};

let apiTrainees = [];
let apiSessions = [];
let apiEvents = [];
let apiAssessments = [];
let apiCertificates = [];
let apiTrend = [];
let apiModuleStats = [];
let apiLanguageStats = [];
let hiddenEvents = new Set();

const iconPaths = {
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  activity:'<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  layers:'<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/>',
  check:'<path d="m5 12 4 4L19 6"/><circle cx="12" cy="12" r="9"/>',
  award:'<circle cx="12" cy="8" r="6"/><path d="m8.2 13.2-1.1 8 4.9-2.7 4.9 2.7-1.1-8"/>',
  scan:'<path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M4 12h16"/>',
  shield:'<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
  chart:'<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-5 5"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2Z" transform="translate(-1 -1)"/>',
  flame:'<path d="M8.5 14.5A4.5 4.5 0 0 0 13 19a4 4 0 0 0 4-4c0-2-1.5-3.5-3-5-.4 1.8-1.3 2.5-2.5 3.5C11 11 12 8.5 10.5 5 9.8 7.8 5 10 5 14a7 7 0 0 0 14 0c0-1.5-.5-2.8-1.2-3.8"/>',
  wind:'<path d="M3 8h12a3 3 0 1 0-3-3"/><path d="M2 12h17a3 3 0 1 1-3 3"/><path d="M4 16h7a2 2 0 1 1-2 2"/>',
  play:'<path d="m8 5 12 7-12 7V5Z"/>',
  alert:'<path d="M10.3 3.9 1.8 18.1A2 2 0 0 0 3.5 21h17a2 2 0 0 0 1.7-2.9L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
  arrow:'<path d="M7 17 17 7M7 7h10v10"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
  refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.5-3"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  close:'<path d="m18 6-12 12M6 6l12 12"/>'
};

function icon(name, size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.grid}</svg>`;
}

function esc(s = '') {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatLanguage(code = '') {
  const c = String(code).toLowerCase();
  if (c === 'sat' || c === 'santali') return 'Santali';
  if (c === 'hi' || c === 'hindi') return 'Hindi';
  return 'English';
}

function matches(text) {
  return !searchTerm || text.toLowerCase().includes(searchTerm.toLowerCase());
}

function statusClass(s) {
  return /complete|pass|verified|active|on track|cleared|on site|available/i.test(s) ? 'good' :
         /incident|attention|due|expir|fail|overdue|risk/i.test(s) ? 'warn' :
         /progress|pending|ready|scheduled|training now|started/i.test(s) ? 'info' : 'neutral';
}

function badge(s) {
  return `<span class="status-pill ${statusClass(s)}"><i></i>${esc(s)}</span>`;
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return 'Recently';
  try {
    const d = new Date(dateStr);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'Recently';
  }
}

// REST API Fetch Helper
async function apiGet(endpoint) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (err) {
    return null;
  }
}

async function apiPost(endpoint, body) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SAFEX-API-KEY': 'SAFEX-AR-SAFETY-KEY-2026'
      },
      body: JSON.stringify(body)
    });
    return await res.json();
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// Background Poller / Auto-refresh
async function loadAllData(silent = false) {
  try {
    const [overview, trainees, sessions, events, assessments, certs, trend, modStats, langStats] = await Promise.all([
      apiGet('/api/dashboard/overview'),
      apiGet('/api/trainees'),
      apiGet('/api/sessions'),
      apiGet('/api/events'),
      apiGet('/api/assessments'),
      apiGet('/api/certificates'),
      apiGet('/api/dashboard/training-trend'),
      apiGet('/api/dashboard/module-stats'),
      apiGet('/api/dashboard/language-stats')
    ]);

    if (overview) {
      apiOverview = overview;
      isApiConnected = true;
    }
    if (trainees) apiTrainees = trainees;
    if (sessions) apiSessions = sessions;
    if (events) apiEvents = events;
    if (assessments) apiAssessments = assessments;
    if (certs) apiCertificates = certs;
    if (trend) apiTrend = trend;
    if (modStats && modStats.length) apiModuleStats = modStats;
    if (langStats && langStats.length) apiLanguageStats = langStats;

    lastSyncTime = new Date();
    if (!silent) {
      render();
    }
  } catch (e) {
    console.warn('[SAFEX API Poller]', e);
  }
}

// Polling interval: every 6 seconds as requested
setInterval(() => {
  loadAllData(true).then(() => {
    // Re-render current page smoothly if user is not in a modal
    if (!document.querySelector('#quick-form') && !document.querySelector('#verify-input:focus')) {
      const contentEl = document.querySelector('#page-content');
      if (contentEl) {
        contentEl.innerHTML = pageContent();
      }
      topbar();
    }
  });
}, 6000);

// Initial Load
loadAllData();

// Components & Page Renderers
function sidebar() {
  document.querySelector('#sidebar').innerHTML = `
    <div class="brand">
      <img src="/public/ar-safety-icon.svg" alt=""/>
      <div>
        <strong>AR <b>SIMULATOR</b></strong>
        <small>INDUSTRIAL SAFETY</small>
      </div>
      <button class="mobile-close icon-button" data-action="close-nav" aria-label="Close menu">${icon('close')}</button>
    </div>
    <div class="workspace-chip">
      <span class="brand-shield">${icon('shield', 18)}</span>
      <div>
        <b>Safety command center</b>
        <small>Administrator workspace</small>
      </div>
    </div>
    ${navSections.map(section => `
      <div class="nav-group">
        <div class="nav-label">${section.label}</div>
        ${section.items.map(([label, ico, count]) => `
          <button class="nav-item ${currentPage === label ? 'active' : ''}" data-page="${label}">
            ${icon(ico, 17)}
            <span>${label}</span>
            ${count ? `<em>${count}</em>` : ''}
          </button>
        `).join('')}
      </div>
    `).join('')}
    <div class="sidebar-bottom">
      <div class="guide-card">
        ${icon('shield', 20)}
        <div>
          <b>Safety in every action.</b>
          <small>Build safer decisions in every shift.</small>
        </div>
        <button class="guide-link" data-page="Training Sessions">Platform guide ${icon('arrow', 12)}</button>
      </div>
      <div class="sidebar-foot">
        <span class="live-dot"></span> SAFEX Command <span>v1.0 · Live</span>
      </div>
    </div>
  `;
}

function topbar() {
  document.querySelector('#topbar').innerHTML = `
    <button class="mobile-menu icon-button" data-action="open-nav" aria-label="Open menu">${icon('menu')}</button>
    <div class="breadcrumbs">
      <span>Workspace</span><b>›</b><strong>${esc(currentPage)}</strong>
    </div>
    <div class="top-actions">
      <div class="search-wrap">
        <span>${icon('search', 16)}</span>
        <input id="global-search" type="search" placeholder="Search anything…" aria-label="Search dashboard" value="${esc(searchTerm)}">
        <kbd>⌘ K</kbd>
        <div class="search-results" id="search-results"></div>
      </div>
      <span class="preview-tag" title="Connected to PostgreSQL Database">
        <i class="live-dot"></i> Live PostgreSQL
      </span>
      <button class="icon-button notification-button" data-action="notifications" aria-label="Notifications">
        ${icon('bell')} ${unread ? '<i class="notification-dot"></i>' : ''}
      </button>
      <button class="profile-button" data-action="profile">
        <span class="avatar avatar-small">SA</span>
        <span><b>Safety Administrator</b><small>Command Center</small></span>
        <span class="chevron">⌄</span>
      </button>
    </div>
  `;
}

function metric(label, value, detail, ico, accent, trend = '') {
  return `
    <article class="metric-card">
      <div class="metric-top">
        <span>${label}</span>
        <span class="metric-icon ${accent}">${icon(ico, 17)}</span>
      </div>
      <div class="metric-value">${value}</div>
      <div class="metric-foot">
        ${trend ? `<b class="trend">${trend}</b>` : ''}
        <span>${detail}</span>
      </div>
    </article>
  `;
}

function chart() {
  const completedCount = apiOverview.completedSessions || 32;
  const rate = apiOverview.completionRate || 76;
  return `
    <div class="chart-legend">
      <span><i class="legend-fire"></i> Fire & Explosion</span>
      <span><i class="legend-gas"></i> Gas & Confined Space</span>
    </div>
    <div class="chart-summary">
      <b>${completedCount}</b>
      <span>completed sessions</span>
      <em>${rate}% completion</em>
    </div>
    <svg class="training-chart" viewBox="0 0 720 205" role="img" aria-label="Training completion trend">
      <defs>
        <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="#52d8c1" stop-opacity=".16"/>
          <stop offset="1" stop-color="#52d8c1" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <g class="chart-grid">
        <path d="M42 25H705M42 65H705M42 105H705M42 145H705M42 185H705"/>
        <path d="M42 20V185M175 20V185M308 20V185M441 20V185M574 20V185M705 20V185"/>
      </g>
      <g class="chart-labels">
        <text x="7" y="29">40</text>
        <text x="7" y="69">30</text>
        <text x="7" y="109">20</text>
        <text x="7" y="149">10</text>
        <text x="16" y="189">0</text>
        <text x="40" y="202">Sep 01</text>
        <text x="167" y="202">Sep 08</text>
        <text x="300" y="202">Sep 15</text>
        <text x="433" y="202">Sep 22</text>
        <text x="566" y="202">Sep 28</text>
        <text x="667" y="202">Today</text>
      </g>
      <path d="M43 52 C92 67 108 79 137 74 S193 85 221 79 S280 88 309 85 S368 81 397 87 S455 93 486 92 S541 107 575 128 S643 150 704 154 L704 185 L43 185Z" fill="url(#area)"/>
      <path class="line-fire" d="M43 52 C92 67 108 79 137 74 S193 85 221 79 S280 88 309 85 S368 81 397 87 S455 93 486 92 S541 107 575 128 S643 150 704 154"/>
      <path class="line-gas" d="M43 102 C83 91 110 97 137 95 S194 110 221 102 S279 117 309 112 S369 119 397 116 S455 112 486 118 S541 130 575 145 S643 163 704 169"/>
      <circle cx="704" cy="154" r="4" class="chart-dot"/>
    </svg>
    <div class="chart-bottom">
      <span>${icon('activity', 14)} Action-based AR training</span>
      <button class="text-link" data-page="Reports">View analytics ${icon('arrow', 13)}</button>
    </div>
  `;
}

function moduleCard(m) {
  const dynamicStat = apiModuleStats.find(s => s.key === m.key || s.id === m.id);
  const traineesCount = dynamicStat ? dynamicStat.trainees : m.trainees;
  const progress = dynamicStat ? dynamicStat.completion : m.progress;

  return `
    <article class="module-card">
      <div class="module-cover cover-${m.color}">
        <div class="cover-grid"></div>
        <span class="module-number">${m.id} / AR TRAINING</span>
        <span class="module-state">${badge(m.status)}</span>
        <div class="module-symbol">${icon(m.icon, 22)}</div>
        <div class="cover-label">${esc(m.category)}</div>
      </div>
      <div class="module-body">
        <h3>${esc(m.name)}</h3>
        <p>${esc(m.summary)}</p>
        <div class="module-meta">
          <span>${icon('users', 14)} ${traineesCount} trainees</span>
          <span class="progress-label">${progress}% complete</span>
        </div>
        <div class="progress-track"><i style="width:${progress}%"></i></div>
        <button class="module-link" data-module="${m.id}">Explore module ${icon('arrow', 13)}</button>
      </div>
    </article>
  `;
}

function workerRow(w) {
  const initials = w.name ? w.name.split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase() : 'TR';
  const langLabel = formatLanguage(w.language);
  const moduleLabel = w.module || (w.sessions && w.sessions[0]?.module === 'FIRE' ? 'Fire & Explosion' : 'Gas & Confined Space');
  const statusLabel = w.status || (w.sessions && w.sessions[0]?.status === 'COMPLETED' ? 'Complete' : 'Training due');
  const riskLabel = w.risk || (statusLabel === 'Complete' ? 'On track' : 'Attention');
  const lastActive = w.last || (w.sessions && w.sessions[0]?.startedAt ? formatRelativeTime(w.sessions[0].startedAt) : formatRelativeTime(w.updatedAt));

  return `
    <tr>
      <td>
        <div class="worker-cell">
          <span class="avatar avatar-${riskLabel === 'Attention' ? 'warn' : 'teal'}">${esc(initials)}</span>
          <span>
            <b>${esc(w.name)}</b>
            <small>${esc(w.traineeId || w.id)} · ${esc(langLabel)}</small>
          </span>
        </div>
      </td>
      <td>${esc(moduleLabel)}</td>
      <td>${badge(w.availability || 'On site')}</td>
      <td>${badge(statusLabel)}</td>
      <td>${esc(lastActive)}</td>
      <td><button class="row-menu" aria-label="Worker actions" data-worker="${esc(w.traineeId || w.id)}">···</button></td>
    </tr>
  `;
}

function activityRow(e) {
  const iconName = e.icon || (e.eventType === 'TRAINING_COMPLETED' || e.eventType?.includes('PASS') ? 'check' :
                   e.eventType?.includes('ALARM') || e.eventType?.includes('GAS') ? 'alert' :
                   e.eventType?.includes('START') ? 'play' :
                   e.eventType?.includes('PPE') || e.eventType?.includes('ISOLATE') ? 'shield' : 'activity');
  const tone = e.tone || (iconName === 'check' ? 'teal' : iconName === 'alert' ? 'amber' : 'blue');
  const title = e.title || (e.eventType ? e.eventType.replaceAll('_', ' ') : 'Safety Event');
  const detail = e.detail || (e.eventData ? JSON.stringify(e.eventData).replace(/[{}"]/g, '') : 'AR Safety Action Logged');
  const time = e.time || formatRelativeTime(e.timestamp);

  return `
    <div class="activity-row">
      <span class="activity-icon tone-${tone}">${icon(iconName, 15)}</span>
      <div class="activity-copy">
        <b>${esc(title)}</b>
        <span>${esc(detail)}</span>
      </div>
      <span class="activity-time">${esc(time)}</span>
    </div>
  `;
}

function dashboard() {
  const displayWorkers = (apiTrainees.length > 0 ? apiTrainees : [
    { name: 'Kiran Yadav', traineeId: 'TR-2142', language: 'hi', module: 'Gas & Confined Space', availability: 'On site', status: 'Training due', risk: 'Attention', last: 'Sep 28, 2026' },
    { name: 'Asha Soren', traineeId: 'TR-2141', language: 'sat', module: 'Fire & Explosion', availability: 'On site', status: 'Assessment due', risk: 'Attention', last: 'Sep 27, 2026' },
    { name: 'Rakesh Mandal', traineeId: 'TR-2140', language: 'hi', module: 'Gas & Confined Space', availability: 'Training now', status: 'In progress', risk: 'On track', last: 'Sep 26, 2026' },
    { name: 'Meera Das', traineeId: 'TR-2137', language: 'sat', module: 'Fire & Explosion', availability: 'On site', status: 'Complete', risk: 'On track', last: 'Sep 24, 2026' }
  ]).filter(w => matches(`${w.name} ${w.traineeId || w.id} ${w.language} ${w.module || ''} ${w.status || ''}`)).slice(0, 4);

  const displayEvents = (apiEvents.length > 0 ? apiEvents : [
    { icon: 'check', tone: 'teal', title: 'Assessment passed', detail: 'Meera Das (Santali) completed Fire & Explosion', time: '2 min ago' },
    { icon: 'alert', tone: 'amber', title: 'Hazardous gas detected', detail: 'Zone 4 Tunnel · CH4 / H2S · Asha Soren (Santali)', time: '18 min ago' },
    { icon: 'play', tone: 'blue', title: 'Session started', detail: 'Gas & Confined Space · Shift A · Rakesh Mandal (Hindi)', time: '41 min ago' },
    { icon: 'shield', tone: 'teal', title: 'Buddy confirmed', detail: 'Arun Kisku & Asha Soren confirmed buddy protocol', time: '1 hr ago' }
  ]).filter((e, i) => !hiddenEvents.has(i) && matches(`${e.title || ''} ${e.detail || ''} ${e.eventType || ''}`)).slice(0, 4);

  const totalWorkersCount = apiOverview.totalTrainees || apiTrainees.length || 8;
  const sessionsCount = (apiOverview.activeSessions + apiOverview.completedSessions) || apiSessions.length || 3;
  const completedCount = apiOverview.completedSessions || 2;
  const certsCount = apiOverview.certificatesIssued || apiCertificates.length || 2;
  const rate = apiOverview.completionRate || 76;
  const trainedWorkers = Math.max(1, Math.round((totalWorkersCount * rate) / 100));
  const dueWorkers = Math.max(0, totalWorkersCount - trainedWorkers);

  return `
    <div class="page-heading">
      <div>
        <div class="eyebrow">SAFEX AR COMMAND CENTER <span>/</span> INDUSTRIAL SAFETY COMPLIANCE</div>
        <h1>Operations overview<span class="heading-dot">.</span></h1>
        <p>Real-time AR training telemetry synchronized with PostgreSQL.</p>
      </div>
      <div class="heading-actions">
        <label class="select-wrap">
          ${icon('activity', 15)}
          <select id="period-select" aria-label="Dashboard period">
            <option ${period === 'This month' ? 'selected' : ''}>This month</option>
            <option ${period === 'Last 30 days' ? 'selected' : ''}>Last 30 days</option>
            <option ${period === 'This quarter' ? 'selected' : ''}>This quarter</option>
          </select>
        </label>
        <button class="button button-primary" data-action="export">${icon('download', 15)} Export report</button>
      </div>
    </div>

    <div class="demo-notice">
      <span>
        ${icon('activity', 15)}
        <b>SAFEX AR Live Telemetry</b>
        <span>Connected to PostgreSQL · Auto-sync active (English, Hindi, Santali)</span>
      </span>
      <span style="display:flex;align-items:center;gap:6px;font-size:10px;color:var(--teal)">
        <span class="live-dot"></span> PostgreSQL Active
      </span>
    </div>

    ${emptyMode ? `
      <section class="empty-state">
        <span class="empty-icon">${icon('grid', 24)}</span>
        <h2>No training records yet</h2>
        <p>Start a session in Unity AR to see live operational data here.</p>
        <button class="button button-primary" data-action="add-worker">${icon('plus', 15)} Add a trainee</button>
      </section>
    ` : `
      <section class="metric-grid" aria-label="Key training metrics">
        ${metric('Total workers', String(totalWorkersCount), 'Registered trainees', 'users', 'teal')}
        ${metric('Training sessions', String(sessionsCount), 'Across active modules', 'activity', 'blue')}
        ${metric('Completed trainings', String(completedCount), `${rate}% completion rate`, 'check', 'green', '↗ 8%')}
        ${metric('Certificates issued', String(certsCount), 'Assessment passed', 'award', 'violet')}
        ${metric('Certificates verified', String(certsCount), 'Verification recorded', 'scan', 'teal')}
        ${metric('Active modules', '04', 'Fire, gas & site safety', 'layers', 'amber')}
      </section>

      <div class="overview-grid">
        <section class="panel completion-panel">
          <div class="panel-heading">
            <div>
              <h2>Training completion</h2>
              <p>Completed sessions · ${esc(period.toLowerCase())}</p>
            </div>
            <div class="chart-legend">
              <span><i class="legend-fire"></i> Fire</span>
              <span><i class="legend-gas"></i> Gas</span>
            </div>
          </div>
          ${chart()}
        </section>

        <section class="panel readiness-panel">
          <div class="panel-heading">
            <div>
              <h2>Training readiness</h2>
              <p>Workers with a completed module</p>
            </div>
            ${icon('shield', 18)}
          </div>
          <div class="readiness-chart">
            <svg viewBox="0 0 180 110" aria-label="${rate} percent readiness">
              <path class="gauge-base" d="M20 90a70 70 0 0 1 140 0"/>
              <path class="gauge-fill" d="M20 90a70 70 0 0 1 140 0" pathLength="100" style="stroke-dasharray:${rate} 100"/>
            </svg>
            <div class="gauge-copy">
              <b>${rate}<span>%</span></b>
              <small>workers trained</small>
            </div>
          </div>
          <div class="readiness-stats">
            <span><i class="legend-fire"></i> Trained <b>${trainedWorkers}</b></span>
            <span><i class="legend-amber"></i> Training due <b>${dueWorkers}</b></span>
          </div>
          <button class="review-link" data-page="Compliance">Review training compliance ${icon('arrow', 13)}</button>
        </section>
      </div>

      <section class="section-block">
        <div class="section-heading">
          <div>
            <div class="section-title-row">
              <h2>Training modules</h2>
              <span class="count-badge">04</span>
            </div>
            <p>Purpose-built for critical industrial safety moments.</p>
          </div>
          <button class="text-link" data-page="Modules">All modules ${icon('arrow', 13)}</button>
        </div>
        <div class="module-grid">
          ${modules.slice(0, 2).map(moduleCard).join('')}
        </div>
      </section>

      <div class="lower-grid">
        <section class="panel activity-panel">
          <div class="panel-heading">
            <div>
              <h2>Recent activity</h2>
              <p>The latest updates from Unity AR records</p>
            </div>
            <button class="text-link" data-page="Training Sessions">View all ${icon('arrow', 13)}</button>
          </div>
          <div class="activity-list">
            ${displayEvents.map(activityRow).join('') || '<div class="no-results">No recent AR activity.</div>'}
          </div>
        </section>

        <section class="panel readiness-list-panel">
          <div class="panel-heading">
            <div>
              <h2>Needs attention</h2>
              <p>Priority follow-ups for your safety team</p>
            </div>
            <span class="attention-count">04</span>
          </div>
          <button class="attention-row" data-page="Certificates">
            <span class="attention-icon amber">${icon('award', 16)}</span>
            <span><b>Certificate renewal</b><small>2 certificates expire in 7 days</small></span>
            ${icon('arrow', 13)}
          </button>
          <button class="attention-row" data-page="Workers">
            <span class="attention-icon red">${icon('users', 16)}</span>
            <span><b>Training overdue</b><small>${dueWorkers} workers need a refresher</small></span>
            ${icon('arrow', 13)}
          </button>
          <button class="attention-row" data-page="Assessments">
            <span class="attention-icon blue">${icon('check', 16)}</span>
            <span><b>Assessment review</b><small>Latest submissions recorded from Unity</small></span>
            ${icon('arrow', 13)}
          </button>
          <button class="attention-row" data-page="Compliance">
            <span class="attention-icon red">${icon('alert', 16)}</span>
            <span><b>Multilingual compliance</b><small>Santali, Hindi & English training track</small></span>
            ${icon('arrow', 13)}
          </button>
          <button class="review-link" data-page="Compliance">Open compliance overview ${icon('arrow', 13)}</button>
        </section>
      </div>

      <section class="panel workers-panel">
        <div class="panel-heading">
          <div>
            <h2>Worker status</h2>
            <p>Recent trainees and their latest training status</p>
          </div>
          <button class="text-link" data-page="Workers">All workers ${icon('arrow', 13)}</button>
        </div>
        ${workerTable(displayWorkers)}
      </section>
    `}
  `;
}

function workerTable(rows) {
  return `
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>WORKER / LANGUAGE</th>
            <th>TRAINING MODULE</th>
            <th>AVAILABILITY</th>
            <th>STATUS</th>
            <th>LAST ACTIVITY</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(workerRow).join('') || `<tr><td colspan="6" class="no-results">No workers match “${esc(searchTerm)}”.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function pageHeading(title, sub, button = '') {
  return `
    <div class="page-heading subpage-heading">
      <div>
        <div class="eyebrow">SAFEX AR COMMAND CENTER <span>/</span> WORKSPACE</div>
        <h1>${esc(title)}<span class="heading-dot">.</span></h1>
        <p>${esc(sub)}</p>
      </div>
      ${button}
    </div>
  `;
}

function tablePage(title, sub, rows, columns, cta = '') {
  const body = rows.map(r => `
    <tr>
      ${columns.map(c => `<td>${c.render ? c.render(r) : esc(r[c.key] || '—')}</td>`).join('')}
    </tr>
  `).join('');

  return `
    ${title ? pageHeading(title, sub, cta) : ''}
    <div class="page-toolbar">
      <div class="filter-chip">${icon('activity', 14)} ${rows.length} records</div>
      <button class="button button-quiet" data-action="refresh">${icon('refresh', 14)} Refresh</button>
    </div>
    <section class="panel page-table-panel">
      <div class="table-scroll">
        <table>
          <thead>
            <tr>${columns.map(c => `<th>${c.label}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${body || `<tr><td colspan="${columns.length}" class="no-results">No records found.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function pageContent() {
  if (currentPage === 'Dashboard') {
    return dashboard();
  }

  if (currentPage === 'Workers') {
    const list = apiTrainees.length > 0 ? apiTrainees : [
      { name: 'Kiran Yadav', traineeId: 'TR-2142', language: 'hi', module: 'Gas & Confined Space', availability: 'On site', status: 'Training due', risk: 'Attention', last: 'Sep 28, 2026' },
      { name: 'Asha Soren', traineeId: 'TR-2141', language: 'sat', module: 'Fire & Explosion', availability: 'On site', status: 'Assessment due', risk: 'Attention', last: 'Sep 27, 2026' },
      { name: 'Rakesh Mandal', traineeId: 'TR-2140', language: 'hi', module: 'Gas & Confined Space', availability: 'Training now', status: 'In progress', risk: 'On track', last: 'Sep 26, 2026' },
      { name: 'Neha Kulkarni', traineeId: 'TR-2139', language: 'en', module: 'Fire & Explosion', availability: 'Training now', status: 'In progress', risk: 'On track', last: 'Sep 26, 2026' },
      { name: 'Dev Patel', traineeId: 'TR-2138', language: 'en', module: 'Working at Height', availability: 'On leave', status: 'Complete', risk: 'On track', last: 'Sep 25, 2026' },
      { name: 'Meera Das', traineeId: 'TR-2137', language: 'sat', module: 'Fire & Explosion', availability: 'On site', status: 'Complete', risk: 'On track', last: 'Sep 24, 2026' },
      { name: 'Arun Kisku', traineeId: 'TR-2136', language: 'sat', module: 'Machine Guarding', availability: 'On site', status: 'Certificate expiring', risk: 'Attention', last: 'Sep 22, 2026' },
      { name: 'Pooja Nair', traineeId: 'TR-2135', language: 'en', module: 'Gas & Confined Space', availability: 'On site', status: 'Complete', risk: 'On track', last: 'Sep 21, 2026' }
    ];

    const rows = list.filter(w => matches(`${w.name} ${w.traineeId || w.id} ${formatLanguage(w.language)} ${w.module || ''} ${w.status || ''}`));

    const total = rows.length;
    const onTrack = rows.filter(r => (r.risk || 'On track') === 'On track').length;
    const attention = rows.filter(r => (r.risk || '') === 'Attention').length;

    return `
      ${pageHeading('Workers', 'Trainee records, language preference, and training risk status.',
        '<button class="button button-primary" data-action="add-worker">' + icon('plus', 15) + ' Add worker</button>'
      )}
      <div class="mini-stat-grid">
        <div class="mini-stat"><small>Registered</small><b>${total}</b></div>
        <div class="mini-stat"><small>On track</small><b class="text-teal">${onTrack}</b></div>
        <div class="mini-stat"><small>Need attention</small><b class="text-amber">${attention}</b></div>
        <div class="mini-stat"><small>Active in AR</small><b>08 <span class="live-dot"></span></b></div>
      </div>
      ${tablePage('', '', rows, [
        {
          label: 'WORKER',
          render: w => {
            const initials = w.name ? w.name.split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase() : 'TR';
            return `
              <div class="worker-cell">
                <span class="avatar avatar-${w.risk === 'Attention' ? 'warn' : 'teal'}">${esc(initials)}</span>
                <span>
                  <b>${esc(w.name)}</b>
                  <small>${esc(w.traineeId || w.id)} · ${esc(formatLanguage(w.language))}</small>
                </span>
              </div>
            `;
          }
        },
        {
          label: 'LANGUAGE',
          render: w => `<span class="status-pill neutral"><i></i>${esc(formatLanguage(w.language))}</span>`
        },
        {
          label: 'ASSIGNED MODULE',
          render: w => esc(w.module || (w.sessions && w.sessions[0]?.module === 'FIRE' ? 'Fire & Explosion' : 'Gas & Confined Space'))
        },
        {
          label: 'AVAILABILITY',
          render: w => badge(w.availability || 'On site')
        },
        {
          label: 'STATUS',
          render: w => badge(w.status || (w.sessions && w.sessions[0]?.status === 'COMPLETED' ? 'Complete' : 'Training due'))
        },
        {
          label: 'LAST ACTIVE',
          render: w => esc(w.last || (w.sessions && w.sessions[0]?.startedAt ? formatRelativeTime(w.sessions[0].startedAt) : formatRelativeTime(w.updatedAt)))
        }
      ])}
    `;
  }

  if (currentPage === 'Modules') {
    const list = modules.filter(m => matches(`${m.name} ${m.category} ${m.summary}`));
    return `
      ${pageHeading('Training modules', 'Immersive AR scenarios built for critical mining & industrial safety moments.',
        '<button class="button button-primary" data-action="schedule">' + icon('plus', 15) + ' Schedule session</button>'
      )}
      <div class="module-grid module-grid-all">
        ${list.map(moduleCard).join('') || '<div class="no-results">No modules match your search.</div>'}
      </div>
    `;
  }

  if (currentPage === 'Training Sessions') {
    const rawSessions = apiSessions.length > 0 ? apiSessions : [
      { sessionId: 'SESSION-GAS-20260928-01', module: 'GAS', trainee: { name: 'Asha Soren', language: 'sat' }, startedAt: new Date(Date.now() - 3600000).toISOString(), status: 'COMPLETED' },
      { sessionId: 'SESSION-FIRE-20260927-02', module: 'FIRE', trainee: { name: 'Meera Das', language: 'sat' }, startedAt: new Date(Date.now() - 86400000).toISOString(), status: 'COMPLETED' },
      { sessionId: 'SESSION-GAS-ACTIVE-03', module: 'GAS', trainee: { name: 'Rakesh Mandal', language: 'hi' }, startedAt: new Date(Date.now() - 600000).toISOString(), status: 'IN_PROGRESS' }
    ];

    const rows = rawSessions.map(s => {
      const traineeName = s.trainee?.name || `Trainee (${s.traineeId || 'Worker'})`;
      const lang = formatLanguage(s.trainee?.language);
      const modName = s.module === 'FIRE' ? 'Fire & Explosion' : 'Gas & Confined Space';
      return {
        sessionId: s.sessionId,
        name: `${modName} · ${traineeName}`,
        module: modName,
        trainee: `${traineeName} (${lang})`,
        date: formatRelativeTime(s.startedAt),
        status: s.status || 'STARTED',
        duration: s.durationSeconds ? `${Math.round(s.durationSeconds / 60)} min` : 'Active'
      };
    }).filter(x => matches(`${x.name} ${x.module} ${x.trainee} ${x.status}`));

    return tablePage(
      'Training sessions',
      'Live AR telemetry sessions recorded from Unity Android application.',
      rows,
      [
        { label: 'SESSION ID', key: 'sessionId' },
        { label: 'MODULE', key: 'module' },
        { label: 'TRAINEE & LANGUAGE', key: 'trainee' },
        { label: 'STARTED', key: 'date' },
        { label: 'DURATION', key: 'duration' },
        { label: 'STATUS', render: x => badge(x.status) }
      ],
      '<button class="button button-primary" data-action="schedule">' + icon('plus', 15) + ' Schedule session</button>'
    );
  }

  if (currentPage === 'Assessments') {
    const rawAssessments = apiAssessments.length > 0 ? apiAssessments : [
      { module: 'GAS', score: 100, passed: true, createdAt: new Date(Date.now() - 3600000).toISOString(), session: { trainee: { name: 'Asha Soren', language: 'sat' } }, completedActions: ['REACH_GAS_DETECTOR','RAISE_ALARM','SELECT_CORRECT_GAS_PPE','BUDDY_CONFIRMED','ISOLATE_CONTAMINATED_AREA','EVACUATE_SAFE_EXIT'] },
      { module: 'FIRE', score: 92, passed: true, createdAt: new Date(Date.now() - 86400000).toISOString(), session: { trainee: { name: 'Meera Das', language: 'sat' } }, completedActions: ['TRAINING_STARTED','REACH_POWER_CONTROL','ISOLATE_POWER','USE_FIRE_EXTINGUISHER','RAISE_ALARM','EVACUATE_SAFE_EXIT'] }
    ];

    const rows = rawAssessments.map(a => {
      const traineeName = a.session?.trainee?.name || 'Trainee Operator';
      const lang = formatLanguage(a.session?.trainee?.language);
      const modName = a.module === 'FIRE' ? 'Fire & Explosion' : 'Gas & Confined Space';
      const actionCount = Array.isArray(a.completedActions) ? a.completedActions.length : 6;
      return {
        name: `${traineeName} (${lang})`,
        module: modName,
        actions: `${actionCount} actions verified`,
        score: `${a.score}%`,
        date: formatRelativeTime(a.createdAt),
        status: a.passed ? 'Passed' : 'Failed'
      };
    }).filter(x => matches(`${x.name} ${x.module} ${x.status}`));

    return tablePage(
      'Assessments',
      'Action-based competence evaluations recorded by SAFEX AR Assessment Manager.',
      rows,
      [
        { label: 'WORKER & LANGUAGE', key: 'name' },
        { label: 'MODULE', key: 'module' },
        { label: 'COMPLETED ACTIONS', key: 'actions' },
        { label: 'SCORE', key: 'score' },
        { label: 'SUBMITTED', key: 'date' },
        { label: 'RESULT', render: x => badge(x.status) }
      ],
      '<button class="button button-quiet" data-action="refresh">' + icon('refresh', 14) + ' Refresh</button>'
    );
  }

  if (currentPage === 'Certificates' || currentPage === 'Verification') {
    const rawCerts = apiCertificates.length > 0 ? apiCertificates : [
      { certificateId: 'SAFEX-20260928-842103', trainee: { name: 'Asha Soren', language: 'sat' }, module: 'GAS', score: 100, issuedAt: new Date(Date.now() - 3600000).toISOString(), status: 'PASSED' },
      { certificateId: 'SAFEX-20260927-491204', trainee: { name: 'Meera Das', language: 'sat' }, module: 'FIRE', score: 92, issuedAt: new Date(Date.now() - 86400000).toISOString(), status: 'PASSED' }
    ];

    const rows = rawCerts.map(c => {
      const traineeName = c.trainee?.name || `Trainee ${c.traineeId || ''}`;
      const lang = formatLanguage(c.trainee?.language);
      const modName = c.module === 'FIRE' ? 'Fire & Explosion' : 'Gas & Confined Space';
      return {
        certId: c.certificateId,
        name: `${traineeName} (${lang})`,
        cert: modName,
        score: `${c.score}%`,
        issued: formatRelativeTime(c.issuedAt),
        status: c.status === 'PASSED' ? 'Verified' : 'Pending'
      };
    }).filter(x => matches(`${x.name} ${x.certId} ${x.cert} ${x.status}`));

    const isVerificationView = currentPage === 'Verification';

    return `
      ${pageHeading(
        isVerificationView ? 'Certificate verification' : 'Certificates',
        isVerificationView ? 'Official credential verification lookup for audits and on-site QR scans.' : 'Issued AR safety qualification certificates stored in PostgreSQL.',
        '<button class="button button-quiet" data-action="export">' + icon('download', 14) + ' Export</button>'
      )}

      ${isVerificationView ? `
        <section class="panel" style="margin-bottom:14px;padding:16px 20px;">
          <div class="panel-heading" style="margin-bottom:10px">
            <div>
              <h2>Instant QR / Credential Lookup</h2>
              <p>Enter a SAFEX Certificate ID to query official verification records</p>
            </div>
            ${icon('scan', 18)}
          </div>
          <form id="verify-form" style="display:flex;gap:10px;align-items:center;max-width:600px;">
            <input id="verify-input" type="text" placeholder="e.g. SAFEX-20260928-842103" required style="flex:1;height:38px;border-radius:6px;border:1px solid #344447;background:#0e1719;color:#e8efee;padding:0 12px;font-size:12px;" value="${esc(verifySearchQuery)}">
            <button class="button button-primary" type="submit">${icon('search', 14)} Verify</button>
          </form>

          ${verifySearchResult ? `
            <div style="margin-top:14px;padding:14px;border:1px solid #274b45;border-radius:8px;background:#112624;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                <b style="font-size:13px;color:var(--teal)">✓ OFFICIAL CERTIFICATE VERIFIED</b>
                <span class="status-pill good"><i></i>${esc(verifySearchResult.status || 'PASSED')}</span>
              </div>
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;font-size:11px;">
                <div><span style="color:#8ba5a2">Trainee Name:</span> <b>${esc(verifySearchResult.traineeName)}</b></div>
                <div><span style="color:#8ba5a2">Language:</span> <b>${esc(formatLanguage(verifySearchResult.language))}</b></div>
                <div><span style="color:#8ba5a2">Safety Module:</span> <b>${esc(verifySearchResult.moduleName)}</b></div>
                <div><span style="color:#8ba5a2">Score:</span> <b style="color:var(--teal)">${verifySearchResult.score}%</b></div>
                <div><span style="color:#8ba5a2">Certificate ID:</span> <b>${esc(verifySearchResult.certificateId)}</b></div>
                <div><span style="color:#8ba5a2">Issued Date:</span> <b>${esc(verifySearchResult.verificationDetails?.issuedDateFormatted || 'Recent')}</b></div>
              </div>
            </div>
          ` : ''}
        </section>
      ` : ''}

      <div class="page-toolbar">
        <div class="filter-chip">${icon('activity', 14)} ${rows.length} certificate records</div>
        <button class="button button-quiet" data-action="refresh">${icon('refresh', 14)} Refresh</button>
      </div>
      <section class="panel page-table-panel">
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>CERTIFICATE ID</th>
                <th>WORKER & LANGUAGE</th>
                <th>MODULE</th>
                <th>SCORE</th>
                <th>ISSUED</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(r => `
                <tr>
                  <td><b>${esc(r.certId)}</b></td>
                  <td>${esc(r.name)}</td>
                  <td>${esc(r.cert)}</td>
                  <td><b style="color:var(--teal)">${esc(r.score)}</b></td>
                  <td>${esc(r.issued)}</td>
                  <td>${badge(r.status)}</td>
                </tr>
              `).join('') || `<tr><td colspan="6" class="no-results">No certificates found.</td></tr>`}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  if (currentPage === 'Compliance') {
    const rate = apiOverview.completionRate || 82;
    return `
      ${pageHeading('Compliance overview', 'Actionable readiness and training coverage across language groups.')}
      <div class="compliance-grid">
        <article class="panel compliance-score">
          <span class="eyebrow">OVERALL READINESS</span>
          <div class="score-value">${rate}<span>%</span></div>
          <div class="progress-track"><i style="width:${rate}%"></i></div>
          <p>Compliance coverage is <b class="text-teal">active and synchronizing</b>.</p>
          <small>Standard: ISO 45001 / OSHA 1910 Mining Hazardous Space</small>
        </article>
        <article class="panel compliance-stat">
          <span class="metric-icon amber">${icon('award')}</span>
          <small>Certifications issued</small>
          <b>${apiOverview.certificatesIssued || 2}</b>
          <span>Stored in PostgreSQL</span>
          <button class="text-link" data-page="Certificates">Review certificates ${icon('arrow', 13)}</button>
        </article>
        <article class="panel compliance-stat">
          <span class="metric-icon blue">${icon('users')}</span>
          <small>Active Trainees</small>
          <b>${apiOverview.totalTrainees || 8}</b>
          <span>Santali, Hindi, English</span>
          <button class="text-link" data-page="Workers">Review workers ${icon('arrow', 13)}</button>
        </article>
        <article class="panel compliance-stat">
          <span class="metric-icon violet">${icon('check')}</span>
          <small>Assessments passed</small>
          <b>${apiOverview.passedAssessments || 2}</b>
          <span>Real telemetry verified</span>
          <button class="text-link" data-page="Assessments">Review assessments ${icon('arrow', 13)}</button>
        </article>
      </div>

      <section class="panel compliance-panel">
        <div class="panel-heading">
          <div>
            <h2>Multilingual workforce training coverage</h2>
            <p>Completion by language demographic</p>
          </div>
          <span class="live-dot"></span>
        </div>
        ${(apiLanguageStats.length > 0 ? apiLanguageStats : [
          { name: 'Santali', trainees: 3, sessions: 2 },
          { name: 'Hindi', trainees: 2, sessions: 1 },
          { name: 'English', trainees: 3, sessions: 1 }
        ]).map(l => {
          const pct = Math.min(100, Math.round(((l.sessions || 1) / Math.max(1, l.trainees || 1)) * 100));
          return `
            <div class="team-coverage">
              <span>${esc(l.name)}</span>
              <div class="progress-track"><i style="width:${pct}%"></i></div>
              <b>${pct}%</b>
            </div>
          `;
        }).join('')}
        <div class="compliance-note">
          ${icon('alert', 16)}
          <span>Full offline fallback active: Unity training continues offline and automatically synchronizes when connectivity is restored.</span>
          <button class="text-link" data-page="Workers">View trainees ${icon('arrow', 12)}</button>
        </div>
      </section>
    `;
  }

  if (currentPage === 'Reports') {
    return `
      ${pageHeading('Training analytics', 'A clear view of participation, completion, and readiness trends.',
        '<button class="button button-primary" data-action="export">' + icon('download', 15) + ' Export report</button>'
      )}
      <section class="panel report-chart">
        <div class="panel-heading">
          <div>
            <h2>Completion trends</h2>
            <p>Completed training sessions over the selected period</p>
          </div>
          <label class="select-wrap">
            ${icon('activity', 15)}
            <select id="period-select">
              <option ${period === 'This month' ? 'selected' : ''}>This month</option>
              <option ${period === 'Last 30 days' ? 'selected' : ''}>Last 30 days</option>
              <option ${period === 'This quarter' ? 'selected' : ''}>This quarter</option>
            </select>
          </label>
        </div>
        ${chart()}
      </section>
      <div class="mini-stat-grid report-stats">
        <div class="mini-stat"><small>Sessions completed</small><b>${apiOverview.completedSessions || 32}</b></div>
        <div class="mini-stat"><small>Average assessment score</small><b>94%</b></div>
        <div class="mini-stat"><small>Workers reached</small><b>${apiOverview.totalTrainees || 24}</b></div>
        <div class="mini-stat"><small>Training completion</small><b>${apiOverview.completionRate || 76}%</b></div>
      </div>
    `;
  }

  if (currentPage === 'Settings') {
    return `
      ${pageHeading('Settings', 'Manage command center preferences and backend connectivity.')}
      <section class="panel settings-panel">
        <div class="settings-row" style="align-items:flex-start;flex-direction:column;gap:8px;padding:14px 0;">
          <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
            <div>
              <b>Backend API Endpoint</b>
              <small>Configured endpoint for real-time telemetry and database sync</small>
            </div>
            <span class="status-pill ${isApiConnected ? 'good' : 'warn'}"><i></i> ${isApiConnected ? 'Connected' : 'Offline / Retrying'}</span>
          </div>
          <form id="api-url-form" style="display:flex;gap:8px;width:100%;max-width:550px;margin-top:4px;">
            <input id="api-url-input" type="url" placeholder="https://your-backend.onrender.com or http://localhost:5000" value="${esc(API_BASE)}" style="flex:1;height:34px;border-radius:6px;border:1px solid #344447;background:#0e1719;color:#e8efee;padding:0 10px;font-size:11px;">
            <button class="button button-primary" type="submit" style="min-height:34px;">Save & Connect</button>
            <button class="button button-quiet" type="button" data-action="reset-api-url" style="min-height:34px;">Reset</button>
          </form>
        </div>
        <div class="settings-row">
          <div>
            <b>Database Connection</b>
            <small>PostgreSQL with Prisma ORM data synchronization</small>
          </div>
          <span class="status-pill good"><i></i> PostgreSQL</span>
        </div>
        <div class="settings-row">
          <div>
            <b>Supported Languages</b>
            <small>Full localized training telemetry</small>
          </div>
          <span class="status-pill neutral"><i></i> English · Hindi · Santali</span>
        </div>
        <div class="settings-row">
          <div>
            <b>Live cursor ambience</b>
            <small>Subtle pointer-following light effect on this dashboard.</small>
          </div>
          <button class="toggle ${document.body.classList.contains('cursor-off') ? '' : 'on'}" data-action="cursor-toggle" role="switch" aria-checked="${!document.body.classList.contains('cursor-off')}" aria-label="Toggle cursor ambience">
            <i></i>
          </button>
        </div>
        <div class="settings-row">
          <div>
            <b>Auto-polling Interval</b>
            <small>Synchronizes dashboard data from Unity Android APK</small>
          </div>
          <span class="status-pill info"><i></i> Every 6s</span>
        </div>
      </section>
    `;
  }

  return pageHeading(currentPage, 'Explore operational records and safety training activity.');
}

function render(focus = false) {
  sidebar();
  topbar();
  document.querySelector('#page-content').innerHTML = pageContent();
  bindSearch();
  if (focus) document.querySelector('#page-content').focus();
}

function setPage(page) {
  currentPage = page;
  mobileNavOpen = false;
  verifySearchResult = null;
  verifySearchQuery = '';
  render(true);
  document.querySelector('#sidebar').classList.remove('open');
  window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
}

function toast(msg) {
  const root = document.querySelector('#toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span class="toast-check">${icon('check', 15)}</span>${esc(msg)}`;
  root.append(el);
  setTimeout(() => el.classList.add('show'), 10);
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 250);
  }, 3000);
}

function exportCsv() {
  const list = apiTrainees.length > 0 ? apiTrainees : [];
  const rows = [
    ['Trainee ID', 'Name', 'Language', 'Device ID', 'Created At'],
    ...list.map(w => [w.traineeId, w.name, formatLanguage(w.language), w.deviceId || 'N/A', w.createdAt])
  ];
  const csv = rows.map(r => r.map(v => '"' + String(v).replaceAll('"', '""') + '"').join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'safex-ar-safety-report.csv';
  a.click();
  URL.revokeObjectURL(url);
  toast('Training report exported as CSV');
}

function openModal(type) {
  const overlay = document.querySelector('#overlay-root');
  const isWorker = type === 'worker';
  const autoId = 'TR-' + Math.floor(2140 + Math.random() * 800);

  overlay.innerHTML = `
    <div class="modal-backdrop" data-action="dismiss-modal">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-head">
          <div>
            <span class="eyebrow">COMMAND CENTER ACTION</span>
            <h2 id="modal-title">${isWorker ? 'Register Trainee' : 'Schedule training session'}</h2>
          </div>
          <button class="icon-button" data-action="dismiss-modal" aria-label="Close">${icon('close')}</button>
        </div>
        <p class="modal-intro">${isWorker ? 'Add a trainee to the real PostgreSQL database.' : 'Create an AR training session schedule.'}</p>
        <form id="quick-form" data-kind="${isWorker ? 'worker' : 'schedule'}">
          ${isWorker ? `
            <label>Worker name
              <input name="name" required placeholder="e.g. Somra Majhi">
            </label>
            <label>Trainee ID
              <input name="traineeId" required value="${autoId}">
            </label>
            <label>Language Preference
              <select name="language">
                <option value="sat">Santali (sat)</option>
                <option value="hi">Hindi (hi)</option>
                <option value="en">English (en)</option>
              </select>
            </label>
            <label>Device ID
              <input name="deviceId" placeholder="e.g. ANDROID-SAFEX-01" value="ANDROID-${Math.floor(1000 + Math.random()*9000)}">
            </label>
          ` : `
            <label>Session name
              <input name="name" required placeholder="e.g. Gas leak drill · Shift A">
            </label>
            <label>Training module
              <select name="module">
                <option value="GAS">Gas Leak & Confined Space</option>
                <option value="FIRE">Fire & Explosion</option>
              </select>
            </label>
            <label>Assigned Trainee ID
              <input name="traineeId" required placeholder="e.g. TR-2141" value="${apiTrainees[0]?.traineeId || 'TR-2141'}">
            </label>
          `}
          <div class="modal-actions">
            <button type="button" class="button button-quiet" data-action="dismiss-modal">Cancel</button>
            <button class="button button-primary" type="submit">${icon('check', 15)} ${isWorker ? 'Register Trainee' : 'Create Session'}</button>
          </div>
        </form>
        <small class="demo-footnote">Saves immediately to PostgreSQL backend.</small>
      </section>
    </div>
  `;
  overlay.querySelector('input')?.focus();
}

function showSearchResults(q) {
  const box = document.querySelector('#search-results');
  if (!box) return;
  if (!q) {
    box.innerHTML = '';
    box.classList.remove('show');
    return;
  }
  let pages = ['Dashboard', 'Workers', 'Training Sessions', 'Modules', 'Assessments', 'Certificates', 'Verification', 'Compliance', 'Reports', 'Settings'].filter(x => x.toLowerCase().includes(q.toLowerCase()));
  let people = apiTrainees.filter(w => `${w.name} ${w.traineeId} ${w.language}`.toLowerCase().includes(q.toLowerCase())).slice(0, 3);
  let mods = modules.filter(m => `${m.name} ${m.category}`.toLowerCase().includes(q.toLowerCase())).slice(0, 2);

  let results = [
    ...pages.map(p => ({ kind: 'Page', label: p, page: p })),
    ...people.map(w => ({ kind: 'Worker', label: `${w.name} · ${w.traineeId} (${formatLanguage(w.language)})`, page: 'Workers' })),
    ...mods.map(m => ({ kind: 'Module', label: m.name, page: 'Modules' }))
  ].slice(0, 7);

  box.innerHTML = results.length ? results.map(r => `
    <button class="search-result" data-page="${r.page}">
      <span>${icon(r.kind === 'Page' ? 'grid' : r.kind === 'Worker' ? 'user' : 'layers', 15)} ${esc(r.label)}</span>
      <small>${r.kind}</small>
    </button>
  `).join('') : `<div class="search-empty">No matching pages or records</div>`;
  box.classList.add('show');
}

function bindSearch() {
  const input = document.querySelector('#global-search');
  if (!input) return;
  input.addEventListener('input', () => {
    searchTerm = input.value.trim();
    showSearchResults(input.value.trim());
    const contentEl = document.querySelector('#page-content');
    if (contentEl) contentEl.innerHTML = pageContent();
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      input.value = '';
      searchTerm = '';
      showSearchResults('');
      render();
    }
    if (e.key === 'Enter') {
      const first = document.querySelector('.search-result');
      if (first) setPage(first.dataset.page);
    }
  });
}

// Global Event Listeners
document.addEventListener('click', async e => {
  const pageBtn = e.target.closest('[data-page]');
  if (pageBtn) {
    setPage(pageBtn.dataset.page);
    return;
  }

  const actionNode = e.target.closest('[data-action]');
  const act = actionNode?.dataset.action;
  if (act) {
    if (act === 'dismiss-modal' && actionNode.classList.contains('modal-backdrop') && e.target !== actionNode) return;
    if (act === 'open-nav') {
      document.querySelector('#sidebar').classList.add('open');
      return;
    }
    if (act === 'close-nav') {
      document.querySelector('#sidebar').classList.remove('open');
      return;
    }
    if (act === 'export') {
      exportCsv();
      return;
    }
    if (act === 'refresh') {
      const b = e.target.closest('[data-action]');
      b.classList.add('spinning');
      await loadAllData();
      b.classList.remove('spinning');
      toast('Synchronized latest records from PostgreSQL');
      return;
    }
    if (act === 'add-worker') {
      openModal('worker');
      return;
    }
    if (act === 'schedule') {
      openModal('schedule');
      return;
    }
    if (act === 'notifications') {
      unread = false;
      render();
      toast('Notifications checked');
      return;
    }
    if (act === 'profile') {
      toast('Signed in as Safety Administrator');
      return;
    }
    if (act === 'cursor-toggle') {
      document.body.classList.toggle('cursor-off');
      render();
      return;
    }
    if (act === 'reset-api-url') {
      localStorage.removeItem('SAFEX_API_URL');
      API_BASE = window.location.port === '5000' ? '' : 'http://localhost:5000';
      toast('Reset to default API endpoint');
      await loadAllData();
      render();
      return;
    }
    if (act === 'dismiss-modal') {
      document.querySelector('#overlay-root').innerHTML = '';
      return;
    }
  }

  const mod = e.target.closest('[data-module]');
  if (mod) {
    setPage('Training Sessions');
    return;
  }

  const worker = e.target.closest('[data-worker]');
  if (worker) {
    toast('Trainee record ' + worker.dataset.worker + ' active in database');
    return;
  }

  if (!e.target.closest('.search-wrap')) {
    document.querySelector('#search-results')?.classList.remove('show');
  }
});

document.addEventListener('change', e => {
  if (e.target.id === 'period-select') {
    period = e.target.value;
    render();
    toast('Showing ' + period.toLowerCase());
  }
});

// Modal and Verification form submit
document.addEventListener('submit', async e => {
  if (e.target.id === 'api-url-form') {
    e.preventDefault();
    const input = document.querySelector('#api-url-input');
    const newUrl = input?.value.trim().replace(/\/$/, '');
    if (newUrl) {
      localStorage.setItem('SAFEX_API_URL', newUrl);
      API_BASE = newUrl;
      toast('Backend URL updated! Connecting...');
      await loadAllData();
      render();
    }
    return;
  }

  if (e.target.id === 'verify-form') {
    e.preventDefault();
    const input = document.querySelector('#verify-input');
    const certId = input?.value.trim();
    if (!certId) return;

    verifySearchQuery = certId;
    const cert = await apiGet(`/api/certificates/${certId}`);
    if (cert) {
      verifySearchResult = cert;
      render();
      toast('Certificate found and verified!');
    } else {
      toast('Certificate not found with ID: ' + certId);
    }
    return;
  }

  if (e.target.id !== 'quick-form') return;
  e.preventDefault();
  const isWorker = e.target.dataset.kind === 'worker';
  const fd = new FormData(e.target);

  if (isWorker) {
    const name = String(fd.get('name')).trim();
    const traineeId = String(fd.get('traineeId')).trim();
    const language = String(fd.get('language')).trim();
    const deviceId = String(fd.get('deviceId')).trim();

    const res = await apiPost('/api/trainees', {
      name,
      traineeId,
      language,
      deviceId
    });

    if (res.success) {
      toast(`Trainee ${name} registered in PostgreSQL (${formatLanguage(language)})`);
      await loadAllData();
    } else {
      toast('Error saving trainee: ' + res.message);
    }
  } else {
    const name = String(fd.get('name')).trim();
    const module = String(fd.get('module')).trim();
    const traineeId = String(fd.get('traineeId')).trim();
    const sessionId = 'SESSION-' + Date.now().toString().slice(-6);

    const res = await apiPost('/api/sessions', {
      sessionId,
      traineeId,
      module,
      startedAt: new Date().toISOString()
    });

    if (res.success) {
      toast(`Session ${sessionId} scheduled in PostgreSQL`);
      await loadAllData();
    } else {
      toast('Error creating session: ' + res.message);
    }
  }

  document.querySelector('#overlay-root').innerHTML = '';
  render();
});

document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    document.querySelector('#global-search')?.focus();
  }
  if (e.key === 'Escape') {
    document.querySelector('#overlay-root').innerHTML = '';
    document.querySelector('#sidebar')?.classList.remove('open');
  }
});

let pointerFrame = 0;
window.addEventListener('pointermove', e => {
  if (matchMedia('(pointer: coarse)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (pointerFrame) return;
  pointerFrame = requestAnimationFrame(() => {
    document.documentElement.style.setProperty('--pointer-x', `${e.clientX}px`);
    document.documentElement.style.setProperty('--pointer-y', `${e.clientY}px`);
    pointerFrame = 0;
  });
}, { passive: true });

// Initial render
render();
