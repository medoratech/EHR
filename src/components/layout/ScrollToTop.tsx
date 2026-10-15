import { useEffect } from 'react'
import { useLocation } from 'react-router'

/**
 * Resets scroll to the top of the page whenever the route or portal view
 * (query string) changes, so every page opens from the top.
 *
 * Uses an explicit `instant` behaviour to override the global
 * `scroll-behavior: smooth`, and leaves in-page `#hash` targets alone.
 */
export function ScrollToTop() {
  const { pathname, search, hash } = useLocation()

  useEffect(() => {
    if (hash) return
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname, search, hash])

  return null
}
