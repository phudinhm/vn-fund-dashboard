import { beforeAll, describe, expect, it, vi } from 'vitest'
import { render, screen, renderHook, act } from '@testing-library/react'
import { DcaHistoricalPercentileBlock } from './DcaHistoricalPercentileBlock'
import { useLanguage } from '../hooks/useLanguage'

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
  // Nhãn đọc qua useT() (store ngôn ngữ toàn cục): ghim tiếng Việt để test
  // không phụ thuộc ngôn ngữ mặc định hiện tại của app.
  const { result } = renderHook(() => useLanguage())
  act(() => result.current.setLanguage('vi'))
})

describe('DcaHistoricalPercentileBlock', () => {
  it('keeps the block visible and disables every window when history is under one year', () => {
    render(<DcaHistoricalPercentileBlock portfolios={[portfolio('2025-01-01', '2025-06-01')]} />)

    expect(screen.getByRole('heading', { name: 'Hiệu suất lịch sử theo percentile' })).toBeInTheDocument()
    expect(screen.getByText('Khoảng dữ liệu đang chọn chưa đủ 1 năm. Dashboard giữ block này để bạn biết mốc nào chưa dùng được.')).toBeInTheDocument()
    for (const years of [1, 2, 3, 4, 5]) {
      expect(screen.getByRole('button', { name: `${years} năm` })).toBeDisabled()
    }
  })

  it('enables only historical windows covered by the selected data range', () => {
    render(<DcaHistoricalPercentileBlock portfolios={[portfolio('2020-01-01', '2022-01-02')]} />)

    expect(screen.getByRole('button', { name: '1 năm' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '2 năm' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '3 năm' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '4 năm' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '5 năm' })).toBeDisabled()
  })
})

function portfolio(startDate: string, endDate: string) {
  return {
    id: 'test',
    name: 'Danh mục thử',
    color: '#000000',
    cumulative: [
      { date: startDate, value: 0 },
      { date: endDate, value: 0.2 },
    ],
  }
}
