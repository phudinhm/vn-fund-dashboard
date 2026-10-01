const H = { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' }
const r = await fetch('https://api.fmarket.vn/res/products/filter', { method: 'POST', headers: H, body: JSON.stringify({
  types: ['NEW_FUND', 'TRADING_FUND'], issuerIds: [], sortOrder: 'DESC', sortField: 'navTo6Months', page: 1, pageSize: 400,
  isIpo: false, fundAssetTypes: [], bondRemainPeriods: [], searchField: '', isBuyByReward: false, thirdAppIds: [] }) })
const rows = (await r.json()).data?.rows ?? []
for (const code of ['ABBF', 'DCDS', 'VESAF', 'SSISCA', 'DCBF']) {
  const row = rows.find(x => x.shortName === code)
  if (!row) { console.log(code, 'not in catalog'); continue }
  const j = await (await fetch(`https://api.fmarket.vn/res/products/${row.id}`, { headers: H })).json()
  const d = j.data
  const f = x => `${x.type} ${x.beginRelationalOperator?.code ?? ''}${x.beginVolume}..${x.endRelationalOperator?.code ?? ''}${x.endVolume} fee=${x.fee} byDay=${x.isUnitByDay} prog=${x.productProgram?.scheme?.code}/${x.productProgram?.name}`
  console.log('==', code, 'mgmt', d.managementFee, 'perf', d.performanceFee, 'avgAnnual', d.avgAnnualReturn)
  console.log(' FEE:', (d.productFeeList || []).map(f).join(' | '))
  console.log(' SIP:', (d.productFeeSipList || []).map(f).join(' | '))
  console.log(' misc: buyMinValue', d.buyMinValue, 'sellMinValue', d.sellMinValue, 'holdingMin', d.holdingMin, 'fundType', d.dataFundAssetType?.name, 'note', String(d.fundNote ?? '').slice(0, 200))
}
