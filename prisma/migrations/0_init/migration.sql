-- CreateTable
CREATE TABLE "trainees" (
    "id" TEXT NOT NULL,
    "traineeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "deviceId" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trainees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_sessions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "traineeId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'STARTED',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "assessmentPassed" BOOLEAN NOT NULL DEFAULT false,
    "certificateId" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_events" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "completedActions" JSONB NOT NULL,
    "requiredActions" JSONB,
    "passed" BOOLEAN NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "traineeId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trainees_traineeId_key" ON "trainees"("traineeId");

-- CreateIndex
CREATE UNIQUE INDEX "training_sessions_sessionId_key" ON "training_sessions"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_certificateId_key" ON "certificates"("certificateId");

-- AddForeignKey
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "trainees"("traineeId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "certificates"("certificateId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_events" ADD CONSTRAINT "training_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "training_sessions"("sessionId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "training_sessions"("sessionId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "trainees"("traineeId") ON DELETE CASCADE ON UPDATE CASCADE;
