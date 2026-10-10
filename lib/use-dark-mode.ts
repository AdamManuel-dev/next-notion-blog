import { useCallback, useEffect, useState } from 'react'

export function useDarkMode() {
  const [value, setValue] = useState(true)

  useEffect(() => {
    setValue(document.body.classList.contains('dark-mode'))
  }, [])

  const toggle = useCallback(() => {
    setValue((previous) => {
      const next = !previous
      document.body.classList.toggle('dark-mode', next)
      document.body.classList.toggle('light-mode', !next)
      try {
        localStorage.setItem('darkMode', JSON.stringify(next))
      } catch {
        // The theme still works when browser storage is unavailable.
      }
      return next
    })
  }, [])

  return { value, toggle }
}
