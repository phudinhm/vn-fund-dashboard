#!/usr/bin/env node
/**
 * Kéo biểu phí từng quỹ (phí quản lý, phí thưởng hiệu quả, phí mua, phí bán theo
 * thời gian nắm giữ) từ chi tiết sản phẩm fmarket.
 *
 *   node scripts/fetch_fund_fees.mjs
 *
 * Ghi public/data/fund_fees.json theo mã quỹ. Mỗi quỹ một request chi tiết nên
 * chạy tuần tự có nghỉ ngắn, không dồn dập vào API.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { extractFees } from './fundFees.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '..', 'public', 'data', 'fund_fees.json')
const HEADERS = { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' }

const FILTER_BODY = {
  types: ['NEW_FUND', 'TRADING_FUND'], issuerIds: [], sortOrder: 'DESC', sortField: 'navTo6Months',
  page: 1, pageSize: 400, isIpo: false, fundAssetTypes: [], bondRemainPeriods: [],
  searchField: '', isBuyByReward: false, thirdAppIds: [],
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function main() {
  const resp = await fetch('https://api.fmarket.vn/res/products/filter', {
    method: 'POST', headers: HEADERS, body: JSON.stringify(FILTER_BODY),
  })
  if (!resp.ok) throw new Error(`Fmarket catalog API error: ${resp.status}`)
  const rows = (await resp.json()).data?.rows ?? []
  console.log(`📂 ${rows.length} sản phẩm`)

  const fees = []
  let failed = 0
  for (const row of rows) {
    const code = String(row.shortName || row.code || '').toUpperCase().trim()
    if (!code || !row.id) continue
    try {
      const r = await fetch(`https://api.fmarket.vn/res/products/${row.id}`, { headers: HEADERS })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const detail = (await r.json()).data
      if (!detail) throw new Error('no data')
      fees.push(extractFees(code, detail))
    } catch (e) {
      failed++
      console.log(`  ❌ ${code}: ${e.message}`)
    }
    await sleep(120)
  }

  fees.sort((a, b) => a.code.localeCompare(b.code))
  const withMgmt = fees.filter(f => f.management !== null).length
  const withSell = fees.filter(f => f.sell.length > 0).length
  console.log(`   phí quản lý: ${withMgmt}/${fees.length}, phí bán: ${withSell}/${fees.length}, lỗi: ${failed}`)

  // Cấu trúc fmarket đổi thì ô phí rỗng hàng loạt: lỗi lộ ra ở đây thay vì ghi file rỗng.
  if (fees.length < 20 || withMgmt === 0) {
    throw new Error('Quá ít quỹ có phí — fmarket có thể đã đổi cấu trúc, không ghi đè file')
  }
  fs.writeFileSync(OUT, JSON.stringify(fees, null, 1) + '\n')
  console.log(`✍️  Đã ghi fund_fees.json (${fees.length} quỹ)`)
  if (failed > 0) process.exitCode = 1
}

main().catch(err => { console.error('❌', err.message); process.exit(1) })
