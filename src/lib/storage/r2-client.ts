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
  private client: S3Client | null = null;
  private bucketName: string;
  private publicUrl: string;
  private isConfigured: boolean = false;

  constructor() {
    // Check if R2 is properly configured
    const requiredVars = [
      'CF_R2_ACCOUNT_ID',
      'CF_R2_ACCESS_KEY_ID', 
      'CF_R2_SECRET_ACCESS_KEY',
      'CF_R2_BUCKET_NAME',
      'CF_R2_ENDPOINT',
      'CF_R2_PUBLIC_URL'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length === 0) {
      this.isConfigured = true;
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
    } else {
      console.warn('Cloudflare R2 not configured. File upload/download features will be disabled. Missing variables:', missingVars.join(', '));
      this.isConfigured = false;
      this.bucketName = '';
      this.publicUrl = '';
    }
  }

  /**
   * Upload a file to R2 storage
   */
  async uploadFile(
    file: File, 
    filename: string, 
    metadata: Partial<FileMetadata> = {}
  ): Promise<UploadResult> {
    if (!this.isConfigured || !this.client) {
      return {
        success: false,
        error: 'Cloudflare R2 is not configured. File upload functionality is disabled.',
      };
    }

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
    if (!this.isConfigured || !this.client) {
      throw new Error('Cloudflare R2 is not configured. File access functionality is disabled.');
    }

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
    if (!this.isConfigured || !this.client) {
      console.warn('Cloudflare R2 is not configured. File deletion functionality is disabled.');
      return false;
    }

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
    if (!this.isConfigured || !this.client) {
      return false;
    }

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
    if (!this.isConfigured || !this.client) {
      return null;
    }

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

  /**
   * Check if R2 is properly configured
   */
  isR2Configured(): boolean {
    return this.isConfigured;
  }
}

// Export singleton instance
export const r2Client = new R2StorageClient();