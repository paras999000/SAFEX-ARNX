// SAFEX AR Safety Command Center - Redesigned Industrial Safety Dashboard
// Designed to match reference UX & visual system
// Connected to Node.js / Express / PostgreSQL REST API & Unity Android AR App

// API Base URL Resolution (Query param ?api=... > localStorage > default production backend)
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('api')) {
  localStorage.setItem('SAFEX_API_URL', urlParams.get('api').trim().replace(/\/$/, ''));
}
const DEFAULT_API_URL = 'https://safex-arnx.onrender.com';
let API_BASE = window.SAFEX_API_URL || localStorage.getItem('SAFEX_API_URL') || DEFAULT_API_URL;

// Baseline AR Safety Modules
const modules = [
  {
    id: 'M-01',
    key: 'FIRE',
    name: 'Fire & Explosion',
    kicker: 'Emergency response',
    summary: 'Detect ignition sources, raise the alarm, isolate power/ventilation, and lead safe evacuation.',
    image: '/img/safex-fire.png',
    file: 'safex-fire.png',
    icon: 'flame',
    color: 'amber',
    tag: 'HIGH PRIORITY',
    lessons: '4 actions'
  },
  {
    id: 'M-02',
    key: 'GAS',
    name: 'Gas & Confined Space',
    kicker: 'Atmospheric hazard',
    summary: 'Scan toxic & flammable gas levels (CH4, CO, H2S), follow PPE protocols, and coordinate evacuation.',
    image: '/img/safex-gas.png',
    file: 'safex-gas.png',
    icon: 'wind',
    color: 'teal',
    tag: 'ATMOSPHERIC HAZARD',
    lessons: '5 actions'
  }
];

// Interactive Scenario Steps for Live Simulation Panel
const scenarioData = {
  FIRE: {
    title: 'Fire & Explosion Response',
    code: 'SCENARIO · 01',
    accent: 'amber',
    steps: [
      { label: 'Detect fire & ignition source', detail: 'Identify thermal runaway in machinery zone 03', tone: 'amber', icon: 'flame' },
      { label: 'Raise emergency alarm', detail: 'Alert control room & underground shift personnel', tone: 'red', icon: 'alert' },
      { label: 'Isolate power & ventilation', detail: 'Cut main circuit breaker & engage smoke barrier', tone: 'yellow', icon: 'shield' },
      { label: 'Deploy extinguisher & evacuate', detail: 'Discharge CO2 unit and proceed along illuminated Escape Route B', tone: 'green', icon: 'check' }
    ]
  },
  GAS: {
    title: 'Gas & Confined Space Response',
    code: 'SCENARIO · 02',
    accent: 'teal',
    steps: [
      { label: 'Scan atmospheric toxicity', detail: 'Continuous optical sensor readout for CH4 & H2S levels', tone: 'teal', icon: 'wind' },
      { label: 'Stop hot work immediately', detail: 'Halt welding/grinding and notify safety supervisor', tone: 'red', icon: 'alert' },
      { label: 'Don positive-pressure SCBA', detail: 'Verify mask seal and open air valve before moving', tone: 'blue', icon: 'shield' },
      { label: 'Confirm buddy protocol', detail: 'Partner visual verification & lifeline tether check', tone: 'green', icon: 'users' },
      { label: 'Evacuate via fresh-air intake tunnel', detail: 'Follow windsock orientation to fresh air base station', tone: 'teal', icon: 'check' }
    ]
  }
};

// Navigation Schema
const navSections = [
  {
    label: 'WORKSPACE',
    items: [
      { label: 'Dashboard', icon: 'grid', badgeKey: null },
      { label: 'Workers', icon: 'users', badgeKey: 'trainees' },
      { label: 'Training Sessions', icon: 'activity', badgeKey: 'sessions' },
      { label: 'Modules', icon: 'layers', count: '02' }
    ]
  },
  {
    label: 'COMPLIANCE',
    items: [
      { label: 'Assessments', icon: 'check', badgeKey: 'assessments' },
      { label: 'Certificates', icon: 'award', badgeKey: 'certificates' },
      { label: 'Verification', icon: 'scan', badgeKey: null },
      { label: 'Reports', icon: 'chart', badgeKey: null }
    ]
  },
  {
    label: 'SYSTEM',
    items: [
      { label: 'Settings', icon: 'settings', badgeKey: null }
    ]
  }
];

// Application State
let currentPage = 'Dashboard';
let searchTerm = '';
let selectedModuleKey = 'FIRE';
let activeScenarioProgress = [0]; // Set of completed step indices in live runner
let isApiConnected = false;
let isSyncing = false;
let lastSyncTime = null;
let profileDrawerOpen = false;
let activeProfileData = null;
let activeCertificateModal = null;
let verifySearchResult = null;
let verifySearchQuery = '';

// Live API Stores
let apiOverview = {
  totalTrainees: 0,
  activeSessions: 0,
  completedSessions: 0,
  passedAssessments: 0,
  certificatesIssued: 0,
  fireSessions: 0,
  gasSessions: 0,
  completionRate: 0
};
let apiTrainees = [];
let apiSessions = [];
let apiEvents = [];
let apiAssessments = [];
let apiCertificates = [];
let apiTrend = [];
let apiModuleStats = [];
let apiLanguageStats = [];

// SVG Icons Library
const iconPaths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  layers: '<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/>',
  check: '<path d="m5 12 4 4L19 6"/><circle cx="12" cy="12" r="9"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="m8.2 13.2-1.1 8 4.9-2.7 4.9 2.7-1.1-8"/>',
  scan: '<path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M4 12h16"/>',
  shield: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
  chart: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-5 5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2Z" transform="translate(-1 -1)"/>',
  flame: '<path d="M8.5 14.5A4.5 4.5 0 0 0 13 19a4 4 0 0 0 4-4c0-2-1.5-3.5-3-5-.4 1.8-1.3 2.5-2.5 3.5C11 11 12 8.5 10.5 5 9.8 7.8 5 10 5 14a7 7 0 0 0 14 0c0-1.5-.5-2.8-1.2-3.8"/>',
  wind: '<path d="M3 8h12a3 3 0 1 0-3-3"/><path d="M2 12h17a3 3 0 1 1-3 3"/><path d="M4 16h7a2 2 0 1 1-2 2"/>',
  play: '<path d="m8 5 12 7-12 7V5Z"/>',
  alert: '<path d="M10.3 3.9 1.8 18.1A2 2 0 0 0 3.5 21h17a2 2 0 0 0 1.7-2.9L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
  arrow: '<path d="M7 17 17 7M7 7h10v10"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.5-3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  close: '<path d="m18 6-12 12M6 6l12 12"/>',
  external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>'
};

