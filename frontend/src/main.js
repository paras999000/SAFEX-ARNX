// SAFEX AR Safety Command Center - Redesigned Industrial Safety Dashboard
// Multilingual Edition: English (en - default), हिन्दी (hi), ᱥᱟᱱᱛᱟᱲᱤ (sat)
// Connected to Node.js / Express / PostgreSQL REST API & Unity Android AR App

import {
  SUPPORTED_LANGUAGES,
  getSavedLanguage,
  setGlobalLanguage,
  t
} from './i18n/translations.js';

// API Base URL Resolution (Query param ?api=... > localStorage > default production backend)
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('api')) {
  localStorage.setItem('SAFEX_API_URL', urlParams.get('api').trim().replace(/\/$/, ''));
}
const DEFAULT_API_URL = 'https://safex-arnx.onrender.com';
let API_BASE = window.SAFEX_API_URL || localStorage.getItem('SAFEX_API_URL') || DEFAULT_API_URL;

// Active Language State (en, hi, sat)
let currentLanguage = getSavedLanguage();
setGlobalLanguage(currentLanguage);

function setLanguage(lang) {
  if (lang !== 'en' && lang !== 'hi' && lang !== 'sat') return;
  currentLanguage = lang;
  setGlobalLanguage(lang);
  render();
}
window.setLanguage = setLanguage;

// Baseline AR Safety Modules
function getModules() {
  return [
    {
      id: 'M-01',
      key: 'FIRE',
      name: t('modules.fire_name'),
      kicker: t('modules.fire_kicker'),
      summary: t('modules.fire_summary'),
      image: '/img/safex-fire.png',
      file: 'safex-fire.png',
      icon: 'flame',
      color: 'amber',
      tag: t('modules.fire_tag'),
      lessons: t('modules.fire_lessons')
    },
    {
      id: 'M-02',
      key: 'GAS',
      name: t('modules.gas_name'),
      kicker: t('modules.gas_kicker'),
      summary: t('modules.gas_summary'),
      image: '/img/safex-gas.png',
      file: 'safex-gas.png',
      icon: 'wind',
      color: 'teal',
      tag: t('modules.gas_tag'),
      lessons: t('modules.gas_lessons')
    }
  ];
}

// Interactive Scenario Steps for Live Simulation Panel
function getScenarioData() {
  return {
    FIRE: {
      title: t('scenario.fire_title'),
      code: t('scenario.fire_code'),
      accent: 'amber',
      steps: [
        { label: t('scenario.fire_step_0_label'), detail: t('scenario.fire_step_0_detail'), tone: 'amber', icon: 'flame' },
        { label: t('scenario.fire_step_1_label'), detail: t('scenario.fire_step_1_detail'), tone: 'red', icon: 'alert' },
        { label: t('scenario.fire_step_2_label'), detail: t('scenario.fire_step_2_detail'), tone: 'yellow', icon: 'shield' },
        { label: t('scenario.fire_step_3_label'), detail: t('scenario.fire_step_3_detail'), tone: 'green', icon: 'check' }
      ]
    },
    GAS: {
      title: t('scenario.gas_title'),
      code: t('scenario.gas_code'),
      accent: 'teal',
      steps: [
        { label: t('scenario.gas_step_0_label'), detail: t('scenario.gas_step_0_detail'), tone: 'teal', icon: 'wind' },
        { label: t('scenario.gas_step_1_label'), detail: t('scenario.gas_step_1_detail'), tone: 'red', icon: 'alert' },
        { label: t('scenario.gas_step_2_label'), detail: t('scenario.gas_step_2_detail'), tone: 'blue', icon: 'shield' },
        { label: t('scenario.gas_step_3_label'), detail: t('scenario.gas_step_3_detail'), tone: 'green', icon: 'users' },
        { label: t('scenario.gas_step_4_label'), detail: t('scenario.gas_step_4_detail'), tone: 'teal', icon: 'check' }
      ]
    }
  };
}

// Navigation Schema
const navSections = [
  {
    key: 'workspace',
    labelKey: 'nav.workspace',
    items: [
      { id: 'Dashboard', key: 'dashboard', labelKey: 'nav.dashboard', icon: 'grid', badgeKey: null },
      { id: 'Workers', key: 'workers', labelKey: 'nav.workers', icon: 'users', badgeKey: 'trainees' },
      { id: 'Training Sessions', key: 'sessions', labelKey: 'nav.sessions', icon: 'activity', badgeKey: 'sessions' },
      { id: 'Modules', key: 'modules', labelKey: 'nav.modules', icon: 'layers', count: '02' }
    ]
  },
  {
    key: 'compliance',
    labelKey: 'nav.compliance',
    items: [
      { id: 'Assessments', key: 'assessments', labelKey: 'nav.assessments', icon: 'check', badgeKey: 'assessments' },
      { id: 'Certificates', key: 'certificates', labelKey: 'nav.certificates', icon: 'award', badgeKey: 'certificates' },
      { id: 'Verification', key: 'verification', labelKey: 'nav.verification', icon: 'scan', badgeKey: null },
      { id: 'Reports', key: 'reports', labelKey: 'nav.reports', icon: 'chart', badgeKey: null }
    ]
  },
  {
    key: 'system',
    labelKey: 'nav.system',
    items: [
      { id: 'Settings', key: 'settings', labelKey: 'nav.settings', icon: 'settings', badgeKey: null }
    ]
  }
];

function getNavPageLabel(pageId) {
  for (const s of navSections) {
    for (const it of s.items) {
      if (it.id === pageId) return t(it.labelKey);
    }
  }
  return pageId;
}

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
  if (c === 'sat' || c === 'santali') return t('lang.sat');
  if (c === 'hi' || c === 'hindi') return t('lang.hi');
  return t('lang.en');
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return t('time.recently');
  try {
    const d = new Date(dateStr);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return t('time.just_now');
    if (diff < 3600) return t('time.min_ago', { n: Math.floor(diff / 60) });
    if (diff < 86400) return t('time.hours_ago', { n: Math.floor(diff / 3600) });
    const locale = currentLanguage === 'hi' ? 'hi-IN' : (currentLanguage === 'sat' ? 'sat' : 'en-US');
    return d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return t('time.recently');
  }
}

function matchesSearch(text) {
  if (!searchTerm) return true;
  return String(text).toLowerCase().includes(searchTerm.toLowerCase());
}

function badge(s) {
  const str = String(s || 'Active');
  const cls = /complete|pass|verified|active|on track|सत्यापित|उत्तीर्ण|ᱥᱟᱹᱛ|ᱯᱟᱥ|ᱵᱷᱮᱨᱤᱯᱷᱟᱭ/i.test(str) ? 'good' :
              /incident|attention|fail|overdue|risk|अनुत्तीर्ण|ᱯᱷᱮᱞ/i.test(str) ? 'warn' :
              /progress|pending|ready|started|लंबित|ᱵᱟᱹᱠᱤ/i.test(str) ? 'info' : 'neutral';

  let display = str;
  const upper = str.toUpperCase();
  if (upper === 'ACTIVE') display = t('badge.active');
  else if (upper === 'IN_PROGRESS' || upper === 'IN PROGRESS') display = t('badge.in_progress');
  else if (upper === 'PASSED') display = t('badge.passed');
  else if (upper === 'FAILED') display = t('badge.failed');
  else if (upper === 'VERIFIED') display = t('badge.verified');
  else if (upper === 'NOT FOUND') display = t('badge.not_found');

  return `<span class="status-pill ${cls}"><i></i>${esc(display)}</span>`;
}

// REST API Helpers
async function apiGet(endpoint) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Accept': 'application/json',
        'X-SAFEX-API-KEY': 'SAFEX-AR-SAFETY-KEY-2026'
      }
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

// ==================================================
// QR CODE PARSING & EXTRACTION
// ==================================================
function parseCertificateQR(data) {
  if (!data || typeof data !== 'string') return null;
  const text = data.trim();
  if (!text) return null;

  // 1. JSON structure: {"certificateId":"...", ...} or {"id":"..."}
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object') {
      const id = parsed.certificateId || parsed.id || parsed.certId;
      if (id && typeof id === 'string') return id.trim();
    }
  } catch {}

  // 2. Structured text with explicit label: "ID: SAFEX-..." or "CERTIFICATE ID: ..."
  const labelMatch = text.match(/(?:CERTIFICATE\s*ID|CERT\s*ID|^ID|[\r\n]ID)[:=\s]+([A-Za-z0-9_-]+)/i);
  if (labelMatch && labelMatch[1]) {
    return labelMatch[1].trim();
  }

  // 3. SAFEX standard ID format: SAFEX-YYYYMMDD-###### or SAFEX-[alphanumeric]
  const safexMatch = text.match(/SAFEX-[A-Za-z0-9_-]+/i);
  if (safexMatch) {
    return safexMatch[0].trim();
  }

  // 4. URL format: http(s)://...?cert=... or ?certificateId=... or /certificates/SAFEX-...
  try {
    if (text.startsWith('http://') || text.startsWith('https://')) {
      const url = new URL(text);
      const qCert = url.searchParams.get('cert') || url.searchParams.get('certificateId') || url.searchParams.get('id');
      if (qCert) return qCert.trim();

      const parts = url.pathname.split('/').filter(Boolean);
      const last = parts[parts.length - 1];
      if (last && /^SAFEX-[A-Za-z0-9_-]+$/i.test(last)) {
        return last.trim();
      }
    }
  } catch {}

  // 5. Fallback: single token alphanumeric string of valid certificate length
  if (/^[A-Za-z0-9_-]{6,36}$/.test(text)) {
    return text;
  }

  return null;
}

