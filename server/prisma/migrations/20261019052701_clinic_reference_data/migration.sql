-- CreateTable
CREATE TABLE "Department" (
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "Clinic" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "timeZone" TEXT NOT NULL,
    "appointmentSlots" TEXT[],
    "paymentMethods" TEXT[],
    "defaultClinician" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id")
);

-- Departments become rows instead of a hardcoded CHECK list.
ALTER TABLE "Patient" DROP CONSTRAINT "Patient_department_check";
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_department_check";

INSERT INTO "Department" ("name", "position") VALUES
  ('Cardiology', 0), ('Dermatology', 1), ('Endocrinology', 2), ('General Medicine', 3),
  ('Neurology', 4), ('Orthopaedics', 5), ('Paediatrics', 6), ('Pulmonology', 7);
-- Keep any department already referenced by existing records.
INSERT INTO "Department" ("name", "position")
SELECT DISTINCT d, 100 FROM (
  SELECT "department" AS d FROM "Patient" UNION SELECT "department" FROM "Appointment"
) used
ON CONFLICT ("name") DO NOTHING;

-- Exactly one settings row, seeded with the values the code used to hardcode.
ALTER TABLE "Clinic" ADD CONSTRAINT "Clinic_singleton_check" CHECK ("id" = 1);
ALTER TABLE "Clinic" ADD CONSTRAINT "Clinic_lists_check"
  CHECK (cardinality("appointmentSlots") > 0 AND cardinality("paymentMethods") > 0);
INSERT INTO "Clinic" ("id", "name", "currency", "locale", "timeZone", "appointmentSlots", "paymentMethods", "defaultClinician", "updatedAt")
VALUES (1, 'Medora Clinic', 'GHS', 'en-GH', 'Africa/Accra',
        ARRAY['08:30','09:30','10:30','11:30','13:30','14:30','15:30'],
        ARRAY['Cash','Mobile money','Card'],
        'Duty clinician', CURRENT_TIMESTAMP);

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_department_fkey" FOREIGN KEY ("department") REFERENCES "Department"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_department_fkey" FOREIGN KEY ("department") REFERENCES "Department"("name") ON DELETE RESTRICT ON UPDATE CASCADE;
