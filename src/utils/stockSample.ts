/**
 * Kịch bản MINH HOẠ cho chế độ "tự nhập" của tab DCA cổ phiếu: một chuỗi giá
 * giả lập (không phải mã thật) kèm đủ 3 loại sự kiện, để người dùng thấy đúng
 * định dạng cần dán vào. Giá tại ngày ex đã bị trừ đúng theo sự kiện, như giá
 * đóng cửa thật, nên sổ tài khoản chạy nhất quán.
 */
export interface SampleScenario {
  csv: string
  events: string
}

function nextTradingDay(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

export function buildSampleScenario(): SampleScenario {
  const cashEx1 = nextTradingDay('2023-06-20')
  const cashPay1 = nextTradingDay('2023-07-05')
  const stockEx = nextTradingDay('2024-01-10')
  const cashEx2 = nextTradingDay('2024-06-18')
  const cashPay2 = nextTradingDay('2024-07-03')
  const rightsEx = nextTradingDay('2024-09-10')
  const CASH = 1000
  const STOCK_RATIO = 0.1
  const RIGHTS_RATIO = 0.2
  const RIGHTS_PRICE = 20000

  let seed = 20240101
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }

  const rows: string[] = ['date,price']
  const d = new Date('2023-01-02T00:00:00Z')
  let price = 50000
  for (let i = 0; i < 760; i++) {
    const iso = d.toISOString().slice(0, 10)
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) {
      if (rows.length > 1) price *= 1 + (rand() - 0.47) * 0.03
      if (iso === cashEx1 || iso === cashEx2) price -= CASH
      if (iso === stockEx) price /= 1 + STOCK_RATIO
      if (iso === rightsEx) price = (price + RIGHTS_RATIO * RIGHTS_PRICE) / (1 + RIGHTS_RATIO)
      price = Math.max(price, 10000)
      rows.push(`${iso},${Math.round(price / 10) * 10}`)
    }
    d.setUTCDate(d.getUTCDate() + 1)
  }

  const events = [
    '# cổ tức tiền mặt: <ngày ex> [<ngày nhận>] <VND/cp>',
    `cash ${cashEx1} ${cashPay1} ${CASH}`,
    '# cổ tức bằng cổ phiếu: <ngày ex> <tỷ lệ>',
    `stock ${stockEx} 10%`,
    `cash ${cashEx2} ${cashPay2} ${CASH}`,
    '# quyền mua: <ngày ex> <tỷ lệ> <giá phát hành>',
    `rights ${rightsEx} 20% ${RIGHTS_PRICE}`,
  ].join('\n')

  return { csv: rows.join('\n'), events }
}
