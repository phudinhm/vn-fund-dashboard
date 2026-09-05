#!/usr/bin/env node
/**
 * Kéo hồ sơ quỹ và hồ sơ công ty quản lý từ danh mục fmarket.
 *
 *   node scripts/fetch_fund_profiles.mjs           # ghi 2 file profile
 *   node scripts/fetch_fund_profiles.mjs --dump    # lưu thêm 1 bản ghi thô
 *
 * Ghi ra:
 *   public/data/fund_profiles.json   — theo mã quỹ
 *   public/data/fund_houses.json     — gom theo công ty quản lý
 *
 * --dump lưu một sản phẩm nguyên vẹn vào scratch để đối chiếu khi fmarket đổi
 * cấu trúc: lúc đó sửa fundProfile.mjs chứ không phải mò trong log CI.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { extractProfile, buildHouseProfiles } from './fundProfile.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'public', 'data')
const FILTER_URL = 'https://api.fmarket.vn/res/products/filter'

const FILTER_BODY = {
  types: ['NEW_FUND', 'TRADING_FUND'],
  issuerIds: [],
  sortOrder: 'DESC',
  sortField: 'navTo6Months',
  page: 1,
  pageSize: 400,
  isIpo: false,
  fundAssetTypes: [],
  bondRemainPeriods: [],
  searchField: '',
  isBuyByReward: false,
  thirdAppIds: [],
}

async function main() {
  const resp = await fetch(FILTER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(FILTER_BODY),
  })
  if (!resp.ok) throw new Error(`Fmarket catalog API error: ${resp.status}`)
  const json = await resp.json()
  const rows = json.data?.rows || json.data || []
  console.log(`📂 fmarket trả về ${rows.length} sản phẩm`)

  if (process.argv.includes('--dump') && rows.length > 0) {
    const out = path.join(DATA_DIR, '..', '..', 'fmarket_sample.json')
    fs.writeFileSync(out, JSON.stringify(rows[0], null, 2))
    console.log(`🔎 Đã lưu một bản ghi thô: ${out}`)
  }

  const profiles = rows.map(extractProfile).filter(Boolean)
  profiles.sort((a, b) => a.code.localeCompare(b.code))
  const houses = buildHouseProfiles(profiles)

  // Đếm ô thật sự có dữ liệu: nếu fmarket đổi tên trường, con số này tụt về 0
  // và lỗi lộ ra ngay thay vì âm thầm ghi ra một file toàn null.
  const withFee = profiles.filter(p => p.managementFee !== null).length
  const withInception = profiles.filter(p => p.inceptionDate !== null).length
  const withHouse = profiles.filter(p => p.fundHouse).length
  console.log(`   phí quản lý: ${withFee}/${profiles.length}`)
  console.log(`   ngày thành lập: ${withInception}/${profiles.length}`)
  console.log(`   công ty quản lý: ${withHouse}/${profiles.length} → ${houses.length} công ty`)

  if (profiles.length > 0 && withHouse === 0) {
    throw new Error('Không quỹ nào có công ty quản lý — fmarket có thể đã đổi cấu trúc, xem --dump')
  }

  fs.writeFileSync(path.join(DATA_DIR, 'fund_profiles.json'), JSON.stringify(profiles, null, 1) + '\n')
  fs.writeFileSync(path.join(DATA_DIR, 'fund_houses.json'), JSON.stringify(houses, null, 1) + '\n')
  console.log(`✍️  Đã ghi fund_profiles.json (${profiles.length}) và fund_houses.json (${houses.length})`)
}

main().catch(err => {
  console.error('❌', err.message)
  process.exit(1)
})
