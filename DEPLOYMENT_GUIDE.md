# 3D Model Feature - Deployment Guide

For the current Render and Vercel environment variable list, see [ENVIRONMENT.md](ENVIRONMENT.md).

## ? You're Ready to Deploy!

Your code is complete and compiled. You only need to:

1. **Run SQL migration** (3 missing tables)
2. **Configure Cloudinary**
3. **Push to staging**

---

## ?? Your Database Status

**Current**: 21 tables  
**Missing**: 3 tables  
**After migration**: 24 tables ?

Missing tables:
- `dashboard_metrics`
- `dashboard_notifications`
- `product_3d_models` (NEW - for 3D models)

---

## ?? Step-by-Step Deployment

### Step 1: Database Migration (2 minutes)

1. Go to **Neon Console** ? **SQL Editor**
2. Open `backend/SQL/MIGRATION_ONLY_MISSING_TABLES.sql`
3. Copy entire file
4. Paste into Neon SQL Editor
5. Click **Run**
6. Verify: `SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';` ? Should show **24**

### Step 2: Configure Cloudinary

1. Create Cloudinary account: https://cloudinary.com
2. Get credentials:
   - Cloud Name
   - API Key
   - API Secret

3. In **Render Dashboard**, go to your backend service:
   - **Settings** ? **Environment**
   - Add these variables:
     ```
     Cloudinary__CloudName=your-cloud-name
     Cloudinary__ApiKey=your-api-key
     Cloudinary__ApiSecret=your-api-secret
     ```
   - Click **Save** (will trigger redeploy)

### Step 3: Push to Staging

```bash
git add .
git commit -m "feat: add 3D model upload with Cloudinary integration"
git push origin feature/tj/frontend/admin-side
```

Render will auto-build and deploy your backend.

### Step 4: Test

Test the 3D model endpoints:

```bash
# Upload a model
curl -X POST https://your-backend-url/api/Product3DModel/upload \
  -F "productId=prd-123" \
  -F "modelFile=@model.glb" \
  -F "previewFile=@preview.jpg"

# List models
curl https://your-backend-url/api/Product3DModel/product/prd-123

# Delete model
curl -X DELETE https://your-backend-url/api/Product3DModel/model-id
```

---

## ?? Files Changed

### Backend
- ? `Models/Product3DModel.cs` (NEW)
- ? `Models/Product.cs` (modified)
- ? `DTO/Product3DModelDTO.cs` (NEW)
- ? `Services/CloudinaryService.cs` (NEW)
- ? `Controllers/Product3DModelController.cs` (NEW)
- ? `Data/AppDbContext.cs` (modified)
- ? `Program.cs` (modified)
- ? `backend.csproj` (modified)
- ? `SQL/MIGRATION_ONLY_MISSING_TABLES.sql` (NEW - run this!)

### Frontend
- ? `admin/src/types.ts` (modified)
- ? `admin/src/components/Model3DUpload.tsx` (NEW)
- ? `admin/src/components/Model3DList.tsx` (NEW)

---

## ?? API Endpoints

All implemented and ready to use:

```
POST   /api/Product3DModel/upload          Upload .glb + preview image
GET    /api/Product3DModel/product/{id}    List models for product
GET    /api/Product3DModel/{id}            Get single model
POST   /api/Product3DModel                 Create model (direct URLs)
PUT    /api/Product3DModel/{id}            Update model
DELETE /api/Product3DModel/{id}            Delete model
```

---

## ?? Frontend Components

Ready to integrate into your admin:

```tsx
import { Model3DUpload } from './components/Model3DUpload'
import { Model3DList } from './components/Model3DList'

// Upload component
<Model3DUpload
  productId={productId}
  onUploadSuccess={(model) => { /* handle success */ }}
  onError={(error) => { /* handle error */ }}
/>

// List component
<Model3DList productId={productId} />
```

---

## ? Feature Overview

**What users can do:**
- Upload .glb 3D models
- Upload preview images
- View uploaded models
- Delete models
- See file sizes and upload dates

**Where files go:**
- Models: Cloudinary CDN
- Metadata: PostgreSQL database
- Folder structure: `/products/{productId}/3d-models/` and `/3d-previews/`

---

## ?? Pre-Deployment Checklist

- [ ] Read this guide
- [ ] Run SQL migration in Neon
- [ ] Create Cloudinary account
- [ ] Add Cloudinary env vars to Render
- [ ] Push code to staging
- [ ] Wait for Render build
- [ ] Test endpoints
- [ ] Verify in database
- [ ] Test admin UI

---

## ?? Troubleshooting

**Upload returns 400 Bad Request**
? Check productId and modelFile in request

**Upload returns 401 Unauthorized**
? Verify Cloudinary credentials in Render env vars

**Database error: product_3d_models doesn't exist**
? Run migration SQL in Neon console

**CORS error in admin UI**
? Backend URL should be in Cors:AllowedOrigins

---

## ?? Next Steps

1. ? Code is done (compiled, no errors)
2. ? Run SQL migration
3. ? Add Cloudinary credentials
4. ? Push to staging
5. ? Deploy & test

**Everything else is automated!** ??

---

**Questions?** Check:
- 3D setup ? `3D_MODEL_SETUP.md`
- Database ? `MINIMAL_MIGRATION_GUIDE.md`
- This guide ? Read above

Good luck! ??
