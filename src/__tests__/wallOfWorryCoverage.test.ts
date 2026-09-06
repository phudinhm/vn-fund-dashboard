import { describe, it, expect } from 'vitest'
// @ts-expect-error — script thuần JS, không có khai báo kiểu
import { parseEventDates, parsePriceCsv, findDrawdownEpisodes, uncoveredEpisodes } from '../../scripts/wallOfWorryCoverage.mjs'

const series = (pairs: [string, number][]) => pairs.map(([date, price]) => ({ date, price }))

describe('parsePriceCsv', () => {
  it('đọc CSV giá và bỏ dòng hỏng', () => {
    const out = parsePriceCsv('date,price\n2024-01-01,100\nhong,abc\n2024-01-02,110\n')

    expect(out).toEqual([{ date: '2024-01-01', price: 100 }, { date: '2024-01-02', price: 110 }])
  })
})

describe('parseEventDates', () => {
  it('lấy ngày sự kiện từ nguồn TypeScript và sắp xếp', () => {
    const src = "{ date: '2020-03-23', label: x }, { date: '2018-02-05', label: y }"

    expect(parseEventDates(src)).toEqual(['2018-02-05', '2020-03-23'])
  })
})

describe('findDrawdownEpisodes', () => {
  it('bắt được nhịp giảm quá ngưỡng và ghi đúng đáy', () => {
    const eps = findDrawdownEpisodes(series([
      ['2024-01-01', 100], ['2024-02-01', 90], ['2024-03-01', 70], ['2024-04-01', 80], ['2024-05-01', 105],
    ]), 0.15)

    expect(eps).toHaveLength(1)
    expect(eps[0]).toMatchObject({ peakDate: '2024-01-01', troughDate: '2024-03-01', recovered: true })
    expect(eps[0].depth).toBeCloseTo(0.30, 5)
  })

  it('bỏ qua nhịp giảm nông hơn ngưỡng', () => {
    const eps = findDrawdownEpisodes(series([
      ['2024-01-01', 100], ['2024-02-01', 95], ['2024-03-01', 102],
    ]), 0.15)

    expect(eps).toEqual([])
  })

  it('vẫn trả về nhịp chưa hồi, đánh dấu recovered=false', () => {
    const eps = findDrawdownEpisodes(series([
      ['2024-01-01', 100], ['2024-02-01', 70],
    ]), 0.15)

    expect(eps[0]).toMatchObject({ recovered: false, troughDate: '2024-02-01' })
  })

  it('tách hai nhịp riêng khi giá đã hồi lên đỉnh mới giữa chừng', () => {
    const eps = findDrawdownEpisodes(series([
      ['2024-01-01', 100], ['2024-02-01', 70], ['2024-03-01', 120],
      ['2024-04-01', 80], ['2024-05-01', 130],
    ]), 0.15)

    expect(eps).toHaveLength(2)
    expect(eps.map((e: { peakDate: string }) => e.peakDate)).toEqual(['2024-01-01', '2024-03-01'])
  })
})

describe('uncoveredEpisodes', () => {
  const ep = [{ peakDate: '2024-01-01', troughDate: '2024-03-01', depth: 0.3, recovered: true }]

  it('coi là đã có sự kiện khi mốc nằm trong nhịp', () => {
    expect(uncoveredEpisodes(ep, ['2024-02-10'])).toEqual([])
  })

  it('chấp nhận sự kiện nổ ra hơi trước đỉnh, trong biên nới', () => {
    expect(uncoveredEpisodes(ep, ['2023-12-20'], 45)).toEqual([])
  })

  it('báo sót khi mọi sự kiện đều ở quá xa', () => {
    expect(uncoveredEpisodes(ep, ['2022-01-01', '2025-01-01'], 45)).toHaveLength(1)
  })

  it('không có sự kiện nào thì mọi nhịp đều bị báo sót', () => {
    expect(uncoveredEpisodes(ep, [])).toHaveLength(1)
  })
})
