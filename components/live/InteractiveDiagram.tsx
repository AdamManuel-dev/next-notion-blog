import * as React from 'react'

import Diagram from './Diagram'

const descriptions = [
  'The request enters the application and is validated.',
  'The service applies business rules and coordinates the work.',
  'The database reads or stores the application data.'
]

interface InteractiveDiagramProps {
  active?: number
}

export default function InteractiveDiagram({
  active = 0
}: InteractiveDiagramProps) {
  const [selectedStage, setSelectedStage] = React.useState(active)

  return (
    <div>
      <Diagram active={selectedStage} onSelect={setSelectedStage} />
      <p aria-live='polite'>{descriptions[selectedStage]}</p>
    </div>
  )
}
