/**
 * DataQualityBlock: minh bạch giới hạn của data trước khi user ra quyết định.
 *
 * Vị trí: đầu tab Compare, ngay sau DateRangePicker, trước mọi chart và số liệu.
 *
 * Block này trả lời 3 câu hỏi retail VN nên hỏi trước khi tin vào "CAGR 13.6%":
 *   1. Data cập nhật tới ngày nào? (freshness)
 *   2. Các quỹ có cùng khoảng thời gian không, hay có quỹ mới hơn? (coverage)
 *   3. Có tuần nào bị thiếu giá không? (gaps)
 *
 * Nếu tất cả đều sạch: block hiển thị ngắn gọn một dòng "xanh" và thu gọn.
 * Nếu có vấn đề: hiển thị warning chi tiết, từng quỹ có gì.
 */
import { useMemo, useState } from 'react'
import type { PricePoint } from '../types'
import { buildFundQualityReport, type FundQualityReport } from '../utils/dataQuality'
import { useT, useTRich } from '../i18n'

/**
 * Ngưỡng báo cam cho freshness.
 *
 * Data resample theo tuần, endDate = Thứ Sáu gần nhất. Trạng thái healthy
 * (CI chạy daily, fetch mỗi tối) có max daysStale ≈ 6 (user mở site Thứ Năm,
 * chưa có Thứ Sáu mới). Threshold 10 cho buffer 4 ngày, đủ nhạy để phát hiện
 * CI fail 4-5 ngày liên tục mà không báo nhầm ngày Tết hoặc holiday ngắn.
 */
const STALE_DAYS_THRESHOLD = 10

interface Props {
  fundIds: string[]
  fundData: Map<string, PricePoint[]>
  colors: string[]
  dateFrom: string | null
  dateTo: string | null
  /** Start/end thực tế đã aligned; khi undefined có thể chưa ready */
  alignedStart?: string
  alignedEnd?: string
}

