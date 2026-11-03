import * as React from 'react'

import styles from './Diagram.module.css'

const stages = ['Request', 'Service', 'Database']

interface DiagramProps {
  active: number
  onSelect: (stage: number) => void
}

/** A controlled, keyboard-accessible pipeline diagram for trusted live blocks. */
export default function Diagram({ active, onSelect }: DiagramProps) {
  return (
    <figure className={styles.diagram}>
      <svg
        viewBox='0 0 540 100'
        role='img'
        aria-label={`Request to Service to Database. Selected stage: ${
          stages[active] ?? 'none'
        }.`}
      >
        <path d='M150 50h45m150 0h45' fill='none' stroke='currentColor' />
        <path
          d='m185 45 10 5-10 5m195-10 10 5-10 5'
          fill='none'
          stroke='currentColor'
        />
        {stages.map((stage, index) => (
          <g key={stage} transform={`translate(${index * 195}, 20)`}>
            <rect
              width='150'
              height='60'
              rx='8'
              fill='none'
              stroke='currentColor'
              strokeWidth={active === index ? 4 : 1}
            />
            <text x='75' y='36' textAnchor='middle' fill='currentColor'>
              {stage}
            </text>
          </g>
        ))}
      </svg>
      <figcaption>Select a stage to follow the request.</figcaption>
      <div
        className={styles.controls}
        role='group'
        aria-label='Pipeline stages'
      >
        {stages.map((stage, index) => (
          <button
            key={stage}
            type='button'
            aria-pressed={active === index}
            onClick={() => onSelect(index)}
          >
            {stage}
          </button>
        ))}
      </div>
    </figure>
  )
}
