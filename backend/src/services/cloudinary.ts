import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Lazy initialization to ensure env vars are loaded
let cloudinaryConfigured = false;

function ensureCloudinaryConfigured() {
  if (!cloudinaryConfigured) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error('Cloudinary credentials not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env file');
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    cloudinaryConfigured = true;
  }
}

export interface UploadResult {
  url: string;
  public_id: string;
  secure_url: string;
}

/**
 * Upload image buffer to Cloudinary
 */
export async function uploadImage(
  buffer: Buffer,
  folder: string = 'centralign-forms'
): Promise<UploadResult> {
  ensureCloudinaryConfigured();
  
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [
          { width: 1920, height: 1080, crop: 'limit' }, // Limit max size
          { quality: 'auto' },
          { fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve({
            url: result.url,
            public_id: result.public_id,
            secure_url: result.secure_url,
          });
        } else {
          reject(new Error('Upload failed: No result returned'));
        }
      }
    );

    const stream = Readable.from(buffer);
    stream.pipe(uploadStream);
  });
}

/**
 * Upload multiple images
 */
export async function uploadImages(
  buffers: Buffer[],
  folder: string = 'centralign-forms'
): Promise<UploadResult[]> {
  return Promise.all(buffers.map(buffer => uploadImage(buffer, folder)));
}

/**
 * Delete image from Cloudinary
 */
export async function deleteImage(publicId: string): Promise<void> {
  ensureCloudinaryConfigured();
  await cloudinary.uploader.destroy(publicId);
}

