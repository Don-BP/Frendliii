import type { VenueHours, DayHours } from '../lib/types'

const DAYS: { key: keyof VenueHours; label: string }[] = [
  { key: 'mon', label: 'Mon' }, { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' }, { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' }, { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
]

export const DEFAULT_HOURS: VenueHours = {
  mon: { open: '09:00', close: '18:00', closed: false },
  tue: { open: '09:00', close: '18:00', closed: false },
  wed: { open: '09:00', close: '18:00', closed: false },
  thu: { open: '09:00', close: '18:00', closed: false },
  fri: { open: '09:00', close: '21:00', closed: false },
  sat: { open: '10:00', close: '21:00', closed: false },
  sun: { open: '10:00', close: '17:00', closed: true },
}

interface Props {
  value: VenueHours
  onChange: (hours: VenueHours) => void
}

export function HoursEditor({ value, onChange }: Props) {
  const update = (day: keyof VenueHours, patch: Partial<DayHours>) => {
    onChange({ ...value, [day]: { ...value[day], ...patch } })
  }

  return (
    <div className="space-y-2">
      {DAYS.map(({ key, label }) => {
        const day = value[key]
        return (
          <div key={key} role="row" aria-label={label} className="flex items-center gap-3">
            <span className="w-8 text-sm text-slate-400">{label}</span>
            <input
              type="checkbox"
              aria-label={`${label} closed`}
              checked={day.closed}
              onChange={(e) => update(key, { closed: e.target.checked })}
              className="rounded"
            />
            <span className="text-xs text-slate-500 w-12">{day.closed ? 'Closed' : 'Open'}</span>
            <input
              type="time"
              value={day.open}
              disabled={day.closed}
              onChange={(e) => update(key, { open: e.target.value })}
              className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200 disabled:opacity-40"
            />
            <span className="text-slate-500 text-sm">–</span>
            <input
              type="time"
              value={day.close}
              disabled={day.closed}
              onChange={(e) => update(key, { close: e.target.value })}
              className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200 disabled:opacity-40"
            />
          </div>
        )
      })}
    </div>
  )
}
