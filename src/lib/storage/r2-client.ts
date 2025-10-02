/**
 * Cloudflare R2 Storage Client
 * Handles file upload, download, and management operations
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface FileMetadata {
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  checksum: string;
  uploadedAt: Date;
  activityId?: string;
}

export interface UploadResult {
  success: boolean;
  fileUrl?: string;
  filename?: string;
  error?: string;
  metadata?: FileMetadata;
}

class R2StorageClient {
  private client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor() {
    if (!process.env.CF_R2_ACCOUNT_ID || !process.env.CF_R2_ACCESS_KEY_ID || !process.env.CF_R2_SECRET_ACCESS_KEY) {
      throw new Error('Missing Cloudflare R2 configuration. Please check environment variables.');
    }

    this.bucketName = process.env.CF_R2_BUCKET_NAME!;
    this.publicUrl = process.env.CF_R2_PUBLIC_URL!;

    this.client = new S3Client({
      region: 'auto',
      endpoint: process.env.CF_R2_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.CF_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CF_R2_SECRET_ACCESS_KEY!,
      },
    });
  }

  /**
   * Upload a file to R2 storage
   */
  async uploadFile(
    file: File, 
    filename: string, 
    metadata: Partial<FileMetadata> = {}
  ): Promise<UploadResult> {
    try {
      const buffer = await file.arrayBuffer();
      
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: filename,
        Body: new Uint8Array(buffer),
        ContentType: file.type,
        Metadata: {
          originalName: metadata.originalName || file.name,
          size: file.size.toString(),
          checksum: metadata.checksum || '',
          uploadedAt: new Date().toISOString(),
          activityId: metadata.activityId || '',
        },
      });

      await this.client.send(command);

      const fileUrl = `${this.publicUrl}/${filename}`;
      
      return {
        success: true,
        fileUrl,
        filename,
        metadata: {
          filename,
          originalName: metadata.originalName || file.name,
          size: file.size,
          mimeType: file.type,
          checksum: metadata.checksum || '',
          uploadedAt: new Date(),
          activityId: metadata.activityId,
        },
      };
    } catch (error) {
      console.error('R2 upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Get a signed URL for secure file access
   */
  async getSignedUrl(filename: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: filename,
    });

    return await getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Delete a file from R2 storage
   */
  async deleteFile(filename: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: filename,
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      console.error('R2 delete error:', error);
      return false;
    }
  }

  /**
   * Check if a file exists in R2 storage
   */
  async fileExists(filename: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: filename,
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file metadata from R2 storage
   */
  async getFileMetadata(filename: string): Promise<FileMetadata | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: filename,
      });

      const response = await this.client.send(command);
      
      return {
        filename,
        originalName: response.Metadata?.originalName || filename,
        size: response.ContentLength || 0,
        mimeType: response.ContentType || 'application/octet-stream',
        checksum: response.Metadata?.checksum || '',
        uploadedAt: new Date(response.Metadata?.uploadedAt || response.LastModified || new Date()),
        activityId: response.Metadata?.activityId,
      };
    } catch (error) {
      console.error('R2 metadata error:', error);
      return null;
    }
  }
}

// Export singleton instance
export const r2Client = new R2StorageClient();