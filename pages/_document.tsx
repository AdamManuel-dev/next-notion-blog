import React from 'react'
import Document, { Html, Head, Main, NextScript } from 'next/document'
import { IconContext } from 'react-icons'

export default class MyDocument extends Document {
  initHotJar = () => {
    ;(function (h: any, o: any, t: any, j: any, a, r) {
      h.hj =
        h.hj ||
        function () {
          // eslint-disable-next-line prefer-rest-params
          ;(h.hj.q = h.hj.q || []).push(arguments)
        }
      h._hjSettings = { hjid: 2275222, hjsv: 6 }
      a = o.getElementsByTagName('head')[0]
      r = o.createElement('script')
      r.async = 1
      r.src = t + h._hjSettings.hjid + j + h._hjSettings.hjsv
      a.appendChild(r)
    })(window, document, 'https://static.hotjar.com/c/hotjar-', '.js?sv=')
  }

  componentDidMount() {
    this.initHotJar()
  }

  render() {
    return (
      <IconContext.Provider value={{ style: { verticalAlign: 'middle' } }}>
        <Html lang='en'>
          <Head>
            <link rel='shortcut icon' href='/avatar.jpeg' />
            <link rel='manifest' href='/manifest.json' />
            <script>{}</script>
          </Head>
          <body>
            <script src='noflash.js' />
            <Main />
            {/* Set this up to expand into a comment section later
            <script
              src='https://utteranc.es/client.js'
              repo='AdamManuel-dev/next-notion-blog'
              issue-term='title'
              label='Comment'
              theme='preferred-color-scheme'
              crossOrigin='anonymous'
              async
            ></script> */}
            <NextScript />
          </body>
        </Html>
      </IconContext.Provider>
    )
  }
}
