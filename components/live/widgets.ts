import * as React from 'react'

export const widgets = {
  Counter: React.lazy(() => import('@live/Counter')),
  Diagram: React.lazy(() => import('@live/InteractiveDiagram'))
}
