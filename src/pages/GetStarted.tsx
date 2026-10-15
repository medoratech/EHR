import { ArrowRight, LogIn, UserPlus } from 'lucide-react'
import { useNavigate } from 'react-router'
import { AuthLayout } from '../components/layout/AuthLayout'

const options = [
  {
    icon: UserPlus,
    title: 'Create account',
    description: 'New to Medora? Set up your facility, invite your team and start your free trial.',
    action: 'Create account',
    to: '/signup',
  },
  {
    icon: LogIn,
    title: 'Sign in',
    description: 'Already have an account? Access your role-based dashboard and pick up where you left off.',
    action: 'Sign in',
    to: '/login',
  },
]

export function GetStarted() {
  const navigate = useNavigate()

  return (
    <AuthLayout
      formId="get-started"
      heading="Get started"
      subheading="Choose how you'd like to continue."
      panelTitle="Better care, delivered together."
      panelBody="Whether you are setting up a new facility or returning to your dashboard, Medora brings every care team onto one secure platform."
      bullets={['Role-based access control', 'Free 14-day trial', 'Guided onboarding']}
    >
      <div className="mt-8 grid gap-4">
        {options.map((option) => (
          <button
            key={option.title}
            type="button"
            onClick={() => navigate(option.to)}
            className="card-shadow group flex w-full cursor-pointer items-start gap-4 rounded-2xl border border-cyan-200/70 bg-white p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-700 to-cyan-600 text-white shadow-lg shadow-cyan-900/25">
              <option.icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-bold text-cyan-950">{option.title}</span>
              <span className="mt-1 block text-sm leading-relaxed text-cyan-700">
                {option.description}
              </span>
              <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-700 group-hover:text-cyan-900">
                {option.action}
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </span>
          </button>
        ))}
      </div>

      <p className="mt-6 text-center text-xs leading-relaxed text-cyan-600">
        By continuing you agree to Medora's{' '}
        <span className="font-semibold text-cyan-800">Terms of Service</span> and{' '}
        <span className="font-semibold text-cyan-800">Privacy Policy</span>.
      </p>
    </AuthLayout>
  )
}
