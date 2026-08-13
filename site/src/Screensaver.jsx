import React, { useEffect, useRef, useState } from 'react'

const SNAP_KEY = 'rewire_snapshots'

export default function Screensaver({ onDismiss }) {
  const [snaps, setSnaps]   = useState([])
  const [idx, setIdx]       = useState(0)
  const [visible, setVisible] = useState(true)
  const timerRef            = useRef(null)

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(SNAP_KEY) || '[]')
      if (Array.isArray(stored)) {
        setSnaps(stored)
        setIdx(0)   // always begin from variation 1
        setVisible(true)
      }
    } catch { setSnaps([]) }
  }, [])

  // cycle through composites oldest→newest, showing the build-up
  useEffect(() => {
    if (snaps.length < 2) return
    timerRef.current = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIdx(i => (i + 1) % snaps.length)
        setVisible(true)
      }, 800)
    }, 5000)
    return () => clearInterval(timerRef.current)
  }, [snaps.length])

  return (
    <div className="screensaver" onClick={onDismiss}>
      {snaps.length > 0 ? (
        <img
          key={idx}
          className="ss-img"
          style={{ opacity: visible ? 1 : 0 }}
          src={snaps[idx]}
          alt=""
        />
      ) : (
        <div className="ss-placeholder">
          <div className="ss-pulse" />
          <div className="ss-pulse-ring" />
        </div>
      )}

      <div className="ss-vignette" />

      <div className="ss-branding">
        <div className="ss-logo">THIRD HOME WOLFSBURG</div>
        <div className="ss-tagline">REWIRE INTERFACE</div>
        {snaps.length > 0 && (
          <div className="ss-count">
            {idx + 1} / {snaps.length} &nbsp;·&nbsp; {snaps.length} space variation{snaps.length !== 1 ? 's' : ''} composited
          </div>
        )}
      </div>

      <div className="ss-cta">Touch or move to continue</div>

      {snaps.length > 1 && (
        <div className="ss-dots">
          {snaps.map((_, i) => (
            <div key={i} className={`ss-dot${i === idx ? ' ss-dot-active' : ''}`} />
          ))}
        </div>
      )}
    </div>
  )
}
