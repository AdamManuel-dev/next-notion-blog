import * as React from 'react'

import styles from './Diagram.module.css'

interface CounterProps {
  initialCount?: number
}

export default function Counter({ initialCount = 0 }: CounterProps) {
  const [count, setCount] = React.useState(initialCount)

  return (
    <div className={styles.diagram}>
      <output aria-live='polite'>Count: {count}</output>
      <div className={styles.controls}>
        <button type='button' onClick={() => setCount((count) => count + 1)}>
          Increment count
        </button>
      </div>
    </div>
  )
}
