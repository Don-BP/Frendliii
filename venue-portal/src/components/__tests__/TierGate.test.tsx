import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TierGate } from '../TierGate'
import type { Venue } from '../../lib/types'

const base: Partial<Venue> = { tier: 'listed', tier_payment_status: 'none' }

describe('TierGate', () => {
  it('renders locked state for listed tier', () => {
    render(<TierGate venue={base as Venue}><div>Content</div></TierGate>)
    expect(screen.getByText(/upgrade/i)).toBeInTheDocument()
    expect(screen.queryByText('Content')).not.toBeInTheDocument()
  })

  it('renders locked state for pending payment', () => {
    render(<TierGate venue={{ ...base, tier: 'perks', tier_payment_status: 'pending' } as Venue}><div>Content</div></TierGate>)
    expect(screen.getByText(/payment pending/i)).toBeInTheDocument()
    expect(screen.queryByText('Content')).not.toBeInTheDocument()
  })

  it('renders children when tier is active paid', () => {
    render(<TierGate venue={{ ...base, tier: 'perks', tier_payment_status: 'active' } as Venue}><div>Content</div></TierGate>)
    expect(screen.getByText('Content')).toBeInTheDocument()
    expect(screen.queryByText(/upgrade/i)).not.toBeInTheDocument()
  })
})