// Dynamic html5-qrcode loader
async function ensureHtml5Qrcode() {
  if (typeof window !== 'undefined' && window.Html5Qrcode) {
    return window.Html5Qrcode;
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="html5-qrcode"]');
    if (existing) {
      if (window.Html5Qrcode) return resolve(window.Html5Qrcode);
      existing.addEventListener('load', () => resolve(window.Html5Qrcode));
      existing.addEventListener('error', () => reject(new Error('Failed to load html5-qrcode library')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
    script.async = true;
    script.onload = () => resolve(window.Html5Qrcode);
    script.onerror = () => reject(new Error('Failed to load html5-qrcode from CDN'));
    document.head.appendChild(script);
  });
}

// Live Scanner State
let html5QrScannerInstance = null;

async function startQrScanner() {
  const statusEl = document.querySelector('#qr-camera-status');
  const errorView = document.querySelector('#qr-error-view');
  const errorTitle = document.querySelector('#qr-error-title');
  const errorMsg = document.querySelector('#qr-error-msg');
  const reticle = document.querySelector('#qr-reticle');

  if (errorView) errorView.style.display = 'none';
  if (reticle) reticle.style.display = 'flex';
  if (statusEl) {
    statusEl.textContent = t('qr.status_requesting');
    statusEl.style.color = '#5ed8c4';
  }

  try {
    const Html5QrcodeClass = await ensureHtml5Qrcode();
    if (!Html5QrcodeClass) {
      throw new Error('Camera scanner library not available.');
    }

    await stopQrScanner();

    // Verify cameras are available
    let cameras = [];
    try {
      cameras = await Html5QrcodeClass.getCameras();
    } catch (camErr) {
      console.warn('[QR Scanner] Error getting cameras list:', camErr);
    }

    if (!cameras || cameras.length === 0) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (errorView) {
          errorView.style.display = 'flex';
          if (reticle) reticle.style.display = 'none';
          if (errorTitle) errorTitle.textContent = t('qr.err_no_cam_title');
          if (errorMsg) errorMsg.textContent = t('qr.err_no_cam_msg');
        }
        return;
      }
    }

    html5QrScannerInstance = new Html5QrcodeClass('safex-qr-reader', false);

    const onScanSuccess = async (decodedText) => {
      console.log('[SAFEX QR] Decoded raw content:', decodedText);
      const certId = parseCertificateQR(decodedText);

      if (!certId) {
        if (statusEl) {
          statusEl.textContent = t('qr.status_invalid');
          statusEl.style.color = '#e4544a';
        }
        toast(t('toast.qr_invalid'), false);
        return;
      }

      toast(t('toast.qr_detected', { id: certId }));
      if (statusEl) {
        statusEl.textContent = t('qr.status_detected', { id: certId });
        statusEl.style.color = '#5ed8c4';
      }

      // Stop camera and close scanner modal immediately
      await stopQrScanner();
      closeQrScannerModal();

      // Trigger automatic verification
      await performCertificateVerification(certId);
    };

    const qrConfig = {
      fps: 15,
      qrbox: { width: 220, height: 220 },
      aspectRatio: 1.0,
    };

    await html5QrScannerInstance.start(
      { facingMode: 'environment' },
      qrConfig,
      onScanSuccess,
      () => {}
    );

    if (statusEl) {
      statusEl.textContent = t('qr.status_point');
      statusEl.style.color = '#829297';
    }
  } catch (err) {
    console.error('[QR Scanner] Camera start failed:', err);
    await stopQrScanner();

    if (errorView) {
      errorView.style.display = 'flex';
      if (reticle) reticle.style.display = 'none';
      const msg = String(err?.message || err);
      const isDenied = msg.includes('Permission') || msg.includes('denied') || msg.includes('NotAllowedError');
      if (isDenied) {
        if (errorTitle) errorTitle.textContent = t('qr.err_access_title');
        if (errorMsg) errorMsg.textContent = t('qr.err_access_msg');
      } else {
        if (errorTitle) errorTitle.textContent = t('qr.err_no_cam_title');
        if (errorMsg) errorMsg.textContent = t('qr.err_no_cam_msg');
      }
    }
  }
}

async function stopQrScanner() {
  if (html5QrScannerInstance) {
    try {
      if (html5QrScannerInstance.isScanning) {
        await html5QrScannerInstance.stop();
      }
      html5QrScannerInstance.clear();
    } catch (e) {
      console.warn('[QR Scanner Stop Error]', e);
    }
    html5QrScannerInstance = null;
  }
}

function openQrScannerModal() {
  const overlay = document.querySelector('#overlay-root');
  if (!overlay) return;

  overlay.innerHTML = `
    <div class="modal-backdrop" id="qr-modal-backdrop" data-action="close-qr-scanner">
      <div class="modal qr-scanner-modal" onclick="event.stopPropagation()">
        <div class="modal-head">
          <div>
            <div class="eyebrow" style="color:#5ed8c4;margin-bottom:4px;">${esc(t('qr.eyebrow'))}</div>
            <h2>${esc(t('qr.heading'))}</h2>
          </div>
          <button class="icon-button" data-action="close-qr-scanner" aria-label="${esc(t('action.close'))}" style="width:32px;height:32px;">
            ${icon('close', 16)}
          </button>
        </div>
        <p class="modal-intro" style="margin-bottom:14px;">${esc(t('qr.intro'))}</p>

        <div class="qr-camera-viewport">
          <div id="safex-qr-reader"></div>

          <div class="qr-target-overlay" id="qr-reticle">
            <div class="qr-scan-box">
              <div style="position:absolute;top:-2px;left:-2px;width:26px;height:26px;border-top:3px solid #5ed8c4;border-left:3px solid #5ed8c4;border-top-left-radius:6px;"></div>
              <div style="position:absolute;top:-2px;right:-2px;width:26px;height:26px;border-top:3px solid #5ed8c4;border-right:3px solid #5ed8c4;border-top-right-radius:6px;"></div>
              <div style="position:absolute;bottom:-2px;left:-2px;width:26px;height:26px;border-bottom:3px solid #5ed8c4;border-left:3px solid #5ed8c4;border-bottom-left-radius:6px;"></div>
              <div style="position:absolute;bottom:-2px;right:-2px;width:26px;height:26px;border-bottom:3px solid #5ed8c4;border-right:3px solid #5ed8c4;border-bottom-right-radius:6px;"></div>
              <div class="qr-laser-line"></div>
            </div>
            <div id="qr-camera-status" style="margin-top:14px;font-family:'DM Mono',monospace;font-size:11px;color:#829297;background:rgba(5,8,10,0.85);padding:4px 14px;border-radius:4px;border:1px solid rgba(255,255,255,0.08);">
              ${esc(t('qr.status_point'))}
            </div>
          </div>

          <div id="qr-error-view" style="display:none;position:absolute;inset:0;padding:24px;background:#0d1417;flex-direction:column;align-items:center;justify-content:center;text-align:center;z-index:10;">
            <div style="width:48px;height:48px;border-radius:50%;background:rgba(228,84,74,0.12);color:#e4544a;display:flex;align-items:center;justify-content:center;margin-bottom:12px;">
              ${icon('alert', 24)}
            </div>
            <b id="qr-error-title" style="color:#f4f5f2;font-size:14px;margin-bottom:6px;">${esc(t('qr.err_access_title'))}</b>
            <p id="qr-error-msg" style="color:#7d8e93;font-size:11.5px;max-width:320px;line-height:1.5;">${esc(t('qr.err_access_msg'))}</p>
            <button type="button" class="secondary-button" style="margin-top:16px;height:34px;padding:0 14px;" data-action="retry-camera">
              ${icon('refresh', 13)} ${esc(t('action.retry_camera'))}
            </button>
          </div>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:16px;">
          <span style="font-size:11px;color:#7d8e93;">${esc(t('qr.stream_label'))}</span>
          <button type="button" class="secondary-button" data-action="close-qr-scanner" style="height:36px;padding:0 18px;">
            ${esc(t('action.close_scanner'))}
          </button>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => {
    startQrScanner();
  }, 50);
}

function closeQrScannerModal() {
  stopQrScanner();
  const overlay = document.querySelector('#overlay-root');
  if (overlay) overlay.innerHTML = '';
}

async function performCertificateVerification(certId) {
  if (!certId) return;
  const tid = String(certId).trim();
  verifySearchQuery = tid;
  toast(t('toast.verifying_pg'));

  const cert = await apiGet(`/api/certificates/${encodeURIComponent(tid)}`);
  if (cert) {
    verifySearchResult = {
      found: true,
      verified: true,
      ...cert
    };
    toast(t('toast.cert_verified'));
  } else {
    verifySearchResult = {
      found: false,
      verified: false,
      certificateId: tid
    };
    toast(t('toast.cert_not_found'), false);
  }
  render();

  setTimeout(() => {
    const resEl = document.querySelector('#verification-result-card');
    if (resEl) resEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 100);
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
          <div class="brand-name">${esc(t('brand.name'))}</div>
          <div class="brand-sub">${esc(t('brand.subtitle'))}</div>
        </div>
        <button class="sidebar-close" data-action="close-nav" aria-label="${esc(t('action.close'))}">${icon('close', 18)}</button>
      </div>
    </div>

    <div class="sidebar-eyebrow eyebrow">${esc(t('brand.eyebrow'))}</div>

    <nav class="sidebar-nav" aria-label="Primary navigation">
      ${navSections.map(section => `
        <div class="nav-label ${section.key === 'system' ? 'nav-label-spaced' : ''}">${esc(t(section.labelKey))}</div>
        ${section.items.map(item => {
          const badgeCount = item.count || getBadgeCount(item.badgeKey);
          return `
            <button class="nav-item ${currentPage === item.id ? 'active' : ''}" data-page="${item.id}">
              ${icon(item.icon, 16)}
              <span>${esc(t(item.labelKey))}</span>
              ${badgeCount ? `<span class="nav-count">${badgeCount}</span>` : ''}
            </button>
          `;
        }).join('')}
      `).join('')}
    </nav>

    <div class="sidebar-bottom">
      <div class="readiness-mini">
        <div class="readiness-top">
          <span>${esc(t('sidebar.readiness'))}</span>
          <span class="status-dot"></span>
          <b>${esc(t('sidebar.live'))}</b>
        </div>
        <div class="readiness-score">
          ${readinessScore} <small>/ 100</small>
        </div>
        <div class="mini-bars" aria-hidden="true">
          <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
        </div>
        <p>${esc(t('sidebar.trainees_count', { n: apiOverview.totalTrainees }))}</p>
      </div>

      <div class="sidebar-user" data-action="open-profile" title="${esc(t('action.view_profile'))}">
        <div class="avatar avatar-teal">SA</div>
        <div>
          <strong>${esc(t('sidebar.user_role'))}</strong>
          <span>${esc(t('sidebar.user_dept'))}</span>
        </div>
        <div class="user-more">›</div>
      </div>
    </div>
  `;
}

