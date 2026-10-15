import { useEffect, useRef } from 'react'

export interface ParallaxOptions {
  /** Depth factor. Higher = the layer lags further behind the scroll. */
  speed?: number
  /** Direction the layer is offset on. */
  axis?: 'x' | 'y'
  /** Hard clamp on the offset in pixels, so content never drifts too far. */
  max?: number
  /** Opt a single instance out of the effect. */
  disabled?: boolean
}

interface ParallaxEntry {
  el: HTMLElement
  speed: number
  axis: 'x' | 'y'
  max: number
  offset: number
  active: boolean
}

const entries = new Set<ParallaxEntry>()
const entryByElement = new Map<Element, ParallaxEntry>()

let frame = 0
let started = false
let observer: IntersectionObserver | null = null

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function measure() {
  frame = 0
  if (typeof window === 'undefined') return
  const viewportHeight = window.innerHeight
  const viewportWidth = window.innerWidth

  entries.forEach((entry) => {
    if (!entry.active) return
    const rect = entry.el.getBoundingClientRect()

    const base =
      entry.axis === 'y'
        ? rect.top - entry.offset + rect.height / 2
        : rect.left - entry.offset + rect.width / 2
    const viewportCenter = entry.axis === 'y' ? viewportHeight / 2 : viewportWidth / 2
    const next = clamp(-(base - viewportCenter) * entry.speed, -entry.max, entry.max)

    if (Math.abs(next - entry.offset) < 0.1) return
    entry.offset = next
    entry.el.style.transform =
      entry.axis === 'y'
        ? `translate3d(0, ${next.toFixed(2)}px, 0)`
        : `translate3d(${next.toFixed(2)}px, 0, 0)`
  })
}

function schedule() {
  if (frame) return
  frame = requestAnimationFrame(measure)
}

function ensureStarted() {
  if (started || typeof window === 'undefined') return
  started = true

  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule, { passive: true })

  if (typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(
      (observed) => {
        observed.forEach((item) => {
          const entry = entryByElement.get(item.target)
          if (entry) entry.active = item.isIntersecting
        })
        schedule()
      },
      { rootMargin: '240px 0px' },
    )
  }
}

function attach(el: HTMLElement, options: Required<ParallaxOptions>) {
  ensureStarted()

  const entry: ParallaxEntry = {
    el,
    speed: options.speed,
    axis: options.axis,
    max: options.max,
    offset: 0,
    active: true,
  }

  entries.add(entry)
  entryByElement.set(el, entry)
  observer?.observe(el)
  el.style.willChange = 'transform'
  schedule()

  return () => {
    entries.delete(entry)
    entryByElement.delete(el)
    observer?.unobserve(el)
    el.style.willChange = ''
    el.style.transform = ''
  }
}

export function useParallax<T extends HTMLElement = HTMLDivElement>({
  speed = 0.15,
  axis = 'y',
  max = 120,
  disabled = false,
}: ParallaxOptions = {}) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || disabled) return
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    return attach(el, { speed, axis, max, disabled })
  }, [speed, axis, max, disabled])

  return ref
}
