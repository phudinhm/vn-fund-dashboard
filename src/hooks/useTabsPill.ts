import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import type { TabId } from '../tabRegistry'

/**
 * Định vị pill nền trượt theo tab đang chọn (transitions.dev "tabs sliding",
 * điều chỉnh cho nav đổi hướng: hàng ngang trên di động, cột dọc từ 1000px —
 * xem media query .tabs trong index.css). JS chỉ đo vị trí thật bằng
 * offsetLeft/offsetTop rồi ghi vào transform, CSS lo phần tween.
 *
 * Đo theo flexDirection thực tế của nav thay vì đoán theo bề rộng màn hình,
 * để không phải lặp lại breakpoint 1000px ở đây.
 */
export function useTabsPill(activeId: TabId) {
  const navRef = useRef<HTMLElement>(null)
  const pillRef = useRef<HTMLSpanElement>(null)
  const tabRefs = useRef(new Map<TabId, HTMLButtonElement>())
  const mountedRef = useRef(false)
  // Cache một callback ref cho mỗi id: registerTab(id) phải trả về CÙNG một
  // hàm qua các lần render, không thì React coi ref "đổi" và detach/attach
  // lại nút mỗi lần App re-render (vd gõ số ở tab khác).
  const callbacksRef = useRef(new Map<TabId, (el: HTMLButtonElement | null) => void>())

  const registerTab = useCallback((id: TabId) => {
    let cb = callbacksRef.current.get(id)
    if (!cb) {
      cb = (el: HTMLButtonElement | null) => {
        if (el) tabRefs.current.set(id, el)
        else tabRefs.current.delete(id)
      }
      callbacksRef.current.set(id, cb)
    }
    return cb
  }, [])

  const position = useCallback((animate: boolean) => {
    const nav = navRef.current
    const pill = pillRef.current
    const tab = tabRefs.current.get(activeId)
    if (!nav || !pill || !tab) return

    if (!animate) pill.style.transitionDuration = '0s'
    pill.style.width = `${tab.offsetWidth}px`
    pill.style.height = `${tab.offsetHeight}px`
    pill.style.transform = `translate(${tab.offsetLeft}px, ${tab.offsetTop}px)`
    if (!animate) {
      // Ép reflow rồi trả lại transition, không thì lần đổi tab kế tiếp cũng
      // mất luôn animation (transitionDuration: 0s vẫn còn hiệu lực).
      void pill.offsetWidth
      pill.style.transitionDuration = ''
    }
  }, [activeId])

  // Đổi tab (kể cả đổi ngôn ngữ làm nhãn dài/ngắn khác): tween. Lần vẽ đầu
  // tiên: snap thẳng, không tween từ góc (0,0) vào vị trí thật.
  useLayoutEffect(() => {
    position(mountedRef.current)
    mountedRef.current = true
  })

  // Đổi cỡ màn hình (kể cả đổi hướng nav ngang/dọc qua breakpoint): snap lại,
  // không tween theo vì đây không phải người dùng chọn tab khác.
  useEffect(() => {
    const onResize = () => position(false)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [position])

  return { navRef, pillRef, registerTab }
}
