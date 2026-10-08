import { useCallback, useEffect, useState } from 'react'

// The Place detail page has its own URL, /platz/<id>, so it can be shared and reloaded.
// Caddy (production) and Vite (dev) answer every path with index.html.
export function placePath(id: number): string {
  return `/platz/${id}`
}

export function placeIdFromPath(path: string): number | null {
  const match = /^\/platz\/(\d+)\/?$/.exec(path)
  return match ? Number(match[1]) : null
}

// The current path, and a function that changes it like a link (the back button works).
export function usePath(): [string, (to: string) => void] {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = useCallback((to: string) => {
    if (to !== window.location.pathname) window.history.pushState(null, '', to)
    setPath(to)
  }, [])

  return [path, navigate]
}
