-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'invited',
    "passwordHash" TEXT,
    "patientId" TEXT,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "persistent" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "ip" TEXT,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetupToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SetupToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Counter" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "mrn" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    "sex" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "bloodGroup" TEXT NOT NULL,
    "conditions" TEXT[],
    "allergies" TEXT[],
    "lastVisitAt" TIMESTAMP(3) NOT NULL,
    "risk" TEXT NOT NULL DEFAULT 'normal',
    "department" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctor" TEXT NOT NULL,
    "doctorId" TEXT,
    "department" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "time" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vitals" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "recordedBy" TEXT NOT NULL,
    "recordedById" TEXT,
    "systolic" INTEGER NOT NULL,
    "diastolic" INTEGER NOT NULL,
    "heartRate" INTEGER NOT NULL,
    "temperatureF" DOUBLE PRECISION NOT NULL,
    "spo2" INTEGER NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "severity" TEXT NOT NULL,

    CONSTRAINT "Vitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "due" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "severity" TEXT NOT NULL DEFAULT 'normal',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabTest" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "testName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'booked',
    "result" TEXT,
    "orderedAt" TIMESTAMP(3) NOT NULL,
    "reportUploaded" BOOLEAN NOT NULL DEFAULT false,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "LabTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabCatalogueItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "turnaround" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LabCatalogueItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "refillsLeft" INTEGER NOT NULL,
    "refillsTotal" INTEGER NOT NULL,
    "notes" TEXT NOT NULL,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medicine" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "ordered" BOOLEAN NOT NULL DEFAULT false,
    "orderedAt" TIMESTAMP(3),
    "dispensedAt" TIMESTAMP(3),
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Medicine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "stock" INTEGER NOT NULL,
    "reorderLevel" INTEGER NOT NULL,
    "expiry" DATE NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "reorderRequestedAt" TIMESTAMP(3),

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unpaid',
    "description" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "method" TEXT,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DischargeSummary" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "admissionDate" DATE NOT NULL,
    "dischargeDate" DATE NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "completedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DischargeSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemSummary" (
    "patientId" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "issues" TEXT[],
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "approvedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProblemSummary_pkey" PRIMARY KEY ("patientId")
);

-- CreateTable
CREATE TABLE "ClinicalNote" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicalNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DietPlan" (
    "patientId" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "dailyCalories" INTEGER NOT NULL,
    "restrictions" TEXT[],
    "entries" JSONB NOT NULL,

    CONSTRAINT "DietPlan_pkey" PRIMARY KEY ("patientId")
);

-- CreateTable
CREATE TABLE "GlucoseReading" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "GlucoseReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actor" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'normal',
    "ip" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'normal',
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_patientId_key" ON "User"("patientId");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SetupToken_tokenHash_key" ON "SetupToken"("tokenHash");

-- CreateIndex
CREATE INDEX "SetupToken_userId_idx" ON "SetupToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_mrn_key" ON "Patient"("mrn");

-- CreateIndex
CREATE INDEX "Patient_name_idx" ON "Patient"("name");

-- CreateIndex
CREATE INDEX "Appointment_date_idx" ON "Appointment"("date");

-- CreateIndex
CREATE INDEX "Appointment_patientId_idx" ON "Appointment"("patientId");

-- CreateIndex
CREATE INDEX "Vitals_patientId_recordedAt_idx" ON "Vitals"("patientId", "recordedAt");

-- CreateIndex
CREATE INDEX "Task_assignedToId_idx" ON "Task"("assignedToId");

-- CreateIndex
CREATE INDEX "LabTest_patientId_idx" ON "LabTest"("patientId");

-- CreateIndex
CREATE INDEX "LabTest_status_idx" ON "LabTest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LabCatalogueItem_name_key" ON "LabCatalogueItem"("name");

-- CreateIndex
CREATE INDEX "Prescription_patientId_idx" ON "Prescription"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_name_key" ON "InventoryItem"("name");

