import { prisma } from '../prisma/client';

export async function seedDatabase() {
  console.log('[Seed] Seeding SAFEX demo trainees and sessions...');

  // 1. Create realistic demo trainees with English, Hindi, and Santali ('sat')
  const traineesData = [
    { traineeId: 'TR-2142', name: 'Kiran Yadav', language: 'hi', deviceId: 'ANDROID-KY01', isDemo: true },
    { traineeId: 'TR-2141', name: 'Asha Soren', language: 'sat', deviceId: 'ANDROID-AS02', isDemo: true },
    { traineeId: 'TR-2140', name: 'Rakesh Mandal', language: 'hi', deviceId: 'ANDROID-RM03', isDemo: true },
    { traineeId: 'TR-2139', name: 'Neha Kulkarni', language: 'en', deviceId: 'ANDROID-NK04', isDemo: true },
    { traineeId: 'TR-2138', name: 'Dev Patel', language: 'en', deviceId: 'ANDROID-DP05', isDemo: true },
    { traineeId: 'TR-2137', name: 'Meera Das', language: 'sat', deviceId: 'ANDROID-MD06', isDemo: true },
    { traineeId: 'TR-2136', name: 'Arun Kisku', language: 'sat', deviceId: 'ANDROID-AK07', isDemo: true },
    { traineeId: 'TR-2135', name: 'Pooja Nair', language: 'en', deviceId: 'ANDROID-PN08', isDemo: true },
  ];

  for (const t of traineesData) {
    await prisma.trainee.upsert({
      where: { traineeId: t.traineeId },
      update: { name: t.name, language: t.language, deviceId: t.deviceId, isDemo: true },
      create: t,
    });
  }

  // 2. Demo Completed GAS Session with Santali Trainee (Asha Soren)
  const gasSessionId = 'SESSION-GAS-20260928-01';
  const gasCertId = 'SAFEX-20260928-842103';

  await prisma.trainingSession.upsert({
    where: { sessionId: gasSessionId },
    update: {},
    create: {
      sessionId: gasSessionId,
      traineeId: 'TR-2141', // Asha Soren (Santali)
      module: 'GAS',
      status: 'COMPLETED',
      startedAt: new Date(Date.now() - 3600 * 1000 * 2),
      completedAt: new Date(Date.now() - 3600 * 1000 * 2 + 840 * 1000),
      durationSeconds: 840,
      assessmentPassed: true,
      certificateId: gasCertId,
      isDemo: true,
    },
  });

  const gasEvents = [
    { eventType: 'SURFACE_DETECTED', eventData: { planeDistance: 1.4 }, offset: 10 },
    { eventType: 'MINE_PLACED', eventData: { area: 'Zone 4 Tunnel' }, offset: 25 },
    { eventType: 'TRAINING_STARTED', eventData: { module: 'GAS', language: 'sat' }, offset: 40 },
    { eventType: 'REACH_GAS_DETECTOR', eventData: { gasType: 'CH4 / H2S', ppm: 45 }, offset: 120 },
    { eventType: 'RAISE_ALARM', eventData: { alarmTriggered: true }, offset: 210 },
    { eventType: 'SELECT_CORRECT_GAS_PPE', eventData: { respirator: 'SCBA Class A', gloves: 'Nitrile' }, offset: 320 },
    { eventType: 'BUDDY_CONFIRMED', eventData: { buddyName: 'Arun Kisku' }, offset: 460 },
    { eventType: 'ISOLATE_CONTAMINATED_AREA', eventData: { valveSecured: true }, offset: 600 },
    { eventType: 'EVACUATE_SAFE_EXIT', eventData: { exitZone: 'East Portal B' }, offset: 780 },
    { eventType: 'TRAINING_COMPLETED', eventData: { score: 100, passed: true }, offset: 840 },
  ];

  for (const evt of gasEvents) {
    const timestamp = new Date(Date.now() - 3600 * 1000 * 2 + evt.offset * 1000);
    await prisma.trainingEvent.create({
      data: {
        sessionId: gasSessionId,
        eventType: evt.eventType,
        eventData: evt.eventData,
        timestamp,
      },
    });
  }

  await prisma.assessment.create({
    data: {
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
    },
  });

  await prisma.certificate.upsert({
    where: { certificateId: gasCertId },
    update: {},
    create: {
      certificateId: gasCertId,
      sessionId: gasSessionId,
      traineeId: 'TR-2141',
      module: 'GAS',
      score: 100,
      percentage: 100,
      status: 'PASSED',
      issuedAt: new Date(Date.now() - 3600 * 1000 * 2 + 840 * 1000),
    },
  });

  // 3. Demo Completed FIRE Session (Meera Das - Santali)
  const fireSessionId = 'SESSION-FIRE-20260927-02';
  const fireCertId = 'SAFEX-20260927-491204';

  await prisma.trainingSession.upsert({
    where: { sessionId: fireSessionId },
    update: {},
    create: {
      sessionId: fireSessionId,
      traineeId: 'TR-2137', // Meera Das (Santali)
      module: 'FIRE',
      status: 'COMPLETED',
      startedAt: new Date(Date.now() - 3600 * 1000 * 24),
      completedAt: new Date(Date.now() - 3600 * 1000 * 24 + 720 * 1000),
      durationSeconds: 720,
      assessmentPassed: true,
      certificateId: fireCertId,
      isDemo: true,
    },
  });

  const fireEvents = [
    { eventType: 'TRAINING_STARTED', eventData: { module: 'FIRE', language: 'sat' }, offset: 20 },
    { eventType: 'REACH_POWER_CONTROL', eventData: { panel: 'Main Feeder 2' }, offset: 150 },
    { eventType: 'ISOLATE_POWER', eventData: { circuitTripped: true }, offset: 280 },
    { eventType: 'USE_FIRE_EXTINGUISHER', eventData: { type: 'CO2 / Dry Powder' }, offset: 430 },
    { eventType: 'RAISE_ALARM', eventData: { hornTriggered: true }, offset: 540 },
    { eventType: 'EVACUATE_SAFE_EXIT', eventData: { assemblyPoint: 'Primary Safe Zone' }, offset: 690 },
    { eventType: 'TRAINING_COMPLETED', eventData: { score: 92, passed: true }, offset: 720 },
  ];

  for (const evt of fireEvents) {
    const timestamp = new Date(Date.now() - 3600 * 1000 * 24 + evt.offset * 1000);
    await prisma.trainingEvent.create({
      data: {
        sessionId: fireSessionId,
        eventType: evt.eventType,
        eventData: evt.eventData,
        timestamp,
      },
    });
  }

  await prisma.assessment.create({
    data: {
      sessionId: fireSessionId,
      module: 'FIRE',
      completedActions: [
        'TRAINING_STARTED',
        'REACH_POWER_CONTROL',
        'ISOLATE_POWER',
        'USE_FIRE_EXTINGUISHER',
        'RAISE_ALARM',
        'EVACUATE_SAFE_EXIT',
        'TRAINING_COMPLETED',
      ],
      passed: true,
      score: 92,
      durationSeconds: 720,
    },
  });

  await prisma.certificate.upsert({
    where: { certificateId: fireCertId },
    update: {},
    create: {
      certificateId: fireCertId,
      sessionId: fireSessionId,
      traineeId: 'TR-2137',
      module: 'FIRE',
      score: 92,
      percentage: 92,
      status: 'PASSED',
      issuedAt: new Date(Date.now() - 3600 * 1000 * 24 + 720 * 1000),
    },
  });

  // 4. Demo Active Session (In Progress)
  await prisma.trainingSession.upsert({
    where: { sessionId: 'SESSION-GAS-ACTIVE-03' },
    update: {},
    create: {
      sessionId: 'SESSION-GAS-ACTIVE-03',
      traineeId: 'TR-2140', // Rakesh Mandal (Hindi)
      module: 'GAS',
      status: 'IN_PROGRESS',
      startedAt: new Date(Date.now() - 600 * 1000),
      durationSeconds: 600,
      assessmentPassed: false,
      isDemo: true,
    },
  });

  console.log('[Seed] Database successfully seeded with demo trainees, sessions, events, assessments, and certificates.');
  return { trainees: traineesData.length, sessions: 3, certificates: 2 };
}
