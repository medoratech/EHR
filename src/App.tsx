import { Navigate, Outlet, Route, Routes } from 'react-router'
import { useEffect, useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { ScrollToTop } from './components/layout/ScrollToTop'
import { AdminPanel } from './pages/AdminPanel'
import { DoctorDashboard } from './pages/DoctorDashboard'
import { GetStarted } from './pages/GetStarted'
import { LaboratoryDashboard } from './pages/LaboratoryDashboard'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { PatientDashboard } from './pages/PatientDashboard'
import { PharmacyDashboard } from './pages/PharmacyDashboard'
import { ReceptionistDashboard } from './pages/ReceptionistDashboard'
import { SignUp } from './pages/SignUp'
import { StaffDashboard } from './pages/StaffDashboard'
import { DemoStoreProvider } from './state/demoStore'

export default function App() {
  const [demoFeedback, setDemoFeedback] = useState<string | null>(null)

  useEffect(() => {
    const showFeedback = (event: Event) => {
      const message = (event as CustomEvent<{ message?: string }>).detail?.message
      setDemoFeedback(message ?? 'Demo action completed.')
      window.setTimeout(() => setDemoFeedback(null), 5000)
    }
    window.addEventListener('medora:demo-action', showFeedback)
    return () => window.removeEventListener('medora:demo-action', showFeedback)
  }, [])

  return (
    <DemoStoreProvider>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/get-started" element={<GetStarted />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route
          element={
            <AppShell>
              <Outlet />
            </AppShell>
          }
        >
          <Route path="/patient" element={<PatientDashboard />} />
          <Route path="/doctor" element={<DoctorDashboard />} />
          <Route path="/staff" element={<StaffDashboard />} />
          <Route path="/laboratory" element={<LaboratoryDashboard />} />
          <Route path="/pharmacy" element={<PharmacyDashboard />} />
          <Route path="/reception" element={<ReceptionistDashboard />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {demoFeedback ? (
        <div className="fixed right-4 bottom-4 z-50 max-w-sm rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-cyan-900 shadow-2xl shadow-cyan-950/15">
          {demoFeedback}
        </div>
      ) : null}
    </DemoStoreProvider>
  )
}
