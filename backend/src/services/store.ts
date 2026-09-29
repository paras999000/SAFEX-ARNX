import fs from 'fs';
import path from 'path';

export interface TraineeRecord {
  id: string;
  traineeId: string;
  name: string;
  language: string; // 'en', 'hi', 'sat'
  deviceId?: string | null;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingSessionRecord {
  id: string;
  sessionId: string;
  traineeId: string;
  module: string; // 'FIRE', 'GAS'
  status: string; // 'STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED'
  startedAt: string;
  completedAt?: string | null;
  durationSeconds: number;
  assessmentPassed: boolean;
  certificateId?: string | null;
  isDemo?: boolean;
  createdAt: string;
}

export interface TrainingEventRecord {
  id: string;
  sessionId: string;
  eventType: string;
  eventData: any;
  timestamp: string;
}

export interface AssessmentRecord {
  id: string;
  sessionId: string;
  module: string;
  completedActions: string[];
  requiredActions?: string[] | null;
  passed: boolean;
  score: number;
  durationSeconds: number;
  createdAt: string;
}

export interface CertificateRecord {
  id: string;
  certificateId: string;
  sessionId: string;
  traineeId: string;
  module: string;
  score: number;
  percentage: number;
  status: string; // 'PASSED', 'FAILED'
  issuedAt: string;
}

class MemoryStore {
  public trainees: TraineeRecord[] = [];
  public sessions: TrainingSessionRecord[] = [];
  public events: TrainingEventRecord[] = [];
  public assessments: AssessmentRecord[] = [];
  public certificates: CertificateRecord[] = [];

  private filePath: string;

  constructor() {
    this.filePath = path.resolve(__dirname, '../../safex_local_db.json');
    this.load();
    if (this.trainees.length === 0) {
      this.seedInitial();
    }
  }

