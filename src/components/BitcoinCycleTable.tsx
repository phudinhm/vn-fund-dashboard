import { memo, useMemo, useState, Fragment, type ReactNode } from 'react'
import type { PricePoint } from '../types'
import {
  buildPeriods, periodStat, groupByYearInTerm,
  type CycleMode,
} from '../utils/cycleReturns'
import { useT, useTRich, type TranslationKey } from '../i18n'

interface Props {
  btc: PricePoint[]
  base: PricePoint[]
  baseName: string
}

const YEAR_LABEL_KEY: Record<1 | 2 | 3 | 4, TranslationKey> = {
  1: 'cyc.year1',
  2: 'cyc.year2',
  3: 'cyc.year3',
  4: 'cyc.year4',
}

/**
 * Lợi nhuận xếp theo năm thứ mấy trong nhiệm kỳ tổng thống Mỹ.
 *
 * Đây KHÔNG phải công cụ dự báo. Mẫu chỉ có hai nhiệm kỳ rưỡi, và ba cách giải
 * thích khác nhau (bầu cử giữa kỳ, Fed siết tiền, chu kỳ halving) đều trùng pha
 * nhau nên không tách được. Bảng bày ra đúng những gì đã xảy ra, kèm đủ thứ để
 * người đọc tự thấy nó mỏng tới đâu: số lần quan sát, cột halving, và một nút
 * đổi khung đo cho thấy con số nhảy khi cắt thời gian theo cách khác.
 */
function BitcoinCycleTableImpl({ btc, base, baseName }: Props) {
  const [mode, setMode] = useState<CycleMode>('term')
  const t = useT()
  const tr = useTRich()

  const rows = useMemo(() => {
    if (btc.length === 0) return []
    const dataStart = btc[0]!.date
    const dataEnd = btc[btc.length - 1]!.date
    return buildPeriods(mode, dataStart, dataEnd).map(period => ({
      period,
      btc: periodStat(btc, period),
      base: periodStat(base, period),
    }))
  }, [btc, base, mode])

  const grouped = useMemo(() => {
    const map = groupByYearInTerm(rows.map(r => r.period))
    const byId = new Map(rows.map(r => [r.period.id, r]))
    return ([1, 2, 3, 4] as const)
      .map(year => ({
        year,
        periods: (map.get(year) ?? []).map(p => byId.get(p.id)!),
      }))
      .filter(g => g.periods.length > 0)
  }, [rows])

  if (rows.length === 0) return null

  return (
    <div className="chart-container cycle-table-card">
      <div className="chart-header">
        <h3>{t('cyc.title')}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className={`log-scale-btn${mode === 'term' ? ' log-scale-btn-active' : ''}`}
            onClick={() => setMode('term')}
            title={t('cyc.modeTermHelp')}
          >
            {t('cyc.modeTerm')}
          </button>
          <button
            className={`log-scale-btn${mode === 'election' ? ' log-scale-btn-active' : ''}`}
            onClick={() => setMode('election')}
            title={t('cyc.modeElectionHelp')}
          >
            {t('cyc.modeElection')}
          </button>
          <button
            className={`log-scale-btn${mode === 'calendar' ? ' log-scale-btn-active' : ''}`}
            onClick={() => setMode('calendar')}
            title={t('cyc.modeCalendarHelp')}
          >
            {t('cyc.modeCalendar')}
          </button>
          <span className="chart-tooltip-icon" title={t('cyc.help')}>?</span>
        </div>
      </div>

      <p className="cycle-table-intro">
        {mode === 'term' && t('cyc.introTerm')}
        {mode === 'election' && t('cyc.introElection')}
        {mode === 'calendar' && t('cyc.introCalendar')}
        {t('cyc.introTail')}
      </p>

      <div className="cycle-table-wrap">
        <table className="cycle-table">
          <thead>
            <tr>
              <th>{t('cyc.colPeriod')}</th>
              <th className="num">Bitcoin</th>
              <th className="num">{baseName}</th>
              <th className="num">{t('cyc.colGiveback')}</th>
              <th>{t('cyc.colHalving')}</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map(({ year, periods }) => {
              const done = periods.filter(p => p.period.complete).length
              const running = periods.filter(p => p.period.partial === 'unfinished').length
              const short = periods.filter(p => p.period.partial === 'truncated').length
              return (
                <Fragment key={year}>
                  <tr className="cycle-table-group">
                    <td colSpan={5}>
                      {t(YEAR_LABEL_KEY[year])}
                      <span className="cycle-table-count">
                        {t('cyc.observations', { n: done })}
                        {running > 0 && t('cyc.running', { n: running })}
                        {short > 0 && t('cyc.truncated', { n: short })}
                      </span>
                    </td>
                  </tr>
                  {periods.map(({ period, btc: b, base: v }) => (
                    <tr key={period.id}>
                      <td>
                        <span className="cycle-table-term">{period.president}</span>
                        <span className="cycle-table-years">{period.label}</span>
                        {period.partial === 'unfinished' && (
                          <span className="cycle-table-partial">{t('cyc.tagRunning')}</span>
                        )}
                        {period.partial === 'truncated' && (
                          <span
                            className="cycle-table-partial"
                            title={t('cyc.tagTruncatedHelp', { date: btc[0]?.date ?? '' })}
                          >{t('cyc.tagTruncated')}</span>
                        )}
                      </td>
                      <td className="num">{pct(b.close)}</td>
                      <td className="num">{pct(v.close)}</td>
                      <td className="num">{pct(b.giveback)}</td>
                      <td>{period.hasHalving ? <span className="cycle-table-halving">{t('cyc.yes')}</span> : ''}</td>
                    </tr>
                  ))}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="cycle-table-note">
        <p>{tr('cyc.noteSample')}</p>
        <p>{tr('cyc.noteCutoff')}</p>
        <p>{t('cyc.noteConfound', { base: baseName })}</p>
      </div>
    </div>
  )
}

export const BitcoinCycleTable = memo(BitcoinCycleTableImpl)

function pct(v: number | null): ReactNode {
  if (v === null) return '–'
  const cls = v > 0 ? 'cycle-pos' : v < 0 ? 'cycle-neg' : ''
  return <span className={cls}>{v > 0 ? '+' : ''}{v.toFixed(1)}%</span>
}
