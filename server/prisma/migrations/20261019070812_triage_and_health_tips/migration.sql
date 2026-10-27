-- AlterTable
ALTER TABLE "Clinic" ADD COLUMN     "emergencyNumber" TEXT NOT NULL DEFAULT '112';

-- CreateTable
CREATE TABLE "HealthTip" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "conditions" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthTip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TriageAssessment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "urgency" TEXT NOT NULL,
    "department" TEXT,
    "clinicalSummary" TEXT NOT NULL,
    "patientAdvice" TEXT NOT NULL,
    "redFlags" TEXT[],
    "considerations" TEXT[],
    "source" TEXT NOT NULL,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "TriageAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TriageAssessment_patientId_createdAt_idx" ON "TriageAssessment"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "TriageAssessment_createdAt_idx" ON "TriageAssessment"("createdAt");

-- AddForeignKey
ALTER TABLE "TriageAssessment" ADD CONSTRAINT "TriageAssessment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriageAssessment" ADD CONSTRAINT "TriageAssessment_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriageAssessment" ADD CONSTRAINT "TriageAssessment_department_fkey" FOREIGN KEY ("department") REFERENCES "Department"("name") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriageAssessment" ADD CONSTRAINT "TriageAssessment_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Urgency and source are fixed vocabularies the API's logic depends on.
ALTER TABLE "TriageAssessment" ADD CONSTRAINT "TriageAssessment_urgency_check"
  CHECK ("urgency" IN ('emergency', 'urgent', 'soon', 'routine', 'self_care'));
ALTER TABLE "TriageAssessment" ADD CONSTRAINT "TriageAssessment_source_check"
  CHECK ("source" IN ('ai', 'rules'));
