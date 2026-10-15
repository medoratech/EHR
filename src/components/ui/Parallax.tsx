import type { HTMLAttributes, ReactNode } from 'react'
import { useParallax, type ParallaxOptions } from '../../lib/parallax'

export function Parallax({
  children,
  speed,
  axis,
  max,
  disabled,
  ...rest
}: ParallaxOptions & HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) {
  const ref = useParallax<HTMLDivElement>({ speed, axis, max, disabled })

  return (
    <div ref={ref} {...rest}>
      {children}
    </div>
  )
}
