# Cloudinary Storage Migration Documentation

This document describes the migration of AetherChat's media upload storage from the local server filesystem to **Cloudinary Cloud Storage**.

---

## 📦 Changes Summary

### 1. Dependencies Installed
- **`cloudinary` (Node.js SDK v2)**: Added to backend dependencies in `server/package.json`.

### 2. New Files Created
- **`server/services/cloudinaryService.js`**: Exposes Cloudinary configurations and helper methods:
  - `uploadFile(buffer, fileName, mimeType)`: Validates format/size, sanitizes name, maps to folder based on MIME type, and uploads file.
  - `deleteFile(publicId, resourceType)`: Deletes an asset from Cloudinary.
  - `parseCloudinaryUrl(url)`: Extracts public ID and resource type from a secure Cloudinary URL.

### 3. Files Modified
- **`server/package.json`**: Package dependencies updated to include Cloudinary.
- **`server/.env`**: Added placeholders for Cloudinary environment credentials.
- **`server/app.js`**:
  - Imported `uploadFile`, `deleteFile`, and `parseCloudinaryUrl` from the storage service.
  - Replaced the local directory writing (`fs.writeFileSync`) in `POST /api/media/upload` with the new Cloudinary upload service.
  - Integrated Cloudinary media asset deletion inside the status story segment deletion endpoint (`DELETE /api/status/:itemId`).

---

## ⚙️ Environment Configuration

Add the following credentials to your **`server/.env`** file. Ensure you never commit real keys to source control:

```env
# Cloudinary Storage Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## 🗺️ Upload Flow Comparison

### Before Migration (Local Storage)
```
React Frontend (Base64 fileData)
       ↓
POST /api/media/upload
       ↓
Express Server app.js
       ↓
Buffer.from(cleanBase64, 'base64')
       ↓
fs.writeFileSync('server/uploads/[safeName]')
       ↓
Return HTTP URL pointing to local server port
```

### After Migration (Cloudinary Cloud Storage)
```
React Frontend (Base64 fileData) - Unchanged!
       ↓
POST /api/media/upload - Unchanged!
       ↓
Express Server app.js (MIME type extraction & size checks)
       ↓
Cloudinary Storage Service (MIME/Extension mapping & Sanitization)
       ↓
Cloudinary Cloud Bucket (secure_url & public_id)
       ↓
Return secure_url HTTPS link to client - Unchanged structure!
```

---

## 📁 Cloudinary Folder Taxonomy

To keep the Cloudinary media library organized, uploads are dynamically mapped to specific folders depending on their MIME type and filename prefix:

| File Pattern / MIME Type | Cloudinary Folder | Resource Type | Description |
|:---|:---|:---|:---|
| Filename prefix: `status_` | `status/` | `image` | Status story uploads |
| Filename prefix: `profile_` / `avatar_` | `profiles/` | `image` | User profile avatar uploads |
| `image/*` | `chat-images/` | `image` | Messaging images (PNG, JPG, WebP, etc.) |
| `video/*` | `chat-videos/` | `video` | Messaging video attachments (MP4, MKV, etc.) |
| `audio/*` | `voice-notes/` | `video` | Recorded voice notes or audio files |
| Other formats (PDF, DOCX, TXT) | `documents/` | `raw` | Miscellaneous files and raw document attachments |

---

## 🛡️ Security Improvements

1. **Path Traversal Protection**: Filenames are sanitized using `.replace(/[^a-zA-Z0-9.-]/g, '_')` to remove invalid characters and prevent directory traversal attempts.
2. **File Size Hard Limits**: Before uploading to Cloudinary, the file size is verified. Large files are rejected early, avoiding bandwidth exhaustion:
   - **Video/Audio**: Maximum **50MB** allowed.
   - **Images/Documents**: Maximum **10MB** allowed.
3. **MIME Type Validation**: Rejects malformed base64 files lacking correct MIME header schemes.
4. **HTTPS Enforced**: Enforced `secure: true` in the Cloudinary configuration to guarantee all generated URLs use secure TLS/HTTPS links.

---

## 🛠️ Operational Strategies

### 1. Error Handling Strategy
- **Client validation**: Evaluates structure and formats before calling Cloudinary.
- **Size validation failures**: Throws distinct errors that map to standard `400 Bad Request` responses on the endpoint.
- **Cloudinary failures**: Upload failures are caught, logged securely, and return a general `500 Failed to upload media file` status without exposing backend API secrets or connection details.
- **Graceful Deletes**: If a media deletion fails during a status segment deletion, it is logged but fails silently without blocking the database update, ensuring a smooth user experience.

### 2. Logging Strategy
All logs are prefixed with `[STORAGE]` and are designed to avoid logging sensitive API keys or full base64 strings:
- **`[STORAGE] Upload Started: Name="[filename]", Folder="[folder]", Type="[type]"`**
- **`[STORAGE] Upload Success: PublicId="[publicId]", URL="[secureUrl]"`**
- **`[STORAGE] Upload Failed: [Error message]`**
- **`[STORAGE] Delete Started: PublicId="[publicId]"`**
- **`[STORAGE] Delete Success: PublicId="[publicId]", Result="[ok/not found]"`**
- **`[STORAGE] Delete Failed: [Error message]`**

---

## 📋 Testing & Rollback Plan

### Testing Checklist
- [ ] **Auth Sign-in**: Ensure user OTP verification and token storage are functioning normally.
- [ ] **Chat Texting**: Send a basic text message to confirm room sockets are running.
- [ ] **Chat Image**: Attach a JPG/PNG file and check that the secure Cloudinary URL is stored and rendered.
- [ ] **Chat Voice Note**: Record a voice note, upload it, and play it back in the chat.
- [ ] **Chat Document**: Send a PDF or text file and verify it downloads correctly.
- [ ] **Status Upload**: Post a media status and confirm it displays in the status viewer.
- [ ] **Status Deletion**: Delete a status story segment and check that the media is deleted from the Cloudinary dashboard.
- [ ] **Console Verification**: Check server console logs to verify `[STORAGE]` outputs.

### Rollback Plan
Should an issue arise with the Cloudinary integration:
1. Revert `server/app.js` to the previous commit (which uses local filesystem writing).
2. Local static serving (`/uploads` mapped to `server/uploads`) remains active, meaning local uploads will continue to work out of the box.
3. Remove the Cloudinary variables from `server/.env`.

---

## 🔮 Future Improvements
1. **Presigned Uploads**: Implement direct client-to-Cloudinary uploads using presigned signatures to offload base64 processing from the Express server.
2. **Image Optimization**: Apply dynamic Cloudinary transformations (like responsive resizing) for better performance on mobile viewports.
