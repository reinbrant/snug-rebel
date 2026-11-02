import { useState, useRef } from 'react'
import { Upload, X, FileText, Image } from 'lucide-react'
import type { Product3DModelItem } from '../types'

interface Model3DUploadProps {
  productId: string
  onUploadSuccess?: (model: Product3DModelItem) => void
  onError?: (error: string) => void
}

export function Model3DUpload({ productId, onUploadSuccess, onError }: Model3DUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [modelFile, setModelFile] = useState<File | null>(null)
  const [previewFile, setPreviewFile] = useState<File | null>(null)
  const [modelName, setModelName] = useState('')
  
  const modelInputRef = useRef<HTMLInputElement>(null)
  const previewInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.name.endsWith('.glb')) {
        setModelFile(file)
      } else if (file.type.startsWith('image/')) {
        setPreviewFile(file)
      }
    }
  }

  const handleModelFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.name.endsWith('.glb')) {
      setModelFile(file)
    }
  }

  const handlePreviewFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setPreviewFile(file)
    }
  }

  const handleUpload = async () => {
    if (!modelFile) {
      onError?.('Please select a .glb model file')
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('productId', productId)
      formData.append('modelFile', modelFile)
      if (previewFile) {
        formData.append('previewFile', previewFile)
      }
      if (modelName) {
        formData.append('modelName', modelName)
      }

      const response = await fetch('http://localhost:5000/api/Product3DModel/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Upload failed')
      }

      const result = await response.json()
      onUploadSuccess?.(result)
      
      // Reset form
      setModelFile(null)
      setPreviewFile(null)
      setModelName('')
      if (modelInputRef.current) modelInputRef.current.value = ''
      if (previewInputRef.current) previewInputRef.current.value = ''
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
        }`}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-sm font-medium text-gray-700 mb-2">Drag and drop your 3D model and preview image</p>
        <p className="text-xs text-gray-500 mb-4">or click to select files</p>
        
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => modelInputRef.current?.click()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            Select .glb Model
          </button>
          <button
            onClick={() => previewInputRef.current?.click()}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700"
          >
            Select Preview Image
          </button>
        </div>

        <input
          ref={modelInputRef}
          type="file"
          accept=".glb"
          onChange={handleModelFileSelect}
          className="hidden"
        />
        <input
          ref={previewInputRef}
          type="file"
          accept="image/*"
          onChange={handlePreviewFileSelect}
          className="hidden"
        />
      </div>

      {(modelFile || previewFile) && (
        <div className="border border-gray-200 rounded-lg p-4 space-y-3">
          {modelFile && (
            <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{modelFile.name}</p>
                  <p className="text-xs text-gray-500">{(modelFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setModelFile(null)
                  if (modelInputRef.current) modelInputRef.current.value = ''
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {previewFile && (
            <div className="flex items-center justify-between p-2 bg-green-50 rounded">
              <div className="flex items-center gap-2">
                <Image className="w-4 h-4 text-green-600" />
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{previewFile.name}</p>
                  <p className="text-xs text-gray-500">{(previewFile.size / 1024).toFixed(2)} KB</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setPreviewFile(null)
                  if (previewInputRef.current) previewInputRef.current.value = ''
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <input
            type="text"
            placeholder="Model name (optional)"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            onClick={handleUpload}
            disabled={isUploading || !modelFile}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading...' : 'Upload Model'}
          </button>
        </div>
      )}
    </div>
  )
}
