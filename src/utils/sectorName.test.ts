import { describe, it, expect } from 'vitest'
import { sectorName } from './sectorName'

describe('sectorName', () => {
  it('leaves Vietnamese untouched', () => {
    expect(sectorName('Ngân hàng', 'vi')).toBe('Ngân hàng')
  })

  it('translates the common sectors', () => {
    expect(sectorName('Ngân hàng', 'en')).toBe('Banking')
    expect(sectorName('Chứng khoán', 'en')).toBe('Securities')
  })

  it('folds the spelling variants of one sector onto one label', () => {
    // Nguồn dữ liệu viết ngành bất động sản theo hai kiểu.
    expect(sectorName('BĐS', 'en')).toBe(sectorName('Bất động sản', 'en'))
    // Và viết tắt "SX" hoặc đầy đủ "Sản xuất".
    expect(sectorName('SX Nhựa - Hóa chất', 'en')).toBe(sectorName('Sản xuất Nhựa - Hóa chất', 'en'))
    expect(sectorName('Vận tải - kho bãi', 'en')).toBe(sectorName('Vận tải - Kho bãi', 'en'))
  })

  it('tolerates surrounding whitespace from the CSV', () => {
    expect(sectorName('  Ngân hàng ', 'en')).toBe('Banking')
  })

  it('passes an unknown sector through rather than dropping it', () => {
    // Nguồn thêm ngành mới thì thà đọc tiếng Việt còn hơn mất thông tin.
    expect(sectorName('Ngành hoàn toàn mới', 'en')).toBe('Ngành hoàn toàn mới')
  })
})
