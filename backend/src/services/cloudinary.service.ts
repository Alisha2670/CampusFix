import { UploadApiResponse } from 'cloudinary';
import cloudinary from '../config/cloudinary.js';
import { ENV } from '../config/env.js';

export class CloudinaryService {
  /**
   * Upload an in-memory buffer to Cloudinary using upload_stream
   */
  static async uploadImageBuffer(
    buffer: Buffer,
    folder: string = 'campusfix_complaints'
  ): Promise<string> {
    // If running in test mode without real Cloudinary credentials, return a mock URL
    if (ENV.NODE_ENV === 'test' && !ENV.CLOUDINARY_API_KEY) {
      return `https://res.cloudinary.com/mock/image/upload/v12345/test-image.jpg`;
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            return reject(
              new Error(`Cloudinary upload failed: ${error?.message || 'Unknown error'}`)
            );
          }
          resolve(result.secure_url);
        }
      );

      uploadStream.end(buffer);
    });
  }
}

