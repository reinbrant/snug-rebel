# 3D Model Upload Feature - Setup Guide

This guide explains how to set up the .glb 3D model and preview image upload functionality using Cloudinary.

## Backend Setup

### 1. Install Cloudinary Package

The `CloudinaryDotNet` package has been added to `backend.csproj`. Build the project to restore packages:

```bash
cd backend
dotnet restore
dotnet build
```

### 2. Configure Cloudinary Credentials

Create or update `backend/appsettings.json` with your Cloudinary credentials:

```json
{
  "Cloudinary": {
    "CloudName": "your-cloud-name",
    "ApiKey": "your-api-key",
    "ApiSecret": "your-api-secret"
  }
}
```

**How to get your Cloudinary credentials:**
1. Sign up at https://cloudinary.com (free tier available)
2. Go to your Dashboard
3. Copy your Cloud Name, API Key, and API Secret
4. Keep these credentials secure (never commit to git)

### 3. Database Migration

A new table `product_3d_models` has been added to the schema. Run this migration:

```sql
CREATE TABLE product_3d_models (
  _pk_product_3d_model_id VARCHAR(40) PRIMARY KEY DEFAULT ('m3d'::text || (gen_random_uuid())::text),
  _fk_product_id VARCHAR(40) NOT NULL REFERENCES products(_pk_product_id) ON DELETE CASCADE,
  model_url VARCHAR(500) NOT NULL,
  preview_image_url VARCHAR(500),
  model_name VARCHAR(255),
  file_size_bytes BIGINT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

CREATE INDEX idx_product_id_3d_models ON product_3d_models(_fk_product_id);
```

Or if using EF Core migrations:
```bash
cd backend
dotnet ef migrations add AddProduct3DModels
dotnet ef database update
```

### 4. New Backend Endpoints

#### Upload 3D Model and Preview Image (Multipart Form)
```
POST /api/Product3DModel/upload
Content-Type: multipart/form-data

Parameters:
- productId (required): Product ID
- modelFile (required): .glb file
- previewFile (optional): Preview image file
- modelName (optional): Display name for the model
```

#### Get 3D Models for a Product
```
GET /api/Product3DModel/product/{productId}
Response: Product3DModelDTO[]
```

#### Get Single 3D Model
```
GET /api/Product3DModel/{id}
Response: Product3DModelDTO
```

#### Create 3D Model (Direct URLs)
```
POST /api/Product3DModel
Content-Type: application/json

{
  "productId": "string",
  "modelUrl": "string",
  "previewImageUrl": "string (optional)",
  "modelName": "string (optional)",
  "fileSizeBytes": number
}
```

#### Update 3D Model
```
PUT /api/Product3DModel/{id}
Content-Type: application/json

{
  "id": "string",
  "productId": "string",
  "modelUrl": "string",
  "previewImageUrl": "string",
  "modelName": "string",
  "fileSizeBytes": number,
  "isActive": boolean,
  "createdAt": "ISO 8601 date",
  "updatedAt": "ISO 8601 date"
}
```

#### Delete 3D Model
```
DELETE /api/Product3DModel/{id}
```

## Frontend Setup (Admin)

### 1. TypeScript Types

Updated `admin/src/types.ts` with:
- `Product3DModelItem`: Represents a 3D model
- Updated `ProductItem` to include `models3D?: Product3DModelItem[]`

### 2. New Components

#### Model3DUpload Component
Located in `admin/src/components/Model3DUpload.tsx`

Features:
- Drag-and-drop support
- File type validation (.glb and image files)
- Progress indication
- Error handling

Usage:
```tsx
import { Model3DUpload } from './components/Model3DUpload'

<Model3DUpload
  productId={productId}
  onUploadSuccess={(model) => {
    console.log('Model uploaded:', model)
  }}
  onError={(error) => {
    console.error('Upload failed:', error)
  }}
/>
```

#### Model3DList Component
Located in `admin/src/components/Model3DList.tsx`

Features:
- Display all 3D models for a product
- Preview images
- File size display
- Delete functionality
- Direct links to model files

