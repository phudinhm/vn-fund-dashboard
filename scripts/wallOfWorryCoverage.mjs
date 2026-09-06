/**
 * Soát xem danh sách Wall of Worry có bỏ sót nhịp sụt giảm nào không.
 *
 * KHÔNG sinh ra sự kiện. Nhãn, mô tả và nguồn của một sự kiện là phần biên
 * tập — máy viết hộ thì thành bịa lịch sử, mà đó đúng là thứ khối này có giá
 * trị. Cái tự động hoá được là câu hỏi "đã sót nhịp nào chưa": mức giảm tính
 * từ chuỗi giá, nên biết chắc.
 *
 * Tách phần thuần khỏi script gọi I/O để kiểm thử được.
 */

/** Ngày của mọi sự kiện trong wallOfWorryEvents.ts. */
export function parseEventDates(tsSource) {
  return [...tsSource.matchAll(/date:\s*'(\d{4}-\d{2}-\d{2})'/g)].map(m => m[1]).sort()
}

/** "date,price" thành [{date, price}], bỏ dòng hỏng. */
export function parsePriceCsv(text) {
  return text.trim().split('\n').slice(1)
    .map(line => {
      const [date, raw] = line.split(',')
      const price = Number(raw)
      return date && Number.isFinite(price) ? { date, price } : null
    })
    .filter(Boolean)
}

/**
 * Các nhịp giảm sâu ít nhất `minDepth` (0.15 = 15%) so với đỉnh chạy.
 *
 * Một nhịp mở khi giá rơi khỏi đỉnh quá ngưỡng, và đóng khi giá lấy lại đỉnh
 * cũ. Nhịp chưa hồi vẫn được trả về, đánh dấu recovered=false — nhịp đang diễn
 * ra mới là nhịp đáng chú ý nhất, bỏ qua thì vô nghĩa.
 */
export function findDrawdownEpisodes(points, minDepth = 0.15) {
  const episodes = []
  let peak = null
  let current = null

  for (const p of points) {
    if (!peak || p.price > peak.price) {
      if (current) { current.recovered = true; episodes.push(current); current = null }
      peak = p
      continue
    }
    const depth = 1 - p.price / peak.price
    if (depth < minDepth) continue
    if (!current) current = { peakDate: peak.date, troughDate: p.date, depth, recovered: false }
    else if (depth > current.depth) { current.depth = depth; current.troughDate = p.date }
  }
  if (current) episodes.push(current)
  return episodes
}

/** Số ngày giữa hai ngày ISO. */
function daysBetween(a, b) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
}

/**
 * Nhịp giảm không có sự kiện nào giải thích.
 *
 * Cửa sổ nới ra `slackDays` về hai phía: tin xấu thường nổ ra trước khi giá
 * chạm đáy, và có sự kiện được đánh dấu ở ngày công bố chứ không phải ngày thị
 * trường phản ứng.
 */
export function uncoveredEpisodes(episodes, eventDates, slackDays = 45) {
  return episodes.filter(ep => !eventDates.some(d =>
    daysBetween(ep.peakDate, d) >= -slackDays && daysBetween(d, ep.troughDate) >= -slackDays,
  ))
}
