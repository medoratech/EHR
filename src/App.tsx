import { Navigate, Outlet, Route, Routes } from 'react-router'
import { useEffect, useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { RequireAuth } from './components/layout/RequireAuth'
import { ScrollToTop } from './components/layout/ScrollToTop'
import { TOAST_EVENT, type ToastTone } from './lib/toast'
import { AdminPanel } from './pages/AdminPanel'
import { DoctorDashboard } from './pages/DoctorDashboard'
import { GetStarted } from './pages/GetStarted'
import { LaboratoryDashboard } from './pages/LaboratoryDashboard'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { PatientDashboard } from './pages/PatientDashboard'
import { PharmacyDashboard } from './pages/PharmacyDashboard'
import { ReceptionistDashboard } from './pages/ReceptionistDashboard'
import { SetPassword } from './pages/SetPassword'
import { SignUp } from './pages/SignUp'
import { StaffDashboard } from './pages/StaffDashboard'
import { AuthProvider } from './state/auth'
import { EhrProvider } from './state/ehrStore'

const toastTone: Record<ToastTone, string> = {
  success: 'border-emerald-200 text-cyan-900',
  info: 'border-cyan-200 text-cyan-900',
  error: 'border-red-200 text-red-800',
}

export default function App() {
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null)

  useEffect(() => {
    let timer: number | undefined
    const show = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string; tone?: ToastTone }>).detail
      setToast({ message: detail?.message ?? 'Done.', tone: detail?.tone ?? 'info' })
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setToast(null), 5000)
    }
    window.addEventListener(TOAST_EVENT, show)
    return () => {
      window.removeEventListener(TOAST_EVENT, show)
      window.clearTimeout(timer)
    }
  }, [])

  return (
    <AuthProvider>
      <EhrProvider>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/get-started" element={<GetStarted />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/set-password" element={<SetPassword />} />
          <Route
            element={
              <RequireAuth>
                <AppShell>
                  <Outlet />
                </AppShell>
              </RequireAuth>
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
        {toast ? (
          <div
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className={`fixed right-4 bottom-4 z-[80] max-w-sm rounded-2xl border bg-white px-4 py-3 text-sm font-semibold shadow-2xl shadow-cyan-950/15 ${toastTone[toast.tone]}`}
          >
            {toast.message}
          </div>
        ) : null}
      </EhrProvider>
    </AuthProvider>
  )
}