export function DataQualityBlock({
  fundIds,
  fundData,
  colors,
  dateFrom,
  dateTo,
  alignedStart,
  alignedEnd,
}: Props) {
  const t = useT()
  const tr = useTRich()
  const [expanded, setExpanded] = useState(false)

  const reports = useMemo<FundQualityReport[]>(() => {
    const out: FundQualityReport[] = []
    for (const id of fundIds) {
      const weekly = fundData.get(id)
      if (!weekly) continue
      const r = buildFundQualityReport(id, weekly, dateFrom, dateTo)
      if (r) out.push(r)
    }
    return out
  }, [fundIds, fundData, dateFrom, dateTo])

  if (reports.length === 0) return null

  // Quỹ có endDate muộn nhất — con số "Cập nhật tới" và "(N ngày trước)" phải
  // lấy từ CÙNG một quỹ. Trước đây lastUpdated lấy max endDate, còn stalestDays
  // lấy max daysStale của mọi quỹ — hai quỹ lệch ngày thì ra "Cập nhật tới
  // 14/08 (1 ngày trước)" dù 14/08 là hôm nay, "1 ngày trước" là của quỹ kia.
  const freshest = reports.reduce(
    (max, r) => (r.endDate > max.endDate ? r : max),
    reports[0]!,
  )
  const lastUpdated = freshest.endDate
  // Max daysStale vẫn dùng để BẬT cảnh báo (có quỹ nào ngừng cập nhật lâu không),
  // nhưng không dùng để gắn vào con số "ngày trước".
  const stalestDays = Math.max(...reports.map(r => r.daysStale))
  const anyGaps = reports.some(r => r.gaps.length > 0)
  const anyCoverageIssue = reports.some(
    r => r.startsAfterRequested || r.endsBeforeRequested,
  )
  const reportsWithIssues = reports.filter(
    r => r.gaps.length > 0 || r.startsAfterRequested || r.endsBeforeRequested,
  )
  const hasWarnings = anyGaps || anyCoverageIssue || stalestDays > STALE_DAYS_THRESHOLD

  // Compute total span for bar chart
  const allStarts = reports.map(r => new Date(r.startDate).getTime())
  const allEnds = reports.map(r => new Date(r.endDate).getTime())
  const globalMin = Math.min(...allStarts, dateFrom ? new Date(dateFrom).getTime() : Infinity)
  const globalMax = Math.max(...allEnds, dateTo ? new Date(dateTo).getTime() : 0)
  const span = globalMax - globalMin

  return (
    <div className={`dq-block ${hasWarnings ? 'dq-block--warn' : 'dq-block--ok'}`}>
      <button
        className="dq-header"
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
      >
        <span className={`dq-dot ${hasWarnings ? 'dq-dot--warn' : 'dq-dot--ok'}`} />
        <span className="dq-header-main">
          {hasWarnings ? (
            <>
              <strong>{t('dq.warning')}</strong>
              <span className="dq-header-sub">
                {t('dq.updatedTo', { date: formatDate(lastUpdated) })}
                {freshest.daysStale > 0 ? t('dq.daysAgo', { n: freshest.daysStale }) : ''}
                {anyGaps ? t('dq.gapsFound') : ''}
                {anyCoverageIssue ? t('dq.coverageIssue') : ''}
              </span>
            </>
          ) : (
            <>
              <strong>{t('dq.ok')}</strong>
              <span className="dq-header-sub">
                {t('dq.updatedTo', { date: formatDate(lastUpdated) })}
                {freshest.daysStale > 0 ? t('dq.daysAgo', { n: freshest.daysStale }) : ''}
                {t('dq.noGaps')}
              </span>
            </>
          )}
        </span>
        <span className="dq-toggle">{t(expanded ? 'dq.collapse' : 'dq.expand')}</span>
      </button>

      {expanded && (
        <div className="dq-body">
          <p className="dq-intro">{t('dq.intro')}</p>

          <div className="dq-timelines">
            {reports.map((r, i) => {
              const color = colors[i % colors.length] ?? 'var(--color-primary)'
              return (
                <FundTimeline
                  key={r.id}
                  report={r}
                  color={color}
                  globalMin={globalMin}
                  span={span}
                  requestedFrom={dateFrom}
                  requestedTo={dateTo}
                />
              )
            })}
          </div>

          {alignedStart && alignedEnd && (
            <p className="dq-aligned">
              {tr('dq.alignedRange', { from: formatDate(alignedStart), to: formatDate(alignedEnd) })}
            </p>
          )}

          {reportsWithIssues.length > 0 && (
            <div className="dq-issues">
              <h4 className="dq-issues-title">{t('dq.issuesTitle')}</h4>
              {reportsWithIssues.map(r => (
                <FundIssueList
                  key={r.id}
                  report={r}
                  requestedFrom={dateFrom}
                  requestedTo={dateTo}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Timeline bar cho từng quỹ ─────────────────────────────

function FundTimeline({
  report,
  color,
  globalMin,
  span,
  requestedFrom,
  requestedTo,
}: {
  report: FundQualityReport
  color: string
  globalMin: number
  span: number
  requestedFrom: string | null
  requestedTo: string | null
}) {
  const t = useT()
  const start = new Date(report.startDate).getTime()
  const end = new Date(report.endDate).getTime()

  const leftPct = span > 0 ? ((start - globalMin) / span) * 100 : 0
  const widthPct = span > 0 ? ((end - start) / span) * 100 : 100

  // Requested window markers
  const reqFromT = requestedFrom ? new Date(requestedFrom).getTime() : null
  const reqToT = requestedTo ? new Date(requestedTo).getTime() : null
  const reqFromPct = reqFromT !== null && span > 0 ? ((reqFromT - globalMin) / span) * 100 : null
  const reqToPct = reqToT !== null && span > 0 ? ((reqToT - globalMin) / span) * 100 : null

  return (
    <div className="dq-timeline-row">
      <div className="dq-timeline-label">
        <span className="dq-swatch" style={{ background: color }} />
        <strong>{report.id}</strong>
      </div>
      <div className="dq-timeline-track">
        <div
          className="dq-timeline-bar"
          style={{
            left: `${leftPct}%`,
            width: `${widthPct}%`,
            background: color,
          }}
        />
        {report.gaps.map((g, i) => {
          const gStart = new Date(g.fromDate).getTime()
          const gEnd = new Date(g.toDate).getTime()
          const gLeftPct = span > 0 ? ((gStart - globalMin) / span) * 100 : 0
          const gWidthPct = span > 0 ? ((gEnd - gStart) / span) * 100 : 0
          return (
            <div
              key={i}
              className="dq-timeline-gap"
              style={{ left: `${gLeftPct}%`, width: `${gWidthPct}%` }}
              title={t('dq.gapTooltip', { weeks: g.weeksMissing, from: g.fromDate, to: g.toDate })}
            />
          )
        })}
        {reqFromPct !== null && (
          <div
            className="dq-timeline-marker"
            style={{ left: `${reqFromPct}%` }}
            title={t('dq.pickedFrom', { date: requestedFrom ?? '' })}
          />
        )}
        {reqToPct !== null && (
          <div
            className="dq-timeline-marker"
            style={{ left: `${reqToPct}%` }}
            title={t('dq.pickedTo', { date: requestedTo ?? '' })}
          />
        )}
      </div>
      <div className="dq-timeline-span">
        {formatDate(report.startDate)} → {formatDate(report.endDate)}
      </div>
    </div>
  )
}

// ─── Danh sách issue chi tiết ──────────────────────────────

function FundIssueList({
  report,
  requestedFrom,
  requestedTo,
}: {
  report: FundQualityReport
  requestedFrom: string | null
  requestedTo: string | null
}) {
  const tr = useTRich()
  return (
    <div className="dq-issue-card">
      <div className="dq-issue-head"><strong>{report.id}</strong></div>
      <ul className="dq-issue-list">
        {report.startsAfterRequested && requestedFrom && (
          <li>
            {tr('dq.startsLate', { start: formatDate(report.startDate), requested: formatDate(requestedFrom) })}
          </li>
        )}
        {report.endsBeforeRequested && requestedTo && (
          <li>
            {tr('dq.endsEarly', { end: formatDate(report.endDate), requested: formatDate(requestedTo) })}
          </li>
        )}
        {report.gaps.map((g, i) => (
          <li key={i}>
            {tr('dq.gap', { weeks: g.weeksMissing, from: formatDate(g.fromDate), to: formatDate(g.toDate) })}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Utils ────────────────────────────────────────────────

function formatDate(d: string): string {
  const parts = d.split('-')
  if (parts.length !== 3) return d
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}
