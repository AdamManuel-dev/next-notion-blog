interface HotjarFunction {
  (...args: unknown[]): void
  q?: IArguments[]
}

declare global {
  interface Window {
    hj: HotjarFunction
    _hjSettings: { hjid: number; hjsv: number }
  }
}

window.hj =
  window.hj ||
  function () {
    // Hotjar's bootstrap protocol queues the original arguments object.
    // eslint-disable-next-line prefer-rest-params
    ;(window.hj.q = window.hj.q || []).push(arguments)
  }
window._hjSettings = { hjid: 2275222, hjsv: 6 }
const head = document.getElementsByTagName('head')[0]
const script = document.createElement('script')
script.async = true
script.src =
  'https://static.hotjar.com/c/hotjar-' +
  window._hjSettings.hjid +
  '.js?sv=' +
  window._hjSettings.hjsv
head.appendChild(script)

export {}
