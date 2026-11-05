import { useEffect, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import type { ModelViewerElement } from '@google/model-viewer'
import '../Model3d.css'

interface Model3DPreviewProps {
  src: string
  name: string
  poster?: string
}

export function Model3DPreview({ src, name, poster }: Model3DPreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<ModelViewerElement | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let cancelled = false
    let viewer: ModelViewerElement | undefined
    setStatus('loading')

    // Keep the 3D renderer out of the initial admin bundle.
    import('@google/model-viewer').then(() => {
      if (cancelled) return
      viewer = document.createElement('model-viewer') as ModelViewerElement
      const modelSource = new URL(src, window.location.href)
      // The renderer caches failures by URL. A fragment retries the load without
      // changing the HTTP request URL or a storage provider's signed query.
      if (attempt > 0) modelSource.hash = `preview-retry-${attempt}-${Date.now()}`
      viewer.setAttribute('src', modelSource.href)
      viewer.setAttribute('alt', `Interactive 3D preview of ${name}`)
      viewer.setAttribute('camera-controls', '')
      viewer.setAttribute('touch-action', 'pan-y')
      viewer.setAttribute('loading', 'eager')
      viewer.setAttribute('shadow-intensity', '1')
      if (poster) viewer.setAttribute('poster', poster)
      viewer.addEventListener('load', () => { if (!cancelled) setStatus('ready') })
      viewer.addEventListener('error', () => { if (!cancelled) setStatus('error') })
      viewerRef.current = viewer
      host.replaceChildren(viewer)
    }).catch(() => { if (!cancelled) setStatus('error') })

    return () => {
      cancelled = true
      viewer?.remove()
      viewerRef.current = null
    }
  }, [src, name, poster, attempt])

  function resetView() {
    const viewer = viewerRef.current
    if (!viewer) return
    viewer.cameraOrbit = '0deg 75deg 105%'
    viewer.cameraTarget = 'auto auto auto'
    viewer.fieldOfView = 'auto'
    viewer.jumpCameraToGoal()
  }

  return (
    <section className="m3d-preview" aria-label={`3D preview: ${name}`}>
      <div className="m3d-preview-header">
        <strong>{name}</strong>
        <button type="button" className="secondary-button small-button" disabled={status !== 'ready'} onClick={resetView}>
          <RotateCcw size={16} aria-hidden="true" /> Reset view
        </button>
      </div>
      <div className="m3d-preview-canvas" aria-busy={status === 'loading'}>
        <div ref={hostRef} className="m3d-viewer-host" hidden={status === 'error'} />
        {status === 'loading' && <p className="m3d-preview-message" role="status">Loading 3D preview…</p>}
        {status === 'error' && (
          <div className="m3d-preview-message">
            <p role="alert">Unable to preview this model. Check that the file is a valid, accessible .glb model.</p>
            <button type="button" className="secondary-button small-button" onClick={() => setAttempt(value => value + 1)}>Retry preview</button>
          </div>
        )}
      </div>
      <p className="m3d-muted">Drag to rotate · Scroll or pinch to zoom · Right-drag or use two fingers to pan.</p>
    </section>
  )
}
