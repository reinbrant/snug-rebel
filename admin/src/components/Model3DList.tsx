import { useState, useEffect } from 'react'
import { Trash2, Eye } from 'lucide-react'
import type { Product3DModelItem } from '../types'

interface Model3DListProps {
  productId: string
  onModelDeleted?: (modelId: string) => void
}

export function Model3DList({ productId, onModelDeleted }: Model3DListProps) {
  const [models, setModels] = useState<Product3DModelItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchModels()
  }, [productId])

  const fetchModels = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`http://localhost:5000/api/Product3DModel/product/${productId}`)
      if (!response.ok) throw new Error('Failed to fetch models')
      const data = await response.json()
      setModels(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (modelId: string) => {
    if (!confirm('Are you sure you want to delete this 3D model?')) return

    try {
      const response = await fetch(`http://localhost:5000/api/Product3DModel/${modelId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete model')

      setModels(models.filter((m) => m.id !== modelId))
      onModelDeleted?.(modelId)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete model')
    }
  }

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading 3D models...</div>
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>
  }

  if (models.length === 0) {
    return <div className="text-center py-8 text-gray-500">No 3D models uploaded yet</div>
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">Model Name</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">Preview</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">File Size</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">Uploaded</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {models.map((model) => (
            <tr key={model.id} className="border-t hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-900">
                <a
                  href={model.modelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium"
                >
                  {model.modelName || 'Untitled Model'}
                </a>
              </td>
              <td className="px-4 py-3">
                {model.previewImageUrl ? (
                  <img
                    src={model.previewImageUrl}
                    alt={model.modelName || 'Model preview'}
                    className="h-10 w-10 object-cover rounded"
                  />
                ) : (
                  <span className="text-gray-400 text-xs">No preview</span>
                )}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {(model.fileSizeBytes / 1024 / 1024).toFixed(2)} MB
              </td>
              <td className="px-4 py-3 text-gray-600 text-xs">
                {new Date(model.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex justify-center gap-2">
                  <a
                    href={model.modelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handleDelete(model.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
