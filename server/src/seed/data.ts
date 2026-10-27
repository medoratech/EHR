// Synthetic, deterministic demo records (formerly src/data/mock.ts on the frontend).
// Every timestamp is relative to an anchor instant and expressed in the clinic's time
// zone, so seeding "today" always lines up with the clinical clock.
import { addDays, clinicDateKey, clinicInstant, parseDateKey } from '../lib/clock.js'

/** Clinic settings for the demo deployment (editable afterwards by an admin). */
export const SEED_CLINIC = {
  name: 'Medora Clinic',
  currency: 'GHS',
  locale: 'en-GH',
  timeZone: 'Africa/Accra',
  appointmentSlots: ['08:30', '09:30', '10:30', '11:30', '13:30', '14:30', '15:30'],
  paymentMethods: ['Cash', 'Mobile money', 'Card'],
  defaultClinician: 'Duty clinician',
  emergencyNumber: '112',
}

export const SEED_DEPARTMENTS = [
  'Cardiology',
  'Dermatology',
  'Endocrinology',
  'General Medicine',
  'Neurology',
  'Orthopaedics',
  'Paediatrics',
  'Pulmonology',
]

export const DEMO_PASSWORD = 'medora'

export const DEMO_ACCOUNTS = [
  { name: 'Dr. Adjoa Mensah', email: 'doctor@medora.health', role: 'Doctor', password: DEMO_PASSWORD },
  { name: 'Nurse Grace Owusu', email: 'staff@medora.health', role: 'Staff', password: DEMO_PASSWORD },
  { name: 'Lab Tech Irene Quaye', email: 'lab@medora.health', role: 'Laboratory', password: DEMO_PASSWORD },
  { name: 'Pharmacy Tech Leo Amoah', email: 'pharmacy@medora.health', role: 'Pharmacy', password: DEMO_PASSWORD },
  { name: 'Reception Sena Aidoo', email: 'reception@medora.health', role: 'Reception', password: DEMO_PASSWORD },
  { name: 'Nana Adjei', email: 'admin@medora.health', role: 'Admin', password: DEMO_PASSWORD },
  { name: 'Amara Osei', email: 'patient@medora.health', role: 'Patient', password: DEMO_PASSWORD },
]

