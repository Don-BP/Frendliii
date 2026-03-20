import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { BottomTabBar } from '../BottomTabBar'

describe('BottomTabBar', () => {
  it('shows all tabs for owner', () => {
    render(
      <MemoryRouter>
        <BottomTabBar role="owner" />
      </MemoryRouter>
    )
    expect(screen.getByLabelText(/dashboard/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/promotions/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/redeem/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/profile/i)).toBeInTheDocument()
  })

  it('shows only Redeem tab for staff', () => {
    render(
      <MemoryRouter>
        <BottomTabBar role="staff" />
      </MemoryRouter>
    )
    expect(screen.queryByLabelText(/dashboard/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/redeem/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/profile/i)).not.toBeInTheDocument()
  })
})
