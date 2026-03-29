import { useState } from 'react'

export const FIXED_VIBES = [
  'Chill', 'Social', 'Lively', 'Wild', 'Romantic', 'Sporty',
  'Artsy', 'Family-friendly', 'Late-night', 'Rooftop', 'Cozy', 'Trendy',
] as const

const PILL_BASE = 'px-3 py-1.5 rounded-full text-sm font-medium transition-colors border'
const PILL_ON = 'bg-[#FF7F61] text-white border-[#FF7F61]'
const PILL_OFF = 'bg-white dark:bg-[#251A38] text-[#8E8271] dark:text-[#9E8FC0] border-[#EEEAE3] dark:border-[#3D2E55] hover:border-[#FF7F61]/50'

// Any entry in value that is not in FIXED_VIBES is the single freeform "Other" entry.
// At most one freeform entry is supported; extras would be silently ignored on save.
const getCustomVibe = (value: string[]) =>
  value.find(v => !(FIXED_VIBES as readonly string[]).includes(v)) ?? ''

interface Props {
  value: string[]
  onChange: (vibes: string[]) => void
}

export function VibeSelector({ value, onChange }: Props) {
  // otherOpen tracks whether the "Other" input panel is visible.
  // It starts open if the incoming value already has a custom entry.
  const [otherOpen, setOtherOpen] = useState(() => getCustomVibe(value) !== '')

  // Derive current custom vibe text directly from value prop (no stale state).
  const otherText = getCustomVibe(value)
  const fixedSelected = value.filter(v => (FIXED_VIBES as readonly string[]).includes(v))

  const toggle = (vibe: string) => {
    if (value.includes(vibe)) {
      onChange(value.filter(v => v !== vibe))
    } else {
      onChange([...value, vibe])
    }
  }

  const handleOtherToggle = () => {
    if (otherOpen) {
      setOtherOpen(false)
      // Remove any freeform entry when closing the panel
      onChange(fixedSelected)
    } else {
      setOtherOpen(true)
    }
  }

  const handleOtherChange = (text: string) => {
    onChange(text.trim() ? [...fixedSelected, text.trim()] : fixedSelected)
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {FIXED_VIBES.map(vibe => (
          <button
            key={vibe}
            type="button"
            onClick={() => toggle(vibe)}
            className={`${PILL_BASE} ${value.includes(vibe) ? PILL_ON : PILL_OFF}`}
          >
            {vibe}
          </button>
        ))}
        <button
          type="button"
          onClick={handleOtherToggle}
          className={`${PILL_BASE} ${otherOpen ? PILL_ON : PILL_OFF}`}
        >
          Other
        </button>
      </div>
      {otherOpen && (
        <input
          type="text"
          value={otherText}
          onChange={(e) => handleOtherChange(e.target.value)}
          placeholder="Describe your vibe…"
          aria-label="Custom vibe"
          className="mt-2 w-full bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-xl px-3 py-2 text-sm text-[#2D1E4B] dark:text-[#F0EBF8] focus:outline-none focus:ring-2 focus:ring-[#FF7F61]/30 focus:border-[#FF7F61]"
        />
      )}
    </div>
  )
}
