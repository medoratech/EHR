import {
  ArrowRight,
  CheckCircle2,
  HeartPulse,
  LockKeyhole,
  Menu,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { portalNavigation } from '../components/layout/nav'

const portalOrder = ['patient', 'doctor', 'staff', 'laboratory', 'pharmacy', 'reception', 'admin']

const portalNotes: Record<string, string> = {
  patient: 'Appointments, reports, medicines and your care plan.',
  doctor: 'Prioritised cases, reports and team coordination.',
  staff: 'Assigned duties, vitals and discharge updates.',
  laboratory: 'Test queues, result uploads and catalogue access.',
  pharmacy: 'Inventory, prescription fulfilment and refills.',
  reception: 'Patient flow, appointments and billing.',
  admin: 'Access, oversight, configuration and audit activity.',
}

const accentStyles: Record<string, { icon: string; glow: string; line: string }> = {
  patient: { icon: 'bg-[#e3f7f1] text-[#12806d]', glow: 'bg-[#9fe3d3]/40', line: 'bg-[#3bae9b]' },
  clinical: { icon: 'bg-[#e8f4f2] text-[#2c6b6c]', glow: 'bg-[#b8e1dc]/40', line: 'bg-[#4f9994]' },
  operations: { icon: 'bg-[#f0eef8] text-[#665b8c]', glow: 'bg-[#d5cef0]/40', line: 'bg-[#8176ad]' },
  diagnostics: { icon: 'bg-[#eaf2f8] text-[#446c8e]', glow: 'bg-[#c1d9ec]/40', line: 'bg-[#658eaf]' },
  pharmacy: { icon: 'bg-[#f7f1e5] text-[#806a3f]', glow: 'bg-[#eadbb8]/40', line: 'bg-[#a68b58]' },
  admin: { icon: 'bg-[#eef0f7] text-[#59627f]', glow: 'bg-[#cdd3e8]/40', line: 'bg-[#7783a8]' },
}

function Brand() {
  return (
    <span className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-950 text-white shadow-lg shadow-cyan-950/15">
        <HeartPulse className="h-5 w-5" aria-hidden="true" />
      </span>
      <span>
        <span className="block text-sm font-bold tracking-tight text-cyan-950">Medora EHR</span>
        <span className="block text-[11px] font-medium tracking-wide text-cyan-600">
          Better care. Together.
        </span>
      </span>
    </span>
  )
}

export function Landing() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [portalsOpen, setPortalsOpen] = useState(false)

  function goToPortal(id: string) {
    navigate(`/${id}`)
    setMenuOpen(false)
  }

  function openPortalMenu() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setPortalsOpen(true)
  }

  function scrollToEcosystem() {
    document.getElementById('ecosystem')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#f6fbf9] text-cyan-950">
      <a href="#portals" className="skip-link">
        Skip to portals
      </a>

      <div className="relative isolate">
        <div className="pointer-events-none absolute -top-56 left-1/2 -z-10 h-[38rem] w-[60rem] -translate-x-1/2 rounded-full bg-cyan-100/55 blur-3xl" />
        <div className="pointer-events-none absolute top-80 -right-48 -z-10 h-96 w-96 rounded-full bg-cyan-100/70 blur-3xl" />

        <header className="relative z-20 border-b border-cyan-900/5 bg-white/65 backdrop-blur-xl">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              aria-label="Medora EHR home"
              className="cursor-pointer text-left"
            >
              <Brand />
            </button>

            <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPortalsOpen((open) => !open)}
                  aria-expanded={portalsOpen}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-cyan-800 transition-colors hover:bg-cyan-100"
                >
                  Portals
                </button>
                {portalsOpen ? (
                  <PortalMenu onSelect={goToPortal} />
                ) : null}
              </div>
              <button
                type="button"
                onClick={scrollToEcosystem}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-cyan-800 transition-colors hover:bg-cyan-100"
              >
                How Medora connects
              </button>
            </nav>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="hidden min-h-11 rounded-xl px-4 text-sm font-semibold text-cyan-800 transition-colors hover:bg-cyan-100 sm:inline-flex"
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-cyan-800 transition-colors hover:bg-cyan-100 md:hidden"
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {menuOpen ? (
            <div className="border-t border-cyan-900/5 bg-white/90 px-4 py-3 md:hidden">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  openPortalMenu()
                }}
                className="block rounded-xl px-3 py-3 text-sm font-semibold text-cyan-800 hover:bg-cyan-50"
              >
                Access portals from the top menu
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  openPortalMenu()
                }}
                className="mt-1 block w-full rounded-xl bg-cyan-950 px-3 py-3 text-center text-sm font-semibold text-white"
              >
                View portal menu
              </button>
            </div>
          ) : null}
        </header>

        <main id="top">
          <section className="relative mx-auto max-w-7xl px-4 pb-20 pt-20 sm:px-6 sm:pt-28 lg:px-8 lg:pb-28">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/80 bg-white/70 px-3.5 py-1.5 text-xs font-bold tracking-wide text-cyan-700 shadow-sm backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-cyan-600" aria-hidden="true" />
                One connected care experience
              </span>
              <h1 className="mt-7 text-5xl font-bold tracking-[-0.055em] text-cyan-950 sm:text-7xl">
                Every role has a place
                <span className="block bg-gradient-to-r from-cyan-900 via-[#2d8b7a] to-cyan-700 bg-clip-text text-transparent">
                  in better care.
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-cyan-700 sm:text-lg">
                Medora brings patients, clinicians, laboratories, pharmacy, reception and
                administration into one calm, beautifully connected workspace.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={openPortalMenu}
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-cyan-950 px-5 text-sm font-bold text-white shadow-xl shadow-cyan-950/15 transition-transform hover:-translate-y-0.5"
                >
                  Choose your portal
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-cyan-200 bg-white/70 px-5 text-sm font-bold text-cyan-800 transition-colors hover:bg-white"
                >
                  Sign in
                </button>
              </div>
            </div>

            <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                ['One patient record', 'Shared context across every team'],
                ['Seven focused portals', 'Workspaces shaped around each role'],
                ['Clear next steps', 'Less noise, more care'],
              ].map(([title, body]) => (
                <div key={title} className="rounded-2xl border border-white/90 bg-white/55 p-4 text-center shadow-sm backdrop-blur">
                  <p className="text-sm font-bold text-cyan-950">{title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-cyan-600">{body}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="portals" className="scroll-mt-8 border-y border-cyan-900/5 bg-white/70 px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
            <div className="mx-auto max-w-7xl">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-bold tracking-[0.2em] text-cyan-600 uppercase">Your workspace</p>
                  <h2 className="mt-3 text-3xl font-bold tracking-tight text-cyan-950 sm:text-4xl">
                    Your portal is always one click away
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-cyan-700">
                    Use the Portals menu at the top of this page to move between focused workspaces.
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 self-start rounded-full bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700 sm:self-auto">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Demo environment
                </span>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {portalOrder.map((id) => {
                  const portal = portalNavigation[id]
                  const styles = accentStyles[portal.accent]
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={openPortalMenu}
                      aria-label={`${portal.label} is available from the top Portals menu`}
                      className="group relative overflow-hidden rounded-3xl border border-cyan-900/8 bg-white p-5 text-left shadow-[0_16px_45px_-32px_rgba(15,31,23,0.6)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(15,31,23,0.32)]"
                    >
                      <span className={`pointer-events-none absolute -top-14 -right-14 h-36 w-36 rounded-full blur-2xl ${styles.glow}`} />
                      <span className="relative flex items-start justify-between gap-4">
                        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${styles.icon}`}>
                          <portal.icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="mt-2 text-[10px] font-bold tracking-[0.14em] text-cyan-500 uppercase">
                          Top menu
                        </span>
                      </span>
                      <span className="relative mt-5 block">
                        <span className="block text-lg font-bold tracking-tight text-cyan-950">{portal.label}</span>
                        <span className="mt-1.5 block min-h-10 text-sm leading-5 text-cyan-700">{portalNotes[id]}</span>
                      </span>
                      <span className={`relative mt-5 block h-1 w-12 rounded-full ${styles.line}`} />
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          <section id="ecosystem" className="scroll-mt-8 px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
            <div className="mx-auto grid max-w-7xl items-center gap-10 rounded-[2rem] border border-cyan-900/8 bg-cyan-950 px-6 py-8 text-white shadow-2xl shadow-cyan-950/15 sm:px-10 sm:py-10 lg:grid-cols-[1fr_auto] lg:px-14">
              <div>
                <span className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-cyan-300 uppercase">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Connected by design
                </span>
                <h2 className="mt-4 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
                  One source of truth, wherever care happens.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-cyan-200">
                  Medora EHR keeps the patient journey aligned across the app, WhatsApp Bot and
                  every team portal — with clear ownership and visible updates.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 lg:max-w-xs lg:justify-end">
                {['Medora App', 'WhatsApp Bot', 'EHR Portals'].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-cyan-100">
                    <LockKeyhole className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-cyan-900/5 bg-white/50 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Brand />
            <p className="text-xs font-medium text-cyan-600">A focused demo of connected care.</p>
          </div>
        </footer>
      </div>
    </div>
  )
}

function PortalMenu({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="absolute top-12 right-0 z-50 w-72 rounded-2xl border border-cyan-100 bg-white p-2 text-left shadow-2xl shadow-cyan-950/15">
      <p className="px-3 py-2 text-[10px] font-bold tracking-[0.18em] text-cyan-500 uppercase">
        Choose a workspace
      </p>
      <div className="grid gap-1">
        {portalOrder.map((id) => {
          const portal = portalNavigation[id]
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-cyan-50"
            >
              <portal.icon className="h-4 w-4 text-cyan-700" aria-hidden="true" />
              <span>
                <span className="block text-sm font-semibold text-cyan-950">{portal.label}</span>
                <span className="block text-[11px] text-cyan-600">{portal.eyebrow}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