Usage:
```tsx
import { Model3DList } from './components/Model3DList'

<Model3DList
  productId={productId}
  onModelDeleted={(modelId) => {
    console.log('Model deleted:', modelId)
  }}
/>
```

### 3. Integration Example

Add to your product form page:

```tsx
import { Model3DUpload } from './components/Model3DUpload'
import { Model3DList } from './components/Model3DList'

export function ProductForm() {
  const [productId] = useState('your-product-id')

  return (
    <div className="space-y-6">
      {/* Existing product form fields */}
      
      {/* 3D Model Section */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4">3D Models</h3>
        
        <div className="mb-6">
          <h4 className="font-medium mb-3">Upload New Model</h4>
          <Model3DUpload
            productId={productId}
            onUploadSuccess={() => {
              // Refresh the models list
            }}
            onError={(error) => alert(error)}
          />
        </div>

        <div>
          <h4 className="font-medium mb-3">Existing Models</h4>
          <Model3DList productId={productId} />
        </div>
      </div>
    </div>
  )
}
```

## Database Schema

### product_3d_models Table

| Column | Type | Description |
|--------|------|-------------|
| `_pk_product_3d_model_id` | VARCHAR(40) | Primary key |
| `_fk_product_id` | VARCHAR(40) | Foreign key to products |
| `model_url` | VARCHAR(500) | Cloudinary URL to .glb file |
| `preview_image_url` | VARCHAR(500) | Cloudinary URL to preview image |
| `model_name` | VARCHAR(255) | Display name for the model |
| `file_size_bytes` | BIGINT | File size in bytes |
| `is_active` | BOOLEAN | Active status (default: true) |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

## Cloudinary File Organization

Files are organized in Cloudinary with the following structure:
```
products/
  ??? {productId}/
      ??? 3d-models/
      ?   ??? {filename}.glb
      ??? 3d-previews/
          ??? {filename}.jpg
```

## Frontend: Displaying 3D Models

To display 3D models in the public-facing store, use a library like:
- **Three.js**: Popular 3D library for web
- **Babylon.js**: Microsoft's 3D engine
- **Cesium.js**: For large-scale 3D

Example with Three.js:
```tsx
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

function Display3DModel({ modelUrl }) {
  useEffect(() => {
    const loader = new GLTFLoader()
    loader.load(modelUrl, (gltf) => {
      // Add model to scene
    })
  }, [modelUrl])

  return <div id="canvas-container" />
}
```

## Environment Variables

For security, use environment variables instead of storing credentials in code:

**Backend (Render environment variables):**
```
Cloudinary__CloudName=your-cloud-name
Cloudinary__ApiKey=your-api-key
Cloudinary__ApiSecret=your-api-secret
```

**Admin (Vercel environment variables):**
```
VITE_API_BASE_URL=https://your-api.onrender.com
```

## Troubleshooting

### 400 Bad Request on Upload
- Ensure `productId` and `modelFile` are provided
- Check file format (.glb required)
- Verify Cloudinary credentials

### 401 Unauthorized
- Check Cloudinary API key and secret
- Verify cloud name is correct

### 413 Payload Too Large
- Check file size limits (Cloudinary free tier: 100MB)
- Compress .glb file if needed

### CORS Issues
- Ensure frontend URL is in `Cors:AllowedOrigins` in appsettings.json
- Verify API base URL matches backend server

## File Size Considerations

- .glb file size: typically 1-50 MB depending on model complexity
- Preview image: typically 0.1-2 MB
- Cloudinary free tier: 25 credits/month (approximately 250-500 uploads)
- Consider optimizing models before upload

## Testing

Test the upload endpoint with curl:
```bash
curl -X POST http://localhost:5000/api/Product3DModel/upload \
  -F "productId=prd-101" \
  -F "modelFile=@model.glb" \
  -F "previewFile=@preview.jpg" \
  -F "modelName=My 3D Model"
```

## Next Steps

1. Set up Cloudinary account and credentials
2. Update `backend/appsettings.json` with credentials
3. Run database migration for `product_3d_models` table
4. Build backend: `dotnet build`
5. Integrate components into your product admin form
6. Test upload functionality
7. (Optional) Add 3D viewer to frontend using Three.js or similar
