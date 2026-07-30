const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');
const fs = require('fs');
const path = require('path');

// Configure Cloudinary SDK
cloudinary.config({
  cloud_name: (process.env.CLOUDINARY_CLOUD_NAME || '').trim(),
  api_key: (process.env.CLOUDINARY_API_KEY || '').trim(),
  api_secret: (process.env.CLOUDINARY_API_SECRET || '').trim(),
  secure: true
});

/**
 * Helper to determine appropriate folder and resource_type based on MIME type and filename.
 */
const getFolderAndResourceType = (mimeType, fileName) => {
  const ext = fileName.split('.').pop().toLowerCase();
  const mimeLower = (mimeType || '').toLowerCase();

  // Status stories folder
  if (fileName.startsWith('status_')) {
    const isVideo = mimeLower.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext);
    return { folder: 'status', resourceType: isVideo ? 'video' : 'image' };
  }

  // Profile pictures folder
  if (fileName.startsWith('profile_') || fileName.startsWith('avatar_')) {
    return { folder: 'profiles', resourceType: 'image' };
  }

  // Type detection
  if (mimeLower.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    return { folder: 'chat-images', resourceType: 'image' };
  }
  
  if (mimeLower.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) {
    return { folder: 'chat-videos', resourceType: 'video' };
  }

  if (mimeLower.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext)) {
    return { folder: 'voice-notes', resourceType: 'video' }; // Cloudinary treats audio files as resource_type 'video'
  }

  // Fallback for documents
  return { folder: 'documents', resourceType: 'raw' };
};

/**
 * Upload a file buffer to Cloudinary.
 * 
 * @param {Buffer} buffer - Decoded binary file buffer.
 * @param {string} fileName - Original filename.
 * @param {string} mimeType - File MIME type.
 * @returns {Promise<object>} Upload response containing secure_url and public_id.
 */
const uploadFile = async (buffer, fileName, mimeType) => {
  const { folder, resourceType } = getFolderAndResourceType(mimeType, fileName);

  console.log(`[STORAGE] Upload Started: Name="${fileName}", Folder="${folder}", Type="${resourceType}"`);

  // Max size limits validation (in bytes)
  const sizeLimit = resourceType === 'video' ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 50MB for video/audio, 10MB for others
  if (buffer.length > sizeLimit) {
    console.error(`[STORAGE] Upload Failed: File size (${(buffer.length / 1024 / 1024).toFixed(2)}MB) exceeds limit.`);
    throw new Error('File size limit exceeded');
  }

  // Check if Cloudinary is configured with actual credentials (not placeholders)
  const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
  const apiKey = (process.env.CLOUDINARY_API_KEY || '').trim();
  const apiSecret = (process.env.CLOUDINARY_API_SECRET || '').trim();

  const isCloudinaryConfigured = cloudName && 
                                 cloudName !== 'your_cloud_name' &&
                                 apiKey &&
                                 apiKey !== 'your_api_key' &&
                                 apiSecret &&
                                 apiSecret !== 'your_api_secret';

  if (!isCloudinaryConfigured) {
    console.log(`[STORAGE] Cloudinary not configured. Falling back to local storage for: ${fileName}`);
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const cleanName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const localFileName = `${Date.now()}-${cleanName}`;
    const localFilePath = path.join(uploadsDir, localFileName);
    
    fs.writeFileSync(localFilePath, buffer);
    console.log(`[STORAGE] Local Upload Success: Path="${localFilePath}", URL="/uploads/${localFileName}"`);
    return {
      secure_url: `/uploads/${localFileName}`,
      public_id: localFileName
    };
  }

  // Sanitize filename to avoid directory traversal or injection
  const cleanName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_').split('.')[0];
  const publicId = `${Date.now()}-${cleanName}`;

  const uploadOptions = {
    folder: folder,
    public_id: publicId,
    resource_type: resourceType,
    overwrite: true,
    invalidate: true
  };

  // Optimize images automatically
  if (resourceType === 'image') {
    uploadOptions.transformation = [
      { quality: 'auto', fetch_format: 'auto' }
    ];
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        console.error(`[STORAGE] Upload Failed: ${error.message}`);
        reject(new Error(`Cloudinary upload failed: ${error.message}`));
      } else {
        console.log(`[STORAGE] Upload Success: PublicId="${result.public_id}", URL="${result.secure_url}"`);
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id
        });
      }
    });

    const readable = new Readable();
    readable._read = () => {};
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};

/**
 * Delete a file from Cloudinary using its public_id.
 * 
 * @param {string} publicId - The unique Cloudinary public ID.
 * @param {string} resourceType - The resource type (image, video, raw).
 * @returns {Promise<object>} Deletion result.
 */
const deleteFile = async (publicId, resourceType = 'image') => {
  console.log(`[STORAGE] Delete Started: PublicId="${publicId}"`);
  
  if (!publicId) {
    throw new Error('Public ID is required for deletion');
  }

  // Check if it exists locally in the uploads directory
  const uploadsDir = path.join(__dirname, '../uploads');
  const localFilePath = path.join(uploadsDir, publicId);
  if (fs.existsSync(localFilePath)) {
    try {
      fs.unlinkSync(localFilePath);
      console.log(`[STORAGE] Local Delete Success: File="${localFilePath}"`);
      return { result: 'ok' };
    } catch (err) {
      console.error(`[STORAGE] Local Delete Failed: ${err.message}`);
      throw err;
    }
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    
    if (result.result === 'ok' || result.result === 'not found') {
      console.log(`[STORAGE] Delete Success: PublicId="${publicId}", Result="${result.result}"`);
      return result;
    } else {
      throw new Error(`Cloudinary deletion failed: ${result.result}`);
    }
  } catch (error) {
    console.error(`[STORAGE] Delete Failed: ${error.message}`);
    throw error;
  }
};

/**
 * Helper to extract public ID and resource type from a Cloudinary URL.
 * 
 * @param {string} url - Secure Cloudinary URL.
 * @returns {object|null} Parsed metadata.
 */
const parseCloudinaryUrl = (url) => {
  if (!url) return null;

  // Handle local URLs
  if (url.includes('/uploads/')) {
    try {
      const filename = url.split('/uploads/').pop();
      return { publicId: filename, resourceType: 'local' };
    } catch (err) {
      return null;
    }
  }

  if (!url.includes('res.cloudinary.com')) return null;

  try {
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;

    // Remaining path after 'upload/vXXXXXXXX/'
    const hasVersion = parts[uploadIndex + 1].startsWith('v');
    const pathStartIndex = uploadIndex + (hasVersion ? 2 : 1);
    const pathParts = parts.slice(pathStartIndex);

    // Reconstruct public_id with folders (excluding extension)
    const rawPublicId = pathParts.join('/');
    const publicId = rawPublicId.substring(0, rawPublicId.lastIndexOf('.'));
    
    // Guess resource type based on folders or URL pattern
    let resourceType = 'image';
    if (url.includes('/video/upload/')) {
      resourceType = 'video';
    } else if (url.includes('/raw/upload/')) {
      resourceType = 'raw';
    }

    return { publicId, resourceType };
  } catch (err) {
    return null;
  }
};

module.exports = {
  uploadFile,
  deleteFile,
  parseCloudinaryUrl
};
