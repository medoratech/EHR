import { Bell, ChevronDown, HeartPulse, LogOut, Menu, RotateCcw, Search, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router'
import { currentPatient, patients, users } from '../../data/api'
import { PatientContextBar } from './PatientContextBar'
import { portalNavigation, type NavItem } from './nav'
import { useDemoStore } from '../../state/useDemoStore'

const viewDetails: Record<string, { title: string; description: string; action: string }> = {
  health: { title: 'My health', description: 'Your care overview, latest vitals and next steps.', action: 'Review health summary' },
  appointments: { title: 'Appointments', description: 'Visits, bookings and appointment requests in one place.', action: 'Manage appointments' },
  reports: { title: 'Reports', description: 'Results and documents shared with your care team.', action: 'Review reports' },
  medicines: { title: 'Medicines', description: 'Prescriptions, orders and refill reminders.', action: 'Manage medicines' },
  overview: { title: 'Overview', description: 'Your role-based workspace at a glance.', action: 'Review today' },
  patients: { title: 'My patients', description: 'Cases, histories and patient context for your team.', action: 'Open patient list' },
  tasks: { title: 'Task queue', description: 'Assigned work and coordination updates for today.', action: 'Review task queue' },
  vitals: { title: 'Vital updates', description: 'Record and review the latest patient readings.', action: 'Review vital updates' },
  discharges: { title: 'Discharges', description: 'Summaries waiting for verification and sign-off.', action: 'Review discharges' },
  queue: { title: 'Test queue', description: 'Samples in progress and diagnostic work awaiting action.', action: 'Review test queue' },
  catalogue: { title: 'Test catalogue', description: 'Bookable laboratory services, preparation and pricing.', action: 'View catalogue' },
  inventory: { title: 'Inventory', description: 'Stock levels, expiry tracking and reorder actions.', action: 'Review inventory' },
  prescriptions: { title: 'Prescription queue', description: 'Doctor-issued prescriptions ready for fulfilment.', action: 'Review prescriptions' },
  refills: { title: 'Refill reminders', description: 'Recurring medicines approaching their next refill.', action: 'Review reminders' },
  appointments_reception: { title: 'Appointments', description: 'Confirm and check in patients arriving through every channel.', action: 'Manage appointments' },
  billing: { title: 'Billing', description: 'Payments, outstanding invoices and receipts.', action: 'Review billing' },
  access: { title: 'User access', description: 'Roles, permissions and staff access status.', action: 'Manage access' },
  oversight: { title: 'Data oversight', description: 'Operational analytics across the Medora ecosystem.', action: 'Review oversight' },
  audit: { title: 'Audit logs', description: 'Security activity and privileged actions across the platform.', action: 'Review audit logs' },
}

function ViewWorkspace({ portalId, search }: { portalId: string; search: string }) {
  const requestedView = new URLSearchParams(search).get('view')
  const normalizedView = portalId === 'reception' && requestedView === 'appointments'
    ? 'appointments_reception'
    : requestedView
  const view = (normalizedView && viewDetails[normalizedView]) || viewDetails.overview

  return (
    <section className="border-b border-cyan-100 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] text-cyan-500 uppercase">Current workspace</p>
          <h1 className="mt-1 text-lg font-bold tracking-tight text-cyan-950">{view.title}</h1>
          <p className="mt-0.5 text-sm text-cyan-700">{view.description}</p>
        </div>
        <span className="rounded-full border border-cyan-200 bg-white px-3 py-1.5 text-xs font-semibold text-cyan-700">
          {view.action}
        </span>
      </div>
    </section>
  )
}

function initialsOf(name: string): string {
  return name
    .replace(/^Dr\.\s*/, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

const roleToUserRole: Record<string, string> = {
  Patient: 'patient',
  Clinician: 'doctor',
  Nursing: 'staff',
  Diagnostics: 'lab',
  Pharmacy: 'pharmacy',
  'Front desk': 'receptionist',
  Administration: 'admin',
}

function currentUser(role: string) {
  const match = roleToUserRole[role]
  if (match === 'patient') {
    return {
      name: currentPatient.name,
      email: 'patient@medora.health',
      role: 'patient' as const,
      status: 'active' as const,
      lastActive: currentPatient.lastVisit,
    }
  }
  return (
    users.find((u) => u.role === match && u.status === 'active') ??
    users.find((u) => u.status === 'active') ??
    users[0]
  )
}

function Brand({ onDark = false }: { onDark?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-800 text-white shadow-lg shadow-cyan-900/20">
        <HeartPulse className="h-5 w-5" aria-hidden="true" />
      </span>
      <span>
        <span className={`block text-sm font-bold ${onDark ? 'text-white' : 'text-cyan-950'}`}>
          Medora EHR
        </span>
        <span className={`block text-xs ${onDark ? 'text-cyan-200' : 'text-cyan-800'}`}>
          Better Care. Together.
        </span>
      </span>
    </div>
  )
}

function NavList({
  items,
  label,
  onNavigate,
}: {
  items: NavItem[]
  label: string
  onNavigate?: () => void
}) {
  return (
    <nav aria-label="Portal navigation" className="flex-1 overflow-y-auto px-3 py-4">
      <p className="px-3 pb-2 text-[10px] font-bold tracking-[0.16em] text-cyan-300/70 uppercase">
        {label}
      </p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end
              onClick={onNavigate}
              className={({ isActive }) =>
                `group flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-200 ${
                  isActive
                    ? 'bg-white font-semibold text-cyan-900 shadow-sm'
                    : 'font-medium text-cyan-100 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={`h-[18px] w-[18px] shrink-0 ${
                      isActive ? 'text-cyan-600' : 'text-cyan-300 group-hover:text-white'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function SidebarFooter() {
  const navigate = useNavigate()
  const { resetDemo } = useDemoStore()
  const actionClass =
    'flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-sm font-medium text-cyan-100 transition-colors duration-200 hover:bg-white/10 hover:text-white'
  return (
    <div className="space-y-1 border-t border-white/10 p-3">
      <button type="button" onClick={resetDemo} className={actionClass}>
        <RotateCcw className="h-4 w-4 text-cyan-300" aria-hidden="true" />
        Reset demo data
      </button>
      <button
        type="button"
        onClick={() => {
          sessionStorage.removeItem('medora:demo-session')
          navigate('/')
        }}
        className={actionClass}
      >
        <LogOut className="h-4 w-4 text-cyan-300" aria-hidden="true" />
        Log out
      </button>
    </div>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const { resetDemo, notifications } = useDemoStore()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [portalMenuOpen, setPortalMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const drawerRef = useRef<HTMLElement>(null)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!drawerOpen) return
    const previous = document.activeElement as HTMLElement | null
    const container = drawerRef.current
    const focusables = () =>
      container
        ? Array.from(
            container.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), select, input, [tabindex]:not([tabindex="-1"])',
            ),
          )
        : []

    focusables()[0]?.focus()

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setDrawerOpen(false)
        return
      }
      if (e.key !== 'Tab') return
      const list = focusables()
      if (list.length === 0) return
      const first = list[0]
      const last = list[list.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      previous?.focus()
    }
  }, [drawerOpen])

  const portalId = location.pathname.split('/')[1] || 'patient'
  const portal = portalNavigation[portalId] ?? portalNavigation.patient
  const role = portal.items[0]?.role ?? 'Overview'
  const user = currentUser(role)
  const initials = initialsOf(user.name)
  const matches = query.trim()
    ? patients
        .filter((patient) =>
          [patient.name, patient.mrn, patient.department, ...patient.conditions]
            .join(' ')
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
        )
        .slice(0, 5)
    : []
  const unreadNotifications = notifications.filter((notification) => !notification.read)

  return (
    <div className={`portal-${portal.accent} min-h-screen lg:grid lg:grid-cols-[290px_1fr]`}>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>

      <aside className="sticky top-0 hidden h-screen flex-col border-r border-white/10 bg-cyan-950 lg:flex">
        <div className="flex items-center border-b border-white/10 px-5 py-4">
          <Brand onDark />
        </div>
        <NavList items={portal.items} label={portal.label} />
        <SidebarFooter />
      </aside>

      {drawerOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 cursor-pointer bg-cyan-950/60 backdrop-blur-sm"
            aria-label="Close navigation menu"
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            id="medora-mobile-nav"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-cyan-950 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <Brand onDark />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation menu"
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-cyan-100 transition-colors duration-200 hover:bg-white/10"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <NavList
              items={portal.items}
              label={portal.label}
              onNavigate={() => setDrawerOpen(false)}
            />
            <SidebarFooter />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 border-b border-cyan-200/70 bg-white/85 shadow-sm shadow-cyan-900/5 backdrop-blur">
          <div className="flex h-18 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={drawerOpen}
              aria-controls="medora-mobile-nav"
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-cyan-800 transition-colors duration-200 hover:bg-cyan-100 lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>

            <div className="lg:hidden">
              <Brand />
            </div>

            <div className="hidden min-w-0 flex-col justify-center lg:flex">
              <span className="text-xs font-semibold tracking-[0.16em] text-cyan-600 uppercase">
                {portal.label}
              </span>
              <span className="truncate text-lg leading-tight font-bold tracking-tight text-cyan-950">
                {portal.eyebrow}
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2.5 sm:gap-4">
              <div className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => setPortalMenuOpen((open) => !open)}
                  aria-expanded={portalMenuOpen}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cyan-200 bg-white/70 px-3.5 text-sm font-semibold text-cyan-800 transition-colors hover:bg-cyan-50"
                >
                  <portal.icon className="h-4 w-4 text-cyan-700" aria-hidden="true" />
                  Portals
                  <ChevronDown className="h-3.5 w-3.5 text-cyan-500" aria-hidden="true" />
                </button>
                {portalMenuOpen ? (
                  <div className="absolute top-13 right-0 z-50 w-72 rounded-2xl border border-cyan-100 bg-white p-2 shadow-2xl shadow-cyan-950/15">
                    <p className="px-3 py-2 text-[10px] font-bold tracking-[0.18em] text-cyan-500 uppercase">
                      Switch workspace
                    </p>
                    {Object.values(portalNavigation).map((item) => (
                      <NavLink
                        key={item.id}
                        to={`/${item.id}`}
                        onClick={() => setPortalMenuOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-cyan-50"
                      >
                        <item.icon className="h-4 w-4 text-cyan-700" aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block text-left text-sm font-semibold text-cyan-950">
                            {item.label}
                          </span>
                          <span className="block truncate text-left text-[11px] text-cyan-600">
                            {item.eyebrow}
                          </span>
                        </span>
                      </NavLink>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="relative hidden md:block">
                <span className="sr-only">Search patients, reports and orders</span>
                <Search
                  className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-cyan-500"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onFocus={() => setSearchOpen(true)}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    setSearchOpen(true)
                  }}
                  placeholder="Search patients, reports, appointments…"
                  className="h-11 w-80 rounded-xl border border-cyan-200 bg-cyan-50/60 pr-4 pl-10 text-sm text-cyan-900 shadow-inner shadow-cyan-900/5 placeholder:text-cyan-500 transition-all focus:w-96 focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100"
                />
                {searchOpen && query.trim() ? (
                  <div className="absolute top-13 right-0 z-50 w-96 overflow-hidden rounded-2xl border border-cyan-100 bg-white p-2 shadow-2xl shadow-cyan-950/15">
                    <p className="px-3 py-2 text-[11px] font-bold tracking-[0.16em] text-cyan-500 uppercase">
                      Patient records
                    </p>
                    {matches.length ? (
                      matches.map((patient) => (
                        <button
                          key={patient.id}
                          type="button"
                          onClick={() => {
                            setQuery(patient.name)
                            setSearchOpen(false)
                            navigate('/patient')
                          }}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-cyan-50"
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-100 text-xs font-bold text-cyan-800">
                            {patient.name
                              .split(' ')
                              .map((part) => part[0])
                              .slice(0, 2)
                              .join('')}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-cyan-950">
                              {patient.name}
                            </span>
                            <span className="block truncate text-xs text-cyan-600">
                              {patient.mrn} · {patient.department}
                            </span>
                          </span>
                          <span className="ml-auto text-[10px] font-bold text-cyan-500 uppercase">
                            {patient.risk}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-4 text-sm text-cyan-700">No records match your search.</p>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="relative">
                <button
                  type="button"
                  aria-label={`Notifications, ${unreadNotifications.length} unread`}
                  aria-expanded={notificationsOpen}
                  onClick={() => setNotificationsOpen((open) => !open)}
                  className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-cyan-700 transition-colors duration-200 hover:bg-cyan-100"
                >
                  <Bell className="h-5 w-5" aria-hidden="true" />
                  {unreadNotifications.length ? (
                    <span className="absolute top-2 right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
                      {unreadNotifications.length}
                    </span>
                  ) : null}
                </button>
                {notificationsOpen ? (
                  <div className="absolute top-13 right-0 z-50 w-80 overflow-hidden rounded-2xl border border-cyan-100 bg-white shadow-2xl shadow-cyan-950/15">
                    <div className="flex items-center justify-between border-b border-cyan-100 px-4 py-3">
                      <p className="text-sm font-bold text-cyan-950">Notifications</p>
                      <span className="text-xs font-semibold text-cyan-600">
                        {unreadNotifications.length} unread
                      </span>
                    </div>
                    <ul className="divide-y divide-cyan-100">
                      {unreadNotifications.slice(0, 3).map((notification) => (
                        <li key={notification.id} className="px-4 py-3">
                          <p className="text-sm font-semibold text-cyan-950">{notification.title}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-cyan-700">
                            {notification.body}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              <div className="relative">
              <button
                type="button"
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen((open) => !open)}
                className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2 transition-colors duration-200 hover:bg-cyan-100"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-600 to-cyan-500 text-sm font-bold text-white ring-2 ring-cyan-100">
                  {initials}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-xs leading-tight text-cyan-600">Signed in as</span>
                  <span className="mt-0.5 block text-sm leading-tight font-semibold text-cyan-950">
                    {user.name}
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 text-cyan-600" aria-hidden="true" />
              </button>
              {profileOpen ? (
                <div className="absolute top-14 right-0 z-50 w-64 rounded-2xl border border-cyan-100 bg-white p-3 shadow-2xl shadow-cyan-950/15">
                  <p className="text-sm font-bold text-cyan-950">{user.name}</p>
                  <p className="mt-0.5 text-xs text-cyan-600">{user.role} · {user.email}</p>
                  <div className="my-3 h-px bg-cyan-100" />
                  <button
                    type="button"
                    onClick={() => {
                      resetDemo()
                      setProfileOpen(false)
                    }}
                    className="flex min-h-10 w-full cursor-pointer items-center rounded-xl px-3 text-left text-sm font-semibold text-cyan-800 hover:bg-cyan-50"
                  >
                    Reset demo data
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sessionStorage.removeItem('medora:demo-session')
                      navigate('/')
                    }}
                    className="flex min-h-10 w-full cursor-pointer items-center rounded-xl px-3 text-left text-sm font-semibold text-cyan-800 hover:bg-cyan-50"
                  >
                    <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                    Sign out
                  </button>
                </div>
              ) : null}
              </div>
            </div>
          </div>
        </header>

        <main
          id="main"
          tabIndex={-1}
          className="app-canvas flex-1 px-4 py-6 focus:outline-none sm:px-6 lg:px-8"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-6">
            <PatientContextBar />
            <ViewWorkspace portalId={portalId} search={location.search} />
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
