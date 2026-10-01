import type { ReactNode, SVGProps } from 'react'

/**
 * Bộ icon dùng chung cho toàn app, thay cho emoji.
 *
 * Emoji rendering tuỳ hệ điều hành/font: có màu sắc riêng (mặt trời vàng, sao
 * vàng...) không theo được theme sáng/tối hay màu chủ đạo của app, và trông
 * khác nhau giữa Windows/macOS/Android. SVG nét đơn, currentColor thì luôn
 * đồng bộ với theme và nhất quán trên mọi máy.
 *
 * `Icon` là khung chung — 24x24, stroke đều, currentColor — mọi icon bên dưới
 * đi qua đây nên không icon nào lỡ tay lệch stroke-width hay viewBox.
 */
function Icon({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

/** So Sánh — cột biểu đồ cao thấp khác nhau. */
export function IconCompare(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M6 20V10M12 20V4M18 20v-7" />
    </Icon>
  )
}

/** Theo Dõi / nút yêu thích — sao, rỗng khi chưa theo dõi, tô đặc khi đã theo dõi. */
export function IconStar({ filled = false, ...props }: SVGProps<SVGSVGElement> & { filled?: boolean }) {
  return (
    <Icon {...props} fill={filled ? 'currentColor' : 'none'}>
      <path d="M12 4.3l2.3 4.7 5.1.7-3.7 3.6.9 5.2L12 16l-4.6 2.5.9-5.2-3.7-3.6 5.1-.7z" />
    </Icon>
  )
}

/** DCA — lịch, vì DCA là đầu tư định kỳ theo lịch. */
export function IconCalendar(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
      <path d="M4 10h16M8 3.5v3M16 3.5v3" />
    </Icon>
  )
}

/** LS vs DCA — cân thăng bằng, cân hai chiến lược. */
export function IconScale(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M12 4v14M8 21h8M5 7h14" />
      <path d="M5 7l-2.6 5.2a2.6 2.6 0 0 0 5.2 0z" />
      <path d="M19 7l-2.6 5.2a2.6 2.6 0 0 0 5.2 0z" />
    </Icon>
  )
}

/** Phân Tích Quỹ — kính lúp. */
export function IconSearch(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M20 20l-5.2-5.2" />
    </Icon>
  )
}

/** Overlap — hai vòng tròn chồng lấn, đúng nghĩa "overlap". */
export function IconOverlap(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="12" r="6.5" />
      <circle cx="15" cy="12" r="6.5" />
    </Icon>
  )
}

/** Tái Cân Bằng — hai mũi tên vòng lại, tái lập tỷ trọng. */
export function IconRefresh(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 12a8 8 0 0 1 13.6-5.7M20 12a8 8 0 0 1-13.6 5.7" />
      <path d="M17 3v4h-4M7 21v-4h4" />
    </Icon>
  )
}

/** Chiến Thuật Phân Bổ — bia ngắm (target). */
export function IconTarget(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.7" fill="currentColor" stroke="none" />
    </Icon>
  )
}

/** Bitcoin — ký hiệu ₿ đặt trong khung tròn cho đồng bộ cỡ với các icon khác. */
export function IconBitcoin(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.3" />
      <text x="12" y="16.3" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="currentColor" stroke="none">
        ₿
      </text>
    </Icon>
  )
}

/** Wall of Worry (đang ẩn khỏi nav, giữ icon để dùng lại nếu mở lại) — mây bão. */
export function IconCloud(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M7 18a4 4 0 0 1-.5-7.97A5 5 0 0 1 16.2 8.1 4.5 4.5 0 0 1 16.5 18H7z" />
    </Icon>
  )
}

/** Máy Tính — bàn phím máy tính bỏ túi. */
export function IconCalculator(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="5" y="3" width="14" height="18" rx="2.2" />
      <path d="M8 7.5h8M8.2 12h1M11.9 12h1M15.6 12h1M8.2 15.8h1M11.9 15.8h1M15.6 15.8v3.2M8.2 19h1M11.9 19h1" />
    </Icon>
  )
}

/** Hồ Sơ Quỹ — toà nhà kiểu định chế tài chính. */
export function IconBank(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 10l8-5.5L20 10M5 10h14M6 10v8M10 10v8M14 10v8M18 10v8M4 20.5h16" />
    </Icon>
  )
}

