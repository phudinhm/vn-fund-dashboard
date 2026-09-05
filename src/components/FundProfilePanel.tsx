import { memo, useMemo, useState } from 'react'
import type { FundMeta } from '../types'
import { useFundProfiles, findProfile, type FundProfile } from '../hooks/useFundProfiles'
import { fundHouse } from '../utils/fundHouse'
import { useT, useDecimal, numberLocale, type TranslationKey } from '../i18n'
import { useLanguage } from '../hooks/useLanguage'

interface Props {
  funds: FundMeta[]
}

/**
 * Loại quỹ fmarket trả về bằng tiếng Việt. Bản tiếng Anh dùng lại đúng nhãn
 * nhóm quỹ của bộ lọc, để cùng một loại không hiện ra hai cách gọi khác nhau
 * ở hai chỗ trong app.
 */
const FUND_TYPE_KEY: Record<string, TranslationKey> = {
  'Quỹ cổ phiếu': 'category.mutual_fund',
  'Quỹ trái phiếu': 'category.bond',
  'Quỹ cân bằng': 'category.balanced',
}

/**
 * Hồ sơ quỹ và công ty quản lý.
 *
 * Dữ liệu do scripts/fetch_fund_profiles.mjs kéo từ fmarket, KHÔNG viết tay:
 * phí quản lý và ngày thành lập là số liệu tài chính, chép tay thì sai lúc nào
 * không ai biết.
 *
 * Tên hiển thị của quỹ lấy từ fund_metadata.json chứ không lấy tên fmarket, vì
 * fmarket viết hoa toàn bộ và đôi chỗ còn là tên cũ trước khi quỹ đổi tên. Tên
 * đăng ký của fmarket vẫn hiện bên dưới để đối chiếu.
 */
function FundProfilePanelImpl({ funds }: Props) {
  const t = useT()
  const dec = useDecimal()
  const { language } = useLanguage()
  const { profiles, houses, loading } = useFundProfiles()
  const [openHouse, setOpenHouse] = useState<string | null>(null)

  const nameById = useMemo(
    () => new Map(funds.map(f => [f.id.toUpperCase(), f.name_vi])),
    [funds],
  )

  if (loading) return <div className="chart-container">{t('profile.loading')}</div>

  if (houses.length === 0) {
    return (
      <div className="chart-container">
        <div className="chart-header"><h3>{t('profile.title')}</h3></div>
        <p className="dca-note">{t('profile.notPublished')}</p>
      </div>
    )
  }

  const fmtPct = (v: number | null) => (v === null ? '—' : `${dec(v, 2)}%`)
  const fmtDate = (d: string | null) => {
    if (!d) return '—'
    const [y, m, day] = d.split('-')
    return language === 'vi' ? `${day}/${m}/${y}` : d
  }

  return (
    <div className="profile-panel">
      <div className="chart-container">
        <div className="chart-header">
          <h3>{t('profile.title')}</h3>
          <span className="chart-tooltip-icon" title={t('profile.help')}>?</span>
        </div>
        <p className="dca-note">
          {t('profile.intro', { funds: profiles.size, houses: houses.length })}
        </p>
      </div>

      {houses.map(house => {
        const open = openHouse === house.name
        // Tên ngắn quen thuộc ("VinaCapital") dễ nhận ra hơn tên pháp nhân đầy
        // đủ; lấy từ fundHouse.ts qua bất kỳ quỹ nào của công ty đó.
        const shortName = house.funds.map(fundHouse).find(Boolean) ?? null
        return (
          <div key={house.name} className="chart-container profile-house">
            <button
              className="profile-house-head"
              onClick={() => setOpenHouse(open ? null : house.name)}
              aria-expanded={open}
            >
              <span className="profile-house-name">
                {shortName ?? house.name}
                {shortName && <span className="profile-house-legal">{house.name}</span>}
              </span>
              <span className="profile-house-stats">
                <span>{t('profile.fundCount', { n: house.fundCount })}</span>
                <span>{t('profile.medianFee', { fee: fmtPct(house.medianManagementFee) })}</span>
                <span>{t('profile.since', { date: fmtDate(house.earliestInception) })}</span>
                <span className="profile-caret">{open ? '▲' : '▼'}</span>
              </span>
            </button>

            {open && (
              <div className="perf-table-wrap">
                <table className="perf-table">
                  <thead>
                    <tr>
                      <th className="perf-th-name">{t('profile.col.fund')}</th>
                      <th>{t('profile.col.type')}</th>
                      <th className="num">{t('profile.col.fee')}</th>
                      <th className="num">{t('profile.col.inception')}</th>
                      <th className="num">{t('profile.col.nav')}</th>
                      <th className="num">{t('profile.col.r12m')}</th>
                      <th className="num">{t('profile.col.r36m')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {house.funds.map(code => {
                      const p = findProfile(profiles, code)
                      if (!p) return null
                      return (
                        <FundRow
                          key={code}
                          profile={p}
                          displayName={nameById.get(code.toUpperCase()) ?? p.name}
                          fmtPct={fmtPct}
                          fmtDate={fmtDate}
                          locale={numberLocale(language)}
                          typeLabel={
                            FUND_TYPE_KEY[p.fundType] ? t(FUND_TYPE_KEY[p.fundType]!) : p.fundType
                          }
                        />
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function FundRow({
  profile, displayName, fmtPct, fmtDate, locale, typeLabel,
}: {
  profile: FundProfile
  displayName: string
  fmtPct: (v: number | null) => string
  fmtDate: (d: string | null) => string
  locale: string
  typeLabel: string
}) {
  const sign = (v: number | null) =>
    v === null ? '' : v > 0 ? 'cycle-pos' : v < 0 ? 'cycle-neg' : ''
  return (
    <tr>
      <td className="perf-td-name">
        <span className="profile-fund-code">{profile.code}</span>
        <span className="profile-fund-name">{displayName}</span>
      </td>
      <td>{typeLabel || '—'}</td>
      <td className="num">{fmtPct(profile.managementFee)}</td>
      <td className="num">{fmtDate(profile.inceptionDate)}</td>
      <td className="num">
        {profile.nav === null ? '—' : Math.round(profile.nav).toLocaleString(locale)}
      </td>
      <td className={`num ${sign(profile.returns.m12)}`}>{fmtPct(profile.returns.m12)}</td>
      <td className={`num ${sign(profile.returns.m36)}`}>{fmtPct(profile.returns.m36)}</td>
    </tr>
  )
}

export const FundProfilePanel = memo(FundProfilePanelImpl)
