import { useT, useTRich } from '../i18n'

export interface PortfolioStats {
  name: string
  color: string
  cumReturn: number
  cagrValue: number
  stdev: number
  /**
   * CAGR ÷ biến động. `null` khi danh mục gần như không biến động (vd 100%
   * tiết kiệm ngân hàng): chia cho gần-0 không ra "hiệu quả vô hạn" mà là
   * KHÔNG ĐỊNH NGHĨA ĐƯỢC. Sharpe sinh ra để so hai tài sản đều có rủi ro,
   * áp lên tài sản không rủi ro là dùng sai thước.
   */
  sharpe: number | null
  maxDD: number
  worstWeek: number    // negative return, e.g. -0.12 = -12% in the worst single week
  worstMonth: number   // negative return, worst 4-week rolling window
}

interface Props {
  stats: PortfolioStats[]
}

export function PerformanceTable({ stats }: Props) {
  const t = useT()
  const tr = useTRich()
  if (stats.length === 0) return null

  const bestCumReturn = Math.max(...stats.map(s => s.cumReturn))
  const bestCagr     = Math.max(...stats.map(s => s.cagrValue))
  const bestStdev    = Math.min(...stats.map(s => s.stdev))   // thấp hơn = tốt hơn
  const bestMaxDD    = Math.max(...stats.map(s => s.maxDD))   // gần 0 nhất = tốt hơn

  // Chỉ xếp hạng Sharpe giữa các danh mục THỰC SỰ có rủi ro. Danh mục không
  // biến động (sharpe = null) bị loại khỏi cuộc đua, nếu không nó luôn "thắng"
  // bằng một con số vô nghĩa.
  const sharpeValues = stats.map(s => s.sharpe).filter((v): v is number => v !== null)
  const bestSharpe = sharpeValues.length > 0 ? Math.max(...sharpeValues) : null

  const isBest = (val: number, best: number) => Math.abs(val - best) < 1e-9
  const isBestSharpe = (val: number | null) =>
    val !== null && bestSharpe !== null && isBest(val, bestSharpe)

  const winnerCagr   = stats.find(s => isBest(s.cagrValue, bestCagr))
  const winnerSharpe = stats.find(s => isBestSharpe(s.sharpe))
  const winnerDD     = stats.find(s => isBest(s.maxDD, bestMaxDD))

  return (
    <div className="perf-table-container">
      <div className="chart-header">
        <h3>{t('perf.title')}</h3>
        <span
          className="chart-tooltip-icon"
          title={t('perf.help')}
        >?</span>
      </div>
      <div className="perf-table-wrap">
        <table className="perf-table">
          <thead>
            <tr>
              <th className="perf-th-name">{t('perf.col.name')}</th>
              <th title={t('perf.col.cumReturnHelp')}>{t('perf.col.cumReturn')}</th>
              <th title={t('perf.col.cagrHelp')}>{t('perf.col.cagr')}</th>
              <th title={t('perf.col.stdevHelp')}>{t('perf.col.stdev')}</th>
              <th title={t('perf.col.sharpeHelp')}>{t('perf.col.sharpe')}</th>
              <th title={t('perf.col.maxDDHelp')}>{t('perf.col.maxDD')}</th>
            </tr>
          </thead>
          <tbody>
            {stats.map(s => (
              <tr key={s.name}>
                <td className="perf-td-name">
                  <span className="perf-dot" style={{ background: s.color }} />
                  {s.name}
                </td>
                <td className={cls(s.cumReturn >= 0 ? 'perf-pos' : 'perf-neg', isBest(s.cumReturn, bestCumReturn) && 'perf-best')}>
                  {fmtPct(s.cumReturn)}
                </td>
                <td className={cls(s.cagrValue >= 0 ? 'perf-pos' : 'perf-neg', isBest(s.cagrValue, bestCagr) && 'perf-best')}>
                  {fmtPct(s.cagrValue)}
                </td>
                <td className={cls('perf-neutral', isBest(s.stdev, bestStdev) && 'perf-best')}>
                  {fmtPct(s.stdev)}
                </td>
                <td
                  className={cls('perf-neutral', isBestSharpe(s.sharpe) && 'perf-best')}
                  title={s.sharpe === null
                    ? t('perf.sharpeNA')
                    : undefined}
                >
                  {s.sharpe === null ? '—' : s.sharpe.toFixed(2)}
                </td>
                <td className={cls('perf-neg', isBest(s.maxDD, bestMaxDD) && 'perf-best')}>
                  {fmtPct(s.maxDD)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {winnerCagr && winnerSharpe && winnerSharpe.sharpe !== null && winnerDD && stats.length > 1 && (
        <div className="chart-takeaway chart-takeaway--blue">
          <span className="chart-takeaway-icon">🏆</span>
          <div className="chart-takeaway-body">
            {winnerCagr.name === winnerSharpe.name
              ? tr('perf.takeaway.sweep', {
                  name: winnerCagr.name,
                  cagr: fmtPct(winnerCagr.cagrValue),
                  sharpe: winnerSharpe.sharpe.toFixed(2),
                  ddName: winnerDD.name,
                  dd: fmtPct(winnerDD.maxDD),
                })
              : tr('perf.takeaway.split', {
                  cagrName: winnerCagr.name,
                  cagr: fmtPct(winnerCagr.cagrValue),
                  sharpeName: winnerSharpe.name,
                  sharpe: winnerSharpe.sharpe.toFixed(2),
                  ddName: winnerDD.name,
                  dd: fmtPct(winnerDD.maxDD),
                })}
          </div>
        </div>
      )}
    </div>
  )
}

function fmtPct(value: number): string {
  return (value * 100).toFixed(2) + '%'
}

function cls(...args: (string | false | undefined | null)[]): string {
  return args.filter(Boolean).join(' ')
}
