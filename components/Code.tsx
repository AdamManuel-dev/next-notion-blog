import * as React from 'react'
import { Code as NotionCode } from 'react-notion-x/third-party/code'
import { useNotionContext } from 'react-notion-x'
import { getBlockTitle } from 'notion-utils'

export function Code(props: React.ComponentProps<typeof NotionCode>) {
  const { recordMap } = useNotionContext()
  const [status, setStatus] = React.useState<'idle' | 'copied' | 'error'>(
    'idle'
  )
  const timer = React.useRef<ReturnType<typeof setTimeout>>()
  React.useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    clearTimeout(timer.current)
    try {
      await navigator.clipboard.writeText(getBlockTitle(props.block, recordMap))
      setStatus('copied')
    } catch {
      setStatus('error')
    }
    timer.current = setTimeout(() => setStatus('idle'), 2400)
  }

  return (
    <div className='blog-code'>
      <button
        type='button'
        className='blog-copy'
        onClick={copy}
        aria-label='Copy code'
      >
        <span
          key={status}
          className={status === 'copied' ? 'copy-success' : ''}
          aria-hidden='true'
        >
          {status === 'copied' ? '✓' : '⧉'}
        </span>
        {status === 'copied' ? 'Copied!' : 'Copy'}
      </button>
      <span className='blog-sr-only' role='status'>
        {status === 'copied'
          ? 'Code copied to clipboard.'
          : status === 'error'
          ? 'Copy failed. Select the code and copy it manually.'
          : ''}
      </span>
      {status === 'error' && (
        <span className='copy-error'>Select the code to copy it manually.</span>
      )}
      <NotionCode {...props} />
    </div>
  )
}