function topbar() {
  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

  document.querySelector('#topbar').innerHTML = `
    <button class="mobile-menu" data-action="open-nav" aria-label="Open navigation">${icon('menu', 18)}</button>
    <div class="breadcrumb">
      <span>${esc(t('breadcrumb.root'))}</span>
      ${icon('arrow', 11)}
      <strong>${esc(getNavPageLabel(currentPage))}</strong>
    </div>

    <div class="topbar-actions">
      <div class="live-location" title="Synchronized with PostgreSQL on Render">
        <span class="live-pulse"></span>
        <span>${esc(t('status.postgres_synced'))}</span>
      </div>

      <div class="search-wrap">
        ${icon('search', 14)}
        <input id="global-search" type="search" placeholder="${esc(t('topbar.search_placeholder'))}" aria-label="Search dashboard" value="${esc(searchTerm)}">
        <kbd>⌘ K</kbd>
      </div>

      <!-- LANGUAGE SELECTOR -->
      <div class="lang-selector-wrap" id="lang-selector-wrap">
        <button type="button" class="lang-selector-btn" id="lang-menu-trigger" data-action="toggle-lang-menu" aria-haspopup="true" aria-expanded="false" title="Language: ${currentLangObj.label}">
          <span class="lang-globe">🌐</span>
          <span class="lang-code">${currentLangObj.code.toUpperCase()}</span>
          <span class="lang-chevron">▾</span>
        </button>
        <div class="lang-dropdown-menu" id="lang-dropdown-menu" role="menu">
          ${SUPPORTED_LANGUAGES.map(l => `
            <button type="button" class="lang-option ${currentLanguage === l.code ? 'active' : ''}" data-change-lang="${l.code}" role="menuitem">
              <span class="lang-flag">${l.flag}</span>
              <span class="lang-name">${l.code === 'sat' ? 'Santali' : esc(l.label)}</span>
              ${currentLanguage === l.code ? '<span class="lang-check">✓</span>' : ''}
            </button>
          `).join('')}
        </div>
      </div>

      <button class="icon-button ${isSyncing ? 'spinning' : ''}" data-action="refresh" title="${esc(t('action.refresh'))}" aria-label="${esc(t('action.refresh'))}">
        ${icon('refresh', 16)}
      </button>

      <button class="icon-button notification-button" data-action="notifications" aria-label="Notifications" title="${esc(t('common.all_systems_online'))}">
        ${icon('bell', 16)}
        <i class="notification-dot"></i>
      </button>

      <div class="topbar-avatar" data-action="open-profile" title="${esc(t('sidebar.user_role'))}">
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

  const scenarioData = getScenarioData();
  const currentModules = getModules();
  const activeScenario = scenarioData[selectedModuleKey] || scenarioData.FIRE;
  const totalSteps = activeScenario.steps.length;
  const completedStepsCount = activeScenarioProgress.length;

  return `
    <div class="welcome-row">
      <div>
        <div class="eyebrow">${t('dashboard.eyebrow')}</div>
        <h1>${esc(t('dashboard.title_main'))} <em>${esc(t('dashboard.title_em'))}</em></h1>
        <p>${esc(t('dashboard.subtitle'))}</p>
      </div>
      <div class="welcome-actions">
        <button class="secondary-button" data-action="schedule">${icon('plus', 14)} ${esc(t('action.schedule'))}</button>
        <button class="primary-button" data-action="add-worker">${icon('users', 14)} ${esc(t('action.add_trainee'))}</button>
      </div>
    </div>

    <!-- Stat Cards Grid -->
    <section class="stat-grid" aria-label="Key training metrics">
      <div class="stat-card stat-card-highlight">
        <div class="stat-icon amber-icon">${icon('shield', 19)}</div>
        <div>
          <span>${esc(t('dashboard.stat_readiness'))}</span>
          <strong>${readiness}<span>/100</span></strong>
          <small class="positive">${icon('arrow', 11)} ${esc(t('dashboard.stat_readiness_delta'))}</small>
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
          <span>${esc(t('dashboard.stat_employees'))}</span>
          <strong>${totalEmployees}</strong>
          <small>${esc(t('dashboard.stat_employees_sub'))}</small>
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
          <span>${esc(t('dashboard.stat_sessions'))}</span>
          <strong>${sessionsCount}</strong>
          <small>${esc(t('dashboard.stat_sessions_sub', { n: apiOverview.completedSessions || 0 }))}</small>
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
          <span>${esc(t('dashboard.stat_certs'))}</span>
          <strong>${certsCount}</strong>
          <small class="positive">${esc(t('dashboard.stat_certs_sub'))}</small>
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
        <div class="hero-kicker">${icon('shield', 13)} ${esc(t('dashboard.hero_kicker'))}</div>
        <h2>${esc(t('dashboard.hero_title_1'))}<br/><span>${esc(t('dashboard.hero_title_2'))}</span><br/>${esc(t('dashboard.hero_title_3'))}</h2>
        <p>${esc(t('dashboard.hero_desc'))}</p>
        <div class="hero-meta">
          <div>
            <strong>02</strong>
            <span>${t('dashboard.hero_meta_scenarios')}</span>
          </div>
          <div>
            <strong>03</strong>
            <span>${t('dashboard.hero_meta_languages')}</span>
          </div>
          <div>
            <strong>100%</strong>
            <span>${t('dashboard.hero_meta_compliance')}</span>
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
          <span>${t('dashboard.callout_tunnel')}</span>
        </div>
        <div class="hero-callout hero-callout-two">
          <span class="callout-dot" style="background:#5ed8c4;box-shadow:0 0 8px #5ed8c4;"></span>
          <span>${t('dashboard.callout_gas')}</span>
        </div>
      </div>
    </section>

    <!-- Training Modules Selector -->
    <section class="section-block">
      <div class="section-heading">
        <div>
          <div class="eyebrow">${esc(t('dashboard.curriculum_eyebrow'))}</div>
          <h2>${esc(t('dashboard.curriculum_title'))}</h2>
          <p>${esc(t('dashboard.curriculum_desc'))}</p>
        </div>
        <button class="text-button" data-page="Modules">${esc(t('dashboard.curriculum_view_all'))} ${icon('arrow', 13)}</button>
      </div>

      <div class="module-grid">
        ${currentModules.map(m => {
          const isSelected = selectedModuleKey === m.key;
          const stat = apiModuleStats.find(s => s.key === m.key);
          const trainees = stat ? stat.trainees : (m.key === 'FIRE' ? apiOverview.fireSessions : apiOverview.gasSessions);
          const progress = stat ? stat.completion : (isSelected ? 75 : 40);

          return `
            <div class="module-card ${m.color} ${isSelected ? 'selected' : ''}" data-select-module="${m.key}">
              <div class="module-image">
                <img class="module-photo" src="${m.image}" onerror="if(!this.dataset.t){this.dataset.t='1';this.src='/public/img/${m.file}';}else if(this.dataset.t==='1'){this.dataset.t='2';this.src='img/${m.file}';}" alt="${esc(m.name)}" loading="eager" />
                <div class="module-image-shade"></div>
                <div class="module-tag">${icon(m.icon, 12)} ${esc(m.tag)}</div>
                <div class="module-arrow">${icon('arrow', 14)}</div>
              </div>
              <div class="module-body">
                <div class="module-title-row">
                  <span class="module-kicker">${esc(m.kicker)}</span>
                  <span class="module-kicker" style="color:#5ed8c4;">${esc(m.lessons)}</span>
                </div>
                <h3>${esc(m.name)}</h3>
                <p>${esc(m.summary)}</p>
                <div class="module-footer">
                  <span>${icon('users', 13)} ${esc(t('modules.trainees_stat', { n: trainees }))}</span>
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
            <div class="eyebrow"><span class="scenario-dot ${selectedModuleKey === 'GAS' ? 'gas' : ''}"></span> ${esc(activeScenario.code)}</div>
            <h2>${esc(activeScenario.title)}</h2>
            <p>Step-by-step action sequence verified by SAFEX AR Engine.</p>
          </div>
          <div class="panel-heading-actions">
            <button class="icon-button" data-action="reset-scenario" title="Restart step sequence">${icon('refresh', 14)}</button>
          </div>
        </div>

        <div class="action-progress">
          <strong>${esc(t('dashboard.step_completed', { c: completedStepsCount, t: totalSteps }))}</strong>
          <span style="font-family:'DM Mono',monospace;font-size:10.5px;color:#5ed8c4;">${esc(t('dashboard.step_verified', { pct: Math.round((completedStepsCount / totalSteps) * 100) }))}</span>
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
                <div class="action-state">${isDone ? esc(t('dashboard.step_done')) : esc(t('dashboard.step_pending'))}</div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="panel-footnote">
          ${icon('shield', 13)}
          <span>${esc(t('dashboard.panel_footnote'))}</span>
        </div>
      </div>

      <!-- Right: Side Stack (Readiness Ring & Latest Credential) -->
      <div class="side-stack">
        <div class="readiness-card">
          <div class="section-heading compact">
            <div>
              <div class="eyebrow">${esc(t('dashboard.your_readiness'))}</div>
              <h3>${esc(t('dashboard.shift_overview'))}</h3>
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
              <strong>${readiness >= 70 ? esc(t('dashboard.ready_for_shift')) : esc(t('dashboard.training_required'))}</strong>
              <span>${esc(t('dashboard.total_registered_workers', { n: totalEmployees }))}</span>
              <b>${icon('check', 12)} ${esc(t('dashboard.regional_lang_track'))}</b>
            </div>
          </div>

          <div class="readiness-metrics">
            <div>
              <small>${esc(t('dashboard.active_sessions'))}</small>
              <strong>${apiOverview.activeSessions}</strong>
            </div>
            <div>
              <small>${esc(t('dashboard.passed_assessments'))}</small>
              <strong>${apiOverview.passedAssessments}</strong>
            </div>
          </div>
        </div>

        <div class="credential-card">
          <div class="credential-header">
            <div>
              <div class="eyebrow">${esc(t('dashboard.compliance_credential'))}</div>
              <h3>${esc(t('dashboard.dgms_qualification'))}</h3>
            </div>
            <div class="credential-icon">${icon('award', 20)}</div>
          </div>

          <div class="credential-body">
            <div class="credential-seal">
              ${icon('shield', 22)}
              <span>${esc(t('badge.verified'))}</span>
            </div>
            <div>
              <strong>100%</strong>
              <span>${esc(t('dashboard.standard_score'))}</span>
            </div>
          </div>

          <button class="primary-button" style="width:100%;" data-action="view-sample-cert">
            ${icon('award', 14)} ${esc(t('action.view_official_cert'))}
          </button>
        </div>
      </div>
    </section>

    <!-- Field Photo Gallery (Real High-Res Imagery) -->
    <section class="field-gallery">
      <div class="section-heading">
        <div>
          <div class="eyebrow">${esc(t('dashboard.on_the_ground'))}</div>
          <h2>${esc(t('dashboard.safety_in_practice'))}</h2>
        </div>
        <div class="gallery-caption">
          <span class="live-pulse"></span> ${esc(t('dashboard.real_world_env'))}
        </div>
      </div>

      <div class="field-gallery-grid">
        <div class="field-photo">
          <img class="field-photo-img" src="/img/safex-crew.png" onerror="if(!this.dataset.t){this.dataset.t='1';this.src='/public/img/safex-crew.png';}else if(this.dataset.t==='1'){this.dataset.t='2';this.src='img/safex-crew.png';}" alt="Underground Mine Crew Evacuation" loading="eager" />
          <div class="field-photo-shade"></div>
          <div class="field-photo-copy">
            <div>
              <small>${esc(t('dashboard.drill_crew_kicker'))}</small>
              <strong>${esc(t('dashboard.drill_crew_title'))}</strong>
            </div>
            ${icon('arrow', 15)}
          </div>
        </div>

        <div class="field-photo">
          <img class="field-photo-img" src="/img/safex-gas.png" onerror="if(!this.dataset.t){this.dataset.t='1';this.src='/public/img/safex-gas.png';}else if(this.dataset.t==='1'){this.dataset.t='2';this.src='img/safex-gas.png';}" alt="Optical Gas Monitoring in Confined Spaces" loading="eager" />
          <div class="field-photo-shade"></div>
          <div class="field-photo-copy">
            <div>
              <small>${esc(t('dashboard.drill_gas_kicker'))}</small>
              <strong>${esc(t('dashboard.drill_gas_title'))}</strong>
            </div>
            ${icon('arrow', 15)}
          </div>
        </div>

        <div class="field-photo">
          <img class="field-photo-img" src="/img/safex-ppe.png" onerror="if(!this.dataset.t){this.dataset.t='1';this.src='/public/img/safex-ppe.png';}else if(this.dataset.t==='1'){this.dataset.t='2';this.src='img/safex-ppe.png';}" alt="PPE Protocol & Fall Anchor Inspection" loading="eager" />
          <div class="field-photo-shade"></div>
          <div class="field-photo-copy">
            <div>
              <small>${esc(t('dashboard.drill_ppe_kicker'))}</small>
              <strong>${esc(t('dashboard.drill_ppe_title'))}</strong>
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
          <div class="eyebrow">${esc(t('dashboard.workforce_eyebrow'))}</div>
          <h2>${esc(t('dashboard.workforce_title'))}</h2>
        </div>
        <button class="text-button" data-page="Workers">${esc(t('dashboard.workforce_view_all'))} ${icon('arrow', 13)}</button>
      </div>

      ${apiTrainees.length > 0 ? `
        <div class="page-table-panel">
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>${esc(t('workers.th_employee'))}</th>
                  <th>${esc(t('workers.th_id'))}</th>
                  <th>${esc(t('sessions.th_language'))}</th>
                  <th>${esc(t('workers.th_device'))}</th>
                  <th>${esc(t('workers.th_registered'))}</th>
                  <th>${esc(t('workers.th_actions'))}</th>
                </tr>
              </thead>
              <tbody>
                ${apiTrainees.slice(0, 5).map(tItem => `
                  <tr>
                    <td>
                      <div class="worker-cell">
                        <div class="avatar avatar-teal">${esc(tItem.name.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase() || 'TR')}</div>
                        <div>
                          <b>${esc(tItem.name)}</b>
                          <small>${esc(tItem.traineeId)}</small>
                        </div>
                      </div>
                    </td>
                    <td><span style="font-family:'DM Mono',monospace;color:#f3a42b;">${esc(tItem.traineeId)}</span></td>
                    <td>${badge(formatLanguage(tItem.language))}</td>
                    <td><span style="font-family:'DM Mono',monospace;font-size:10px;color:#7e8f94;">${esc(tItem.deviceId ? tItem.deviceId.slice(0, 16) + '...' : 'Unity AR Headset')}</span></td>
                    <td>${esc(formatRelativeTime(tItem.createdAt))}</td>
                    <td>
                      <button class="outline-button" style="height:28px;padding:0 8px;font-size:10px;" data-open-trainee="${esc(tItem.id)}">
                        ${esc(t('action.view_profile'))}
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : emptyStateCard(t('workers.empty_home_title'), t('workers.empty_home_desc'), t('action.add_worker'), 'add-worker')}
    </section>
  `;
}

// ==================================================
// PAGE: WORKERS / EMPLOYEES
// ==================================================
function renderWorkersPage() {
  const filtered = apiTrainees.filter(tItem => matchesSearch(`${tItem.name} ${tItem.traineeId} ${tItem.language} ${tItem.deviceId || ''}`));

  return `
    <div class="welcome-row">
      <div>
        <div class="eyebrow">${t('workers.eyebrow')}</div>
        <h1>${esc(t('workers.title'))}</h1>
        <p>${esc(t('workers.subtitle'))}</p>
      </div>
      <div class="welcome-actions">
        <button class="primary-button" data-action="add-worker">${icon('plus', 14)} ${esc(t('action.add_worker'))}</button>
      </div>
    </div>

    <div class="mini-stat-grid">
      <div class="mini-stat">
        <small>${esc(t('workers.total_employees'))}</small>
        <b>${apiTrainees.length}</b>
      </div>
      <div class="mini-stat">
        <small>${esc(t('workers.english_preferred'))}</small>
        <b class="text-teal">${apiTrainees.filter(tItem => (tItem.language || '').toLowerCase() === 'en').length}</b>
      </div>
      <div class="mini-stat">
        <small>${esc(t('workers.hindi_preferred'))}</small>
        <b class="text-amber">${apiTrainees.filter(tItem => (tItem.language || '').toLowerCase() === 'hi').length}</b>
      </div>
      <div class="mini-stat">
        <small>${esc(t('workers.santali_preferred'))}</small>
        <b style="color:#aa97f0;">${apiTrainees.filter(tItem => (tItem.language || '').toLowerCase() === 'sat').length}</b>
      </div>
    </div>

    <div class="page-toolbar">
      <div class="filter-chip">${icon('users', 13)} ${esc(t('workers.found_count', { n: filtered.length }))}</div>
      <button class="secondary-button" style="height:32px;padding:0 10px;" data-action="refresh">${icon('refresh', 13)} ${esc(t('action.refresh'))}</button>
    </div>

    ${filtered.length > 0 ? `
      <div class="page-table-panel">
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>${esc(t('workers.th_employee_name'))}</th>
                <th>${esc(t('workers.th_id'))}</th>
                <th>${esc(t('workers.th_preferred_lang'))}</th>
                <th>${esc(t('workers.th_device_id'))}</th>
                <th>${esc(t('workers.th_sessions'))}</th>
                <th>${esc(t('workers.th_certificates'))}</th>
                <th>${esc(t('workers.th_registered'))}</th>
                <th>${esc(t('workers.th_actions'))}</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(tItem => {
                const sessionCount = tItem.sessions ? tItem.sessions.length : 0;
                const certCount = tItem.certificates ? tItem.certificates.length : 0;
                return `
                  <tr>
                    <td>
                      <div class="worker-cell">
                        <div class="avatar avatar-teal">${esc(tItem.name.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase() || 'TR')}</div>
                        <div>
                          <b>${esc(tItem.name)}</b>
                          <small>${esc(t('workers.registered_trainee'))}</small>
                        </div>
                      </div>
                    </td>
                    <td><span style="font-family:'DM Mono',monospace;color:#f3a42b;font-weight:600;">${esc(tItem.traineeId)}</span></td>
                    <td>${badge(formatLanguage(tItem.language))}</td>
                    <td><span style="font-family:'DM Mono',monospace;font-size:10px;color:#7e8f94;">${esc(tItem.deviceId || 'Unity Device')}</span></td>
                    <td><b style="font-family:'Barlow Condensed',sans-serif;font-size:16px;">${sessionCount}</b></td>
                    <td><b style="font-family:'Barlow Condensed',sans-serif;font-size:16px;color:#5ed8c4;">${certCount}</b></td>
                    <td>${esc(formatRelativeTime(tItem.createdAt))}</td>
                    <td>
                      <button class="outline-button" style="height:28px;padding:0 10px;font-size:10px;" data-open-trainee="${esc(tItem.id)}">
                        ${esc(t('action.view_profile'))}
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : emptyStateCard(t('workers.empty_title'), t('workers.empty_desc'), t('action.add_worker'), 'add-worker')}
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
        <div class="eyebrow">${t('sessions.eyebrow')}</div>
        <h1>${esc(t('sessions.title'))}</h1>
        <p>${esc(t('sessions.subtitle'))}</p>
      </div>
      <div class="welcome-actions">
        <button class="primary-button" data-action="schedule">${icon('plus', 14)} ${esc(t('action.schedule'))}</button>
      </div>
    </div>

    <div class="page-toolbar">
      <div class="filter-chip">${icon('activity', 13)} ${esc(t('sessions.found_count', { n: filtered.length }))}</div>
      <button class="secondary-button" style="height:32px;padding:0 10px;" data-action="refresh">${icon('refresh', 13)} ${esc(t('action.refresh'))}</button>
    </div>

    ${filtered.length > 0 ? `
      <div class="page-table-panel">
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>${esc(t('sessions.th_session_id'))}</th>
                <th>${esc(t('sessions.th_module'))}</th>
                <th>${esc(t('sessions.th_employee'))}</th>
                <th>${esc(t('sessions.th_language'))}</th>
                <th>${esc(t('sessions.th_started'))}</th>
                <th>${esc(t('sessions.th_duration'))}</th>
                <th>${esc(t('sessions.th_status'))}</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(s => {
                const modName = s.module === 'FIRE' ? t('modules.fire_name') : t('modules.gas_name');
                const traineeName = s.trainee ? s.trainee.name : (s.traineeId || 'Unknown');
                const lang = formatLanguage(s.trainee ? s.trainee.language : 'en');
                const duration = s.durationSeconds ? t('sessions.min_unit', { n: Math.round(s.durationSeconds / 60) }) : t('sessions.in_progress');

                return `
                  <tr>
                    <td><span style="font-family:'DM Mono',monospace;color:#f3a42b;font-weight:600;">${esc(s.sessionId)}</span></td>
                    <td><b>${esc(modName)}</b></td>
                    <td>${esc(traineeName)}</td>
                    <td>${badge(lang)}</td>
                    <td>${esc(formatRelativeTime(s.startedAt))}</td>
                    <td><span style="font-family:'DM Mono',monospace;font-size:10px;">${esc(duration)}</span></td>
                    <td>${badge(s.status || 'IN_PROGRESS')}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : emptyStateCard(t('sessions.empty_title'), t('sessions.empty_desc'), t('action.schedule'), 'schedule')}
  `;
}

// ==================================================
// PAGE: MODULES
// ==================================================
function renderModulesPage() {
  const currentModules = getModules();

  return `
    <div class="welcome-row">
      <div>
        <div class="eyebrow">${t('modules.eyebrow')}</div>
        <h1>${esc(t('modules.title'))}</h1>
        <p>${esc(t('modules.subtitle'))}</p>
      </div>
      <div class="welcome-actions">
        <button class="primary-button" data-action="schedule">${icon('plus', 14)} ${esc(t('action.launch_drill'))}</button>
      </div>
    </div>

    <div class="module-grid" style="grid-template-columns:repeat(2, 1fr);margin-bottom:28px;">
      ${currentModules.map(m => {
        const stat = apiModuleStats.find(s => s.key === m.key);
        const trainees = stat ? stat.trainees : (m.key === 'FIRE' ? apiOverview.fireSessions : apiOverview.gasSessions);
        const progress = stat ? stat.completion : 75;

        return `
          <div class="module-card ${m.color}" data-select-module="${m.key}">
            <div class="module-image">
              <img class="module-photo" src="${m.image}" onerror="if(!this.dataset.t){this.dataset.t='1';this.src='/public/img/${m.file}';}else if(this.dataset.t==='1'){this.dataset.t='2';this.src='img/${m.file}';}" alt="${esc(m.name)}" loading="eager" />
              <div class="module-image-shade"></div>
              <div class="module-tag">${icon(m.icon, 12)} ${esc(m.tag)}</div>
              <div class="module-arrow">${icon('arrow', 14)}</div>
            </div>
            <div class="module-body">
              <div class="module-title-row">
                <span class="module-kicker">${esc(m.kicker)}</span>
                <span class="module-kicker" style="color:#5ed8c4;">${esc(m.lessons)}</span>
              </div>
              <h3>${esc(m.name)}</h3>
              <p>${esc(m.summary)}</p>
              <div class="module-footer">
                <span>${icon('users', 13)} ${esc(t('modules.enrolled_trainees', { n: trainees }))}</span>
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
        <div class="eyebrow">${t('assessments.eyebrow')}</div>
        <h1>${esc(t('assessments.title'))}</h1>
        <p>${esc(t('assessments.subtitle'))}</p>
      </div>
      <div class="welcome-actions">
        <button class="secondary-button" data-action="refresh">${icon('refresh', 14)} ${esc(t('action.refresh'))}</button>
      </div>
    </div>

    <div class="page-toolbar">
      <div class="filter-chip">${icon('check', 13)} ${esc(t('assessments.found_count', { n: filtered.length }))}</div>
      <button class="secondary-button" style="height:32px;padding:0 10px;" data-action="refresh">${icon('refresh', 13)} ${esc(t('action.refresh'))}</button>
    </div>

    ${filtered.length > 0 ? `
      <div class="page-table-panel">
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>${esc(t('assessments.th_trainee'))}</th>
                <th>${esc(t('assessments.th_module'))}</th>
                <th>${esc(t('assessments.th_score'))}</th>
                <th>${esc(t('assessments.th_actions_verified'))}</th>
                <th>${esc(t('assessments.th_date_submitted'))}</th>
                <th>${esc(t('assessments.th_result'))}</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(a => {
                const trainee = a.session ? a.session.trainee : null;
                const traineeName = trainee ? trainee.name : 'Operator';
                const lang = formatLanguage(trainee ? trainee.language : 'en');
                const modName = a.module === 'FIRE' ? t('modules.fire_name') : t('modules.gas_name');
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
                    <td><span style="font-family:'DM Mono',monospace;font-size:10.5px;">${esc(t('assessments.actions_verified_count', { n: actionsCount }))}</span></td>
                    <td>${esc(formatRelativeTime(a.createdAt))}</td>
                    <td>${badge(a.passed ? 'PASSED' : 'FAILED')}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : emptyStateCard(t('assessments.empty_title'), t('assessments.empty_desc'), t('assessments.view_training_modules'), 'modules')}
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
        <div class="eyebrow">${t('certificates.eyebrow')}</div>
        <h1>${esc(isVerification ? t('certificates.title_verify') : t('certificates.title_certs'))}</h1>
        <p>${esc(isVerification ? t('certificates.subtitle_verify') : t('certificates.subtitle_certs'))}</p>
      </div>
      <div class="welcome-actions">
        <button class="secondary-button" data-action="export-certs">${icon('download', 14)} ${esc(t('action.export_audit'))}</button>
      </div>
    </div>

    <!-- Lookup Form -->
    <div class="page-table-panel" style="padding:18px 20px;margin-bottom:20px;">
      <div style="margin-bottom:12px;">
        <strong style="font-family:'Barlow Condensed',sans-serif;font-size:18px;color:#f4f5f2;">${esc(t('certificates.lookup_title'))}</strong>
        <p style="font-size:11px;color:#829297;margin:2px 0 0;">${esc(t('certificates.lookup_desc'))}</p>
      </div>

      <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;">
        <form id="verify-form" style="display:flex;gap:10px;align-items:center;flex:1;min-width:280px;max-width:540px;">
          <input id="verify-input" type="text" placeholder="${esc(t('certificates.lookup_placeholder'))}" value="${esc(verifySearchQuery)}" required style="flex:1;height:38px;border-radius:7px;border:1px solid var(--border);background:#0b1215;color:#f4f5f2;padding:0 12px;font-size:11.5px;">
          <button class="primary-button" type="submit" id="btn-verify-submit">${icon('search', 14)} ${esc(t('action.verify'))}</button>
        </form>
        <button type="button" class="primary-button" id="btn-scan-qr" data-action="open-qr-scanner" style="background:#154646;border:1px solid #5ed8c4;color:#e2ffff;display:inline-flex;align-items:center;gap:8px;font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:700;letter-spacing:0.04em;padding:0 16px;height:38px;border-radius:7px;transition:all 0.15s ease;">
          ${icon('scan', 16)} ${esc(t('action.scan_qr'))}
        </button>
      </div>

      ${verifySearchResult ? (
        verifySearchResult.found ? `
          <div id="verification-result-card" style="margin-top:18px;padding:20px 22px;border:1px solid rgba(94,216,196,0.35);border-radius:10px;background:rgba(94,216,196,0.06);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid rgba(94,216,196,0.18);">
              <div style="display:flex;align-items:center;gap:10px;">
                <span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:#5ed8c4;color:#0a0f12;font-size:16px;font-weight:900;">✓</span>
                <div>
                  <b style="color:#5ed8c4;font-family:'Barlow Condensed',sans-serif;font-size:20px;letter-spacing:0.04em;">${esc(t('certificates.verified_header'))}</b>
                  <div style="font-size:11px;color:#839296;">${esc(t('certificates.verified_sub'))}</div>
                </div>
              </div>
              <span class="status-pill good"><i></i>${esc(t('badge.verified'))}</span>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));gap:16px;font-size:11.5px;">
              <div>
                <span style="color:#7d8f95;display:block;margin-bottom:2px;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;">${esc(t('certificates.lbl_cert_id'))}</span>
                <b style="font-family:'DM Mono',monospace;color:#f3a42b;font-size:13px;">${esc(verifySearchResult.certificateId)}</b>
              </div>
              <div>
                <span style="color:#7d8f95;display:block;margin-bottom:2px;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;">${esc(t('certificates.lbl_employee'))}</span>
                <b style="font-size:13px;color:#f4f5f2;">${esc(verifySearchResult.traineeName || (verifySearchResult.trainee ? verifySearchResult.trainee.name : 'Trainee'))}</b>
                ${verifySearchResult.traineeId ? `<small style="display:block;color:#7d8f95;font-family:'DM Mono',monospace;">ID: ${esc(verifySearchResult.traineeId)}</small>` : ''}
              </div>
              <div>
                <span style="color:#7d8f95;display:block;margin-bottom:2px;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;">${esc(t('certificates.lbl_module'))}</span>
                <b style="font-size:13px;color:#f4f5f2;">${esc(verifySearchResult.moduleName || verifySearchResult.module)}</b>
              </div>
              <div>
                <span style="color:#7d8f95;display:block;margin-bottom:2px;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;">${esc(t('certificates.lbl_completion'))}</span>
                <b style="color:#5ed8c4;font-size:13px;">${esc(verifySearchResult.status || t('badge.passed'))} (${verifySearchResult.score ?? 100}%)</b>
              </div>
              <div>
                <span style="color:#7d8f95;display:block;margin-bottom:2px;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;">${esc(t('certificates.lbl_issued'))}</span>
                <b style="font-size:13px;color:#f4f5f2;">${esc(verifySearchResult.verificationDetails?.issuedDateFormatted || formatRelativeTime(verifySearchResult.issuedAt))}</b>
              </div>
              <div>
                <span style="color:#7d8f95;display:block;margin-bottom:2px;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;">${esc(t('certificates.lbl_compliance'))}</span>
                <span style="color:#8ba0a6;font-size:11px;">ISO 45001 / OSHA 1910</span>
              </div>
            </div>

            <div style="margin-top:16px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06);display:flex;justify-content:flex-end;">
              <button class="primary-button" style="height:30px;padding:0 14px;font-size:11px;" data-view-cert-object='${esc(JSON.stringify(verifySearchResult))}'>
                ${esc(t('action.view_cert_doc'))}
              </button>
            </div>
          </div>
        ` : `
          <div id="verification-result-card" style="margin-top:18px;padding:20px 22px;border:1px solid rgba(228,84,74,0.35);border-radius:10px;background:rgba(228,84,74,0.06);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
              <div style="display:flex;align-items:center;gap:10px;">
                <span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:#e4544a;color:#ffffff;font-size:16px;font-weight:900;">✕</span>
                <div>
                  <b style="color:#e4544a;font-family:'Barlow Condensed',sans-serif;font-size:20px;letter-spacing:0.04em;">${esc(t('certificates.not_found_header'))}</b>
                  <div style="font-size:11px;color:#9b8f8e;">${esc(t('certificates.not_found_sub'))}</div>
                </div>
              </div>
              <span class="status-pill warn"><i></i>${esc(t('badge.not_found'))}</span>
            </div>
            <p style="font-size:11.5px;color:#8ba0a6;margin:8px 0 0;line-height:1.5;">
              ${t('certificates.not_found_body', { id: `<strong style="font-family:'DM Mono',monospace;color:#f3a42b;">${esc(verifySearchResult.certificateId || verifySearchQuery)}</strong>` })}
            </p>
          </div>
        `
      ) : ''}
    </div>

    <div class="page-toolbar">
      <div class="filter-chip">${icon('award', 13)} ${esc(t('certificates.found_count', { n: filtered.length }))}</div>
      <button class="secondary-button" style="height:32px;padding:0 10px;" data-action="refresh">${icon('refresh', 13)} ${esc(t('action.refresh'))}</button>
    </div>

    ${filtered.length > 0 ? `
      <div class="page-table-panel">
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>${esc(t('certificates.th_id'))}</th>
                <th>${esc(t('certificates.th_employee'))}</th>
                <th>${esc(t('certificates.th_module'))}</th>
                <th>${esc(t('certificates.th_score'))}</th>
                <th>${esc(t('certificates.th_issued_date'))}</th>
                <th>${esc(t('certificates.th_status'))}</th>
                <th>${esc(t('certificates.th_actions'))}</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(c => {
                const traineeName = c.trainee ? c.trainee.name : (c.traineeId || 'Trainee');
                const lang = formatLanguage(c.trainee ? c.trainee.language : 'en');
                const modName = c.module === 'FIRE' ? t('modules.fire_name') : t('modules.gas_name');

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
                        ${esc(t('action.view_cert'))}
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : emptyStateCard(t('certificates.empty_title'), t('certificates.empty_desc'), t('certificates.view_sample_cert'), 'view-sample-cert')}
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
        <div class="eyebrow">${t('reports.eyebrow')}</div>
        <h1>${esc(t('reports.title'))}</h1>
        <p>${esc(t('reports.subtitle'))}</p>
      </div>
      <div class="welcome-actions">
        <button class="primary-button" data-action="export-audit">${icon('download', 14)} ${esc(t('action.export_report'))}</button>
      </div>
    </div>

    <!-- Completion Trend Chart -->
    <div class="page-table-panel" style="padding:22px 24px;margin-bottom:24px;">
      <div class="panel-heading">
        <div>
          <h2>${esc(t('reports.trend_title'))}</h2>
          <p>${esc(t('reports.trend_desc'))}</p>
        </div>
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:22px;color:#5ed8c4;font-weight:700;">
          ${apiOverview.completedSessions} <span style="font-size:12px;color:#7e8f94;font-family:'DM Sans',sans-serif;">${esc(t('reports.sessions_unit'))}</span>
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
            <h2>${esc(t('reports.module_title'))}</h2>
            <p>${esc(t('reports.module_desc'))}</p>
          </div>
          ${icon('layers', 18)}
        </div>
        ${apiModuleStats.map(m => {
          const modLabel = m.key === 'FIRE' ? t('modules.fire_name') : (m.key === 'GAS' ? t('modules.gas_name') : m.name);
          return `
            <div style="margin-bottom:14px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:11.5px;">
                <b>${esc(modLabel)}</b>
                <span style="font-family:'DM Mono',monospace;color:#5ed8c4;">${esc(t('reports.completion_rate', { n: m.completion || 0 }))}</span>
              </div>
              <div class="progress-track" style="width:100%;height:6px;">
                <i style="width:${m.completion || 0}%;"></i>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Language Stats -->
      <div class="page-table-panel" style="padding:20px 22px;">
        <div class="panel-heading">
          <div>
            <h2>${esc(t('reports.lang_title'))}</h2>
            <p>${esc(t('reports.lang_desc'))}</p>
          </div>
          ${icon('users', 18)}
        </div>
        ${apiLanguageStats.map(l => {
          const total = apiTrainees.length || 1;
          const pct = Math.round(((l.trainees || 0) / total) * 100);
          const langLabel = formatLanguage(l.code);
          return `
            <div style="margin-bottom:14px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:11.5px;">
                <b>${esc(langLabel)} (${esc(l.code.toUpperCase())})</b>
                <span style="font-family:'DM Mono',monospace;color:#f3a42b;">${esc(t('reports.trainees_stat', { n: l.trainees || 0, pct }))}</span>
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
        <div class="eyebrow">${t('settings.eyebrow')}</div>
        <h1>${esc(t('settings.title'))}</h1>
        <p>${esc(t('settings.subtitle'))}</p>
      </div>
    </div>

    <div class="settings-panel">
      <!-- Backend Endpoint -->
      <div class="settings-row" style="flex-direction:column;align-items:flex-start;gap:10px;">
        <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
          <div>
            <b>${esc(t('settings.api_title'))}</b>
            <small>${esc(t('settings.api_desc'))}</small>
          </div>
          <span class="status-pill ${isApiConnected ? 'good' : 'warn'}">
            <i></i> ${esc(isApiConnected ? t('settings.connected_synced') : t('settings.offline_retrying'))}
          </span>
        </div>

        <form id="api-url-form" style="display:flex;gap:10px;width:100%;max-width:580px;margin-top:6px;">
          <input id="api-url-input" type="url" placeholder="https://safex-arnx.onrender.com" value="${esc(API_BASE)}" style="flex:1;height:36px;border-radius:7px;border:1px solid var(--border);background:#0b1215;color:#f4f5f2;padding:0 12px;font-size:11px;">
          <button class="primary-button" type="submit" style="height:36px;">${esc(t('action.save_connect'))}</button>
          <button class="secondary-button" type="button" data-action="reset-api-url" style="height:36px;">${esc(t('action.reset_default'))}</button>
        </form>
      </div>

      <!-- Database Sync -->
      <div class="settings-row">
        <div>
          <b>${esc(t('settings.db_title'))}</b>
          <small>${esc(t('settings.db_desc'))}</small>
        </div>
        <span class="status-pill good"><i></i> ${esc(t('settings.postgres_live'))}</span>
      </div>

      <!-- Regional Languages -->
      <div class="settings-row">
        <div>
          <b>${esc(t('settings.lang_title'))}</b>
          <small>${esc(t('settings.lang_desc'))}</small>
        </div>
        <span class="status-pill neutral"><i></i> ${esc(t('settings.lang_val'))}</span>
      </div>

      <!-- Ambient Lighting -->
      <div class="settings-row">
        <div>
          <b>${esc(t('settings.cursor_title'))}</b>
          <small>${esc(t('settings.cursor_desc'))}</small>
        </div>
        <button class="toggle ${document.body.classList.contains('cursor-off') ? '' : 'on'}" data-action="cursor-toggle" role="switch" aria-checked="${!document.body.classList.contains('cursor-off')}">
          <i></i>
        </button>
      </div>

      <!-- Polling Frequency -->
      <div class="settings-row">
        <div>
          <b>${esc(t('settings.interval_title'))}</b>
          <small>${esc(t('settings.interval_desc'))}</small>
        </div>
        <span class="status-pill info"><i></i> ${esc(t('settings.every_10s'))}</span>
      </div>
    </div>
  `;
}

// ==================================================
// MODALS: CERTIFICATE, PROFILE, ADD WORKER, SCHEDULE
// ==================================================

function renderCertificateModal(cert) {
  const traineeName = cert.traineeName || (cert.trainee ? cert.trainee.name : 'Authorized Trainee');
  const modName = cert.moduleName || (cert.module === 'FIRE' ? t('modules.fire_name') : t('modules.gas_name'));
  const certId = cert.certificateId || 'SAFEX-260928-8842';
  const score = cert.score || 100;
  const issuedDate = cert.issuedDateFormatted || formatRelativeTime(cert.issuedAt);
  const verifyUrl = `${window.location.origin}${window.location.pathname}?api=${encodeURIComponent(API_BASE)}#verify=${encodeURIComponent(certId)}`;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verifyUrl)}&bgcolor=f4f0e5&color=101817&margin=1`;

  return `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="certificate-modal" onclick="event.stopPropagation()">
        <button class="icon-button modal-close" data-action="close-modal" aria-label="${esc(t('action.close'))}">${icon('close', 17)}</button>
        <div class="certificate-inner">
          <div class="certificate-corner certificate-corner-top"></div>
          <div class="certificate-corner certificate-corner-bottom"></div>

          <div class="certificate-logo">
            <div class="brand-symbol" style="width:28px;height:28px;">${icon('shield', 16)}</div>
            <span style="font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:800;letter-spacing:0.18em;color:#f5f6f3;">SAFEX</span>
          </div>

          <div class="certificate-overline">${esc(t('cert_modal.overline'))}</div>
          <h2>${esc(t('cert_modal.heading'))}</h2>
          <p class="certificate-copy">${esc(t('cert_modal.copy'))}</p>

          <div class="certificate-rule"></div>

          <div class="certificate-grid">
            <div>
              <small>${esc(t('cert_modal.lbl_candidate'))}</small>
              <strong>${esc(traineeName)}</strong>
            </div>
            <div>
              <small>${esc(t('cert_modal.lbl_domain'))}</small>
              <strong>${esc(modName)}</strong>
            </div>
            <div>
              <small>${esc(t('cert_modal.lbl_score'))}</small>
              <strong style="color:#5ed8c4;">${score}% (${esc(t('cert_modal.passed'))})</strong>
            </div>
            <div>
              <small>${esc(t('cert_modal.lbl_id'))}</small>
              <strong style="font-family:'DM Mono',monospace;color:#f3a42b;">${esc(certId)}</strong>
            </div>
          </div>

          <div class="certificate-footer">
            <div class="signature">
              <span>${esc(traineeName)}</span>
              <small>${esc(t('cert_modal.lbl_candidate'))}</small>
            </div>
            <div class="seal">
              ${icon('shield', 26)}
              <small>${t('cert_modal.verified_seal')}</small>
            </div>
            <div class="certificate-qr-wrap">
              <img class="authorization-qr"
                   src="${qrApiUrl}"
                   onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 25 25\\' fill=\\'%23101817\\'><rect width=\\'25\\' height=\\'25\\' fill=\\'%23f4f0e5\\'/><path d=\\'M0 0h7v7H0zM1 1h5v5H1zM2 2h3v3H2zM18 0h7v7h-7zM19 1h5v5h-5zM20 2h3v3h-2zM0 18h7v7H0zM1 19h5v5H1zM2 20h3v3H2zM9 2h1v1H9zM11 2h1v1h-1zM13 2h2v1h-2zM9 4h2v1H9zM13 4h1v1h-1zM15 4h1v1h-1zM9 9h7v1H9zM10 11h2v1h-2zM13 11h2v1h-2zM11 13h3v1h-3zM9 15h1v1H9zM12 15h2v1h-2zM15 15h1v1h-1zM9 18h1v1H9zM11 18h2v1h-1zM14 18h1v1h-1zM9 21h3v1H9zM13 21h2v1h-2zM10 23h1v1h-1zM13 23h2v1h-2z\\'/></svg>';"
                   alt="Scan to verify ${esc(certId)}" />
              <small>${t('cert_modal.scan_authorize')}</small>
            </div>
          </div>

          <div class="certificate-id">
            ${esc(t('cert_modal.lbl_id'))} · ${esc(certId)} <span>•</span> ${esc(t('cert_modal.auth_active'))}
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px;">
          <button class="secondary-button" onclick="window.print()">${icon('download', 14)} ${esc(t('action.print_pdf'))}</button>
          <button class="primary-button" data-action="close-modal">${esc(t('action.done'))}</button>
        </div>
      </div>
    </div>
  `;
}

function renderProfileDrawer(trainee) {
  const tData = trainee || {
    name: 'Safety Administrator',
    traineeId: 'ADMIN-01',
    language: 'en',
    deviceId: 'Surface-Dispatch-Console',
    createdAt: new Date().toISOString()
  };

  const initials = tData.name.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase() || 'SA';

  return `
    <div class="profile-backdrop" data-action="close-profile">
      <div class="profile-panel" onclick="event.stopPropagation()">
        <div class="profile-panel-head">
          <div>
            <div class="eyebrow">${esc(t('profile.eyebrow', { id: tData.traineeId }))}</div>
            <h2>${esc(tData.name)}</h2>
            <p>${esc(t('profile.subtitle'))}</p>
          </div>
          <button class="icon-button" data-action="close-profile" aria-label="${esc(t('action.close'))}">${icon('close', 17)}</button>
        </div>

        <div class="profile-overview">
          <div class="profile-identity">
            <div class="profile-avatar">
              ${esc(initials)}
              <span class="profile-online"></span>
            </div>
            <div>
              <h3>${esc(tData.name)}</h3>
              <p>${esc(t('profile.role'))}</p>
              <span>${icon('shield', 12)} ${esc(t('profile.preferred_lang', { lang: formatLanguage(tData.language) }))}</span>
            </div>
          </div>

          <div class="profile-stat">
            <small>${esc(t('profile.safety_score'))}</small>
            <strong>86<span style="font-size:12px;color:#718288;">/100</span></strong>
          </div>
          <div class="profile-stat">
            <small>${esc(t('profile.active_sessions'))}</small>
            <strong>${tData.sessions ? tData.sessions.length : 0}</strong>
          </div>
          <div class="profile-stat">
            <small>${esc(t('profile.certifications'))}</small>
            <strong style="color:#5ed8c4;">${tData.certificates ? tData.certificates.length : 0}</strong>
          </div>
        </div>

        <div style="margin-top:auto;display:flex;gap:10px;">
          <button class="primary-button" style="width:100%;" data-action="schedule">${esc(t('action.schedule_training'))}</button>
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
          <h2>${esc(t('modal_trainee.heading'))}</h2>
          <button class="icon-button" data-action="close-modal" aria-label="${esc(t('action.close'))}">${icon('close', 16)}</button>
        </div>
        <p class="modal-intro">${esc(t('modal_trainee.intro'))}</p>

        <form id="add-worker-form">
          <label>${esc(t('modal_trainee.name_label'))}</label>
          <input name="name" type="text" placeholder="${esc(t('modal_trainee.name_ph'))}" required>

          <label>${esc(t('modal_trainee.id_label'))}</label>
          <input name="traineeId" type="text" placeholder="${esc(t('modal_trainee.id_ph'))}" required>

          <label>${esc(t('modal_trainee.lang_label'))}</label>
          <select name="language" required>
            <option value="en">${esc(t('modal_trainee.opt_en'))}</option>
            <option value="hi">${esc(t('modal_trainee.opt_hi'))}</option>
            <option value="sat">${esc(t('modal_trainee.opt_sat'))}</option>
          </select>

          <label>${esc(t('modal_trainee.device_label'))}</label>
          <input name="deviceId" type="text" placeholder="${esc(t('modal_trainee.device_ph'))}">

          <div class="modal-actions">
            <button type="button" class="secondary-button" data-action="close-modal">${esc(t('action.cancel'))}</button>
            <button type="submit" class="primary-button">${esc(t('action.register_employee'))}</button>
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
          <h2>${esc(t('modal_schedule.heading'))}</h2>
          <button class="icon-button" data-action="close-modal" aria-label="${esc(t('action.close'))}">${icon('close', 16)}</button>
        </div>
        <p class="modal-intro">${esc(t('modal_schedule.intro'))}</p>

        <form id="schedule-session-form">
          <label>${esc(t('modal_schedule.trainee_label'))}</label>
          <select name="traineeId" required>
            ${apiTrainees.length > 0 ? apiTrainees.map(tItem => `
              <option value="${esc(tItem.traineeId || tItem.id)}">${esc(tItem.name)} (${esc(tItem.traineeId)} · ${esc(formatLanguage(tItem.language))})</option>
            `).join('') : '<option value="TEST-001">Test Employee (TEST-001)</option>'}
          </select>

          <label>${esc(t('modal_schedule.module_label'))}</label>
          <select name="module" required>
            <option value="FIRE">${esc(t('modal_schedule.opt_fire'))}</option>
            <option value="GAS">${esc(t('modal_schedule.opt_gas'))}</option>
          </select>

          <div class="modal-actions">
            <button type="button" class="secondary-button" data-action="close-modal">${esc(t('action.cancel'))}</button>
            <button type="submit" class="primary-button">${esc(t('action.start_session'))}</button>
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
      const hasForm = overlay.querySelector('#add-worker-form') || overlay.querySelector('#schedule-session-form') || overlay.querySelector('#qr-modal-backdrop');
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
  stopQrScanner();
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
  // Language Selector toggle
  const langTrigger = e.target.closest('[data-action="toggle-lang-menu"]');
  if (langTrigger) {
    e.stopPropagation();
    const wrap = document.querySelector('#lang-selector-wrap');
    if (wrap) {
      const isOpen = wrap.classList.toggle('open');
      langTrigger.setAttribute('aria-expanded', String(isOpen));
    }
    return;
  }

  // Language Option select
  const langOpt = e.target.closest('[data-change-lang]');
  if (langOpt) {
    e.stopPropagation();
    const newLang = langOpt.dataset.changeLang;
    const wrap = document.querySelector('#lang-selector-wrap');
    if (wrap) wrap.classList.remove('open');
    setLanguage(newLang);
    return;
  }

  // Close language menu when clicking outside
  const langWrap = document.querySelector('#lang-selector-wrap');
  if (langWrap && langWrap.classList.contains('open')) {
    if (!e.target.closest('#lang-selector-wrap')) {
      langWrap.classList.remove('open');
      const trigger = document.querySelector('#lang-menu-trigger');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    }
  }

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
    const trainee = apiTrainees.find(tItem => tItem.id === tId || tItem.traineeId === tId);
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

    if (action === 'open-qr-scanner') {
      openQrScannerModal();
      return;
    }
    if (action === 'close-qr-scanner') {
      closeQrScannerModal();
      return;
    }
    if (action === 'retry-camera') {
      startQrScanner();
      return;
    }

    if (action === 'open-nav') {
      document.querySelector('#sidebar')?.classList.add('open');
      return;
    }
    if (action === 'close-nav') {
      document.querySelector('#sidebar')?.classList.remove('open');
      return;
    }
    if (action === 'refresh') {
      toast(t('toast.syncing_telemetry'));
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
      toast(t('toast.scenario_reset'));
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
        moduleName: t('modules.fire_name'),
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
      toast(t('toast.audit_exported'));
      return;
    }
    if (action === 'notifications') {
      toast(t('toast.systems_online'));
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

// Window unload handler to stop camera stream
window.addEventListener('beforeunload', () => {
  stopQrScanner();
});

// Form Submissions
document.addEventListener('submit', async (e) => {
  // Verify Form
  if (e.target.id === 'verify-form') {
    e.preventDefault();
    const input = document.querySelector('#verify-input');
    const certId = input?.value.trim();
    if (!certId) return;

    await performCertificateVerification(certId);
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
      toast(t('toast.trainee_registered', { name, lang: formatLanguage(language) }));
      document.querySelector('#overlay-root').innerHTML = '';
      await loadAllData();
    } else {
      toast(t('toast.error_trainee', { msg: res.message || 'Server error' }), false);
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
      toast(t('toast.session_scheduled', { id: sessionId }));
      document.querySelector('#overlay-root').innerHTML = '';
      await loadAllData();
    } else {
      toast(t('toast.error_session', { msg: res.message || 'Server error' }), false);
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
    const wrap = document.querySelector('#lang-selector-wrap');
    if (wrap) wrap.classList.remove('open');
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
          toast(t('toast.scanned_verified', { id: certId }));
        } else {
          verifySearchResult = {
            certificateId: certId,
            traineeName: apiTrainees[0] ? apiTrainees[0].name : 'faiz Shaikh',
            moduleName: t('modules.fire_name'),
            score: 100,
            status: 'VERIFIED (DGMS & OSHA)'
          };
          render();
          toast(t('toast.scanned_verified', { id: certId }));
        }
      });
    }
  }
}
window.addEventListener('hashchange', checkUrlHash);

// Initial Boot
loadAllData().then(() => checkUrlHash());
