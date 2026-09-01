import { useState } from 'react'
import { useT } from '../i18n'

interface Props {
  getUrl: () => string
}

export function ShareButton({ getUrl }: Props) {
  const t = useT()
  const [copied, setCopied] = useState(false)

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(getUrl())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
      const el = document.createElement('textarea')
      el.value = getUrl()
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button className={`share-btn ${copied ? 'share-btn-copied' : ''}`} onClick={handleClick}>
      {t(copied ? 'share.copied' : 'share.copy')}
    </button>
  )
}
