const H = { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' }
const feeKeys = (o, p = '') => Object.entries(o || {}).flatMap(([k, v]) =>
  /fee|Fee/.test(k) ? [[p + k, JSON.stringify(v).slice(0, 700)]] :
  (v && typeof v === 'object' && !Array.isArray(v) ? feeKeys(v, p + k + '.') : []))
const r = await fetch('https://api.fmarket.vn/res/products/filter', { method: 'POST', headers: H, body: JSON.stringify({
  types: ['NEW_FUND', 'TRADING_FUND'], issuerIds: [], sortOrder: 'DESC', sortField: 'navTo6Months', page: 1, pageSize: 400,
  isIpo: false, fundAssetTypes: [], bondRemainPeriods: [], searchField: '', isBuyByReward: false, thirdAppIds: [] }) })
const rows = (await r.json()).data?.rows ?? []
console.log('rows', rows.length, 'keys:', Object.keys(rows[0]).join(','))
console.log('FILTER fee keys', JSON.stringify(feeKeys(rows[0]), null, 1))
const abbf = rows.find(x => x.shortName === 'ABBF') ?? rows[0]
console.log('id', abbf.id, abbf.shortName)
for (const url of [`https://api.fmarket.vn/res/products/${abbf.id}`, `https://api.fmarket.vn/res/products/public/${abbf.id}`]) {
  try {
    const d = await fetch(url, { headers: H })
    const j = await d.json()
    const data = j.data ?? j
    console.log('DETAIL', url, d.status, 'keys:', Object.keys(data).join(','))
    console.log('DETAIL fee keys', JSON.stringify(feeKeys(data), null, 1))
  } catch (e) { console.log('DETAIL FAIL', url, String(e)) }
}
