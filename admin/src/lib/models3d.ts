import type { Product3DModelItem } from '../types'
import { API_BASE, readErrorMessage } from './config'

// Files picked in the UI, before they are sent to the backend.
export type StagedModel = {
  modelFile: File | null
  previewFile: File | null
  modelName: string
}

export async function uploadProductModel(productId: string, staged: StagedModel): Promise<Product3DModelItem> {
  if (!staged.modelFile) {
    throw new Error('Please select a .glb model file.')
  }

  const formData = new FormData()
  formData.append('productId', productId)
  formData.append('modelFile', staged.modelFile)
  if (staged.previewFile) formData.append('previewFile', staged.previewFile)
  if (staged.modelName.trim()) formData.append('modelName', staged.modelName.trim())

  const response = await fetch(`${API_BASE}/api/Product3DModel/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Upload failed (HTTP ${response.status}).`))
  }

  return (await response.json()) as Product3DModelItem
}