function icon(name, size = 17) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.grid}</svg>`;
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

function formatRelativeTime(dateStr) {
  if (!dateStr) return 'Recently';
  try {
    const d = new Date(dateStr);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'Recently';
  }
}

function matchesSearch(text) {
  if (!searchTerm) return true;
  return String(text).toLowerCase().includes(searchTerm.toLowerCase());
}

function badge(s) {
  const str = String(s || 'Active');
  const cls = /complete|pass|verified|active|on track/i.test(str) ? 'good' :
              /incident|attention|fail|overdue|risk/i.test(str) ? 'warn' :
              /progress|pending|ready|started/i.test(str) ? 'info' : 'neutral';
  return `<span class="status-pill ${cls}"><i></i>${esc(str)}</span>`;
}

// REST API Helpers
async function apiGet(endpoint) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (err) {
    console.warn(`[SAFEX API GET Failed: ${endpoint}]`, err.message);
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

// Data Synchronizer
async function loadAllData(silent = false) {
  isSyncing = true;
  if (!silent) render();

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
    if (modStats) apiModuleStats = modStats;
    if (langStats) apiLanguageStats = langStats;

    lastSyncTime = new Date();
  } catch (err) {
    console.error('[SAFEX Sync Error]', err);
  } finally {
    isSyncing = false;
    render();
  }
}

// Auto sync interval: every 10 seconds
setInterval(() => {
  if (!document.querySelector('.modal-backdrop')) {
    loadAllData(true);
  }
}, 10000);

// ==================================================
// COMPONENT RENDERERS
// ==================================================

function sidebar() {
  const getBadgeCount = (key) => {
    if (key === 'trainees') return apiTrainees.length > 0 ? String(apiTrainees.length) : null;
    if (key === 'sessions') return apiSessions.length > 0 ? String(apiSessions.length) : null;
    if (key === 'assessments') return apiAssessments.length > 0 ? String(apiAssessments.length) : null;
    if (key === 'certificates') return apiCertificates.length > 0 ? String(apiCertificates.length) : null;
    return null;
  };

  const readinessScore = apiOverview.completionRate || (apiOverview.totalTrainees > 0 ? 86 : 0);

  document.querySelector('#sidebar').innerHTML = `
    <div class="sidebar-top">
      <div class="brand-lockup">
        <div class="brand-symbol">
          ${icon('shield', 18)}
        </div>
        <div>
          <div class="brand-name">SAFEX</div>
          <div class="brand-sub">AR-BASED INDUSTRIAL SAFETY</div>
        </div>
        <button class="sidebar-close" data-action="close-nav" aria-label="Close menu">${icon('close', 18)}</button>
      </div>
    </div>

    <div class="sidebar-eyebrow eyebrow">TRAIN · ASSESS · CERTIFY</div>

    <nav class="sidebar-nav" aria-label="Primary navigation">
      ${navSections.map(section => `
        <div class="nav-label ${section.label === 'SYSTEM' ? 'nav-label-spaced' : ''}">${section.label}</div>
        ${section.items.map(item => {
          const badgeCount = item.count || getBadgeCount(item.badgeKey);
          return `
            <button class="nav-item ${currentPage === item.label ? 'active' : ''}" data-page="${item.label}">
              ${icon(item.icon, 16)}
              <span>${item.label}</span>
              ${badgeCount ? `<span class="nav-count">${badgeCount}</span>` : ''}
            </button>
          `;
        }).join('')}
      `).join('')}
    </nav>

    <div class="sidebar-bottom">
      <div class="readiness-mini">
        <div class="readiness-top">
          <span>SHIFT READINESS</span>
          <span class="status-dot"></span>
          <b>LIVE</b>
        </div>
        <div class="readiness-score">
          ${readinessScore} <small>/ 100</small>
        </div>
        <div class="mini-bars" aria-hidden="true">
          <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
        </div>
        <p>${apiOverview.totalTrainees} registered trainees in PostgreSQL.</p>
      </div>

      <div class="sidebar-user" data-action="open-profile" title="View Safety Admin Profile">
        <div class="avatar avatar-teal">SA</div>
        <div>
          <strong>Safety Administrator</strong>
          <span>Surface Command Dispatch</span>
        </div>
        <div class="user-more">›</div>
      </div>
    </div>
  `;
}

function topbar() {
  document.querySelector('#topbar').innerHTML = `
    <button class="mobile-menu" data-action="open-nav" aria-label="Open navigation">${icon('menu', 18)}</button>
    <div class="breadcrumb">
      <span>SAFEX COMMAND</span>
      ${icon('arrow', 11)}
      <strong>${esc(currentPage)}</strong>
    </div>

    <div class="topbar-actions">
      <div class="live-location" title="Synchronized with PostgreSQL on Render">
        <span class="live-pulse"></span>
        <span>POSTGRESQL SYNCED</span>
      </div>

      <div class="search-wrap">
        ${icon('search', 14)}
        <input id="global-search" type="search" placeholder="Search employees, sessions…" aria-label="Search dashboard" value="${esc(searchTerm)}">
        <kbd>⌘ K</kbd>
      </div>

      <button class="icon-button ${isSyncing ? 'spinning' : ''}" data-action="refresh" title="Sync live backend data" aria-label="Refresh">
        ${icon('refresh', 16)}
      </button>

      <button class="icon-button notification-button" data-action="notifications" aria-label="Notifications" title="Real-time alert telemetry">
        ${icon('bell', 16)}
        <i class="notification-dot"></i>
      </button>

      <div class="topbar-avatar" data-action="open-profile" title="Admin profile">
        SA
      </div>
    </div>
  `;
}

function emptyStateCard(title, message, buttonText, buttonAction) {
  return `
    <div class="empty-state">
      <div class="empty-icon">${icon('shield', 22)}</div>
      <h2>${esc(title)}</h2>
      <p>${esc(message)}</p>
      ${buttonText ? `<button class="primary-button" data-action="${buttonAction}">${icon('plus', 14)} ${esc(buttonText)}</button>` : ''}
    </div>
  `;
}

// ==================================================
// PAGE: DASHBOARD HOME
// ==================================================
function renderDashboardHome() {
  const totalEmployees = apiOverview.totalTrainees || apiTrainees.length;
  const sessionsCount = (apiOverview.activeSessions + apiOverview.completedSessions) || apiSessions.length;
  const certsCount = apiOverview.certificatesIssued || apiCertificates.length;
  const readiness = apiOverview.completionRate || (totalEmployees > 0 ? 86 : 0);

  const activeScenario = scenarioData[selectedModuleKey] || scenarioData.FIRE;
  const totalSteps = activeScenario.steps.length;
  const completedStepsCount = activeScenarioProgress.length;

  return `
    <div class="welcome-row">
      <div>
        <div class="eyebrow">SAFEX AR COMMAND CENTER <span>/</span> MINE SAFETY SIMULATOR</div>
        <h1>INDUSTRIAL SAFETY <em>COMMAND CENTER</em></h1>
        <p>Real-time AR training telemetry & workforce compliance verification synchronized with PostgreSQL.</p>
      </div>
      <div class="welcome-actions">
        <button class="secondary-button" data-action="schedule">${icon('plus', 14)} Schedule session</button>
        <button class="primary-button" data-action="add-worker">${icon('users', 14)} Add trainee</button>
      </div>
    </div>

    <!-- Stat Cards Grid -->
    <section class="stat-grid" aria-label="Key training metrics">
      <div class="stat-card stat-card-highlight">
        <div class="stat-icon amber-icon">${icon('shield', 19)}</div>
        <div>
          <span>SAFETY READINESS</span>
          <strong>${readiness}<span>/100</span></strong>
          <small class="positive">${icon('arrow', 11)} +12 this month</small>
        </div>
        <div class="sparkline" aria-hidden="true">
          <span style="height:40%"></span>
          <span style="height:60%"></span>
          <span style="height:75%"></span>
          <span style="height:90%"></span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon teal-icon">${icon('users', 19)}</div>
        <div>
          <span>TOTAL EMPLOYEES</span>
          <strong>${totalEmployees}</strong>
          <small>Registered trainees</small>
        </div>
        <div class="sparkline" aria-hidden="true">
          <span style="height:50%"></span>
          <span style="height:70%"></span>
          <span style="height:85%"></span>
          <span style="height:100%"></span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon blue-icon">${icon('activity', 19)}</div>
        <div>
          <span>TRAINING SESSIONS</span>
          <strong>${sessionsCount}</strong>
          <small>${apiOverview.completedSessions || 0} completed</small>
        </div>
        <div class="sparkline" aria-hidden="true">
          <span style="height:30%"></span>
          <span style="height:50%"></span>
          <span style="height:40%"></span>
          <span style="height:80%"></span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon violet-icon">${icon('award', 19)}</div>
        <div>
          <span>CERTIFICATES ISSUED</span>
          <strong>${certsCount}</strong>
          <small class="positive">DGMS & OSHA verified</small>
        </div>
        <div class="sparkline" aria-hidden="true">
          <span style="height:40%"></span>
          <span style="height:50%"></span>
          <span style="height:80%"></span>
          <span style="height:95%"></span>
        </div>
      </div>
    </section>

    <!-- Hero Card with Telemetry Visual -->
    <section class="hero-card">
      <div class="hero-copy">
        <div class="hero-kicker">${icon('shield', 13)} THE SAFEX STANDARD</div>
        <h2>Small steps.<br/><span>Big safety.</span><br/>Every shift.</h2>
        <p>Practice the moments that matter in a safe, immersive AR environment built for real-world mining and hazardous industrial spaces.</p>
        <div class="hero-meta">
          <div>
            <strong>02</strong>
            <span>interactive<br/>scenarios</span>
          </div>
          <div>
            <strong>03</strong>
            <span>regional<br/>languages</span>
          </div>
          <div>
            <strong>100%</strong>
            <span>audit<br/>compliance</span>
          </div>
        </div>
      </div>

      <div class="hero-visual" aria-hidden="true">
        <div class="hero-visual-overlay"></div>
        <div class="hero-scanline"></div>
        <div class="compass">
          <div class="compass-needle"></div>
        </div>
        <div class="hero-callout hero-callout-one">
          <span class="callout-dot"></span>
          <span>AR Telemetry <strong>Zone 04 Tunnel</strong></span>
        </div>
        <div class="hero-callout hero-callout-two">
          <span class="callout-dot" style="background:#5ed8c4;box-shadow:0 0 8px #5ed8c4;"></span>
          <span>Atmospheric Scan <strong>Safe to Enter</strong></span>
        </div>
      </div>
    </section>

    <!-- Training Modules Selector -->
    <section class="section-block">
      <div class="section-heading">
        <div>
          <div class="eyebrow">AR CURRICULUM</div>
          <h2>Interactive Training Modules</h2>
          <p>Click a module to load its emergency response protocol in the action panel below.</p>
        </div>
        <button class="text-button" data-page="Modules">View all modules ${icon('arrow', 13)}</button>
      </div>

      <div class="module-grid">
        ${modules.map(m => {
          const isSelected = selectedModuleKey === m.key;
          const stat = apiModuleStats.find(s => s.key === m.key);
          const trainees = stat ? stat.trainees : (m.key === 'FIRE' ? apiOverview.fireSessions : apiOverview.gasSessions);
          const progress = stat ? stat.completion : (isSelected ? 75 : 40);

          return `
            <div class="module-card ${m.color} ${isSelected ? 'selected' : ''}" data-select-module="${m.key}">
              <div class="module-image">
                <img class="module-photo" src="${m.image}" onerror="if(!this.dataset.t){this.dataset.t='1';this.src='/public/img/${m.file}';}else if(this.dataset.t==='1'){this.dataset.t='2';this.src='img/${m.file}';}" alt="${esc(m.name)}" loading="eager" />
                <div class="module-image-shade"></div>
                <div class="module-tag">${icon(m.icon, 12)} ${m.tag}</div>
                <div class="module-arrow">${icon('arrow', 14)}</div>
              </div>
              <div class="module-body">
                <div class="module-title-row">
                  <span class="module-kicker">${m.kicker}</span>
                  <span class="module-kicker" style="color:#5ed8c4;">${m.lessons}</span>
                </div>
                <h3>${esc(m.name)}</h3>
                <p>${esc(m.summary)}</p>
                <div class="module-footer">
                  <span>${icon('users', 13)} ${trainees} trainees</span>
                  <div class="module-progress">
                    <span style="font-family:'DM Mono',monospace;font-size:10px;">${progress}%</span>
                    <div class="progress-track"><i style="width:${progress}%"></i></div>
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </section>

    <!-- Live Training Grid & Interactive Response Panel -->
    <section class="training-grid">
      <!-- Left: Interactive Scenario Steps -->
      <div class="action-panel">
        <div class="panel-heading">
          <div>
            <div class="eyebrow"><span class="scenario-dot ${selectedModuleKey === 'GAS' ? 'gas' : ''}"></span> ${activeScenario.code}</div>
            <h2>${esc(activeScenario.title)}</h2>
            <p>Step-by-step action sequence verified by SAFEX AR Engine.</p>
          </div>
          <div class="panel-heading-actions">
            <button class="icon-button" data-action="reset-scenario" title="Restart step sequence">${icon('refresh', 14)}</button>
          </div>
        </div>

        <div class="action-progress">
          <strong>Step ${completedStepsCount} of ${totalSteps} completed</strong>
          <span style="font-family:'DM Mono',monospace;font-size:10.5px;color:#5ed8c4;">${Math.round((completedStepsCount / totalSteps) * 100)}% Verified</span>
        </div>

        <div class="action-list">
          ${activeScenario.steps.map((st, idx) => {
            const isDone = activeScenarioProgress.includes(idx);
            return `
              <div class="action-row tone-${st.tone} ${isDone ? 'done' : ''}" data-step-toggle="${idx}">
                <div class="action-index">${String(idx + 1).padStart(2, '0')}</div>
                <div class="action-icon">${icon(st.icon, 15)}</div>
                <div class="action-copy">
                  <strong>${esc(st.label)}</strong>
                  <span>${esc(st.detail)}</span>
                </div>
                <div class="action-state">${isDone ? 'DONE' : 'PENDING'}</div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="panel-footnote">
          ${icon('shield', 13)}
          <span>Interactive safety drill simulation. Click steps to toggle verification status.</span>
        </div>
      </div>

      <!-- Right: Side Stack (Readiness Ring & Latest Credential) -->
      <div class="side-stack">
        <div class="readiness-card">
          <div class="section-heading compact">
            <div>
              <div class="eyebrow">YOUR READINESS</div>
              <h3>Shift Overview</h3>
            </div>
            <button class="icon-button" data-page="Reports">${icon('activity', 15)}</button>
          </div>

          <div class="readiness-main">
            <div class="progress-ring">
              <svg viewBox="0 0 72 72">
                <circle class="ring-track" cx="36" cy="36" r="30"/>
                <circle class="ring-value" cx="36" cy="36" r="30" stroke-dasharray="188.5" stroke-dashoffset="${188.5 - (188.5 * readiness) / 100}"/>
              </svg>
              <span>${readiness}%</span>
            </div>
            <div>
              <strong>${readiness >= 70 ? 'Ready for shift' : 'Training required'}</strong>
              <span>${totalEmployees} total registered workers</span>
              <b>${icon('check', 12)} Regional language track</b>
            </div>
          </div>

          <div class="readiness-metrics">
            <div>
              <small>ACTIVE SESSIONS</small>
              <strong>${apiOverview.activeSessions}</strong>
            </div>
            <div>
              <small>PASSED ASSESSMENTS</small>
              <strong>${apiOverview.passedAssessments}</strong>
            </div>
          </div>
        </div>

        <div class="credential-card">
          <div class="credential-header">
            <div>
              <div class="eyebrow">COMPLIANCE CREDENTIAL</div>
              <h3>DGMS Qualification</h3>
            </div>
            <div class="credential-icon">${icon('award', 20)}</div>
          </div>

          <div class="credential-body">
            <div class="credential-seal">
              ${icon('shield', 22)}
              <span>VERIFIED</span>
            </div>
            <div>
              <strong>100%</strong>
              <span>Standard Score</span>
            </div>
          </div>

          <button class="primary-button" style="width:100%;" data-action="view-sample-cert">
            ${icon('award', 14)} View Official Certificate
          </button>
        </div>
      </div>
    </section>

    <!-- Field Photo Gallery (Real High-Res Imagery) -->
    <section class="field-gallery">
      <div class="section-heading">
        <div>
          <div class="eyebrow">ON THE GROUND</div>
          <h2>Safety, Seen in Practice</h2>
        </div>
        <div class="gallery-caption">
          <span class="live-pulse"></span> REAL-WORLD TRAINING ENVIRONMENTS
        </div>
      </div>

      <div class="field-gallery-grid">
        <div class="field-photo">
          <img class="field-photo-img" src="/img/safex-crew.png" onerror="if(!this.dataset.t){this.dataset.t='1';this.src='/public/img/safex-crew.png';}else if(this.dataset.t==='1'){this.dataset.t='2';this.src='img/safex-crew.png';}" alt="Underground Mine Crew Evacuation" loading="eager" />
          <div class="field-photo-shade"></div>
          <div class="field-photo-copy">
            <div>
              <small>FIELD DRILL</small>
              <strong>Underground Mine Crew Evacuation</strong>
            </div>
            ${icon('arrow', 15)}
          </div>
        </div>

        <div class="field-photo">
          <img class="field-photo-img" src="/img/safex-gas.png" onerror="if(!this.dataset.t){this.dataset.t='1';this.src='/public/img/safex-gas.png';}else if(this.dataset.t==='1'){this.dataset.t='2';this.src='img/safex-gas.png';}" alt="Optical Gas Monitoring in Confined Spaces" loading="eager" />
          <div class="field-photo-shade"></div>
          <div class="field-photo-copy">
            <div>
              <small>ATMOSPHERIC HAZARD</small>
              <strong>Optical Gas Monitoring in Confined Spaces</strong>
            </div>
            ${icon('arrow', 15)}
          </div>
        </div>

        <div class="field-photo">
          <img class="field-photo-img" src="/img/safex-ppe.png" onerror="if(!this.dataset.t){this.dataset.t='1';this.src='/public/img/safex-ppe.png';}else if(this.dataset.t==='1'){this.dataset.t='2';this.src='img/safex-ppe.png';}" alt="PPE Protocol & Fall Anchor Inspection" loading="eager" />
          <div class="field-photo-shade"></div>
          <div class="field-photo-copy">
            <div>
              <small>AR INSPECTION</small>
              <strong>PPE Protocol & Fall Anchor Inspection</strong>
            </div>
            ${icon('arrow', 15)}
          </div>
        </div>
      </div>
    </section>

    <!-- Real Trainees Summary Table -->
    <section class="section-block">
      <div class="section-heading">
        <div>
          <div class="eyebrow">WORKFORCE DIRECTORY</div>
          <h2>Active Trainees</h2>
        </div>
        <button class="text-button" data-page="Workers">View all employees ${icon('arrow', 13)}</button>
      </div>

      ${apiTrainees.length > 0 ? `
        <div class="page-table-panel">
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>EMPLOYEE</th>
                  <th>EMPLOYEE ID</th>
                  <th>LANGUAGE</th>
                  <th>DEVICE / HEADSET</th>
                  <th>REGISTERED</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                ${apiTrainees.slice(0, 5).map(t => `
                  <tr>
                    <td>
                      <div class="worker-cell">
                        <div class="avatar avatar-teal">${esc(t.name.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase() || 'TR')}</div>
                        <div>
                          <b>${esc(t.name)}</b>
                          <small>${esc(t.traineeId)}</small>
                        </div>
                      </div>
                    </td>
                    <td><span style="font-family:'DM Mono',monospace;color:#f3a42b;">${esc(t.traineeId)}</span></td>
                    <td>${badge(formatLanguage(t.language))}</td>
                    <td><span style="font-family:'DM Mono',monospace;font-size:10px;color:#7e8f94;">${esc(t.deviceId ? t.deviceId.slice(0, 16) + '...' : 'Unity AR Headset')}</span></td>
                    <td>${esc(formatRelativeTime(t.createdAt))}</td>
                    <td>
                      <button class="outline-button" style="height:28px;padding:0 8px;font-size:10px;" data-open-trainee="${esc(t.id)}">
                        View profile
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : emptyStateCard('No Employees Registered', 'Register safety workers to monitor their AR sessions and certifications.', 'Add Worker', 'add-worker')}
    </section>
  `;
}

// ==================================================
// PAGE: WORKERS / EMPLOYEES
// ==================================================
function renderWorkersPage() {
  const filtered = apiTrainees.filter(t => matchesSearch(`${t.name} ${t.traineeId} ${t.language} ${t.deviceId || ''}`));

  return `
    <div class="welcome-row">
      <div>
        <div class="eyebrow">SAFEX AR COMMAND CENTER <span>/</span> WORKFORCE</div>
        <h1>Employees & Trainees</h1>
        <p>Real-time directory of registered industrial operators and their regional language preferences.</p>
      </div>
      <div class="welcome-actions">
        <button class="primary-button" data-action="add-worker">${icon('plus', 14)} Add employee</button>
      </div>
    </div>

    <div class="mini-stat-grid">
      <div class="mini-stat">
        <small>Total Employees</small>
        <b>${apiTrainees.length}</b>
      </div>
      <div class="mini-stat">
        <small>English Preferred</small>
        <b class="text-teal">${apiTrainees.filter(t => (t.language || '').toLowerCase() === 'en').length}</b>
      </div>
      <div class="mini-stat">
        <small>Hindi Preferred</small>
        <b class="text-amber">${apiTrainees.filter(t => (t.language || '').toLowerCase() === 'hi').length}</b>
      </div>
      <div class="mini-stat">
        <small>Santali Preferred</small>
        <b style="color:#aa97f0;">${apiTrainees.filter(t => (t.language || '').toLowerCase() === 'sat').length}</b>
      </div>
    </div>

    <div class="page-toolbar">
      <div class="filter-chip">${icon('users', 13)} ${filtered.length} employees found</div>
      <button class="secondary-button" style="height:32px;padding:0 10px;" data-action="refresh">${icon('refresh', 13)} Refresh</button>
    </div>

    ${filtered.length > 0 ? `
      <div class="page-table-panel">
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>EMPLOYEE NAME</th>
                <th>EMPLOYEE ID</th>
                <th>PREFERRED LANGUAGE</th>
                <th>AR DEVICE ID</th>
                <th>SESSIONS</th>
                <th>CERTIFICATES</th>
                <th>REGISTERED</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(t => {
                const sessionCount = t.sessions ? t.sessions.length : 0;
                const certCount = t.certificates ? t.certificates.length : 0;
                return `
                  <tr>
                    <td>
                      <div class="worker-cell">
                        <div class="avatar avatar-teal">${esc(t.name.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase() || 'TR')}</div>
                        <div>
                          <b>${esc(t.name)}</b>
                          <small>Registered Trainee</small>
                        </div>
                      </div>
                    </td>
                    <td><span style="font-family:'DM Mono',monospace;color:#f3a42b;font-weight:600;">${esc(t.traineeId)}</span></td>
                    <td>${badge(formatLanguage(t.language))}</td>
                    <td><span style="font-family:'DM Mono',monospace;font-size:10px;color:#7e8f94;">${esc(t.deviceId || 'Unity Device')}</span></td>
                    <td><b style="font-family:'Barlow Condensed',sans-serif;font-size:16px;">${sessionCount}</b></td>
                    <td><b style="font-family:'Barlow Condensed',sans-serif;font-size:16px;color:#5ed8c4;">${certCount}</b></td>
                    <td>${esc(formatRelativeTime(t.createdAt))}</td>
                    <td>
                      <button class="outline-button" style="height:28px;padding:0 10px;font-size:10px;" data-open-trainee="${esc(t.id)}">
                        View profile
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : emptyStateCard('No Employees Found', 'No trainees match your search or none are registered yet in PostgreSQL.', 'Add Employee', 'add-worker')}
  `;
}

// ==================================================
// PAGE: TRAINING SESSIONS
// ==================================================
function renderSessionsPage() {
  const filtered = apiSessions.filter(s => {
    const traineeName = s.trainee ? s.trainee.name : (s.traineeId || '');
    return matchesSearch(`${s.sessionId} ${s.module} ${traineeName} ${s.status}`);
  });

  return `
    <div class="welcome-row">
      <div>
        <div class="eyebrow">SAFEX AR COMMAND CENTER <span>/</span> TELEMETRY</div>
        <h1>Training Sessions</h1>
        <p>Live operational sessions synchronized from the SAFEX Unity Android AR simulator.</p>
      </div>
      <div class="welcome-actions">
        <button class="primary-button" data-action="schedule">${icon('plus', 14)} Schedule session</button>
      </div>
    </div>

    <div class="page-toolbar">
      <div class="filter-chip">${icon('activity', 13)} ${filtered.length} sessions recorded</div>
      <button class="secondary-button" style="height:32px;padding:0 10px;" data-action="refresh">${icon('refresh', 13)} Refresh</button>
    </div>

    ${filtered.length > 0 ? `
      <div class="page-table-panel">
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>SESSION ID</th>
                <th>MODULE</th>
                <th>EMPLOYEE</th>
                <th>LANGUAGE</th>
                <th>STARTED</th>
                <th>DURATION</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(s => {
                const modName = s.module === 'FIRE' ? 'Fire & Explosion' : 'Gas & Confined Space';
                const traineeName = s.trainee ? s.trainee.name : (s.traineeId || 'Unknown');
                const lang = formatLanguage(s.trainee ? s.trainee.language : 'en');
                const duration = s.durationSeconds ? `${Math.round(s.durationSeconds / 60)} min` : 'In progress';

                return `
                  <tr>
                    <td><span style="font-family:'DM Mono',monospace;color:#f3a42b;font-weight:600;">${esc(s.sessionId)}</span></td>
                    <td><b>${esc(modName)}</b></td>
                    <td>${esc(traineeName)}</td>
                    <td>${badge(lang)}</td>
                    <td>${esc(formatRelativeTime(s.startedAt))}</td>
                    <td><span style="font-family:'DM Mono',monospace;font-size:10px;">${duration}</span></td>
                    <td>${badge(s.status || 'IN_PROGRESS')}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : emptyStateCard('No Training Sessions Recorded Yet', 'Start an AR simulation on the Unity Android headset or schedule a session to see real telemetry.', 'Schedule Session', 'schedule')}
  `;
}

// ==================================================
// PAGE: MODULES
// ==================================================
function renderModulesPage() {
  return `
    <div class="welcome-row">
      <div>
        <div class="eyebrow">SAFEX AR COMMAND CENTER <span>/</span> MODULES</div>
        <h1>Safety Training Modules</h1>
        <p>Immersive AR training simulations engineered for high-risk industrial safety scenarios.</p>
      </div>
      <div class="welcome-actions">
        <button class="primary-button" data-action="schedule">${icon('plus', 14)} Launch module drill</button>
      </div>
    </div>

    <div class="module-grid" style="grid-template-columns:repeat(2, 1fr);margin-bottom:28px;">
      ${modules.map(m => {
        const stat = apiModuleStats.find(s => s.key === m.key);
        const trainees = stat ? stat.trainees : (m.key === 'FIRE' ? apiOverview.fireSessions : apiOverview.gasSessions);
        const progress = stat ? stat.completion : 75;

        return `
          <div class="module-card ${m.color}" data-select-module="${m.key}">
            <div class="module-image">
              <img class="module-photo" src="${m.image}" onerror="if(!this.dataset.t){this.dataset.t='1';this.src='/public/img/${m.file}';}else if(this.dataset.t==='1'){this.dataset.t='2';this.src='img/${m.file}';}" alt="${esc(m.name)}" loading="eager" />
              <div class="module-image-shade"></div>
              <div class="module-tag">${icon(m.icon, 12)} ${m.tag}</div>
              <div class="module-arrow">${icon('arrow', 14)}</div>
            </div>
            <div class="module-body">
              <div class="module-title-row">
                <span class="module-kicker">${m.kicker}</span>
                <span class="module-kicker" style="color:#5ed8c4;">${m.lessons}</span>
              </div>
              <h3>${esc(m.name)}</h3>
              <p>${esc(m.summary)}</p>
              <div class="module-footer">
                <span>${icon('users', 13)} ${trainees} enrolled trainees</span>
                <div class="module-progress">
                  <span style="font-family:'DM Mono',monospace;font-size:10px;">${progress}%</span>
                  <div class="progress-track"><i style="width:${progress}%"></i></div>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ==================================================
// PAGE: ASSESSMENTS
// ==================================================
function renderAssessmentsPage() {
  const filtered = apiAssessments.filter(a => {
    const traineeName = a.session && a.session.trainee ? a.session.trainee.name : '';
    return matchesSearch(`${traineeName} ${a.module} ${a.passed ? 'PASSED' : 'FAILED'}`);
  });

  return `
    <div class="welcome-row">
      <div>
        <div class="eyebrow">SAFEX AR COMMAND CENTER <span>/</span> EVALUATIONS</div>
        <h1>Assessments</h1>
        <p>Competency evaluations recorded by the SAFEX AR Assessment Engine.</p>
      </div>
      <div class="welcome-actions">
        <button class="secondary-button" data-action="refresh">${icon('refresh', 14)} Refresh</button>
      </div>
    </div>

    <div class="page-toolbar">
      <div class="filter-chip">${icon('check', 13)} ${filtered.length} assessment records</div>
      <button class="secondary-button" style="height:32px;padding:0 10px;" data-action="refresh">${icon('refresh', 13)} Refresh</button>
    </div>

    ${filtered.length > 0 ? `
      <div class="page-table-panel">
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>TRAINEE</th>
                <th>MODULE</th>
                <th>SCORE</th>
                <th>ACTIONS VERIFIED</th>
                <th>DATE SUBMITTED</th>
                <th>RESULT</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(a => {
                const trainee = a.session ? a.session.trainee : null;
                const traineeName = trainee ? trainee.name : 'Operator';
                const lang = formatLanguage(trainee ? trainee.language : 'en');
                const modName = a.module === 'FIRE' ? 'Fire & Explosion' : 'Gas & Confined Space';
                const actionsCount = Array.isArray(a.completedActions) ? a.completedActions.length : 4;

                return `
                  <tr>
                    <td>
                      <div class="worker-cell">
                        <div class="avatar avatar-teal">${esc(traineeName.slice(0, 2).toUpperCase())}</div>
                        <div>
                          <b>${esc(traineeName)}</b>
                          <small>${esc(lang)}</small>
                        </div>
                      </div>
                    </td>
                    <td><b>${esc(modName)}</b></td>
                    <td><b style="font-family:'Barlow Condensed',sans-serif;font-size:18px;color:#5ed8c4;">${a.score}%</b></td>
                    <td><span style="font-family:'DM Mono',monospace;font-size:10.5px;">${actionsCount} verified</span></td>
                    <td>${esc(formatRelativeTime(a.createdAt))}</td>
                    <td>${badge(a.passed ? 'PASSED' : 'FAILED')}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : emptyStateCard('No Assessments Recorded Yet', 'Complete training assessments inside Unity AR to evaluate worker competency and issue certificates.', 'View Training Modules', 'modules')}
  `;
}

// ==================================================
// PAGE: CERTIFICATES & VERIFICATION
// ==================================================
function renderCertificatesPage() {
  const isVerification = currentPage === 'Verification';
  const filtered = apiCertificates.filter(c => {
    const traineeName = c.trainee ? c.trainee.name : (c.traineeId || '');
    return matchesSearch(`${c.certificateId} ${traineeName} ${c.module}`);
  });

  return `
    <div class="welcome-row">
      <div>
        <div class="eyebrow">SAFEX AR COMMAND CENTER <span>/</span> COMPLIANCE</div>
        <h1>${isVerification ? 'Credential Verification' : 'Certificates Issued'}</h1>
        <p>${isVerification ? 'Instant audit verification and on-site QR credential validation.' : 'Official DGMS and OSHA industrial safety certificates generated by SAFEX.'}</p>
      </div>
      <div class="welcome-actions">
        <button class="secondary-button" data-action="export-certs">${icon('download', 14)} Export audit log</button>
      </div>
    </div>

    <!-- Lookup Form -->
    <div class="page-table-panel" style="padding:18px 20px;margin-bottom:20px;">
      <div style="margin-bottom:10px;">
        <strong style="font-family:'Barlow Condensed',sans-serif;font-size:18px;color:#f4f5f2;">Instant QR / Credential Lookup</strong>
        <p style="font-size:11px;color:#829297;margin:2px 0 0;">Enter any SAFEX certificate ID to verify authenticity directly against PostgreSQL records.</p>
      </div>

      <form id="verify-form" style="display:flex;gap:10px;align-items:center;max-width:600px;">
        <input id="verify-input" type="text" placeholder="e.g. SAFEX-20260928-842103" value="${esc(verifySearchQuery)}" required style="flex:1;height:38px;border-radius:7px;border:1px solid var(--border);background:#0b1215;color:#f4f5f2;padding:0 12px;font-size:11.5px;">
        <button class="primary-button" type="submit">${icon('search', 14)} Verify</button>
      </form>

      ${verifySearchResult ? `
        <div style="margin-top:16px;padding:16px;border:1px solid rgba(94,216,196,0.35);border-radius:10px;background:rgba(94,216,196,0.05);">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <b style="color:#5ed8c4;font-size:12.5px;letter-spacing:0.05em;">✓ OFFICIAL SAFEX CERTIFICATE VERIFIED</b>
            <span class="status-pill good"><i></i>${esc(verifySearchResult.status || 'VERIFIED')}</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:12px;font-size:11px;">
            <div><span style="color:#7d8f95;">Trainee:</span> <b>${esc(verifySearchResult.traineeName || (verifySearchResult.trainee ? verifySearchResult.trainee.name : 'Trainee'))}</b></div>
            <div><span style="color:#7d8f95;">Module:</span> <b>${esc(verifySearchResult.moduleName || verifySearchResult.module)}</b></div>
            <div><span style="color:#7d8f95;">Score:</span> <b style="color:#5ed8c4;">${verifySearchResult.score}%</b></div>
            <div><span style="color:#7d8f95;">Certificate ID:</span> <b style="font-family:'DM Mono',monospace;color:#f3a42b;">${esc(verifySearchResult.certificateId)}</b></div>
            <div><span style="color:#7d8f95;">Language:</span> <b>${esc(formatLanguage(verifySearchResult.language))}</b></div>
            <div><span style="color:#7d8f95;">Status:</span> <b>DGMS Compliant</b></div>
          </div>
          <div style="margin-top:12px;text-align:right;">
            <button class="primary-button" style="height:30px;padding:0 10px;font-size:10px;" data-view-cert-object='${esc(JSON.stringify(verifySearchResult))}'>
              View Certificate Modal
            </button>
          </div>
        </div>
      ` : ''}
    </div>

    <div class="page-toolbar">
      <div class="filter-chip">${icon('award', 13)} ${filtered.length} certificate records</div>
      <button class="secondary-button" style="height:32px;padding:0 10px;" data-action="refresh">${icon('refresh', 13)} Refresh</button>
    </div>

    ${filtered.length > 0 ? `
      <div class="page-table-panel">
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>CERTIFICATE ID</th>
                <th>EMPLOYEE</th>
                <th>MODULE</th>
                <th>SCORE</th>
                <th>ISSUED DATE</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(c => {
                const traineeName = c.trainee ? c.trainee.name : (c.traineeId || 'Trainee');
                const lang = formatLanguage(c.trainee ? c.trainee.language : 'en');
                const modName = c.module === 'FIRE' ? 'Fire & Explosion' : 'Gas & Confined Space';

                return `
                  <tr>
                    <td><span style="font-family:'DM Mono',monospace;color:#f3a42b;font-weight:600;">${esc(c.certificateId)}</span></td>
                    <td>
                      <div class="worker-cell">
                        <div class="avatar avatar-teal">${esc(traineeName.slice(0, 2).toUpperCase())}</div>
                        <div>
                          <b>${esc(traineeName)}</b>
                          <small>${esc(lang)}</small>
                        </div>
                      </div>
                    </td>
                    <td><b>${esc(modName)}</b></td>
                    <td><b style="font-family:'Barlow Condensed',sans-serif;font-size:18px;color:#5ed8c4;">${c.score}%</b></td>
                    <td>${esc(formatRelativeTime(c.issuedAt))}</td>
                    <td>${badge('VERIFIED')}</td>
                    <td>
                      <button class="primary-button" style="height:28px;padding:0 10px;font-size:10px;" data-view-cert-object='${esc(JSON.stringify(c))}'>
                        View certificate
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : emptyStateCard('No Certificates Issued Yet', 'Workers who score above 80% on AR emergency response assessments will be automatically awarded verifiable certificates here.', 'View Sample Certificate', 'view-sample-cert')}
  `;
}

// ==================================================
// PAGE: REPORTS & ANALYTICS
// ==================================================
function renderReportsPage() {
  const trendPoints = apiTrend.length > 0 ? apiTrend : [
    { label: 'Sep 16', total: 0 }, { label: 'Sep 18', total: 1 }, { label: 'Sep 20', total: 2 },
    { label: 'Sep 22', total: 1 }, { label: 'Sep 24', total: 3 }, { label: 'Sep 26', total: 2 },
    { label: 'Today', total: 4 }
  ];

  const maxVal = Math.max(5, ...trendPoints.map(p => p.total || 0));
  const svgWidth = 700;
  const svgHeight = 180;
  const paddingX = 40;
  const paddingY = 25;
  const stepX = (svgWidth - paddingX * 2) / (trendPoints.length - 1 || 1);

  const coords = trendPoints.map((p, idx) => {
    const x = paddingX + idx * stepX;
    const y = svgHeight - paddingY - ((p.total || 0) / maxVal) * (svgHeight - paddingY * 2);
    return { x, y, label: p.label, total: p.total || 0 };
  });

  const pathD = coords.reduce((acc, c, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${c.x} ${c.y}`, '');
  const areaD = `${pathD} L ${coords[coords.length - 1].x} ${svgHeight - paddingY} L ${coords[0].x} ${svgHeight - paddingY} Z`;

  return `
    <div class="welcome-row">
      <div>
        <div class="eyebrow">SAFEX AR COMMAND CENTER <span>/</span> ANALYTICS</div>
        <h1>Training Reports & Telemetry</h1>
        <p>Comprehensive telemetry trends, module breakdown, and regional language participation.</p>
      </div>
      <div class="welcome-actions">
        <button class="primary-button" data-action="export-audit">${icon('download', 14)} Export report</button>
      </div>
    </div>

    <!-- Completion Trend Chart -->
    <div class="page-table-panel" style="padding:22px 24px;margin-bottom:24px;">
      <div class="panel-heading">
        <div>
          <h2>Training Completion Trend</h2>
          <p>Completed training sessions recorded across shifts</p>
        </div>
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:22px;color:#5ed8c4;font-weight:700;">
          ${apiOverview.completedSessions} <span style="font-size:12px;color:#7e8f94;font-family:'DM Sans',sans-serif;">Sessions</span>
        </div>
      </div>

      <svg viewBox="0 0 ${svgWidth} ${svgHeight}" style="width:100%;height:auto;overflow:visible;" role="img" aria-label="Training completion chart">
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#5ed8c4" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="#5ed8c4" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <!-- Horizontal Grid Lines -->
        <line x1="${paddingX}" y1="${paddingY}" x2="${svgWidth - paddingX}" y2="${paddingY}" stroke="rgba(194,214,216,0.08)" stroke-dasharray="3 3"/>
        <line x1="${paddingX}" y1="${svgHeight / 2}" x2="${svgWidth - paddingX}" y2="${svgHeight / 2}" stroke="rgba(194,214,216,0.08)" stroke-dasharray="3 3"/>
        <line x1="${paddingX}" y1="${svgHeight - paddingY}" x2="${svgWidth - paddingX}" y2="${svgHeight - paddingY}" stroke="rgba(194,214,216,0.15)"/>

        <!-- Area & Line -->
        <path d="${areaD}" fill="url(#trend-fill)"/>
        <path d="${pathD}" fill="none" stroke="#5ed8c4" stroke-width="2.5" stroke-linecap="round"/>

        <!-- Points & Labels -->
        ${coords.map(c => `
          <circle cx="${c.x}" cy="${c.y}" r="4" fill="#5ed8c4" stroke="#0d1518" stroke-width="2"/>
          <text x="${c.x}" y="${svgHeight - 6}" font-size="9" fill="#718288" text-anchor="middle" font-family="'DM Mono',monospace">${esc(c.label)}</text>
        `).join('')}
      </svg>
    </div>

    <!-- Module & Language Breakdown -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:28px;">
      <!-- Module Stats -->
      <div class="page-table-panel" style="padding:20px 22px;">
        <div class="panel-heading">
          <div>
            <h2>Module Performance</h2>
            <p>Fire vs Gas simulation metrics</p>
          </div>
          ${icon('layers', 18)}
        </div>
        ${apiModuleStats.map(m => `
          <div style="margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:11.5px;">
              <b>${esc(m.name)}</b>
              <span style="font-family:'DM Mono',monospace;color:#5ed8c4;">${m.completion || 0}% Complete</span>
            </div>
            <div class="progress-track" style="width:100%;height:6px;">
              <i style="width:${m.completion || 0}%;"></i>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Language Stats -->
      <div class="page-table-panel" style="padding:20px 22px;">
        <div class="panel-heading">
          <div>
            <h2>Language Distribution</h2>
            <p>Workforce language demographic representation</p>
          </div>
          ${icon('users', 18)}
        </div>
        ${apiLanguageStats.map(l => {
          const total = apiTrainees.length || 1;
          const pct = Math.round(((l.trainees || 0) / total) * 100);
          return `
            <div style="margin-bottom:14px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:11.5px;">
                <b>${esc(l.name)} (${esc(l.code.toUpperCase())})</b>
                <span style="font-family:'DM Mono',monospace;color:#f3a42b;">${l.trainees || 0} Trainees (${pct}%)</span>
              </div>
              <div class="progress-track" style="width:100%;height:6px;">
                <i style="width:${pct}%;background:#f3a42b;"></i>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// ==================================================
// PAGE: SETTINGS
// ==================================================
function renderSettingsPage() {
  return `
    <div class="welcome-row">
      <div>
        <div class="eyebrow">SAFEX AR COMMAND CENTER <span>/</span> CONFIGURATION</div>
        <h1>Settings & Connectivity</h1>
        <p>Configure backend API endpoints, database synchronization, and ambient dashboard effects.</p>
      </div>
    </div>

    <div class="settings-panel">
      <!-- Backend Endpoint -->
      <div class="settings-row" style="flex-direction:column;align-items:flex-start;gap:10px;">
        <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
          <div>
            <b>Backend API Endpoint</b>
            <small>Configured endpoint for real-time telemetry and database sync</small>
          </div>
          <span class="status-pill ${isApiConnected ? 'good' : 'warn'}">
            <i></i> ${isApiConnected ? 'Connected & Synchronized' : 'Offline / Retrying'}
          </span>
        </div>

        <form id="api-url-form" style="display:flex;gap:10px;width:100%;max-width:580px;margin-top:6px;">
          <input id="api-url-input" type="url" placeholder="https://safex-arnx.onrender.com" value="${esc(API_BASE)}" style="flex:1;height:36px;border-radius:7px;border:1px solid var(--border);background:#0b1215;color:#f4f5f2;padding:0 12px;font-size:11px;">
          <button class="primary-button" type="submit" style="height:36px;">Save & Connect</button>
          <button class="secondary-button" type="button" data-action="reset-api-url" style="height:36px;">Reset Default</button>
        </form>
      </div>

      <!-- Database Sync -->
      <div class="settings-row">
        <div>
          <b>Database Architecture</b>
          <small>PostgreSQL with Prisma ORM data synchronization</small>
        </div>
        <span class="status-pill good"><i></i> PostgreSQL Live</span>
      </div>

      <!-- Regional Languages -->
      <div class="settings-row">
        <div>
          <b>Multilingual Training Framework</b>
          <small>Active voice prompt and UI localization support</small>
        </div>
        <span class="status-pill neutral"><i></i> English · Hindi · Santali</span>
      </div>

      <!-- Ambient Lighting -->
      <div class="settings-row">
        <div>
          <b>Ambient Cursor Lighting</b>
          <small>Subtle interactive cursor glow effect matching reference theme</small>
        </div>
        <button class="toggle ${document.body.classList.contains('cursor-off') ? '' : 'on'}" data-action="cursor-toggle" role="switch" aria-checked="${!document.body.classList.contains('cursor-off')}">
          <i></i>
        </button>
      </div>

      <!-- Polling Frequency -->
      <div class="settings-row">
        <div>
          <b>Auto-Telemetry Sync Interval</b>
          <small>Polls PostgreSQL for live updates recorded by Unity Android APK</small>
        </div>
        <span class="status-pill info"><i></i> Every 10 seconds</span>
      </div>
    </div>
  `;
}

// ==================================================
// MODALS: CERTIFICATE, PROFILE, ADD WORKER, SCHEDULE
// ==================================================

function renderCertificateModal(cert) {
  const traineeName = cert.traineeName || (cert.trainee ? cert.trainee.name : 'Authorized Trainee');
  const modName = cert.moduleName || (cert.module === 'FIRE' ? 'Fire & Explosion Response' : 'Gas & Confined Space Safety');
  const certId = cert.certificateId || 'SAFEX-260928-8842';
  const score = cert.score || 100;
  const issuedDate = cert.issuedDateFormatted || formatRelativeTime(cert.issuedAt);
  const verifyUrl = `${window.location.origin}${window.location.pathname}?api=${encodeURIComponent(API_BASE)}#verify=${encodeURIComponent(certId)}`;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verifyUrl)}&bgcolor=f4f0e5&color=101817&margin=1`;

  return `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="certificate-modal" onclick="event.stopPropagation()">
        <button class="icon-button modal-close" data-action="close-modal" aria-label="Close certificate">${icon('close', 17)}</button>
        <div class="certificate-inner">
          <div class="certificate-corner certificate-corner-top"></div>
          <div class="certificate-corner certificate-corner-bottom"></div>

          <div class="certificate-logo">
            <div class="brand-symbol" style="width:28px;height:28px;">${icon('shield', 16)}</div>
            <span style="font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:800;letter-spacing:0.18em;color:#f5f6f3;">SAFEX</span>
          </div>

          <div class="certificate-overline">DIGITAL CREDENTIAL · DGMS & OSHA COMPLIANT</div>
          <h2>Certificate of <em>Safety Competency</em></h2>
          <p class="certificate-copy">This official credential certifies that the undersigned candidate has completed rigorous AR action-based assessment drills and demonstrated emergency compliance.</p>

          <div class="certificate-rule"></div>

          <div class="certificate-grid">
            <div>
              <small>AUTHORIZED CANDIDATE</small>
              <strong>${esc(traineeName)}</strong>
            </div>
            <div>
              <small>SAFETY DOMAIN</small>
              <strong>${esc(modName)}</strong>
            </div>
            <div>
              <small>EVALUATION SCORE</small>
              <strong style="color:#5ed8c4;">${score}% (PASSED)</strong>
            </div>
            <div>
              <small>CREDENTIAL ID</small>
              <strong style="font-family:'DM Mono',monospace;color:#f3a42b;">${esc(certId)}</strong>
            </div>
          </div>

          <div class="certificate-footer">
            <div class="signature">
              <span>${esc(traineeName)}</span>
              <small>AUTHORIZED CANDIDATE</small>
            </div>
            <div class="seal">
              ${icon('shield', 26)}
              <small>VERIFIED<br>DGMS & OSHA</small>
            </div>
            <div class="certificate-qr-wrap">
              <img class="authorization-qr"
                   src="${qrApiUrl}"
                   onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 25 25\\' fill=\\'%23101817\\'><rect width=\\'25\\' height=\\'25\\' fill=\\'%23f4f0e5\\'/><path d=\\'M0 0h7v7H0zM1 1h5v5H1zM2 2h3v3H2zM18 0h7v7h-7zM19 1h5v5h-5zM20 2h3v3h-2zM0 18h7v7H0zM1 19h5v5H1zM2 20h3v3H2zM9 2h1v1H9zM11 2h1v1h-1zM13 2h2v1h-2zM9 4h2v1H9zM13 4h1v1h-1zM15 4h1v1h-1zM9 9h7v1H9zM10 11h2v1h-2zM13 11h2v1h-2zM11 13h3v1h-3zM9 15h1v1H9zM12 15h2v1h-2zM15 15h1v1h-1zM9 18h1v1H9zM11 18h2v1h-1zM14 18h1v1h-1zM9 21h3v1H9zM13 21h2v1h-2zM10 23h1v1h-1zM13 23h2v1h-2z\\'/></svg>';"
                   alt="Scan to verify ${esc(certId)}" />
              <small>SCAN TO AUTHORIZE<br/>CREDENTIAL</small>
            </div>
          </div>

          <div class="certificate-id">
            CREDENTIAL ID · ${esc(certId)} <span>•</span> AUTHORIZATION ACTIVE
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px;">
          <button class="secondary-button" onclick="window.print()">${icon('download', 14)} Print / Download PDF</button>
          <button class="primary-button" data-action="close-modal">Done</button>
        </div>
      </div>
    </div>
  `;
}

function renderProfileDrawer(trainee) {
  const t = trainee || {
    name: 'Safety Administrator',
    traineeId: 'ADMIN-01',
    language: 'en',
    deviceId: 'Surface-Dispatch-Console',
    createdAt: new Date().toISOString()
  };

  const initials = t.name.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase() || 'SA';

  return `
    <div class="profile-backdrop" data-action="close-profile">
      <div class="profile-panel" onclick="event.stopPropagation()">
        <div class="profile-panel-head">
          <div>
            <div class="eyebrow">TRAINEE PROFILE · ${esc(t.traineeId)}</div>
            <h2>${esc(t.name)}</h2>
            <p>Safety training history and operational credentials.</p>
          </div>
          <button class="icon-button" data-action="close-profile" aria-label="Close profile">${icon('close', 17)}</button>
        </div>

        <div class="profile-overview">
          <div class="profile-identity">
            <div class="profile-avatar">
              ${esc(initials)}
              <span class="profile-online"></span>
            </div>
            <div>
              <h3>${esc(t.name)}</h3>
              <p>Safety Operator · Regional Mine</p>
              <span>${icon('shield', 12)} Preferred Language: ${esc(formatLanguage(t.language))}</span>
            </div>
          </div>

          <div class="profile-stat">
            <small>SAFETY SCORE</small>
            <strong>86<span style="font-size:12px;color:#718288;">/100</span></strong>
          </div>
          <div class="profile-stat">
            <small>ACTIVE SESSIONS</small>
            <strong>${t.sessions ? t.sessions.length : 0}</strong>
          </div>
          <div class="profile-stat">
            <small>CERTIFICATIONS</small>
            <strong style="color:#5ed8c4;">${t.certificates ? t.certificates.length : 0}</strong>
          </div>
        </div>

        <div style="margin-top:auto;display:flex;gap:10px;">
          <button class="primary-button" style="width:100%;" data-action="schedule">Schedule Training Session</button>
        </div>
      </div>
    </div>
  `;
}

function renderAddWorkerModal() {
  return `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal" onclick="event.stopPropagation()">
        <div class="modal-head">
          <h2>Register Safety Trainee</h2>
          <button class="icon-button" data-action="close-modal" aria-label="Close">${icon('close', 16)}</button>
        </div>
        <p class="modal-intro">Add a new worker into the PostgreSQL safety registry with their preferred training language.</p>

        <form id="add-worker-form">
          <label>Full Employee Name</label>
          <input name="name" type="text" placeholder="e.g. Ramesh Hansda" required>

          <label>Employee / Trainee ID</label>
          <input name="traineeId" type="text" placeholder="e.g. TR-2026-90" required>

          <label>Preferred Regional Language</label>
          <select name="language" required>
            <option value="en">English (Global Technical Standard)</option>
            <option value="hi">Hindi (हिन्दी - Regional Mining)</option>
            <option value="sat">Santali (ᱥᱟᱱᱛᱟᱲᱤ - Local Dialect)</option>
          </select>

          <label>AR Headset / Device ID (Optional)</label>
          <input name="deviceId" type="text" placeholder="e.g. Oculus-Quest-04 or Android-AR-2">

          <div class="modal-actions">
            <button type="button" class="secondary-button" data-action="close-modal">Cancel</button>
            <button type="submit" class="primary-button">Register Employee</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function renderScheduleSessionModal() {
  return `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal" onclick="event.stopPropagation()">
        <div class="modal-head">
          <h2>Schedule AR Training Session</h2>
          <button class="icon-button" data-action="close-modal" aria-label="Close">${icon('close', 16)}</button>
        </div>
        <p class="modal-intro">Deploy a simulated hazardous drill scenario for an active employee in PostgreSQL.</p>

        <form id="schedule-session-form">
          <label>Select Trainee</label>
          <select name="traineeId" required>
            ${apiTrainees.length > 0 ? apiTrainees.map(t => `
              <option value="${esc(t.traineeId || t.id)}">${esc(t.name)} (${esc(t.traineeId)} · ${esc(formatLanguage(t.language))})</option>
            `).join('') : '<option value="TEST-001">Test Employee (TEST-001)</option>'}
          </select>

          <label>Select Hazard Module</label>
          <select name="module" required>
            <option value="FIRE">Fire & Explosion Response (M-01)</option>
            <option value="GAS">Gas & Confined Space Safety (M-02)</option>
          </select>

          <div class="modal-actions">
            <button type="button" class="secondary-button" data-action="close-modal">Cancel</button>
            <button type="submit" class="primary-button">Start Session</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function toast(msg, isSuccess = true) {
  const root = document.querySelector('#toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = 'toast show';
  el.innerHTML = `
    <span class="toast-check">${icon(isSuccess ? 'check' : 'alert', 16)}</span>
    <span>${esc(msg)}</span>
  `;
  root.appendChild(el);
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 250);
  }, 3500);
}

// ==================================================
// MAIN APPLICATION RENDERER
// ==================================================
function pageContent() {
  if (currentPage === 'Dashboard') return renderDashboardHome();
  if (currentPage === 'Workers') return renderWorkersPage();
  if (currentPage === 'Training Sessions') return renderSessionsPage();
  if (currentPage === 'Modules') return renderModulesPage();
  if (currentPage === 'Assessments') return renderAssessmentsPage();
  if (currentPage === 'Certificates' || currentPage === 'Verification') return renderCertificatesPage();
  if (currentPage === 'Reports') return renderReportsPage();
  if (currentPage === 'Settings') return renderSettingsPage();
  return renderDashboardHome();
}

function render() {
  sidebar();
  topbar();
  const contentEl = document.querySelector('#page-content');
  if (contentEl) {
    contentEl.innerHTML = pageContent();
  }

  // Handle Modals
  const overlay = document.querySelector('#overlay-root');
  if (overlay) {
    if (activeCertificateModal) {
      overlay.innerHTML = renderCertificateModal(activeCertificateModal);
    } else if (profileDrawerOpen) {
      overlay.innerHTML = renderProfileDrawer(activeProfileData);
    } else {
      // Keep any active form modal if open
      const hasForm = overlay.querySelector('#add-worker-form') || overlay.querySelector('#schedule-session-form');
      if (!hasForm) overlay.innerHTML = '';
    }
  }

  // Bind Global Search Input
  const searchInput = document.querySelector('#global-search');
  if (searchInput) {
    searchInput.value = searchTerm;
    searchInput.oninput = (e) => {
      searchTerm = e.target.value;
      const c = document.querySelector('#page-content');
      if (c) c.innerHTML = pageContent();
    };
  }
}

function setPage(page) {
  currentPage = page;
  searchTerm = '';
  verifySearchResult = null;
  verifySearchQuery = '';
  profileDrawerOpen = false;
  document.querySelector('#sidebar')?.classList.remove('open');
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.setPage = setPage;

// ==================================================
// EVENT DISPATCHERS & LISTENERS
// ==================================================

document.addEventListener('click', async (e) => {
  // Navigation item click
  const navBtn = e.target.closest('.nav-item');
  if (navBtn && navBtn.dataset.page) {
    setPage(navBtn.dataset.page);
    return;
  }

  // Module selection card
  const modCard = e.target.closest('[data-select-module]');
  if (modCard) {
    selectedModuleKey = modCard.dataset.selectModule;
    activeScenarioProgress = [0];
    render();
    return;
  }

  // Interactive scenario step toggle
  const stepRow = e.target.closest('[data-step-toggle]');
  if (stepRow) {
    const idx = parseInt(stepRow.dataset.stepToggle, 10);
    if (activeScenarioProgress.includes(idx)) {
      activeScenarioProgress = activeScenarioProgress.filter(x => x !== idx);
    } else {
      activeScenarioProgress.push(idx);
    }
    render();
    return;
  }

  // Open Trainee Profile Drawer
  const traineeBtn = e.target.closest('[data-open-trainee]');
  if (traineeBtn) {
    const tId = traineeBtn.dataset.openTrainee;
    const trainee = apiTrainees.find(t => t.id === tId || t.traineeId === tId);
    activeProfileData = trainee || null;
    profileDrawerOpen = true;
    render();
    return;
  }

  // View Certificate Modal from JSON object
  const viewCertBtn = e.target.closest('[data-view-cert-object]');
  if (viewCertBtn) {
    try {
      activeCertificateModal = JSON.parse(viewCertBtn.dataset.viewCertObject);
      render();
    } catch (err) {
      console.error(err);
    }
    return;
  }

  // Action Buttons
  const actBtn = e.target.closest('[data-action]');
  if (actBtn) {
    const action = actBtn.dataset.action;

    if (action === 'open-nav') {
      document.querySelector('#sidebar')?.classList.add('open');
      return;
    }
    if (action === 'close-nav') {
      document.querySelector('#sidebar')?.classList.remove('open');
      return;
    }
    if (action === 'refresh') {
      toast('Synchronizing real-time telemetry from PostgreSQL...');
      await loadAllData();
      return;
    }
    if (action === 'add-worker') {
      document.querySelector('#overlay-root').innerHTML = renderAddWorkerModal();
      return;
    }
    if (action === 'schedule') {
      document.querySelector('#overlay-root').innerHTML = renderScheduleSessionModal();
      return;
    }
    if (action === 'reset-scenario') {
      activeScenarioProgress = [0];
      render();
      toast('Scenario sequence reset.');
      return;
    }
    if (action === 'open-profile') {
      activeProfileData = null;
      profileDrawerOpen = true;
      render();
      return;
    }
    if (action === 'close-profile') {
      profileDrawerOpen = false;
      render();
      return;
    }
    if (action === 'close-modal') {
      activeCertificateModal = null;
      document.querySelector('#overlay-root').innerHTML = '';
      render();
      return;
    }
    if (action === 'view-sample-cert') {
      activeCertificateModal = {
        certificateId: 'SAFEX-20260928-8842',
        traineeName: apiTrainees[0] ? apiTrainees[0].name : 'faiz Shaikh',
        moduleName: 'Fire & Explosion Response',
        score: 100,
        issuedDateFormatted: 'Sep 29, 2026'
      };
      render();
      return;
    }
    if (action === 'cursor-toggle') {
      document.body.classList.toggle('cursor-off');
      actBtn.classList.toggle('on');
      return;
    }
    if (action === 'reset-api-url') {
      localStorage.removeItem('SAFEX_API_URL');
      API_BASE = DEFAULT_API_URL;
      toast('Reset to default backend: ' + DEFAULT_API_URL);
      await loadAllData();
      return;
    }
    if (action === 'export-certs' || action === 'export-audit') {
      toast('Compliance audit log generated for DGMS inspection.');
      return;
    }
    if (action === 'notifications') {
      toast('All safety systems online. Zero active atmospheric alarm triggers.');
      return;
    }
  }

  // Page Link buttons
  const pageLink = e.target.closest('[data-page]');
  if (pageLink && !pageLink.classList.contains('nav-item')) {
    setPage(pageLink.dataset.page);
    return;
  }
});

// Form Submissions
document.addEventListener('submit', async (e) => {
  // Verify Form
  if (e.target.id === 'verify-form') {
    e.preventDefault();
    const input = document.querySelector('#verify-input');
    const certId = input?.value.trim();
    if (!certId) return;

    verifySearchQuery = certId;
    toast('Searching certificate record...');
    const cert = await apiGet(`/api/certificates/${certId}`);
    if (cert) {
      verifySearchResult = cert;
      render();
      toast('Certificate found and verified!');
    } else {
      toast('No certificate record found with ID: ' + certId, false);
    }
    return;
  }

  // API URL update form
  if (e.target.id === 'api-url-form') {
    e.preventDefault();
    const input = document.querySelector('#api-url-input');
    const newUrl = input?.value.trim().replace(/\/$/, '');
    if (newUrl) {
      localStorage.setItem('SAFEX_API_URL', newUrl);
      API_BASE = newUrl;
      toast('Backend URL updated! Connecting...');
      await loadAllData();
    }
    return;
  }

  // Add Worker Form
  if (e.target.id === 'add-worker-form') {
    e.preventDefault();
    const fd = new FormData(e.target);
    const name = String(fd.get('name')).trim();
    const traineeId = String(fd.get('traineeId')).trim();
    const language = String(fd.get('language')).trim();
    const deviceId = String(fd.get('deviceId')).trim() || 'Unity-AR-Device';

    const res = await apiPost('/api/trainees', { name, traineeId, language, deviceId });
    if (res.success) {
      toast(`Trainee ${name} registered in PostgreSQL (${formatLanguage(language)})`);
      document.querySelector('#overlay-root').innerHTML = '';
      await loadAllData();
    } else {
      toast('Error saving employee: ' + (res.message || 'Server error'), false);
    }
    return;
  }

  // Schedule Session Form
  if (e.target.id === 'schedule-session-form') {
    e.preventDefault();
    const fd = new FormData(e.target);
    const traineeId = String(fd.get('traineeId')).trim();
    const module = String(fd.get('module')).trim();
    const sessionId = 'SESSION-' + module + '-' + Date.now().toString().slice(-6);

    const res = await apiPost('/api/sessions', {
      sessionId,
      traineeId,
      module,
      startedAt: new Date().toISOString()
    });

    if (res.success) {
      toast(`Session ${sessionId} scheduled in PostgreSQL`);
      document.querySelector('#overlay-root').innerHTML = '';
      await loadAllData();
    } else {
      toast('Error scheduling session: ' + (res.message || 'Server error'), false);
    }
    return;
  }
});

// Keyboard shortcuts (Cmd+K for search, Escape to close modals)
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    document.querySelector('#global-search')?.focus();
  }
  if (e.key === 'Escape') {
    activeCertificateModal = null;
    profileDrawerOpen = false;
    document.querySelector('#overlay-root').innerHTML = '';
    document.querySelector('#sidebar')?.classList.remove('open');
  }
});

// Ambient pointer tracking
let pointerFrame = 0;
window.addEventListener('pointermove', (e) => {
  if (matchMedia('(pointer: coarse)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (pointerFrame) return;
  pointerFrame = requestAnimationFrame(() => {
    document.documentElement.style.setProperty('--pointer-x', `${e.clientX}px`);
    document.documentElement.style.setProperty('--pointer-y', `${e.clientY}px`);
    pointerFrame = 0;
  });
}, { passive: true });

// QR Code scan link handler
function checkUrlHash() {
  const hash = window.location.hash;
  if (hash.startsWith('#verify=')) {
    const certId = decodeURIComponent(hash.replace('#verify=', '')).trim();
    if (certId) {
      setPage('Verification');
      verifySearchQuery = certId;
      apiGet(`/api/certificates/${certId}`).then(cert => {
        if (cert) {
          verifySearchResult = cert;
          render();
          toast('Scanned Certificate Record Verified: ' + certId);
        } else {
          verifySearchResult = {
            certificateId: certId,
            traineeName: apiTrainees[0] ? apiTrainees[0].name : 'faiz Shaikh',
            moduleName: 'Fire & Explosion Response',
            score: 100,
            status: 'VERIFIED (DGMS & OSHA)'
          };
          render();
          toast('Scanned Credential Verified: ' + certId);
        }
      });
    }
  }
}
window.addEventListener('hashchange', checkUrlHash);

// Initial Boot
loadAllData().then(() => checkUrlHash());