/** Minh Bạch Hoá — thước đo, giữ đúng ẩn dụ "đo lường/phương pháp" của icon cũ. */
export function IconRuler(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 15.5 15.5 4l4.5 4.5L8.5 20z" />
      <path d="M13 6.5l2 2M10 9.5l2 2M7 12.5l2 2" />
    </Icon>
  )
}

/** Nút đổi theme — mặt trời (đang tối, bấm để sang sáng). */
export function IconSun(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.4M12 19.1v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7" />
    </Icon>
  )
}

/** Nút đổi theme — trăng lưỡi liềm (đang sáng, bấm để sang tối). */
export function IconMoon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M20 14.2A8.5 8.5 0 1 1 9.8 4a7 7 0 0 0 10.2 10.2z" />
    </Icon>
  )
}

/** Nút copy link chia sẻ — mắt xích. */
export function IconLink(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M10.5 13.5a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1.7 1.7" />
      <path d="M13.5 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1.7-1.7" />
    </Icon>
  )
}

/** Trạng thái "đã copy" — dấu tích. */
export function IconCheck(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Icon>
  )
}

/** Takeaway cảnh báo (thay ⚠️) — tam giác than phiền. */
export function IconWarning(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M12 4 21 19H3z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="16.7" r="0.7" fill="currentColor" stroke="none" />
    </Icon>
  )
}

/** Takeaway "quán quân" (thay 🏆) — cúp. */
export function IconTrophy(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M7 5H4.7A2.2 2.2 0 0 0 4 9.2L7 11M17 5h2.3A2.2 2.2 0 0 1 20 9.2L17 11" />
      <path d="M12 14v3.5M9 20h6" />
    </Icon>
  )
}

/** Takeaway xu hướng tăng (thay 📈). */
export function IconTrendUp(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 16l6-6 4 4 6-7" />
      <path d="M14 7h6v6" />
    </Icon>
  )
}

/** Takeaway xu hướng giảm (thay 📉). */
export function IconTrendDown(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 8l6 6 4-4 6 7" />
      <path d="M14 17h6v-6" />
    </Icon>
  )
}

/** Takeaway tiền/lãi ròng (thay 💰💵) — đồng xu có gạch giá trị. */
export function IconCoin(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.3" />
      <path d="M12 7v10M9.5 9.3a2.5 1.7 0 0 1 2.5-1 2.5 1.7 0 0 1 0 3.4 2.5 1.7 0 0 0 0 3.4 2.5 1.7 0 0 0 2.5-1" />
    </Icon>
  )
}

/** Takeaway gợi ý/mẹo (thay 💡) — bóng đèn. */
export function IconIdea(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M9 17.5h6M9.7 20h4.6" />
      <path d="M8 14a4.5 4.5 0 1 1 8 0c-.9 1-1.5 1.7-1.5 3.5h-5c0-1.8-.6-2.5-1.5-3.5z" />
    </Icon>
  )
}

/** Takeaway "đã trụ vững qua sóng gió" (thay ⚓) — mỏ neo. */
export function IconAnchor(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="5.3" r="1.8" />
      <path d="M12 7.3V21M6 14a6 6 0 0 0 6 7 6 6 0 0 0 6-7M6 14h2.5M15.5 14H18" />
    </Icon>
  )
}

/** Takeaway "vẫn đang trong sóng gió" (thay ⛈️) — mây kèm sét, khác mây trơn của Wall of Worry. */
export function IconStorm(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M6.5 15.5a4 4 0 0 1-.5-7.97 5 5 0 0 1 9.7-1.43A4.5 4.5 0 0 1 15.5 15.5h-1" />
      <path d="M13 15l-2.3 3.6h2.6L11 22" strokeWidth={1.6} />
    </Icon>
  )
}

/** Gợi Ý Đầu Tư — la bàn, chỉ hướng chứ không đi thay. */
export function IconCompass(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M15.6 8.4l-2 5.2-5.2 2 2-5.2z" />
    </Icon>
  )
}

/** DCA Cổ Phiếu: biểu đồ nến, khác cột biểu đồ của So Sánh. */
export function IconCandles(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M7 4v3M7 15v5M12 8v2M12 19v2M17 3v4M17 13v5" />
      <rect x="5" y="7" width="4" height="8" rx="1" />
      <rect x="10" y="10" width="4" height="9" rx="1" />
      <rect x="15" y="7" width="4" height="6" rx="1" />
    </Icon>
  )
}

/** Bộ lọc danh sách quỹ: phễu lọc. */
export function IconFilter(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 5h16l-6.2 7.4V19l-3.6-1.8v-4.8z" />
    </Icon>
  )
}
