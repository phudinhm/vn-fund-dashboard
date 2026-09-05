import { useState, useEffect } from 'react'

/**
 * Hồ sơ quỹ và hồ sơ công ty quản lý, sinh bởi scripts/fetch_fund_profiles.mjs
 * từ danh mục fmarket. Xem script đó để biết từng trường lấy ở đâu.
 *
 * Mọi số đều nullable vì fmarket bỏ trống thật: ngày thành lập chỉ có ở 50
 * trên 68 quỹ. Ô trống hiển thị thành gạch ngang, không phải số 0 giả.
 */
export interface FundReturns {
  m1: number | null
  m3: number | null
  m6: number | null
  m12: number | null
  m24: number | null
  m36: number | null
  annualized36m: number | null
  sinceInception: number | null
}

export interface FundProfile {
  code: string
  /** Tên đăng ký trên fmarket, viết hoa toàn bộ. Tên hiển thị lấy từ metadata. */
  name: string
  fundType: string
  /** Tên pháp nhân đầy đủ của công ty quản lý. */
  fundHouse: string
  /** Phí quản lý theo %/năm. */
  managementFee: number | null
  inceptionDate: string | null
  nav: number | null
  navUpdatedAt: string | null
  returns: FundReturns
  fmarketId: number | null
}

export interface FundHouseProfile {
  name: string
  fundCount: number
  funds: string[]
  earliestInception: string | null
  medianManagementFee: number | null
}

interface State {
  profiles: Map<string, FundProfile>
  houses: FundHouseProfile[]
  loading: boolean
}

const EMPTY: State = { profiles: new Map(), houses: [], loading: true }

/**
 * Tải hai file hồ sơ một lần cho cả ứng dụng.
 *
 * Thiếu file KHÔNG phải lỗi cần báo: hồ sơ do một workflow riêng sinh ra, và
 * bản build trước khi workflow đó chạy lần đầu vẫn phải dùng được. Khi đó
 * `profiles` rỗng và phần giao diện hồ sơ tự ẩn đi.
 */
export function useFundProfiles(): State {
  const [state, setState] = useState<State>(EMPTY)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [pRes, hRes] = await Promise.all([
          fetch('/data/fund_profiles.json'),
          fetch('/data/fund_houses.json'),
        ])
        if (!pRes.ok || !hRes.ok) throw new Error('profiles not published yet')
        const list: FundProfile[] = await pRes.json()
        const houses: FundHouseProfile[] = await hRes.json()
        if (cancelled) return
        setState({
          profiles: new Map(list.map(p => [p.code.toUpperCase(), p])),
          houses,
          loading: false,
        })
      } catch {
        if (!cancelled) setState({ profiles: new Map(), houses: [], loading: false })
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return state
}

/**
 * Mã quỹ trong metadata không có gạch nối, còn fmarket có ("VCBFFIF" và
 * "VCBF-FIF"). Tra hồ sơ phải bỏ qua khác biệt đó, nếu không sáu quỹ VCBF/SSI
 * sẽ hiện ra như thể không có hồ sơ.
 */
export function findProfile(
  profiles: Map<string, FundProfile>,
  fundId: string,
): FundProfile | null {
  const direct = profiles.get(fundId.toUpperCase())
  if (direct) return direct
  const canon = fundId.toUpperCase().replace(/[\s\-._]/g, '')
  for (const [key, value] of profiles) {
    if (key.replace(/[\s\-._]/g, '') === canon) return value
  }
  return null
}
