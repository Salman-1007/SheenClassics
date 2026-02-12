# Cloudinary Setup Instructions

## Step 1: Create Cloudinary Account
1. Go to https://cloudinary.com
2. Sign up for a free account
3. Copy your credentials:
   - Cloud Name
   - API Key
   - API Secret

## Step 2: Add to .env file
```
CLOUD_NAME=your_cloud_name
CLOUD_API_KEY=your_api_key
CLOUD_API_SECRET=your_api_secret
CLOUDINARY_UPLOAD_PRESET=sheenclassics
```

## Step 3: Create Unsigned Upload Preset (CRITICAL)
1. Log in to Cloudinary Dashboard
2. Go to **Settings** (gear icon)
3. Click **Upload** tab
4. Scroll to **Upload presets**
5. Click **Add upload preset**
6. Fill in:
   - **Name**: `sheenclassics` (or match CLOUDINARY_UPLOAD_PRESET in .env)
   - **Mode**: Select **Unsigned**
   - **Folder**: `sheenclassics/products` (optional)
7. Click **Save**

## Why Unsigned Upload Preset?
- Allows frontend/backend uploads without API secret being exposed
- Prevents "Invalid Signature" errors
- More secure for production environments

## Testing
After setup, try uploading an image in admin panel:
- Go to `/admin/products/add`
- Select an image file (jpg, jpeg, png, max 5MB)
- Submit the form
- Image should upload to Cloudinary and display in product list

## Troubleshooting
- **Invalid Signature Error**: Check if upload preset is set to "Unsigned"
- **Upload fails silently**: Check browser console and server logs
- **Image not displaying**: Verify Cloudinary URL is saved in MongoDB
