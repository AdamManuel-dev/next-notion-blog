// Runs immediately after <body> to apply the theme before the first paint.
const storageKey = 'darkMode'
const classNameDark = 'dark-mode'
const classNameLight = 'light-mode'

function setClassOnDocumentBody(darkMode: unknown) {
  document.body.classList.add(darkMode ? classNameDark : classNameLight)
  document.body.classList.remove(darkMode ? classNameLight : classNameDark)
}

const preferDarkQuery = '(prefers-color-scheme: dark)'
const mql = window.matchMedia(preferDarkQuery)
const supportsColorSchemeQuery = mql.media === preferDarkQuery
let localStorageTheme: string | null = null
try {
  localStorageTheme = localStorage.getItem(storageKey)
} catch {
  // Reading storage can be denied by the browser.
}

if (localStorageTheme !== null) {
  const darkMode: unknown = JSON.parse(localStorageTheme)
  setClassOnDocumentBody(darkMode)
} else if (supportsColorSchemeQuery) {
  setClassOnDocumentBody(mql.matches)
  localStorage.setItem(storageKey, String(mql.matches))
} else {
  const isDarkMode = document.body.classList.contains(classNameDark)
  localStorage.setItem(storageKey, JSON.stringify(isDarkMode))
}

export {}
