import { useMemo, useState, type ReactNode } from 'react'
import {
  appointments as seedAppointments,
  auditEvents as seedAuditEvents,
  invoices as seedInvoices,
  labTests as seedLabTests,
  notifications as seedNotifications,
  prescriptions as seedPrescriptions,
  tasks as seedTasks,
  users as seedUsers,
  vitals as seedVitals,
} from '../data/mock'
import type {
  AuditEvent,
  Notification,
} from '../data/types'
import { DemoStoreContext, type DemoStoreValue } from './demoStoreContext'
import { demoNowIso } from '../lib/demoClock'

function nextId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function now() {
  return demoNowIso()
}

function clone<T>(items: T[]): T[] {
  return structuredClone(items)
}

export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [appointments, setAppointments] = useState(() => clone(seedAppointments))
  const [invoices, setInvoices] = useState(() => clone(seedInvoices))
  const [labTests, setLabTests] = useState(() => clone(seedLabTests))
  const [prescriptions, setPrescriptions] = useState(() => clone(seedPrescriptions))
  const [tasks, setTasks] = useState(() => clone(seedTasks))
  const [users, setUsers] = useState(() => clone(seedUsers))
  const [vitals, setVitals] = useState(() => clone(seedVitals))
  const [notifications, setNotifications] = useState(() => clone(seedNotifications))
  const [auditEvents, setAuditEvents] = useState(() => clone(seedAuditEvents))

  function record(action: string, target: string, severity: AuditEvent['severity'] = 'normal') {
    setAuditEvents((current) => [
      {
        id: nextId('AUD'),
        actor: 'Demo user',
        role: 'admin',
        action,
        target,
        at: now(),
        severity,
      },
      ...current,
    ])
  }

  function notify(title: string, body: string, severity: Notification['severity'] = 'normal') {
    setNotifications((current) => [
      { id: nextId('N'), title, body, severity, at: now(), read: false },
      ...current,
    ])
  }

  const value = useMemo<DemoStoreValue>(
    () => ({
      appointments,
      invoices,
      labTests,
      prescriptions,
      tasks,
      users,
      vitals,
      notifications,
      auditEvents,
      addAppointment: (input) => {
        const appointment = { ...input, id: nextId('A') }
        setAppointments((current) => [appointment, ...current])
        notify('Appointment request created', `${appointment.department} appointment requested for ${appointment.date}.`)
        record('Created appointment request', appointment.reason)
        return appointment
      },
      updateAppointment: (id, status) => {
        setAppointments((current) => current.map((item) => (item.id === id ? { ...item, status } : item)))
        const appointment = appointments.find((item) => item.id === id)
        if (appointment) {
          notify(`Appointment ${status}`, `${appointment.doctor} · ${appointment.date} at ${appointment.time}.`)
          record(`Marked appointment ${status}`, appointment.reason)
        }
      },
      addLabTest: (input) => {
        const test = { ...input, id: nextId('LAB') }
        setLabTests((current) => [test, ...current])
        notify('Lab booking created', `${test.testName} is now booked.`)
        record('Booked laboratory test', test.testName)
        return test
      },
      releaseLabReport: (id, result = 'Result reviewed and released') => {
        setLabTests((current) =>
          current.map((item) =>
            item.id === id
              ? { ...item, status: 'completed', reportUploaded: true, isNew: true, result }
              : item,
          ),
        )
        const test = labTests.find((item) => item.id === id)
        if (test) {
          notify('Report released', `${test.testName} is now available to the care team.`)
          record('Released laboratory report', test.testName)
        }
      },
      orderMedicine: (prescriptionId, medicineId) => {
        setPrescriptions((current) =>
          current.map((prescription) =>
            prescription.id === prescriptionId
              ? {
                  ...prescription,
                  medicines: prescription.medicines.map((medicine) =>
                    medicine.id === medicineId ? { ...medicine, ordered: true } : medicine,
                  ),
                }
              : prescription,
          ),
        )
        const prescription = prescriptions.find((item) => item.id === prescriptionId)
        const medicine = prescription?.medicines.find((item) => item.id === medicineId)
        if (medicine) {
          notify('Medicine order placed', `${medicine.name} is being prepared by the pharmacy.`)
          record('Ordered medicine', medicine.name)
        }
      },
      updateInvoice: (id, status, method) => {
        setInvoices((current) =>
          current.map((item) => (item.id === id ? { ...item, status, method: method ?? item.method } : item)),
        )
        const invoice = invoices.find((item) => item.id === id)
        if (invoice) {
          notify('Payment status updated', `${invoice.id} is now ${status}.`)
          record('Updated invoice status', invoice.id)
        }
      },
      addVitals: (input) => {
        const entry = { ...input, id: nextId('VIT') }
        setVitals((current) => [entry, ...current])
        notify('Vitals saved', 'The latest readings are available to the care team.')
        record('Recorded patient vitals', entry.patientId)
        return entry
      },
      updateTask: (id, status) => {
        setTasks((current) => current.map((item) => (item.id === id ? { ...item, status } : item)))
        const task = tasks.find((item) => item.id === id)
        if (task) {
          notify('Task status updated', `${task.title} is now ${status}.`)
          record('Updated care task', task.title)
        }
      },
      addUser: (input) => {
        const user = { ...input, id: nextId('U'), lastActive: now() }
        setUsers((current) => [user, ...current])
        notify('User invited', `${user.name} has been added to the team.`)
        record('Invited platform user', user.email)
        return user
      },
      updateUserStatus: (id, status) => {
        setUsers((current) => current.map((item) => (item.id === id ? { ...item, status } : item)))
        const user = users.find((item) => item.id === id)
        if (user) {
          notify('Access updated', `${user.name} is now ${status}.`)
          record('Updated user access', user.email)
        }
      },
      resetDemo: () => {
        setAppointments(clone(seedAppointments))
        setInvoices(clone(seedInvoices))
        setLabTests(clone(seedLabTests))
        setPrescriptions(clone(seedPrescriptions))
        setTasks(clone(seedTasks))
        setUsers(clone(seedUsers))
        setVitals(clone(seedVitals))
        setNotifications(clone(seedNotifications))
        setAuditEvents(clone(seedAuditEvents))
      },
    }),
    [appointments, auditEvents, invoices, labTests, notifications, prescriptions, tasks, users, vitals],
  )

  return <DemoStoreContext.Provider value={value}>{children}</DemoStoreContext.Provider>
}
