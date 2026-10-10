import { useEffect } from 'react'

// Mobile keyboards can shrink the visual viewport without changing CSS viewport units.
export function useDialogViewport() {
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    const root = document.documentElement
    const update = () => {
      root.style.setProperty('--dialog-viewport-height', `${viewport.height}px`)
      root.style.setProperty(
        '--dialog-viewport-offset',
        `${viewport.offsetTop}px`
      )
    }
    update()
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
      root.style.removeProperty('--dialog-viewport-height')
      root.style.removeProperty('--dialog-viewport-offset')
    }
  }, [])
}
