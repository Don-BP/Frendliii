import { useState } from 'react'

export const FIXED_VIBES = [
  'Chill', 'Social', 'Lively', 'Wild', 'Romantic', 'Sporty',
  'Artsy', 'Family-friendly', 'Late-night', 'Rooftop', 'Cozy', 'Trendy',
] as const

const PILL_BASE = 'px-3 py-1.5 rounded-full text-sm font-medium transition-colors border'
const PILL_ON = 'bg-[#FF7F61] text-white border-[#FF7F61]'
const PILL_OFF = 'bg-white dark:bg-[#251A38] text-[#8E8271] dark:text-[#9E8FC0] border-[#EEEAE3] dark:border-[#3D2E55] hover:border-[#FF7F61]/50'

interface Props {
  value: string[]
  onChange: (vibes: string[]) => void
}

export function VibeSelector({ value, onChange }: Props) {
  const initialCustom = value.find(v => !(FIXED_VIBES as readonly string[]).includes(v)) ?? ''
  const [showOther, setShowOther] = useState(initialCustom !== '')
  const [otherText, setOtherText] = useState(initialCustom)

  const toggle = (vibe: string) => {
    if (value.includes(vibe)) {
      onChange(value.filter(v => v !== vibe))
    } else {
      onChange([...value, vibe])
    }
  }

  const handleOtherToggle = () => {
    if (showOther) {
      setShowOther(false)
      setOtherText('')
      onChange(value.filter(v => (FIXED_VIBES as readonly string[]).includes(v)))
    } else {
      setShowOther(true)
    }
  }

  const handleOtherChange = (text: string) => {
    setOtherText(text)
    const fixed = value.filter(v => (FIXED_VIBES as readonly string[]).includes(v))
    onChange(text.trim() ? [...fixed, text.trim()] : fixed)
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
          className={`${PILL_BASE} ${showOther ? PILL_ON : PILL_OFF}`}
        >
          Other
        </button>
      </div>
      {showOther && (
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
