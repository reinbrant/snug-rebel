import { useCallback, useEffect, useState } from 'react'
import { Eye, Trash2 } from 'lucide-react'
import type { Product3DModelItem } from '../types'
import { API_BASE, readErrorMessage, resolveAssetUrl } from '../lib/config'
import './Model3D.css'

interface Model3DListProps {
  productId: string
  /** Change this value (e.g. increment a counter) to make the list refetch after an upload. */
  refreshKey?: number
  onModelDeleted?: (modelId: string) => void
}

export function Model3DList({ productId, refreshKey = 0, onModelDeleted }: Model3DListProps) {
  const [models, setModels] = useState<Product3DModelItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchModels = useCallback(
    async (signal: AbortSignal) => {
      try {
        setIsLoading(true)
        const response = await fetch(`${API_BASE}/api/Product3DModel/product/${encodeURIComponent(productId)}`, { signal })
        if (!response.ok) {
          throw new Error(await readErrorMessage(response, `Failed to load models (HTTP ${response.status}).`))
        }
        const data = await response.json()
        setModels(Array.isArray(data) ? data : [])
        setError(null)
      } catch (fetchError) {
        if (signal.aborted) return
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load models.')
      } finally {
        if (!signal.aborted) setIsLoading(false)
      }
    },
    [productId],
  )

  useEffect(() => {
    const controller = new AbortController()
    fetchModels(controller.signal)
    return () => controller.abort()
  }, [fetchModels, refreshKey])

  async function handleDelete(modelId: string) {
    if (!window.confirm('Are you sure you want to delete this 3D model?')) return

    setDeletingId(modelId)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/api/Product3DModel/${encodeURIComponent(modelId)}`, { method: 'DELETE' })
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, `Failed to delete model (HTTP ${response.status}).`))
      }
      setModels((current) => current.filter((model) => model.id !== modelId))
      onModelDeleted?.(modelId)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete model.')
    } finally {
      setDeletingId(null)
    }
  }

  if (isLoading && models.length === 0) {
    return <p className="empty-state-copy">Loading 3D models...</p>
  }

  return (
    <div className="m3d-stack">
      {error ? <div className="error-banner">{error}</div> : null}

      {models.length === 0 ? (
        !error ? <p className="empty-state-copy">No 3D models uploaded yet.</p> : null
      ) : (
        <div className="inventory-table-wrap">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Preview</th>
                <th>Size</th>
                <th>Uploaded</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {models.map((model) => {
                const modelUrl = resolveAssetUrl(model.modelUrl)
                const previewUrl = resolveAssetUrl(model.previewImageUrl)
                const label = model.modelName || 'Untitled model'

                return (
                  <tr key={model.id}>
                    <td>{label}</td>
                    <td>
                      {previewUrl ? (
                        <img src={previewUrl} alt={`${label} preview`} className="m3d-thumb" />
                      ) : (
                        <span className="m3d-muted">No preview</span>
                      )}
                    </td>
                    <td>{(model.fileSizeBytes / 1024 / 1024).toFixed(2)} MB</td>
                    <td>{new Date(model.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span className={`status-pill ${model.isActive ? 'success' : 'neutral'}`}>
                        {model.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="m3d-row-actions">
                        <a
                          href={modelUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="icon-button"
                          aria-label={`Open ${label}`}
                        >
                          <Eye size={16} />
                        </a>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`Delete ${label}`}
                          disabled={deletingId === model.id}
                          onClick={() => handleDelete(model.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}