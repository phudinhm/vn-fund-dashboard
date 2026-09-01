/**
 * Mấy khối dùng chung của tab "Minh Bạch Hoá".
 *
 * Nội dung tab này là một tài liệu tĩnh, không có số nào kéo từ trạng thái mô
 * phỏng. Vì vậy bản tiếng Việt và tiếng Anh viết thành hai tài liệu song song
 * (MethodologyVi / MethodologyEn) thay vì cắt thành hàng trăm key trong
 * i18n.ts: cắt nhỏ một bài giải thích có công thức và ví dụ số thì vừa khó
 * đọc khi sửa, vừa khoá thứ tự câu theo ngữ pháp tiếng Việt.
 *
 * Khung (heading, công thức, hộp ví dụ) thì dùng chung, nằm ở đây.
 */

/** Khối công thức nổi bật (monospace, nền nhạt). */
export function Formula({ children }: { children: React.ReactNode }) {
  return <div className="method-formula">{children}</div>
}

/** Dòng "trong đó:" giải thích ký hiệu ngay dưới công thức. */
export function Where({ children }: { children: React.ReactNode }) {
  return <div className="method-where">{children}</div>
}

/** Dòng nối con số này tới đúng chỗ nó xuất hiện trên tab tương ứng. */
export function SeenAt({ where, children }: { where: string; children: React.ReactNode }) {
  return (
    <div className="method-seenat">
      <span className="method-seenat-icon">👉</span>
      <span>{where}: {children}</span>
    </div>
  )
}

/** Hộp ví dụ số cụ thể. */
export function Example({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="method-example">
      <div className="method-example-label">{label}</div>
      <div className="method-example-body">{children}</div>
    </div>
  )
}

export function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="method-section">
      <h3 className="method-section-title">{title}</h3>
      {children}
    </section>
  )
}

/** Id các mục, dùng chung cho mục lục và cho anchor của cả hai ngôn ngữ. */
export const SECTION_IDS = ['m-data', 'm-sim', 'm-returns', 'm-risk', 'm-behavior', 'm-future'] as const