  private save() {
    try {
      fs.writeFileSync(
        this.filePath,
        JSON.stringify(
          {
            trainees: this.trainees,
            sessions: this.sessions,
            events: this.events,
            assessments: this.assessments,
            certificates: this.certificates,
          },
          null,
          2
        ),
        'utf8'
      );
    } catch (e) {
      // Ignored if write error
    }
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const data = JSON.parse(raw);
        this.trainees = data.trainees || [];
        this.sessions = data.sessions || [];
        this.events = data.events || [];
        this.assessments = data.assessments || [];
        this.certificates = data.certificates || [];
      }
    } catch {
      // Reset on parse error
    }
  }

  public seedInitial() {
    const now = new Date();

    this.trainees = [
      { id: '1', traineeId: 'TR-2142', name: 'Kiran Yadav', language: 'hi', deviceId: 'ANDROID-KY01', isDemo: true, createdAt: now.toISOString(), updatedAt: now.toISOString() },
      { id: '2', traineeId: 'TR-2141', name: 'Asha Soren', language: 'sat', deviceId: 'ANDROID-AS02', isDemo: true, createdAt: now.toISOString(), updatedAt: now.toISOString() },
      { id: '3', traineeId: 'TR-2140', name: 'Rakesh Mandal', language: 'hi', deviceId: 'ANDROID-RM03', isDemo: true, createdAt: now.toISOString(), updatedAt: now.toISOString() },
      { id: '4', traineeId: 'TR-2139', name: 'Neha Kulkarni', language: 'en', deviceId: 'ANDROID-NK04', isDemo: true, createdAt: now.toISOString(), updatedAt: now.toISOString() },
      { id: '5', traineeId: 'TR-2138', name: 'Dev Patel', language: 'en', deviceId: 'ANDROID-DP05', isDemo: true, createdAt: now.toISOString(), updatedAt: now.toISOString() },
      { id: '6', traineeId: 'TR-2137', name: 'Meera Das', language: 'sat', deviceId: 'ANDROID-MD06', isDemo: true, createdAt: now.toISOString(), updatedAt: now.toISOString() },
      { id: '7', traineeId: 'TR-2136', name: 'Arun Kisku', language: 'sat', deviceId: 'ANDROID-AK07', isDemo: true, createdAt: now.toISOString(), updatedAt: now.toISOString() },
      { id: '8', traineeId: 'TR-2135', name: 'Pooja Nair', language: 'en', deviceId: 'ANDROID-PN08', isDemo: true, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    ];

    const gasSessionId = 'SESSION-GAS-20260928-01';
    const gasCertId = 'SAFEX-20260928-842103';

    this.sessions = [
      {
        id: 's-1',
        sessionId: gasSessionId,
        traineeId: 'TR-2141', // Asha Soren (Santali)
        module: 'GAS',
        status: 'COMPLETED',
        startedAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
        completedAt: new Date(Date.now() - 3600 * 1000 * 2 + 840 * 1000).toISOString(),
        durationSeconds: 840,
        assessmentPassed: true,
        certificateId: gasCertId,
        isDemo: true,
        createdAt: now.toISOString(),
      },
      {
        id: 's-2',
        sessionId: 'SESSION-FIRE-20260927-02',
        traineeId: 'TR-2137', // Meera Das (Santali)
        module: 'FIRE',
        status: 'COMPLETED',
        startedAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
        completedAt: new Date(Date.now() - 3600 * 1000 * 24 + 720 * 1000).toISOString(),
        durationSeconds: 720,
        assessmentPassed: true,
        certificateId: 'SAFEX-20260927-491204',
        isDemo: true,
        createdAt: now.toISOString(),
      },
      {
        id: 's-3',
        sessionId: 'SESSION-GAS-ACTIVE-03',
        traineeId: 'TR-2140', // Rakesh Mandal
        module: 'GAS',
        status: 'IN_PROGRESS',
        startedAt: new Date(Date.now() - 600 * 1000).toISOString(),
        durationSeconds: 600,
        assessmentPassed: false,
        isDemo: true,
        createdAt: now.toISOString(),
      },
    ];

    this.events = [
      { id: 'e-1', sessionId: gasSessionId, eventType: 'SURFACE_DETECTED', eventData: { planeDistance: 1.4 }, timestamp: new Date(Date.now() - 3600 * 1000 * 2 + 10000).toISOString() },
      { id: 'e-2', sessionId: gasSessionId, eventType: 'MINE_PLACED', eventData: { area: 'Zone 4 Tunnel' }, timestamp: new Date(Date.now() - 3600 * 1000 * 2 + 25000).toISOString() },
      { id: 'e-3', sessionId: gasSessionId, eventType: 'TRAINING_STARTED', eventData: { module: 'GAS', language: 'sat' }, timestamp: new Date(Date.now() - 3600 * 1000 * 2 + 40000).toISOString() },
      { id: 'e-4', sessionId: gasSessionId, eventType: 'REACH_GAS_DETECTOR', eventData: { gasType: 'CH4 / H2S', ppm: 45 }, timestamp: new Date(Date.now() - 3600 * 1000 * 2 + 120000).toISOString() },
      { id: 'e-5', sessionId: gasSessionId, eventType: 'RAISE_ALARM', eventData: { alarmTriggered: true }, timestamp: new Date(Date.now() - 3600 * 1000 * 2 + 210000).toISOString() },
      { id: 'e-6', sessionId: gasSessionId, eventType: 'SELECT_CORRECT_GAS_PPE', eventData: { respirator: 'SCBA Class A', gloves: 'Nitrile' }, timestamp: new Date(Date.now() - 3600 * 1000 * 2 + 320000).toISOString() },
      { id: 'e-7', sessionId: gasSessionId, eventType: 'BUDDY_CONFIRMED', eventData: { buddyName: 'Arun Kisku' }, timestamp: new Date(Date.now() - 3600 * 1000 * 2 + 460000).toISOString() },
      { id: 'e-8', sessionId: gasSessionId, eventType: 'ISOLATE_CONTAMINATED_AREA', eventData: { valveSecured: true }, timestamp: new Date(Date.now() - 3600 * 1000 * 2 + 600000).toISOString() },
      { id: 'e-9', sessionId: gasSessionId, eventType: 'EVACUATE_SAFE_EXIT', eventData: { exitZone: 'East Portal B' }, timestamp: new Date(Date.now() - 3600 * 1000 * 2 + 780000).toISOString() },
      { id: 'e-10', sessionId: gasSessionId, eventType: 'TRAINING_COMPLETED', eventData: { score: 100, passed: true }, timestamp: new Date(Date.now() - 3600 * 1000 * 2 + 840000).toISOString() },
    ];

    this.assessments = [
      {
        id: 'a-1',
        sessionId: gasSessionId,
        module: 'GAS',
        completedActions: [
          'SURFACE_DETECTED',
          'MINE_PLACED',
          'TRAINING_STARTED',
          'REACH_GAS_DETECTOR',
          'RAISE_ALARM',
          'SELECT_CORRECT_GAS_PPE',
          'BUDDY_CONFIRMED',
          'ISOLATE_CONTAMINATED_AREA',
          'EVACUATE_SAFE_EXIT',
          'TRAINING_COMPLETED',
        ],
        passed: true,
        score: 100,
        durationSeconds: 840,
        createdAt: new Date(Date.now() - 3600 * 1000 * 2 + 840000).toISOString(),
      },
    ];

    this.certificates = [
      {
        id: 'c-1',
        certificateId: gasCertId,
        sessionId: gasSessionId,
        traineeId: 'TR-2141',
        module: 'GAS',
        score: 100,
        percentage: 100,
        status: 'PASSED',
        issuedAt: new Date(Date.now() - 3600 * 1000 * 2 + 840000).toISOString(),
      },
    ];

    this.save();
  }

  // Trainee operations
  upsertTrainee(data: { traineeId: string; name: string; language: string; deviceId?: string | null; isDemo?: boolean }) {
    const existing = this.trainees.find((t) => t.traineeId === data.traineeId);
    const now = new Date().toISOString();
    if (existing) {
      existing.name = data.name;
      existing.language = data.language;
      if (data.deviceId !== undefined) existing.deviceId = data.deviceId;
      existing.updatedAt = now;
      this.save();
      return existing;
    }
    const created: TraineeRecord = {
      id: String(Date.now()),
      traineeId: data.traineeId,
      name: data.name,
      language: data.language,
      deviceId: data.deviceId || null,
      isDemo: data.isDemo ?? false,
      createdAt: now,
      updatedAt: now,
    };
    this.trainees.unshift(created);
    this.save();
    return created;
  }

  // Session operations
  upsertSession(data: { sessionId: string; traineeId: string; module: string; startedAt?: Date; isDemo?: boolean }) {
    const existing = this.sessions.find((s) => s.sessionId === data.sessionId);
    const now = new Date().toISOString();
    if (existing) {
      existing.traineeId = data.traineeId;
      existing.module = data.module;
      this.save();
      return existing;
    }
    const created: TrainingSessionRecord = {
      id: String(Date.now()),
      sessionId: data.sessionId,
      traineeId: data.traineeId,
      module: data.module,
      status: 'STARTED',
      startedAt: data.startedAt ? data.startedAt.toISOString() : now,
      durationSeconds: 0,
      assessmentPassed: false,
      isDemo: data.isDemo ?? false,
      createdAt: now,
    };
    this.sessions.unshift(created);
    this.save();
    return created;
  }

  updateSession(sessionId: string, data: any) {
    const session = this.sessions.find((s) => s.sessionId === sessionId);
    if (!session) return null;
    if (data.status) session.status = data.status;
    if (data.completedAt) session.completedAt = new Date(data.completedAt).toISOString();
    if (data.durationSeconds !== undefined) session.durationSeconds = data.durationSeconds;
    if (data.assessmentPassed !== undefined) session.assessmentPassed = data.assessmentPassed;
    if (data.certificateId) session.certificateId = data.certificateId;
    this.save();
    return session;
  }

  // Event operations
  addEvent(data: { sessionId: string; eventType: string; eventData: any; timestamp: Date }) {
    const evt: TrainingEventRecord = {
      id: String(Date.now() + Math.random()),
      sessionId: data.sessionId,
      eventType: data.eventType,
      eventData: data.eventData,
      timestamp: data.timestamp.toISOString(),
    };
    this.events.push(evt);
    this.save();
    return evt;
  }

  // Assessment operations
  addAssessment(data: { sessionId: string; module: string; completedActions: string[]; requiredActions?: string[]; passed: boolean; score: number; durationSeconds: number }) {
    const item: AssessmentRecord = {
      id: String(Date.now()),
      sessionId: data.sessionId,
      module: data.module,
      completedActions: data.completedActions,
      requiredActions: data.requiredActions || null,
      passed: data.passed,
      score: data.score,
      durationSeconds: data.durationSeconds,
      createdAt: new Date().toISOString(),
    };
    this.assessments.unshift(item);
    this.save();
    return item;
  }

  // Certificate operations
  upsertCertificate(data: { certificateId: string; sessionId: string; traineeId: string; module: string; score: number; percentage: number; status: string }) {
    const existing = this.certificates.find((c) => c.certificateId === data.certificateId);
    if (existing) {
      existing.score = data.score;
      existing.percentage = data.percentage;
      existing.status = data.status;
      this.save();
      return existing;
    }
    const item: CertificateRecord = {
      id: String(Date.now()),
      certificateId: data.certificateId,
      sessionId: data.sessionId,
      traineeId: data.traineeId,
      module: data.module,
      score: data.score,
      percentage: data.percentage,
      status: data.status,
      issuedAt: new Date().toISOString(),
    };
    this.certificates.unshift(item);
    this.save();
    return item;
  }
}

export const memoryStore = new MemoryStore();
