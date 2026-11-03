import { useEffect, useRef, useState } from 'react'
import { FileText, Image as ImageIcon, Upload, X } from 'lucide-react'
import type { Product3DModelItem } from '../types'
import { uploadProductModel, type StagedModel } from '../lib/models3d'
import '../Model3d.css'

const MAX_MODEL_MB = 50
const MAX_PREVIEW_MB = 5

interface Model3DUploadProps {
  /** Existing product to upload to. Omit it together with `stagedOnly` when the product doesn't exist yet. */
  productId?: string
  /**
   * Staged mode: only collect the files and report them through `onStagedChange`.
   * The parent uploads them once the product exists.
   */
  stagedOnly?: boolean
  onStagedChange?: (staged: StagedModel | null) => void
  onUploadSuccess?: (model: Product3DModelItem) => void
  onError?: (error: string) => void
}

const isGlb = (file: File) => file.name.toLowerCase().endsWith('.glb')
const isImage = (file: File) => file.type.startsWith('image/')
const toMb = (bytes: number) => bytes / 1024 / 1024

export function Model3DUpload({ productId, stagedOnly = false, onStagedChange, onUploadSuccess, onError }: Model3DUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [modelFile, setModelFile] = useState<File | null>(null)
  const [previewFile, setPreviewFile] = useState<File | null>(null)
  const [modelName, setModelName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const modelInputRef = useRef<HTMLInputElement>(null)
  const previewInputRef = useRef<HTMLInputElement>(null)

  // In staged mode, tell the parent what is currently selected.
  useEffect(() => {
    if (!stagedOnly) return
    onStagedChange?.(modelFile || previewFile ? { modelFile, previewFile, modelName } : null)
  }, [stagedOnly, onStagedChange, modelFile, previewFile, modelName])

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
    if (!productId) return fail('Save the product first, then upload a model.')
    if (!modelFile) return fail('Please select a .glb model file.')

    setIsUploading(true)
    setError(null)
    try {
      const result = await uploadProductModel(productId, { modelFile, previewFile, modelName })
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
            onKeyDown={(event) => {
              // Don't let Enter submit a surrounding form (e.g. the product form).
              if (event.key === 'Enter') event.preventDefault()
            }}
          />

          {stagedOnly ? null : (
            <button type="button" className="primary-button" onClick={handleUpload} disabled={isUploading || !modelFile}>
              {isUploading ? 'Uploading...' : 'Upload model'}
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}