-- CreateIndex
CREATE INDEX "Invoice_patientId_idx" ON "Invoice"("patientId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "ClinicalNote_patientId_createdAt_idx" ON "ClinicalNote"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "GlucoseReading_patientId_date_idx" ON "GlucoseReading"("patientId", "date");

-- CreateIndex
CREATE INDEX "AuditEvent_at_idx" ON "AuditEvent"("at");

-- CreateIndex
CREATE INDEX "Notification_recipientId_at_idx" ON "Notification"("recipientId", "at");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetupToken" ADD CONSTRAINT "SetupToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vitals" ADD CONSTRAINT "Vitals_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vitals" ADD CONSTRAINT "Vitals_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTest" ADD CONSTRAINT "LabTest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medicine" ADD CONSTRAINT "Medicine_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DischargeSummary" ADD CONSTRAINT "DischargeSummary_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DischargeSummary" ADD CONSTRAINT "DischargeSummary_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DischargeSummary" ADD CONSTRAINT "DischargeSummary_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemSummary" ADD CONSTRAINT "ProblemSummary_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemSummary" ADD CONSTRAINT "ProblemSummary_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietPlan" ADD CONSTRAINT "DietPlan_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlucoseReading" ADD CONSTRAINT "GlucoseReading_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enumerated columns: allowed values mirror server/src/domain.ts.
ALTER TABLE "User" ADD CONSTRAINT "User_role_check" CHECK ("role" IN ('admin', 'doctor', 'lab', 'pharmacy', 'receptionist', 'staff', 'patient'));
ALTER TABLE "User" ADD CONSTRAINT "User_status_check" CHECK ("status" IN ('active', 'invited', 'suspended'));
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_sex_check" CHECK ("sex" IN ('female', 'male', 'other'));
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_risk_check" CHECK ("risk" IN ('normal', 'abnormal', 'critical'));
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_department_check" CHECK ("department" IN ('Cardiology', 'Dermatology', 'Endocrinology', 'General Medicine', 'Neurology', 'Orthopaedics', 'Paediatrics', 'Pulmonology'));
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_department_check" CHECK ("department" IN ('Cardiology', 'Dermatology', 'Endocrinology', 'General Medicine', 'Neurology', 'Orthopaedics', 'Paediatrics', 'Pulmonology'));
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_type_check" CHECK ("type" IN ('OPD', 'IPD', 'Follow-up'));
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_status_check" CHECK ("status" IN ('pending', 'confirmed', 'completed', 'cancelled'));
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_source_check" CHECK ("source" IN ('app', 'whatsapp', 'walk-in'));
ALTER TABLE "Vitals" ADD CONSTRAINT "Vitals_severity_check" CHECK ("severity" IN ('normal', 'abnormal', 'critical'));
ALTER TABLE "Task" ADD CONSTRAINT "Task_kind_check" CHECK ("kind" IN ('discharge-summary', 'med-delivery', 'report-collection', 'room-prep', 'vitals-check'));
ALTER TABLE "Task" ADD CONSTRAINT "Task_status_check" CHECK ("status" IN ('open', 'in-progress', 'reverted', 'done'));
ALTER TABLE "Task" ADD CONSTRAINT "Task_severity_check" CHECK ("severity" IN ('normal', 'abnormal', 'critical'));
ALTER TABLE "LabTest" ADD CONSTRAINT "LabTest_status_check" CHECK ("status" IN ('booked', 'sample-collected', 'processing', 'completed'));
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_status_check" CHECK ("status" IN ('unpaid', 'partial', 'paid'));
ALTER TABLE "DischargeSummary" ADD CONSTRAINT "DischargeSummary_status_check" CHECK ("status" IN ('draft', 'staff-verified', 'doctor-approved'));
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_severity_check" CHECK ("severity" IN ('normal', 'abnormal', 'critical'));
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_role_check" CHECK ("role" IN ('admin', 'doctor', 'lab', 'pharmacy', 'receptionist', 'staff', 'patient'));
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_severity_check" CHECK ("severity" IN ('normal', 'abnormal', 'critical'));

-- Value sanity.
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_time_check" CHECK ("time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_stock_check" CHECK ("stock" >= 0 AND "reorderLevel" >= 0);
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_amount_check" CHECK ("amount" >= 0);
ALTER TABLE "LabTest" ADD CONSTRAINT "LabTest_price_check" CHECK ("price" >= 0);
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_refills_check" CHECK ("refillsLeft" >= 0 AND "refillsLeft" <= "refillsTotal");
ALTER TABLE "DischargeSummary" ADD CONSTRAINT "DischargeSummary_dates_check" CHECK ("dischargeDate" >= "admissionDate");
-- Only patient logins may be linked to a chart.
ALTER TABLE "User" ADD CONSTRAINT "User_patient_link_check" CHECK ("role" = 'patient' OR "patientId" IS NULL);

-- The audit trail is append-only. The one permitted update is the FK clearing
-- "actorId" when a user is deleted; the recorded actor name is kept.
CREATE FUNCTION audit_event_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW."actorId" IS NULL
     AND (NEW."id", NEW."actor", NEW."role", NEW."action", NEW."target", NEW."severity", NEW."ip", NEW."at")
         IS NOT DISTINCT FROM
         (OLD."id", OLD."actor", OLD."role", OLD."action", OLD."target", OLD."severity", OLD."ip", OLD."at")
  THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'AuditEvent rows are append-only';
END;
$$;
CREATE TRIGGER "AuditEvent_append_only" BEFORE UPDATE OR DELETE ON "AuditEvent"
  FOR EACH ROW EXECUTE FUNCTION audit_event_immutable();
