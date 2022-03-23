import React from 'react'
import Document, { Html, Head, Main, NextScript } from 'next/document'
import { IconContext } from 'react-icons'

export default class MyDocument extends Document {
  render() {
    return (
      <IconContext.Provider value={{ style: { verticalAlign: 'middle' } }}>
        <Html lang='en'>
          <Head>
            <link rel='shortcut icon' href='/avatar.jpeg' />
            <link rel='manifest' href='/manifest.json' />
            <script type='text/javascript' src='/scripts/hotjar.js'></script>
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