export function buildSeed(anchor: Date, timeZone = SEED_CLINIC.timeZone) {
  const today = clinicDateKey(anchor, timeZone)
  const pad = (value: number) => String(value).padStart(2, '0')

  /** The instant `offsetDays` from the anchor day at hh:mm clinic time. */
  const at = (offsetDays: number, hour = 9, minute = 0) =>
    clinicInstant(addDays(today, offsetDays), `${pad(hour)}:${pad(minute)}`, timeZone)
  /** A @db.Date value `offsetDays` from the anchor day. */
  const day = (offsetDays: number) => parseDateKey(addDays(today, offsetDays))
  /** A birth date that makes the patient exactly `age` on the anchor day. */
  const bornAged = (age: number, daysPastBirthday: number) => {
    const birthday = addDays(today, -daysPastBirthday)
    const key = `${String(Number(birthday.slice(0, 4)) - age).padStart(4, '0')}${birthday.slice(4)}`
    // Avoid 29 February in a non-leap year, which would roll into March.
    return parseDateKey(parseDateKey(key).toISOString().startsWith(key) ? key : `${key.slice(0, 8)}28`)
  }

  const patients = [
    { id: 'P-1001', mrn: 'MRN-48201', name: 'Amara Osei', dateOfBirth: bornAged(34, 41), sex: 'female', phone: '+233 24 555 0142', bloodGroup: 'O+', conditions: ['Type 2 diabetes', 'Mild anaemia'], allergies: ['Penicillin'], lastVisitAt: at(-12), risk: 'abnormal', department: 'Endocrinology' },
    { id: 'P-1002', mrn: 'MRN-48202', name: 'Kwame Boateng', dateOfBirth: bornAged(58, 120), sex: 'male', phone: '+233 20 555 0188', bloodGroup: 'A-', conditions: ['Hypertension', 'CAD'], allergies: ['Sulfa drugs'], lastVisitAt: at(-3), risk: 'critical', department: 'Cardiology' },
    { id: 'P-1003', mrn: 'MRN-48203', name: 'Zainab Hussein', dateOfBirth: bornAged(7, 200), sex: 'female', phone: '+233 55 555 0110', bloodGroup: 'B+', conditions: ['Acute asthma'], allergies: ['None known'], lastVisitAt: at(-1), risk: 'abnormal', department: 'Paediatrics' },
    { id: 'P-1004', mrn: 'MRN-48204', name: 'Daniel Mensah', dateOfBirth: bornAged(41, 15), sex: 'male', phone: '+233 77 555 0163', bloodGroup: 'AB+', conditions: ['Lumbar disc prolapse'], allergies: ['None known'], lastVisitAt: at(-26), risk: 'normal', department: 'Orthopaedics' },
    { id: 'P-1005', mrn: 'MRN-48205', name: 'Efua Danso', dateOfBirth: bornAged(29, 300), sex: 'female', phone: '+233 24 555 0191', bloodGroup: 'O-', conditions: ['Eczema'], allergies: ['Ibuprofen'], lastVisitAt: at(-6), risk: 'normal', department: 'Dermatology' },
    { id: 'P-1006', mrn: 'MRN-48206', name: 'Yaw Asante', dateOfBirth: bornAged(63, 77), sex: 'male', phone: '+233 20 555 0155', bloodGroup: 'A+', conditions: ['COPD', 'Hypertension'], allergies: ['None known'], lastVisitAt: at(-8), risk: 'critical', department: 'Pulmonology' },
    { id: 'P-1007', mrn: 'MRN-48207', name: 'Nadia Kwarteng', dateOfBirth: bornAged(22, 5), sex: 'female', phone: '+233 55 555 0177', bloodGroup: 'B-', conditions: ['Migraine'], allergies: ['Aspirin'], lastVisitAt: at(-15), risk: 'abnormal', department: 'Neurology' },
    { id: 'P-1008', mrn: 'MRN-48208', name: 'Samuel Tetteh', dateOfBirth: bornAged(50, 180), sex: 'male', phone: '+233 77 555 0129', bloodGroup: 'O+', conditions: ['Chronic kidney disease'], allergies: ['Contrast dye'], lastVisitAt: at(-2), risk: 'critical', department: 'General Medicine' },
  ]

  const users = [
    { id: 'U-1', name: 'Dr. Adjoa Mensah', role: 'doctor', email: 'doctor@medora.health', status: 'active', lastActiveAt: at(0, 8, 45) },
    { id: 'U-2', name: 'Dr. Kojo Amankwah', role: 'doctor', email: 'k.amankwah@medora.health', status: 'active', lastActiveAt: at(0, 7, 50) },
    { id: 'U-3', name: 'Nurse Grace Owusu', role: 'staff', email: 'staff@medora.health', status: 'active', lastActiveAt: at(0, 9, 5) },
    { id: 'U-4', name: 'Nurse Peter Ofori', role: 'staff', email: 'p.ofori@medora.health', status: 'active', lastActiveAt: at(0, 9, 20) },
    { id: 'U-5', name: 'Lab Tech Irene Quaye', role: 'lab', email: 'lab@medora.health', status: 'active', lastActiveAt: at(0, 8, 10) },
    { id: 'U-6', name: 'Pharmacy Tech Leo Amoah', role: 'pharmacy', email: 'pharmacy@medora.health', status: 'active', lastActiveAt: at(0, 9, 0) },
    { id: 'U-7', name: 'Reception Sena Aidoo', role: 'receptionist', email: 'reception@medora.health', status: 'active', lastActiveAt: at(0, 9, 30) },
    // Invited but has not chosen a password yet, so cannot sign in.
    { id: 'U-8', name: 'Dr. Ibrahim Saleh', role: 'doctor', email: 'i.saleh@medora.health', status: 'invited', lastActiveAt: at(-4, 12, 0), noPassword: true },
    { id: 'U-9', name: 'Billing Clerk Kojo Bediako', role: 'admin', email: 'k.bediako@medora.health', status: 'suspended', lastActiveAt: at(-21, 10, 0) },
    { id: 'U-10', name: 'Lab Tech Fuseini Ali', role: 'lab', email: 'f.ali@medora.health', status: 'active', lastActiveAt: at(0, 7, 45) },
    { id: 'U-11', name: 'Nana Adjei', role: 'admin', email: 'admin@medora.health', status: 'active', lastActiveAt: at(0, 8, 0) },
    { id: 'U-12', name: 'Amara Osei', role: 'patient', email: 'patient@medora.health', status: 'active', lastActiveAt: at(0, 7, 15), patientId: 'P-1001' },
  ]

  const doctorIds: Record<string, string> = {
    'Dr. Adjoa Mensah': 'U-1',
    'Dr. Kojo Amankwah': 'U-2',
    'Dr. Ibrahim Saleh': 'U-8',
  }

  const appointment = (
    id: string, patientId: string, doctor: string, department: string, offset: number, time: string,
    type: string, status: string, source: string, reason: string,
  ) => ({ id, patientId, doctor, doctorId: doctorIds[doctor] ?? null, department, date: day(offset), time, type, status, source, reason })

  const appointments = [
    appointment('A-2201', 'P-1001', 'Dr. Adjoa Mensah', 'Endocrinology', 0, '09:30', 'Follow-up', 'confirmed', 'app', 'Diabetes control review'),
    appointment('A-2202', 'P-1002', 'Dr. Kojo Amankwah', 'Cardiology', 0, '10:00', 'Follow-up', 'confirmed', 'whatsapp', 'Post-angioplasty check'),
    appointment('A-2203', 'P-1003', 'Dr. Grace Owusu', 'Paediatrics', 0, '10:30', 'OPD', 'confirmed', 'app', 'Asthma exacerbation'),
    appointment('A-2204', 'P-1006', 'Dr. Kojo Amankwah', 'Pulmonology', 0, '11:15', 'IPD', 'confirmed', 'walk-in', 'COPD admission, oxygen sats low'),
    appointment('A-2205', 'P-1005', 'Dr. Grace Owusu', 'Dermatology', 0, '12:00', 'OPD', 'pending', 'whatsapp', 'Eczema flare, requested video consult'),
    appointment('A-2206', 'P-1004', 'Dr. Ibrahim Saleh', 'Orthopaedics', 1, '08:45', 'Follow-up', 'confirmed', 'app', 'Physio progress assessment'),
    appointment('A-2207', 'P-1007', 'Dr. Ibrahim Saleh', 'Neurology', 1, '14:00', 'OPD', 'pending', 'app', 'Migraine frequency up'),
    appointment('A-2208', 'P-1008', 'Dr. Adjoa Mensah', 'General Medicine', 2, '09:00', 'Follow-up', 'confirmed', 'app', 'Creatinine trend'),
    appointment('A-2209', 'P-1001', 'Dr. Adjoa Mensah', 'Endocrinology', -12, '09:30', 'OPD', 'completed', 'app', 'Initial diagnosis'),
  ]

  // Six days of completed consultations so the volume charts have history.
  const rota = [
    { doctor: 'Dr. Adjoa Mensah', department: 'Endocrinology' },
    { doctor: 'Dr. Kojo Amankwah', department: 'Cardiology' },
    { doctor: 'Dr. Grace Owusu', department: 'Paediatrics' },
    { doctor: 'Dr. Ibrahim Saleh', department: 'Orthopaedics' },
  ]
  let seq = 2300
  for (let offset = -6; offset <= -1; offset++) {
    const perDay = 2 + ((offset + 6) % 3)
    for (let i = 0; i < perDay; i++) {
      const slot = rota[(seq + i) % rota.length]
      appointments.push(
        appointment(
          `A-${seq}`,
          patients[(seq + i) % patients.length].id,
          slot.doctor,
          slot.department,
          offset,
          `${String(8 + i).padStart(2, '0')}:00`,
          i % 2 === 0 ? 'OPD' : 'Follow-up',
          'completed',
          i % 3 === 0 ? 'app' : i % 3 === 1 ? 'walk-in' : 'whatsapp',
          'Routine consultation',
        ),
      )
      seq++
    }
  }

  const vital = (
    id: string, patientId: string, recordedAt: Date, recordedById: string, recordedBy: string,
    bp: string, heartRate: number, temperatureF: number, spo2: number, weightKg: number, severity: string,
  ) => {
    const [systolic, diastolic] = bp.split('/').map(Number)
    return { id, patientId, recordedAt, recordedById, recordedBy, systolic, diastolic, heartRate, temperatureF, spo2, weightKg, severity }
  }

  const vitals = [
    vital('V-901', 'P-1002', at(0, 8, 10), 'U-3', 'Nurse Grace Owusu', '168/96', 104, 99.1, 93, 81.4, 'critical'),
    vital('V-902', 'P-1006', at(0, 7, 55), 'U-3', 'Nurse Grace Owusu', '152/88', 98, 100.4, 89, 64.2, 'critical'),
    vital('V-903', 'P-1003', at(0, 9, 5), 'U-4', 'Nurse Peter Ofori', '104/68', 88, 98.4, 97, 21.8, 'abnormal'),
    vital('V-904', 'P-1001', at(0, 8, 45), 'U-4', 'Nurse Peter Ofori', '128/82', 76, 98.2, 98, 68.5, 'abnormal'),
    vital('V-905', 'P-1005', at(0, 8, 20), 'U-3', 'Nurse Grace Owusu', '118/74', 72, 98.6, 99, 59.1, 'normal'),
    vital('V-906', 'P-1008', at(-1, 16, 30), 'U-4', 'Nurse Peter Ofori', '144/92', 82, 98.0, 95, 70.3, 'abnormal'),
  ]

  const tasks = [
    { id: 'T-701', title: 'Record vitals for Yaw Asante (Bed 12)', kind: 'vitals-check', patientId: 'P-1006', assignedById: 'U-2', assignedToId: 'U-3', due: at(0, 12, 0), status: 'in-progress', severity: 'critical' },
    { id: 'T-702', title: 'Complete discharge summary for Samuel Tetteh', kind: 'discharge-summary', patientId: 'P-1008', assignedById: 'U-1', assignedToId: 'U-4', due: at(0, 17, 0), status: 'open', severity: 'abnormal' },
    { id: 'T-703', title: 'Collect MRI report from radiology', kind: 'report-collection', patientId: 'P-1004', assignedById: 'U-8', assignedToId: 'U-3', due: at(0, 15, 0), status: 'open', severity: 'normal' },
    { id: 'T-704', title: 'Deliver prescribed medicines to Bed 12', kind: 'med-delivery', patientId: 'P-1006', assignedById: 'U-2', assignedToId: 'U-4', due: at(0, 13, 30), status: 'reverted', severity: 'abnormal' },
    { id: 'T-705', title: 'Prepare consultation room 4', kind: 'room-prep', patientId: 'P-1001', assignedById: 'U-1', assignedToId: 'U-4', due: at(0, 9, 15), status: 'done', severity: 'normal' },
  ]

  const labTests = [
    { id: 'L-501', patientId: 'P-1001', testName: 'HbA1c', category: 'Biochemistry', price: 85, status: 'completed', result: '7.4% — above target, review dosing', orderedAt: at(-10), reportUploaded: true, isNew: true, releasedAt: at(0, 8, 34) },
    { id: 'L-502', patientId: 'P-1001', testName: 'Fasting blood glucose', category: 'Biochemistry', price: 20, status: 'completed', result: '142 mg/dL', orderedAt: at(-10), reportUploaded: true, isNew: false, releasedAt: at(-9) },
    { id: 'L-503', patientId: 'P-1002', testName: 'Lipid profile', category: 'Biochemistry', price: 110, status: 'completed', result: 'LDL 168 mg/dL — high', orderedAt: at(-2), reportUploaded: true, isNew: true, releasedAt: at(-1) },
    { id: 'L-504', patientId: 'P-1002', testName: 'Troponin I', category: 'Cardiac marker', price: 140, status: 'processing', result: null, orderedAt: at(0, 8, 0), reportUploaded: false, isNew: false, releasedAt: null },
    { id: 'L-505', patientId: 'P-1006', testName: 'Arterial blood gas', category: 'Respiratory', price: 95, status: 'sample-collected', result: null, orderedAt: at(0, 7, 40), reportUploaded: false, isNew: false, releasedAt: null },
    { id: 'L-506', patientId: 'P-1006', testName: 'Complete blood count', category: 'Haematology', price: 60, status: 'booked', result: null, orderedAt: at(0, 7, 30), reportUploaded: false, isNew: false, releasedAt: null },
    { id: 'L-507', patientId: 'P-1003', testName: 'Full blood count', category: 'Haematology', price: 60, status: 'completed', result: 'Eosinophils elevated 9% — consistent with asthma', orderedAt: at(-1), reportUploaded: true, isNew: true, releasedAt: at(-1, 15, 0) },
    { id: 'L-508', patientId: 'P-1008', testName: 'Serum creatinine', category: 'Renal', price: 45, status: 'completed', result: '2.9 mg/dL — deteriorating', orderedAt: at(-2), reportUploaded: true, isNew: true, releasedAt: at(-1, 11, 0) },
    { id: 'L-509', patientId: 'P-1004', testName: 'Lumbar MRI', category: 'Imaging', price: 420, status: 'processing', result: null, orderedAt: at(-1), reportUploaded: false, isNew: false, releasedAt: null },
    { id: 'L-510', patientId: 'P-1005', testName: 'Skin patch test', category: 'Immunology', price: 180, status: 'booked', result: null, orderedAt: at(0, 6, 0), reportUploaded: false, isNew: false, releasedAt: null },
  ]

  const labCatalogue = [
    { id: 'CAT-1', name: 'Complete blood count', category: 'Haematology', price: 60, turnaround: 'Same day' },
    { id: 'CAT-2', name: 'HbA1c', category: 'Biochemistry', price: 85, turnaround: '24 hours' },
    { id: 'CAT-3', name: 'Lipid profile', category: 'Biochemistry', price: 110, turnaround: '24 hours' },
    { id: 'CAT-4', name: 'Urinalysis', category: 'Microbiology', price: 35, turnaround: 'Same day' },
    { id: 'CAT-5', name: 'Chest X-ray', category: 'Imaging', price: 150, turnaround: 'Same day' },
    { id: 'CAT-6', name: 'Thyroid panel', category: 'Endocrinology', price: 190, turnaround: '48 hours' },
  ]

  const prescriptions = [
    {
      id: 'R-301', patientId: 'P-1001', doctorId: 'U-1', issuedAt: at(-12), refillsLeft: 2, refillsTotal: 3,
      notes: 'Continue with reduced carbohydrate intake. Review in 3 months.',
      medicines: [
        { id: 'M-1', name: 'Metformin', dosage: '500 mg', frequency: 'Twice daily', durationDays: 90, ordered: true, orderedAt: at(-12, 12, 0), position: 0 },
        { id: 'M-2', name: 'Ferrous sulfate', dosage: '325 mg', frequency: 'Once daily', durationDays: 60, ordered: false, orderedAt: null, position: 1 },
      ],
    },
    {
      id: 'R-302', patientId: 'P-1006', doctorId: 'U-2', issuedAt: at(-4), refillsLeft: 0, refillsTotal: 2,
      notes: 'Oxygen therapy 2L via nasal cannula. Stop if SpO2 falls below 88%.',
      medicines: [
        { id: 'M-3', name: 'Salbutamol inhaler', dosage: '100 mcg', frequency: 'As needed', durationDays: 30, ordered: true, orderedAt: at(-4, 13, 0), position: 0 },
        { id: 'M-4', name: 'Amlodipine', dosage: '5 mg', frequency: 'Once daily', durationDays: 30, ordered: false, orderedAt: null, position: 1 },
      ],
    },
    {
      id: 'R-303', patientId: 'P-1002', doctorId: 'U-2', issuedAt: at(-30), refillsLeft: 1, refillsTotal: 3,
      notes: 'Statin therapy long-term. Statin-induced myopathy reported earlier.',
      medicines: [
        { id: 'M-5', name: 'Atorvastatin', dosage: '40 mg', frequency: 'At night', durationDays: 90, ordered: true, orderedAt: at(-30, 15, 0), position: 0 },
      ],
    },
  ]

  const inventory = [
    { id: 'I-1', name: 'Metformin 500 mg', category: 'Antidiabetic', stock: 340, reorderLevel: 120, expiry: day(420), price: 4.2 },
    { id: 'I-2', name: 'Amlodipine 5 mg', category: 'Antihypertensive', stock: 45, reorderLevel: 80, expiry: day(300), price: 3.6 },
    { id: 'I-3', name: 'Salbutamol inhaler 100 mcg', category: 'Respiratory', stock: 18, reorderLevel: 25, expiry: day(150), price: 22.5 },
    { id: 'I-4', name: 'Ferrous sulfate 325 mg', category: 'Supplement', stock: 210, reorderLevel: 100, expiry: day(540), price: 2.1 },
    { id: 'I-5', name: 'Atorvastatin 40 mg', category: 'Statin', stock: 62, reorderLevel: 70, expiry: day(28), price: 8.9 },
    { id: 'I-6', name: 'Amoxicillin 500 mg', category: 'Antibiotic', stock: 0, reorderLevel: 60, expiry: day(-12), price: 6.4 },
  ]

  const invoices = [
    { id: 'INV-4471', patientId: 'P-1001', amount: 105, status: 'paid', description: 'HbA1c and fasting glucose', issuedAt: at(-10), method: 'Mobile money', paidAt: at(-10, 11, 0) },
    { id: 'INV-4472', patientId: 'P-1002', amount: 260, status: 'partial', description: 'Cardiology follow-up and lipid profile', issuedAt: at(-2), method: 'Card', paidAt: null },
    { id: 'INV-4473', patientId: 'P-1006', amount: 840, status: 'unpaid', description: 'Inpatient admission deposit', issuedAt: at(0, 8, 30), method: null, paidAt: null },
    { id: 'INV-4474', patientId: 'P-1003', amount: 60, status: 'paid', description: 'Full blood count', issuedAt: at(-1), method: 'Cash', paidAt: at(-1, 10, 0) },
    { id: 'INV-4475', patientId: 'P-1005', amount: 180, status: 'unpaid', description: 'Skin patch test', issuedAt: at(0, 6, 15), method: null, paidAt: null },
    { id: 'INV-4476', patientId: 'P-1008', amount: 1250, status: 'unpaid', description: 'Inpatient stay, 9 nights', issuedAt: at(-2), method: null, paidAt: null },
  ]

  const dischargeSummaries = [
    { id: 'D-601', patientId: 'P-1008', admissionDate: day(-9), dischargeDate: day(0), diagnosis: 'Chronic kidney disease stage 4, volume overload', status: 'draft', completedById: 'U-4', approvedById: null },
    { id: 'D-602', patientId: 'P-1006', admissionDate: day(-4), dischargeDate: day(6), diagnosis: 'Acute exacerbation of COPD', status: 'staff-verified', completedById: 'U-3', approvedById: null },
    { id: 'D-603', patientId: 'P-1004', admissionDate: day(-30), dischargeDate: day(-22), diagnosis: 'Lumbar disc prolapse, managed conservatively', status: 'doctor-approved', completedById: 'U-4', approvedById: 'U-1' },
  ]

  const problemSummaries = [
    { patientId: 'P-1001', headline: 'Type 2 diabetes, suboptimal control with mild normocytic anaemia', issues: ['HbA1c 7.4% — above 6.5% target', 'Fasting glucose 142 mg/dL on two occasions', 'Ferrous saturation low, mild fatigue reported'], aiGenerated: true, approvedById: 'U-1', updatedAt: at(-10, 14, 0) },
    { patientId: 'P-1002', headline: 'Coronary artery disease post-PCI with resistant hypertension', issues: ['BP 168/96 on current regimen', 'LDL 168 mg/dL, statin therapy ongoing', 'Chest tightness on exertion reported yesterday'], aiGenerated: true, approvedById: null, updatedAt: at(0, 8, 15) },
    { patientId: 'P-1006', headline: 'Acute COPD exacerbation with hypoxaemia, admission day 4', issues: ['SpO2 89% on 2L oxygen', 'ABG pending, started on IV corticosteroids', 'Hypertension co-managed with amlodipine'], aiGenerated: false, approvedById: 'U-2', updatedAt: at(0, 7, 50) },
    { patientId: 'P-1008', headline: 'CKD stage 4 with rising creatinine, planned discharge today', issues: ['Creatinine 2.9 mg/dL, up from 2.4', 'eGFR 22 ml/min', 'Discharge summary still in draft'], aiGenerated: true, approvedById: null, updatedAt: at(0, 6, 30) },
  ]

  const dietPlans = [
    {
      patientId: 'P-1001',
      goal: 'Lower HbA1c from 7.4% to below 6.5% over 3 months',
      dailyCalories: 1750,
      restrictions: ['No refined sugar', 'Limit white rice to one serving a day', 'No sugary drinks'],
      entries: [
        { meal: 'Breakfast', items: 'Oatmeal with groundnuts, boiled egg, unsweetened tea', calories: 420 },
        { meal: 'Lunch', items: 'Grilled fish, kontomire stew, small portion of brown rice', calories: 560 },
        { meal: 'Snack', items: 'Apple and a handful of almonds', calories: 190 },
        { meal: 'Dinner', items: 'Vegetable soup and banku', calories: 480 },
      ],
    },
  ]

  const glucoseReadings = [
    { patientId: 'P-1001', date: day(-90), value: 168 },
    { patientId: 'P-1001', date: day(-45), value: 155 },
    { patientId: 'P-1001', date: day(-10), value: 142 },
  ]

  const auditEvents = [
    { id: 'AU-1', actorId: 'U-1', actor: 'Dr. Adjoa Mensah', role: 'doctor', action: 'Approved discharge summary', target: 'D-603 · Daniel Mensah', at: at(0, 8, 12), severity: 'normal' },
    { id: 'AU-2', actorId: 'U-5', actor: 'Lab Tech Irene Quaye', role: 'lab', action: 'Released laboratory report', target: 'L-501 · HbA1c · Amara Osei', at: at(0, 8, 34), severity: 'normal' },
    { id: 'AU-3', actorId: 'U-3', actor: 'Nurse Grace Owusu', role: 'staff', action: 'Recorded critical vitals', target: 'P-1006 · Yaw Asante', at: at(0, 7, 55), severity: 'critical' },
    { id: 'AU-4', actorId: null, actor: 'System', role: 'admin', action: 'Failed login attempt (3)', target: 'k.bediako@medora.health', at: at(0, 6, 40), severity: 'critical' },
    { id: 'AU-5', actorId: 'U-7', actor: 'Reception Sena Aidoo', role: 'receptionist', action: 'Generated invoice', target: 'INV-4473 · Yaw Asante', at: at(0, 8, 30), severity: 'normal' },
    { id: 'AU-6', actorId: 'U-2', actor: 'Dr. Kojo Amankwah', role: 'doctor', action: 'Assigned task to Nurse Peter Ofori', target: 'T-702 · Discharge summary', at: at(0, 7, 30), severity: 'normal' },
    { id: 'AU-7', actorId: 'U-6', actor: 'Pharmacy Tech Leo Amoah', role: 'pharmacy', action: 'Flagged stock for reorder', target: 'I-6 · Amoxicillin 500 mg', at: at(-1, 16, 20), severity: 'abnormal' },
  ]

  const notifications = [
    { id: 'N-1', recipientId: 'U-12', title: 'Lab result ready', body: 'Your HbA1c report has been released by the laboratory.', at: at(0, 8, 34), severity: 'abnormal', readAt: null },
    { id: 'N-2', recipientId: 'U-12', title: 'Appointment confirmed', body: 'Dr. Adjoa Mensah confirmed your 09:30 follow-up today.', at: at(0, 7, 0), severity: 'normal', readAt: null },
    { id: 'N-3', recipientId: 'U-12', title: 'Medicine refill due', body: 'Ferrous sulfate is 7 days from finishing. Refill from the pharmacy.', at: at(-1, 9, 0), severity: 'abnormal', readAt: at(-1, 12, 0) },
    { id: 'N-4', recipientId: 'U-12', title: 'Prescription updated', body: 'Dr. Mensah adjusted your Metformin dosage to 500 mg twice daily.', at: at(-12, 11, 15), severity: 'normal', readAt: at(-12, 18, 0) },
    { id: 'N-5', recipientId: 'U-1', title: 'Critical vitals', body: 'Kwame Boateng: BP 168/96, pulse 104, SpO₂ 93%.', at: at(0, 8, 10), severity: 'critical', readAt: null },
    { id: 'N-6', recipientId: 'U-1', title: 'New report to review', body: 'Serum creatinine for Samuel Tetteh: 2.9 mg/dL — deteriorating', at: at(-1, 11, 0), severity: 'normal', readAt: null },
    { id: 'N-7', recipientId: 'U-3', title: 'New task assigned', body: 'Dr. Kojo Amankwah: Record vitals for Yaw Asante (Bed 12)', at: at(0, 7, 35), severity: 'critical', readAt: null },
    { id: 'N-8', recipientId: 'U-5', title: 'New test booked', body: 'Skin patch test for Efua Danso.', at: at(0, 6, 0), severity: 'normal', readAt: null },
    { id: 'N-9', recipientId: 'U-6', title: 'Stock alert', body: 'Amoxicillin 500 mg is out of stock and past expiry.', at: at(-1, 16, 20), severity: 'abnormal', readAt: null },
    { id: 'N-10', recipientId: 'U-7', title: 'New appointment request', body: 'Efua Danso requested Dermatology today at 12:00.', at: at(0, 6, 50), severity: 'abnormal', readAt: null },
    { id: 'N-11', recipientId: 'U-11', title: 'Repeated failed sign-ins', body: 'Three failed attempts for k.bediako@medora.health this morning.', at: at(0, 6, 41), severity: 'critical', readAt: null },
  ]

  const systemSettings = [
    { key: 'modules', label: 'Dashboard modules', value: '7 published', position: 1 },
    { key: 'whatsapp', label: 'WhatsApp bot integration', value: 'Connected', position: 2 },
    { key: 'app_sync', label: 'Medora app sync', value: 'Live', position: 3 },
    { key: 'audit_retention', label: 'Audit retention', value: '7 years', position: 4 },
  ]

  const departments = SEED_DEPARTMENTS.map((name, position) => ({ name, position }))

  // Patient education, matched to recorded conditions by whole-word terms. Written as
  // general guidance that never replaces the care team's advice.
  const tip = (category: string, title: string, body: string, conditions: string[] = []) => ({ category, title, body, conditions })
  const healthTips = [
    tip('Diabetes care', 'Pair carbs with protein', 'Adding protein or healthy fat to a meal slows how fast sugar reaches your blood. Try groundnuts with your oats, or grilled fish with your rice, to keep readings steadier.', ['diabetes']),
    tip('Diabetes care', 'Check your feet every day', 'Diabetes can reduce feeling in your feet, so small cuts or blisters can go unnoticed. Look at your feet daily and tell your care team about any sore that is not healing.', ['diabetes']),
    tip('Diabetes care', 'Walk for 10 minutes after eating', 'A short walk after meals lowers the rise in blood sugar that follows eating, without strenuous exercise.', ['diabetes']),
    tip('Diabetes care', 'Log your readings at the same time each day', 'Recording your fasting glucose at a consistent time helps your care team spot trends early and adjust treatment safely.', ['diabetes']),
    tip('Blood pressure', 'Go easy on salt', 'Much of the salt we eat comes from stock cubes and processed or restaurant food. Cutting back helps lower blood pressure; flavour food with herbs, garlic and pepper instead.', ['hypertension', 'high blood pressure']),
    tip('Blood pressure', 'Take your medicines at the same time each day', 'High blood pressure often causes no symptoms, so keep taking your tablets even when you feel well. Do not stop or change a dose without talking to your care team.', ['hypertension', 'high blood pressure']),
    tip('Heart health', 'Know your chest pain warning signs', 'Chest pain or pressure lasting more than a few minutes, especially with breathlessness, sweating or pain spreading to the arm or jaw, needs emergency care. Do not wait to see if it passes.', ['cad', 'coronary', 'angina', 'heart disease', 'heart failure']),
    tip('Breathing', 'Keep your reliever inhaler with you', 'Carry your reliever everywhere and ask a nurse to check your inhaler technique. If you need it more often than usual, contact your care team; if it is not helping and you are struggling to breathe, get emergency care.', ['asthma']),
    tip('Breathing', 'Pace yourself and avoid smoke', 'Break tasks into smaller steps and avoid cigarette and indoor cooking smoke. Tell your care team if you are more breathless than usual or your phlegm changes colour.', ['copd', 'emphysema', 'chronic bronchitis']),
    tip('Iron levels', 'Take iron tablets with fruit, not tea', 'Tea, coffee and milk reduce how much iron you absorb. Unless your prescriber says otherwise, take iron with orange juice or fruit. Dark stools are a common, harmless side effect.', ['anaemia', 'anemia']),
    tip('Kidney health', 'Check before taking painkillers', 'Some over-the-counter painkillers, such as ibuprofen, and some herbal remedies can harm the kidneys. Ask your pharmacist or doctor before starting any new medicine.', ['kidney', 'ckd', 'renal']),
    tip('Headaches', 'Keep a headache diary', 'Note your sleep, meals, screen time and stress on headache days to find your triggers. A sudden, severe or unusual headache needs urgent medical care.', ['migraine']),
    tip('Skin care', 'Moisturise often', 'Use a fragrance-free moisturiser several times a day, especially after washing, and use a soap substitute instead of regular soap.', ['eczema', 'dermatitis']),
    tip('Back care', 'Keep gently moving', 'Staying active as pain allows usually helps more than bed rest. Get urgent help for numbness around the groin or new problems controlling your bladder or bowels.', ['back pain', 'lumbar', 'disc', 'sciatica']),
    tip('Hydration', 'Drink water through the day', 'Staying hydrated supports your kidneys, energy and concentration. Carry a bottle and sip regularly, more in hot weather.'),
    tip('Sleep', 'Protect 7 to 8 hours of sleep', 'Regular, sufficient sleep supports blood sugar, blood pressure and mood. Try to keep the same bedtime and wake time every day.'),
    tip('Your visits', 'Bring your medicines to every appointment', 'Bring all your tablets, inhalers and remedies, or an up-to-date list, so your care team can check for interactions and side effects.'),
  ].map((entry, position) => ({ id: `TIP-${position + 1}`, position, ...entry }))

  return {
    clinic: { ...SEED_CLINIC, timeZone },
    departments,
    healthTips,
    patients,
    users,
    appointments,
    vitals,
    tasks,
    labTests,
    labCatalogue,
    prescriptions,
    inventory,
    invoices,
    dischargeSummaries,
    problemSummaries,
    dietPlans,
    glucoseReadings,
    auditEvents,
    notifications,
    systemSettings,
  }
}
