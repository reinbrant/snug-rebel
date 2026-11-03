import { useRef, useState } from 'react'
import { FileText, Image as ImageIcon, Upload, X } from 'lucide-react'
import type { Product3DModelItem } from '../types'
import { API_BASE, readErrorMessage } from '../lib/config'
import './Model3D.css'

const MAX_MODEL_MB = 50
const MAX_PREVIEW_MB = 5

interface Model3DUploadProps {
  productId: string
  onUploadSuccess?: (model: Product3DModelItem) => void
  onError?: (error: string) => void
}

const isGlb = (file: File) => file.name.toLowerCase().endsWith('.glb')
const isImage = (file: File) => file.type.startsWith('image/')
const toMb = (bytes: number) => bytes / 1024 / 1024

export function Model3DUpload({ productId, onUploadSuccess, onError }: Model3DUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [modelFile, setModelFile] = useState<File | null>(null)
  const [previewFile, setPreviewFile] = useState<File | null>(null)
  const [modelName, setModelName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const modelInputRef = useRef<HTMLInputElement>(null)
  const previewInputRef = useRef<HTMLInputElement>(null)

  function fail(message: string) {
    setError(message)
    onError?.(message)
  }

  function acceptModel(file: File) {
    if (!isGlb(file)) return fail('The 3D model must be a .glb file.')
    if (toMb(file.size) > MAX_MODEL_MB) return fail(`The model is too large. The limit is ${MAX_MODEL_MB} MB.`)
    setError(null)
    setModelFile(file)
  }

  function acceptPreview(file: File) {
    if (!isImage(file)) return fail('The preview must be an image file.')
    if (toMb(file.size) > MAX_PREVIEW_MB) return fail(`The preview image is too large. The limit is ${MAX_PREVIEW_MB} MB.`)
    setError(null)
    setPreviewFile(file)
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(true)
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)

    Array.from(event.dataTransfer.files).forEach((file) => {
      if (isGlb(file)) acceptModel(file)
      else if (isImage(file)) acceptPreview(file)
      else fail(`"${file.name}" is not a .glb model or an image.`)
    })
  }

  function handleModelSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) acceptModel(file)
    event.target.value = ''
  }

  function handlePreviewSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) acceptPreview(file)
    event.target.value = ''
  }

  async function handleUpload() {
    if (!modelFile) return fail('Please select a .glb model file.')

    setIsUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('productId', productId)
      formData.append('modelFile', modelFile)
      if (previewFile) formData.append('previewFile', previewFile)
      if (modelName.trim()) formData.append('modelName', modelName.trim())

      const response = await fetch(`${API_BASE}/api/Product3DModel/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, `Upload failed (HTTP ${response.status}).`))
      }

      const result = (await response.json()) as Product3DModelItem
      setModelFile(null)
      setPreviewFile(null)
      setModelName('')
      onUploadSuccess?.(result)
    } catch (uploadError) {
      fail(uploadError instanceof Error ? uploadError.message : 'Upload failed.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="m3d-stack">
      <div
        className={`m3d-dropzone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <Upload size={28} aria-hidden="true" />
        <p>
          <strong>Drag and drop a .glb model and an optional preview image</strong>
        </p>
        <p className="m3d-hint">Or choose files with the buttons below. Model up to {MAX_MODEL_MB} MB, preview up to {MAX_PREVIEW_MB} MB.</p>

        <div className="m3d-actions">
          <button type="button" className="primary-button small-button" onClick={() => modelInputRef.current?.click()}>
            Select .glb model
          </button>
          <button type="button" className="secondary-button small-button" onClick={() => previewInputRef.current?.click()}>
            Select preview image
          </button>
        </div>

        <input ref={modelInputRef} type="file" accept=".glb" onChange={handleModelSelect} hidden />
        <input ref={previewInputRef} type="file" accept="image/*" onChange={handlePreviewSelect} hidden />
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      {modelFile || previewFile ? (
        <div className="m3d-selected">
          {modelFile ? (
            <div className="m3d-file-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={16} aria-hidden="true" />
                <div>
                  <strong>{modelFile.name}</strong>
                  <small>{toMb(modelFile.size).toFixed(2)} MB</small>
                </div>
              </div>
              <button type="button" className="icon-button" aria-label="Remove model file" onClick={() => setModelFile(null)}>
                <X size={16} />
              </button>
            </div>
          ) : null}

          {previewFile ? (
            <div className="m3d-file-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ImageIcon size={16} aria-hidden="true" />
                <div>
                  <strong>{previewFile.name}</strong>
                  <small>{(previewFile.size / 1024).toFixed(1)} KB</small>
                </div>
              </div>
              <button type="button" className="icon-button" aria-label="Remove preview image" onClick={() => setPreviewFile(null)}>
                <X size={16} />
              </button>
            </div>
          ) : null}

          <input
            type="text"
            className="m3d-text-input"
            placeholder="Model name (optional)"
            value={modelName}
            onChange={(event) => setModelName(event.target.value)}
          />

          <button type="button" className="primary-button" onClick={handleUpload} disabled={isUploading || !modelFile}>
            {isUploading ? 'Uploading...' : 'Upload model'}
          </button>
        </div>
      ) : null}
    </div>
  )
}