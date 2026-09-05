#!/usr/bin/env node
/**
 * Soát xem dashboard đã có đủ quỹ mở trên fmarket chưa, và thêm quỹ còn thiếu.
 *
 *   node scripts/audit_fund_coverage.mjs            # chỉ báo cáo
 *   node scripts/audit_fund_coverage.mjs --write    # ghi quỹ thiếu vào metadata
 *
 * Chỉ cần thêm dòng metadata là đủ: update_nav.mjs thấy CSV chưa có thì kéo
 * toàn bộ lịch sử NAV của quỹ đó trong lần chạy kế tiếp.
 *
 * ETF, chỉ số, vàng và BTC không nằm trên fmarket nên không thuộc phạm vi
 * script này — chúng đi qua scripts/update_vnstock.py và update_gold.mjs.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { diffCoverage, toMetadataEntry, serializeMetadata } from './fundCoverage.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const METADATA_FILE = path.join(__dirname, '..', 'public', 'data', 'fund_metadata.json')
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

async function fetchCatalog() {
  const resp = await fetch(FILTER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(FILTER_BODY),
  })
  if (!resp.ok) throw new Error(`Fmarket catalog API error: ${resp.status}`)
  const json = await resp.json()
  return json.data?.rows || json.data || []
}

async function main() {
  const write = process.argv.includes('--write')
  const metadata = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf-8'))
  const rows = await fetchCatalog()
  console.log(`📂 fmarket: ${rows.length} sản phẩm · dashboard: ${metadata.length} tài sản\n`)

  const { missing, unknown, extra } = diffCoverage(rows, metadata)

  if (missing.length === 0) console.log('✅ Không thiếu quỹ mở nào so với fmarket.')
  else {
    console.log(`➕ Thiếu ${missing.length} quỹ:`)
    for (const f of missing) {
      console.log(`   ${f.code.padEnd(12)} ${f.type.padEnd(12)} ${f.issuer.padEnd(24)} ${f.name}`)
    }
  }

  if (unknown.length > 0) {
    console.log(`\n⚠️  ${unknown.length} quỹ có loại tài sản lạ — cần xếp loại tay:`)
    for (const f of unknown) console.log(`   ${f.code.padEnd(12)} loại="${f.assetType}" ${f.name}`)
  }

  if (extra.length > 0) {
    console.log(`\nℹ️  ${extra.length} mã trong dashboard không có trên fmarket`)
    console.log('   (ETF, chỉ số, vàng, BTC, TCBF/TCEF là bình thường; quỹ mở lạ ở đây có thể đã đóng)')
    for (const f of extra) console.log(`   ${f.code.padEnd(16)} ${f.type}`)
  }

  if (!write) {
    if (missing.length > 0) console.log('\nChạy lại với --write để thêm các quỹ trên vào metadata.')
    return
  }
  if (missing.length === 0) return

  const merged = [...metadata, ...missing.map(toMetadataEntry)]
  fs.writeFileSync(METADATA_FILE, serializeMetadata(merged))
  console.log(`\n✍️  Đã thêm ${missing.length} quỹ vào fund_metadata.json.`)
  console.log('   Lần chạy update_nav.mjs kế tiếp sẽ kéo toàn bộ lịch sử NAV cho chúng.')
}

main().catch(err => {
  console.error('❌', err.message)
  process.exit(1)
})
