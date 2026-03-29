import type { VenueHours, DayHours } from '../lib/types'

const DAYS: { key: keyof VenueHours; label: string }[] = [
  { key: 'mon', label: 'Mon' }, { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' }, { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' }, { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
]

export const DEFAULT_PEAK_HOURS: VenueHours = {
  mon: { open: '20:00', close: '23:00', closed: true },
  tue: { open: '20:00', close: '23:00', closed: true },
  wed: { open: '20:00', close: '23:00', closed: true },
  thu: { open: '20:00', close: '23:00', closed: true },
  fri: { open: '21:00', close: '02:00', closed: true },
  sat: { open: '21:00', close: '02:00', closed: true },
  sun: { open: '20:00', close: '23:00', closed: true },
}

const TIME_INPUT = [
  'w-28 bg-white dark:bg-[#251A38]',
  'border border-[#EEEAE3] dark:border-[#3D2E55] rounded-lg px-2 py-1.5',
  'text-sm text-[#2D1E4B] dark:text-[#F0EBF8]',
  'focus:outline-none focus:ring-2 focus:ring-[#FF7F61]/30 focus:border-[#FF7F61]',
  'disabled:opacity-40 disabled:cursor-not-allowed',
].join(' ')

interface Props {
  value: VenueHours
  onChange: (hours: VenueHours) => void
}

export function PeakHoursEditor({ value, onChange }: Props) {
  const update = (day: keyof VenueHours, patch: Partial<DayHours>) => {
    onChange({ ...value, [day]: { ...value[day], ...patch } })
  }

  return (
    <div className="rounded-xl border border-[#EEEAE3] dark:border-[#3D2E55] divide-y divide-[#EEEAE3] dark:divide-[#3D2E55] overflow-hidden">
      {DAYS.map(({ key, label }) => {
        const day = value[key]
        return (
          <div
            key={key}
            role="row"
            aria-label={label}
            className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-[#251A38]"
          >
            <span className="w-8 text-sm font-medium text-[#2D1E4B] dark:text-[#F0EBF8]">{label}</span>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                aria-label={`${label} has peak hours`}
                checked={!day.closed}
                onChange={(e) => update(key, { closed: !e.target.checked })}
                className="w-4 h-4 rounded accent-[#FF7F61] cursor-pointer"
              />
              <span className={`text-xs w-8 ${!day.closed ? 'text-[#FF7F61]' : 'text-[#8E8271] dark:text-[#9E8FC0]'}`}>
                {!day.closed ? 'Busy' : 'Off'}
              </span>
            </label>

            <input
              type="time"
              value={day.open}
              disabled={day.closed}
              onChange={(e) => update(key, { open: e.target.value })}
              className={TIME_INPUT}
            />
            <span className="text-[#8E8271] dark:text-[#9E8FC0] text-sm select-none">–</span>
            <input
              type="time"
              value={day.close}
              disabled={day.closed}
              onChange={(e) => update(key, { close: e.target.value })}
              className={TIME_INPUT}
            />
          </div>
        )
      })}
    </div>
  )
}
