/**
 * Dấu hiệu nhận diện của dashboard: đường giá đi lên, kết bằng một chấm.
 *
 * Cùng một hình với public/favicon.svg — nền tảng chỉ nên có MỘT ký hiệu. Sửa
 * hình ở đây thì sửa luôn favicon, nếu không tab trình duyệt và header lại là
 * hai thương hiệu khác nhau.
 *
 * Vẽ bằng SVG nội tuyến chứ không nhúng file: mark đổi màu theo theme sáng/tối
 * qua currentColor, mà ảnh ngoài thì không làm được.
 */
export function BrandMark() {
  return (
    <svg
      className="app-header-mark"
      viewBox="0 0 64 64"
      role="img"
      aria-label="Fund Dashboard"
    >
      {/* Nét dày và ít chi tiết: mark chỉ rộng 34px, thêm chi tiết là thành vệt mờ. */}
      <path
        d="M16 43 27 31l8 7 13-17"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="6"
      />
      <circle cx="48" cy="21" r="4" fill="currentColor" />
    </svg>
  )
}
