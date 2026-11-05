import { useState } from 'react'
import { API_BASE, apiFetch, readErrorMessage, resolveAssetUrl } from '../lib/config'

type Image = { url: string; altText?: string }

export function ProductImagesEditor({ images, onChange, onBusyChange }: {
  images: Image[]; onChange: (images: Image[]) => void; onBusyChange: (busy: boolean) => void
}) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  async function upload(file: File) {
    setError(''); setUploading(true); onBusyChange(true)
    try {
      const data = new FormData(); data.append('imageFile', file)
      const response = await apiFetch(`${API_BASE}/api/ProductImage/upload`, { method: 'POST', body: data })
      if (!response.ok) throw new Error(await readErrorMessage(response, 'Image upload failed.'))
      const image = await response.json()
      onChange([...images, { url: image.url, altText: file.name }])
    } catch (e) { setError(e instanceof Error ? e.message : 'Image upload failed.') }
    finally { setUploading(false); onBusyChange(false) }
  }

  return <div className="full-span inventory-editor">
    <h4>Product images</h4>
    <p>The first image is the main product image.</p>
    {error && <p className="error-banner" role="alert">{error}</p>}
    <div className="product-images">
      {images.map((image, index) => <div key={`${index}-${image.url}`} className="product-image-entry">
        <img src={resolveAssetUrl(image.url)} alt={image.altText || 'Product image'} />
        <input disabled={uploading} aria-label={`Image ${index + 1} description`} value={image.altText || ''} maxLength={255}
          onChange={e => onChange(images.map((item, i) => i === index ? { ...item, altText: e.target.value } : item))} />
        {index > 0 && <button type="button" disabled={uploading} className="link-button" onClick={() => onChange([image, ...images.filter((_, i) => i !== index)])}>Make primary</button>}
        <button type="button" disabled={uploading} className="link-button danger" onClick={() => onChange(images.filter((_, i) => i !== index))}>Remove image</button>
      </div>)}
    </div>
    <label><span>{uploading ? 'Uploading image…' : 'Upload image (up to 5 MB)'}</span>
      <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" disabled={uploading} onChange={e => {
        const file = e.target.files?.[0]; if (file) void upload(file); e.target.value = ''
      }} />
    </label>
    <div className="page-actions">
      <input aria-label="Image URL" placeholder="https://…" value={url} onChange={e => setUrl(e.target.value)} />
      <button type="button" className="secondary-button" disabled={uploading || !url.trim()} onClick={() => {
        try {
          if (new URL(url).protocol !== 'https:') throw new Error()
          onChange([...images, { url: url.trim() }]); setUrl(''); setError('')
        } catch { setError('Enter an HTTPS image URL.') }
      }}>Add image URL</button>
    </div>
  </div>
}
