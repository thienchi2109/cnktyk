/**
 * Cloudflare R2 Storage Client
 * Handles file upload, download, and management operations
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  type GetObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { ReadableStream as WebReadableStream } from 'stream/web';

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

  private resolveDownloadName(filename: string): string {
    const lastSegment = filename.split('/').filter(Boolean).pop();
    if (!lastSegment) {
      return 'download';
    }

    // Remove CRLF characters to avoid header injection and trim whitespace
    return lastSegment.replace(/[\r\n]/g, '').trim() || 'download';
  }

  private buildContentDisposition(filename: string, disposition: 'inline' | 'attachment'): string {
    if (disposition === 'attachment') {
      const safeName = this.resolveDownloadName(filename).replace(/"/g, "'");
      const encodedName = encodeURIComponent(safeName);
      return `attachment; filename="${safeName}"; filename*=UTF-8''${encodedName}`;
    }
    return 'inline';
  }

  /**
   * Get a signed URL for secure file access
   * @param filename - Object key stored in R2
   * @param expiresIn - Expiration window for the signed URL
   * @param disposition - Content disposition mode ('inline' | 'attachment')
   */
  async getSignedUrl(
    filename: string,
    expiresIn: number = 3600,
    disposition: 'inline' | 'attachment' = 'inline'
  ): Promise<string> {
    if (!this.isConfigured || !this.client) {
      throw new Error('Cloudflare R2 is not configured. File access functionality is disabled.');
    }

    const commandParams: GetObjectCommandInput = {
      Bucket: this.bucketName,
      Key: filename,
      ResponseContentDisposition: this.buildContentDisposition(filename, disposition),
    };

    const command = new GetObjectCommand(commandParams);

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

  /**
   * Download a file from R2 storage as a Buffer
   * Used for backup operations
   */
  async downloadFileStream(filename: string): Promise<Readable | null> {
    if (!this.isConfigured || !this.client) {
      console.warn('Cloudflare R2 is not configured. File download functionality is disabled.');
      return null;
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: filename,
      });

      const response = await this.client.send(command);
      const body = response.Body;

      if (!body) {
        return null;
      }

      if (body instanceof Readable) {
        return body;
      }

      if (typeof (body as any).transformToWebStream === 'function') {
        return Readable.fromWeb((body as any).transformToWebStream());
      }

      if (typeof Readable.fromWeb === 'function' && body instanceof WebReadableStream) {
        return Readable.fromWeb(body as WebReadableStream<any>);
      }

      console.warn('Unsupported R2 body stream type, returning null');
      return null;
    } catch (error) {
      console.error('R2 download stream error:', error);
      return null;
    }
  }

  async downloadFile(filename: string): Promise<Buffer | null> {
    const stream = await this.downloadFileStream(filename);

    if (!stream) {
      return null;
    }

    try {
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      return Buffer.concat(chunks);
    } catch (error) {
      console.error('R2 download error:', error);
      return null;
    }
  }
}

// Export singleton instance
export const r2Client = new R2StorageClient();
