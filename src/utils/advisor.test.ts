import { describe, it, expect } from 'vitest'
import type { PricePoint } from '../types'
import {
  ADVISOR_CANDIDATES,
  RISK_PARAMS,
  advisorFundIds,
  buildAdvice,
  chooseDeployment,
  sampleQuality,
  trimToCommonStart,
  type AdvisorInput,
} from './advisor'
import type { LSvsDCAScenario } from './lsVsDca'
import { generateSavingsSeries, savingsAssetId } from './savingsAsset'

// ── Dữ liệu giả lập tất định ────────────────────────────────────────────────

function rng(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

function isoDay(d: Date): string {
  return d.toISOString().substring(0, 10)
}

/** Chuỗi giá hàng ngày, drift và độ lệch theo năm. */
function series(from: string, to: string, annualDrift: number, annualVol: number, seed: number): PricePoint[] {
  const next = rng(seed)
  const out: PricePoint[] = []
  let price = 100
  for (let t = new Date(from + 'T00:00:00Z').getTime(); t <= new Date(to + 'T00:00:00Z').getTime(); t += 86400000) {
    const z = (next() + next() + next() + next() - 2) * Math.sqrt(3) // xấp xỉ chuẩn
    price *= Math.exp(annualDrift / 365 + (annualVol / Math.sqrt(365)) * z)
    out.push({ date: isoDay(new Date(t)), price })
  }
  return out
}

function marketPrices(from = '2012-01-01', to = '2024-12-31'): Map<string, PricePoint[]> {
  return new Map<string, PricePoint[]>([
    ['DCDS', series(from, to, 0.11, 0.24, 1)],
    ['E1VFVN30', series('2013-06-01', to, 0.10, 0.26, 2)], // ra đời muộn hơn
    ['DCBF', series(from, to, 0.055, 0.02, 3)],
    ['VCBFTBF', series(from, to, 0.08, 0.10, 4)],
    [savingsAssetId(6), generateSavingsSeries(6, from, to)],
  ])
}

function baseInput(over: Partial<AdvisorInput> = {}): AdvisorInput {
  return {
    prices: marketPrices(),
    horizonYears: 3,
    risk: 'balanced',
    stagingMonths: 6,
    ...over,
  }
}

// ── Chọn cách xuống tiền, trên kịch bản dựng tay có đáp án biết trước ───────

/** Giá tăng đều hàng tháng: luôn ở đỉnh, tức dải "sát đỉnh". */
function risingPath(months = 120): PricePoint[] {
  const out: PricePoint[] = []
  for (let i = 0; i < months; i++) {
    const y = 2015 + Math.floor(i / 12)
    const m = (i % 12) + 1
    out.push({ date: `${y}-${String(m).padStart(2, '0')}-15`, price: 100 * Math.pow(1.01, i) })
  }
  return out
}

/** 15 kịch bản tốt (LS 1.4, DCA 1.25) và 5 kịch bản xấu (LS 0.6, DCA 0.85), cách nhau 4 tháng. */
function skewedScenarios(path: PricePoint[]): LSvsDCAScenario[] {
  const out: LSvsDCAScenario[] = []
  for (let i = 0; i < 20; i++) {
    const bad = i % 4 === 3
    const ls = bad ? 0.6 : 1.4
    const dca = bad ? 0.85 : 1.25
    out.push({ startDate: path[i * 4]!.date, lsGrowth: ls, dcaGrowth: dca, diff: ls - dca })
  }
  return out
}

function deployInput(risk: AdvisorInput['risk'], horizonYears = 1): AdvisorInput {
  return { prices: new Map(), horizonYears, risk, stagingMonths: 6 }
}

describe('chooseDeployment', () => {
  it('xuống một lần khi đầu tư một lần thắng ở mọi kịch bản', () => {
    const path = risingPath()
    const scenarios: LSvsDCAScenario[] = Array.from({ length: 20 }, (_, i) => ({
      startDate: path[i * 4]!.date, lsGrowth: 1.5, dcaGrowth: 1.3, diff: 0.2,
    }))
    const deploy = chooseDeployment(scenarios, path, deployInput('conservative'))
    expect(deploy.best.lumpFraction).toBe(1)
    expect(deploy.lsWinRate).toBe(1)
  })

  it('người sợ rủi ro thì chia đợt khi đuôi xấu của một lần đủ tệ', () => {
    const path = risingPath()
    const deploy = chooseDeployment(skewedScenarios(path), path, deployInput('conservative'))
    expect(deploy.best.lumpFraction).toBe(0)
  })

  it('người chấp nhận rủi ro thì vẫn xuống một lần trên cùng dữ liệu', () => {
    const path = risingPath()
    const deploy = chooseDeployment(skewedScenarios(path), path, deployInput('aggressive'))
    expect(deploy.best.lumpFraction).toBe(1)
  })

  it('luôn trả đủ năm mức chia, từ một lần tới chia đợt hoàn toàn', () => {
    const path = risingPath()
    const deploy = chooseDeployment(skewedScenarios(path), path, deployInput('balanced'))
    expect(deploy.options.map(o => o.lumpFraction)).toEqual([1, 0.75, 0.5, 0.25, 0])
  })

  it('mức 100% một lần và 0% chia đợt khớp đúng trung vị của từng chiến lược', () => {
    const path = risingPath()
    const deploy = chooseDeployment(skewedScenarios(path), path, deployInput('balanced'))
    const lump = deploy.options.find(o => o.lumpFraction === 1)!
    const staged = deploy.options.find(o => o.lumpFraction === 0)!
    expect(lump.medianGrowth).toBeCloseTo(1.4, 10)
    expect(staged.medianGrowth).toBeCloseTo(1.25, 10)
    expect(lump.lossRate).toBeCloseTo(0.25, 10) // 5 trên 20 kịch bản lỗ
  })

  it('dùng các lần vào lệnh cùng trạng thái khi đủ số quãng độc lập', () => {
    const path = risingPath()
    const deploy = chooseDeployment(skewedScenarios(path), path, deployInput('balanced'))
    expect(deploy.basis).toBe('similar')
    expect(deploy.basisEpisodes).toBeGreaterThanOrEqual(3)
    expect(deploy.currentDrawdown).toBe(0)
  })

  it('quay về toàn bộ dữ liệu khi hôm nay ở trạng thái chưa từng đủ mẫu', () => {
    const rising = risingPath(100)
    // Giá sập 45% ở mấy điểm cuối: hôm nay ở dải -40% đến -50%, mà mọi kịch bản
    // lịch sử đều bắt đầu lúc giá đang ở đỉnh.
    const path = [
      ...rising,
      { date: '2023-05-15', price: rising[rising.length - 1]!.price * 0.55 },
    ]
    const deploy = chooseDeployment(skewedScenarios(rising), path, deployInput('balanced'))
    expect(deploy.basis).toBe('all')
    expect(deploy.basisScenarios).toBe(20)
    expect(deploy.currentDrawdown).toBeCloseTo(-0.45, 5)
  })
})

// ── Cắt về ngày chung và cỡ mẫu ─────────────────────────────────────────────

describe('trimToCommonStart', () => {
  it('cắt mọi chuỗi về ngày bắt đầu muộn nhất', () => {
    const trimmed = trimToCommonStart(marketPrices(), advisorFundIds())
    const starts = [...trimmed.values()].map(s => s[0]!.date)
    expect(new Set(starts).size).toBe(1)
    expect(starts[0]! >= '2013-06-01').toBe(true)
  })

  it('trả rỗng khi thiếu dữ liệu của một quỹ cần dùng', () => {
    const prices = marketPrices()
    prices.delete('DCBF')
    expect(trimToCommonStart(prices, advisorFundIds()).size).toBe(0)
  })
})

describe('sampleQuality', () => {
  it('theo đúng ngưỡng quãng độc lập của tab LS vs DCA', () => {
    expect(sampleQuality(0)).toBe('insufficient')
    expect(sampleQuality(2)).toBe('insufficient')
    expect(sampleQuality(3)).toBe('thin')
    expect(sampleQuality(4)).toBe('thin')
    expect(sampleQuality(5)).toBe('ok')
  })
})

// ── Toàn bộ quy trình ───────────────────────────────────────────────────────

describe('buildAdvice', () => {
  it('đề xuất một danh mục đủ điều kiện rủi ro, xếp đủ điều kiện lên trước', () => {
    const advice = buildAdvice(baseInput({ risk: 'conservative' }))
    expect(advice.status).toBe('ok')
    expect(advice.best).not.toBeNull()
    expect(advice.best!.maxDrawdown).toBeLessThanOrEqual(RISK_PARAMS.conservative.maxDrawdown)
    expect(advice.best!.eligible).toBe(true)

    const flags = advice.evaluations.map(e => e.eligible)
    const firstIneligible = flags.indexOf(false)
    if (firstIneligible >= 0) expect(flags.slice(firstIneligible).every(f => !f)).toBe(true)
  })

  it('khẩu vị rủi ro cao hơn thì lợi suất điển hình của danh mục chọn không thấp hơn', () => {
    const cons = buildAdvice(baseInput({ risk: 'conservative' })).best!
    const aggr = buildAdvice(baseInput({ risk: 'aggressive' })).best!
    expect(aggr.medianAnnualized).toBeGreaterThanOrEqual(cons.medianAnnualized)
    expect(aggr.maxDrawdown).toBeGreaterThanOrEqual(cons.maxDrawdown)
  })

  it('so mọi danh mục trên cùng một cửa sổ dữ liệu', () => {
    const advice = buildAdvice(baseInput())
    expect(advice.commonStart! >= '2013-06-01').toBe(true)
    expect(advice.commonEnd).toBe('2024-12-31')
  })

  it('kèm khuyến nghị xuống tiền cho danh mục được chọn', () => {
    const advice = buildAdvice(baseInput())
    expect(advice.deploy).not.toBeNull()
    expect(advice.deploy!.stagingMonths).toBe(6)
    expect(LUMP_OPTIONS).toContain(advice.deploy!.best.lumpFraction)
  })

  it('báo thiếu dữ liệu thay vì đề xuất khi kỳ nắm giữ dài hơn cả lịch sử', () => {
    const short = marketPrices('2020-01-01', '2022-12-31')
    const advice = buildAdvice(baseInput({ prices: short, horizonYears: 10 }))
    expect(advice.status).toBe('insufficient-data')
    expect(advice.best).toBeNull()
    expect(advice.deploy).toBeNull()
  })

  it('báo thiếu dữ liệu khi chưa tải được giá quỹ nào', () => {
    expect(buildAdvice(baseInput({ prices: new Map() })).status).toBe('insufficient-data')
  })

  it('mọi danh mục ứng viên đều dùng quỹ có trong danh sách cần tải', () => {
    const ids = new Set(advisorFundIds())
    for (const c of ADVISOR_CANDIDATES) {
      for (const s of c.slots) expect(ids.has(s.fundId)).toBe(true)
      expect(c.slots.reduce((a, s) => a + s.weight, 0)).toBe(100)
    }
  })
})

const LUMP_OPTIONS = [1, 0.75, 0.5, 0.25, 0]
