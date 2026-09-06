#!/usr/bin/env node
/**
 * Báo cáo những nhịp sụt giảm của E1VFVN30 chưa có sự kiện Wall of Worry nào
 * giải thích.
 *
 *   node scripts/audit_wall_of_worry.mjs [--depth 0.15]
 *
 * Script này KHÔNG tự thêm sự kiện. Nhãn, mô tả và nguồn phải do người viết —
 * đó là toàn bộ giá trị của khối này. Việc máy làm được là chỉ ra chỗ còn
 * thiếu, để danh sách không lặng lẽ cũ đi.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  parseEventDates, parsePriceCsv, findDrawdownEpisodes, uncoveredEpisodes,
} from './wallOfWorryCoverage.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const FUND = 'E1VFVN30' // chuỗi giá mà WallOfWorryPanel vẽ lên

const depthArg = process.argv.indexOf('--depth')
const MIN_DEPTH = depthArg > -1 ? Number(process.argv[depthArg + 1]) : 0.15

const prices = parsePriceCsv(fs.readFileSync(path.join(ROOT, 'public/data', `${FUND}.csv`), 'utf-8'))
const events = parseEventDates(
  fs.readFileSync(path.join(ROOT, 'src/utils/wallOfWorryEvents.ts'), 'utf-8'),
)

const episodes = findDrawdownEpisodes(prices, MIN_DEPTH)
const missing = uncoveredEpisodes(episodes, events)
const lastEvent = events[events.length - 1]
const lastPrice = prices[prices.length - 1]?.date

console.log(`📉 ${FUND}: ${prices.length} phiên, tới ${lastPrice}`)
console.log(`🏷️  ${events.length} sự kiện, mốc gần nhất ${lastEvent}`)
console.log(`   ${episodes.length} nhịp giảm từ ${(MIN_DEPTH * 100).toFixed(0)}% trở lên\n`)

if (missing.length === 0) {
  console.log('✅ Mọi nhịp giảm đáng kể đều đã có sự kiện giải thích.')
} else {
  console.log(`⚠️  ${missing.length} nhịp chưa có sự kiện nào:`)
  for (const m of missing) {
    const pct = (m.depth * 100).toFixed(1)
    const state = m.recovered ? 'đã hồi' : 'CHƯA HỒI'
    console.log(`   ${m.peakDate} → ${m.troughDate}  −${pct}%  (${state})`)
  }
  console.log('\nThêm sự kiện bằng tay vào src/utils/wallOfWorryEvents.ts, kèm nguồn.')
}
