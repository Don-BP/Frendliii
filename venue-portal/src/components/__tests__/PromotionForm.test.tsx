import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PromotionForm } from '../PromotionForm'

describe('PromotionForm', () => {
  it('renders with empty fields when no initial data', () => {
    render(<PromotionForm onSubmit={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByLabelText(/title/i)).toHaveValue('')
    expect(screen.getByLabelText(/discount/i)).toHaveValue('')
  })

  it('pre-fills fields when editing an existing promotion', () => {
    render(
      <PromotionForm
        initial={{ title: '10% Off', discount: '10%', valid_from: '2026-06-01T00:00:00Z', valid_until: '2026-12-31T23:59:59Z', description: null }}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByLabelText(/title/i)).toHaveValue('10% Off')
  })

  it('requires title and discount', async () => {
    const onSubmit = vi.fn()
    render(<PromotionForm onSubmit={onSubmit} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(await screen.findByText(/title is required/i)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('calls onSubmit with form data', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<PromotionForm onSubmit={onSubmit} onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'BOGO Deal' } })
    fireEvent.change(screen.getByLabelText(/discount/i), { target: { value: 'Buy 1 get 1' } })
    fireEvent.change(screen.getByLabelText(/valid from/i), { target: { value: '2026-06-01' } })
    fireEvent.change(screen.getByLabelText(/valid until/i), { target: { value: '2026-12-31' } })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'BOGO Deal', discount: 'Buy 1 get 1' })
    ))
  })

  it('calls onClose when Cancel clicked', () => {
    const onClose = vi.fn()
    render(<PromotionForm onSubmit={vi.fn()} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
