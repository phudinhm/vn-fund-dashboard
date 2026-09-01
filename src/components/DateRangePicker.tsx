import { useEffect, useState } from 'react'
import { useT, type TranslationKey } from '../i18n'

interface Props {
  dateFrom: string | null
  dateTo: string | null
  onChangeFrom: (v: string | null) => void
  onChangeTo: (v: string | null) => void
}

type Preset = '7d' | '1m' | '3m' | '6m' | '1y' | '3y' | '5y' | 'ytd' | 'all'

const PRESET_VALUES: Preset[] = ['7d', '1m', '3m', '6m', '1y', '3y', '5y', 'ytd', 'all']

function getPresetFrom(preset: Preset): string | null {
  const now = new Date()
  let d: Date

  switch (preset) {
    case '7d':
      d = new Date(now)
      d.setDate(now.getDate() - 7)
      break
    case '1m':
      d = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
      break
    case '3m':
      d = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
      break
    case '6m':
      d = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
      break
    case '1y':
      d = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      break
    case '3y':
      d = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate())
      break
    case '5y':
      d = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate())
      break
    case 'ytd':
      d = new Date(now.getFullYear(), 0, 1)
      break
    case 'all':
      return null
  }

  return d.toISOString().substring(0, 10)
}

function getActivePreset(dateFrom: string | null, dateTo: string | null): Preset | null {
  if (dateTo) return null
  if (!dateFrom) return 'all'

  for (const value of PRESET_VALUES) {
    if (value === 'all') continue
    const expected = getPresetFrom(value)
    if (expected === dateFrom) return value
  }
  return null
}

export function DateRangePicker({ dateFrom, dateTo, onChangeFrom, onChangeTo }: Props) {
  const t = useT()
  const [draftFrom, setDraftFrom] = useState(dateFrom ?? '')
  const [draftTo, setDraftTo] = useState(dateTo ?? '')

  useEffect(() => setDraftFrom(dateFrom ?? ''), [dateFrom])
  useEffect(() => setDraftTo(dateTo ?? ''), [dateTo])

  const activePreset = getActivePreset(dateFrom, dateTo)

  function handlePreset(preset: Preset) {
    const nextFrom = getPresetFrom(preset)
    setDraftTo('')
    setDraftFrom(nextFrom ?? '')
    onChangeTo(null)
    onChangeFrom(nextFrom)
  }

  return (
    <div className="date-range-picker">
      <div className="date-presets">
        {PRESET_VALUES.map(value => (
          <button
            key={value}
            className={`preset-btn ${activePreset === value ? 'preset-btn-active' : ''}`}
            onClick={() => handlePreset(value)}
          >
            {t(`dateRange.${value}` as TranslationKey)}
          </button>
        ))}
      </div>
      <div className="date-inputs">
        <input
          type="date"
          aria-label={t('dateRange.from')}
          value={draftFrom}
          onChange={e => setDraftFrom(e.target.value)}
          onBlur={() => onChangeFrom(draftFrom || null)}
        />
        <span className="date-separator">→</span>
        <input
          type="date"
          aria-label={t('dateRange.to')}
          value={draftTo}
          onChange={e => setDraftTo(e.target.value)}
          onBlur={() => onChangeTo(draftTo || null)}
        />
      </div>
    </div>
  )
}
