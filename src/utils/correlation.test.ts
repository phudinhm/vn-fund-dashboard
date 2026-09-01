import { describe, it, expect } from 'vitest'
import { pearson, correlationMatrix, averageCorrelation } from './correlation'

describe('pearson', () => {
  it('gives 1 for a perfectly matching series', () => {
    expect(pearson([1, 2, 3, 4], [1, 2, 3, 4])).toBeCloseTo(1, 10)
  })

  it('gives 1 for a positive linear transform, not just an identical series', () => {
    // Tương quan đo NHỊP đi cùng nhau, không đo biên độ: gấp 3 lần rồi cộng 5
    // vẫn là cùng một nhịp.
    expect(pearson([1, 2, 3, 4], [8, 11, 14, 17])).toBeCloseTo(1, 10)
  })

  it('gives -1 for a perfectly opposite series', () => {
    expect(pearson([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1, 10)
  })

  it('gives ~0 for an uncorrelated series', () => {
    expect(pearson([1, -1, 1, -1], [1, 1, -1, -1])).toBeCloseTo(0, 10)
  })

  it('matches a hand-computed value', () => {
    // r = cov / (sd_a * sd_b) tính tay trên bộ số nhỏ này = 0.8
    const r = pearson([1, 2, 3, 4, 5], [2, 1, 4, 3, 5])
    expect(r).toBeCloseTo(0.8, 10)
  })

  it('returns null for a flat series instead of a bogus number', () => {
    // Tiết kiệm ngân hàng lãi cố định: độ lệch chuẩn 0 → hệ số không xác định.
    expect(pearson([1, 2, 3], [5, 5, 5])).toBeNull()
  })

  it('returns null when there are fewer than two points', () => {
    expect(pearson([1], [2])).toBeNull()
    expect(pearson([], [])).toBeNull()
  })

  it('stays within [-1, 1]', () => {
    const r = pearson([0.01, -0.02, 0.03, -0.015], [0.011, -0.019, 0.031, -0.014])
    expect(r).not.toBeNull()
    expect(r!).toBeLessThanOrEqual(1)
    expect(r!).toBeGreaterThanOrEqual(-1)
  })
})

describe('correlationMatrix', () => {
  const a = [1, 2, 3, 4]
  const b = [2, 4, 6, 8]   // giống nhịp a
  const c = [4, 3, 2, 1]   // ngược nhịp a

  it('puts 1 on the diagonal', () => {
    const m = correlationMatrix([a, b, c])
    expect(m[0]![0]).toBe(1)
    expect(m[1]![1]).toBe(1)
    expect(m[2]![2]).toBe(1)
  })

  it('is symmetric', () => {
    const m = correlationMatrix([a, b, c])
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(m[i]![j]).toBe(m[j]![i])
      }
    }
  })

  it('computes the expected pairwise values', () => {
    const m = correlationMatrix([a, b, c])
    expect(m[0]![1]!).toBeCloseTo(1, 10)
    expect(m[0]![2]!).toBeCloseTo(-1, 10)
  })

  it('handles a single series', () => {
    expect(correlationMatrix([a])).toEqual([[1]])
  })
})

describe('averageCorrelation', () => {
  it('averages a row excluding the asset itself', () => {
    // Bỏ đường chéo (luôn = 1), nếu tính vào thì quỹ nào cũng bị đẩy lên cao.
    const m: (number | null)[][] = [
      [1, 0.5, 0.9],
      [0.5, 1, 0.1],
      [0.9, 0.1, 1],
    ]
    expect(averageCorrelation(m, 0)).toBeCloseTo(0.7, 10)
    expect(averageCorrelation(m, 1)).toBeCloseTo(0.3, 10)
  })

  it('skips pairs that could not be computed', () => {
    const m: (number | null)[][] = [
      [1, null, 0.4],
      [null, 1, null],
      [0.4, null, 1],
    ]
    expect(averageCorrelation(m, 0)).toBeCloseTo(0.4, 10)
  })

  it('returns null when no pair is computable', () => {
    const m: (number | null)[][] = [[1, null], [null, 1]]
    expect(averageCorrelation(m, 0)).toBeNull()
  })
})
