import { useEffect } from 'react'

// Fullscreen image preview overlay. Rendered only while open, so mounting
// installs the Escape-to-close listener and unmounting tears it down.
export default function ImagePreviewModal({ src, onClose }) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="img-preview-overlay" onClick={onClose}>
      <div className="img-preview-modal" onClick={(e) => e.stopPropagation()}>
        <button
          className="img-preview-close"
          onClick={onClose}
          type="button"
          aria-label="Close"
          title="Close"
        >
          ✕
        </button>

        {src && <img src={src} alt="preview" className="img-preview-image" />}
      </div>
    </div>
  )
}
