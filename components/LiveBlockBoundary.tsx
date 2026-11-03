import * as React from 'react'

export const liveBlockErrorMessage =
  'This interactive example could not load. Its source is still available below.'

export class LiveBlockBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? (
      <p role='alert'>{liveBlockErrorMessage}</p>
    ) : (
      this.props.children
    )
  }
}
