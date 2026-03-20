import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StepIndicator } from '../StepIndicator'

describe('StepIndicator', () => {
  it('renders the correct number of steps', () => {
    render(<StepIndicator totalSteps={4} currentStep={1} labels={['Account', 'Details', 'Location', 'Tier']} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
  })

  it('marks current step as active', () => {
    render(<StepIndicator totalSteps={4} currentStep={2} labels={['Account', 'Details', 'Location', 'Tier']} />)
    const items = screen.getAllByRole('listitem')
    expect(items[1]).toHaveAttribute('aria-current', 'step')
  })

  it('marks previous steps as complete', () => {
    render(<StepIndicator totalSteps={4} currentStep={3} labels={['Account', 'Details', 'Location', 'Tier']} />)
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveAttribute('data-complete', 'true')
    expect(items[1]).toHaveAttribute('data-complete', 'true')
  })
})
