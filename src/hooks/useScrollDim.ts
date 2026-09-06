import { useEffect, useState } from 'react'

/** Cuộn qua ngần này (px) mới bắt đầu làm mờ — sát đỉnh trang thì luôn rõ. */
const ENGAGE_AT = 96

/**
 * Bỏ qua rung nhỏ dưới ngưỡng này. Không có nó thì trackpad và cuộn đà làm
 * header nhấp nháy sáng/mờ liên tục vì hướng cuộn đảo qua lại từng pixel.
 */
const MIN_DELTA = 6

/**
 * true khi người dùng đang cuộn xuống và đã rời khỏi đỉnh trang.
 *
 * Dùng để làm mờ header dính: đọc nội dung thì header lùi ra sau, cuộn ngược
 * lên (định đổi tab, đổi ngôn ngữ) thì nó hiện lại ngay.
 *
 * Đọc scroll trong rAF chứ không xử lý thẳng trong sự kiện: scroll bắn rất dày,
 * gom về một lần mỗi khung hình để không giật khi cuộn bảng dài.
 */
export function useScrollDim(): boolean {
  const [dim, setDim] = useState(false)

  useEffect(() => {
    let lastY = window.scrollY
    let ticking = false

    function read() {
      ticking = false
      const y = window.scrollY
      const delta = y - lastY
      if (Math.abs(delta) < MIN_DELTA) return
      lastY = y
      setDim(y > ENGAGE_AT && delta > 0)
    }

    function onScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(read)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return dim
}
