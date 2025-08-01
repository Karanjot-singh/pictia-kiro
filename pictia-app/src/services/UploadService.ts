import { MediaPickerResult, UploadItem, UploadSession } from '@/types';
import { GooglePhotosClient } from './GooglePhotosClient';
import { NewMediaItem } from '@/types/googlePhotos';

export interface UploadServiceConfig {
  googlePhotosClient: GooglePhotosClient;
  maxConcurrentUploads?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface UploadValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class UploadService {
  private config: UploadServiceConfig;
  private activeUploads = new Map<string, AbortController>();
  private uploadQueue: UploadItem[] = [];
  private isProcessing = false;

  constructor(config: UploadServiceConfig) {
    this.config = {
      maxConcurrentUploads: 3,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config,
    };
  }

  /**
   * Validate media files before upload
   */
  validateMedia(media: MediaPickerResult[]): UploadValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const item of media) {
      // Check file size (Google Photos has a 200MB limit)
      if (item.fileSize > 200 * 1024 * 1024) {
        errors.push(`${item.fileName}: File size exceeds 200MB limit`);
      }

      // Check MIME type
      if (!this.isSupportedMimeType(item.mimeType)) {
        errors.push(`${item.fileName}: Unsupported file type (${item.mimeType})`);
      }

      // Warnings for large files
      if (item.fileSize > 50 * 1024 * 1024) {
        warnings.push(`${item.fileName}: Large file size may take longer to upload`);
      }

      // Check dimensions for images
      if (item.mimeType.startsWith('image/') && item.width && item.height) {
        if (item.width > 16383 || item.height > 16383) {
          errors.push(`${item.fileName}: Image dimensions exceed maximum (16383x16383)`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Create upload session and start uploading
   */
  async startUploadSession(
    media: MediaPickerResult[],
    onProgress?: (session: UploadSession) => void
  ): Promise<UploadSession> {
    const validation = this.validateMedia(media);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const session: UploadSession = {
      id: `upload_${Date.now()}`,
      items: media.map((file, index) => ({
        id: `${Date.now()}_${index}`,
        file,
        status: 'pending',
        progress: 0,
      })),
      startTime: new Date(),
      totalItems: media.length,
      completedItems: 0,
      failedItems: 0,
    };

    // Add items to queue
    this.uploadQueue.push(...session.items);

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processUploadQueue(onProgress ? (items) => {
        session.items = items;
        session.completedItems = items.filter(item => item.status === 'completed').length;
        session.failedItems = items.filter(item => item.status === 'failed').length;
        
        if (session.completedItems + session.failedItems === session.totalItems) {
          session.endTime = new Date();
        }
        
        onProgress(session);
      } : undefined);
    }

    return session;
  }

  /**
   * Cancel an upload
   */
  cancelUpload(itemId: string): void {
    const controller = this.activeUploads.get(itemId);
    if (controller) {
      controller.abort();
      this.activeUploads.delete(itemId);
    }

    // Update item status in queue
    const item = this.uploadQueue.find(item => item.id === itemId);
    if (item && item.status === 'uploading') {
      item.status = 'failed';
      item.error = 'Upload cancelled by user';
    }
  }

  /**
   * Retry a failed upload
   */
  async retryUpload(itemId: string, onProgress?: (items: UploadItem[]) => void): Promise<void> {
    const item = this.uploadQueue.find(item => item.id === itemId);
    if (!item || item.status !== 'failed') {
      return;
    }

    item.status = 'pending';
    item.progress = 0;
    delete item.error;

    if (!this.isProcessing) {
      this.processUploadQueue(onProgress);
    }
  }

  /**
   * Process the upload queue
   */
  private async processUploadQueue(onProgress?: (items: UploadItem[]) => void): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    const maxConcurrent = this.config.maxConcurrentUploads || 3;

    try {
      while (true) {
        // Find pending items
        const pendingItems = this.uploadQueue.filter(item => item.status === 'pending');
        if (pendingItems.length === 0) break;

        // Get currently uploading items
        const uploadingItems = this.uploadQueue.filter(item => item.status === 'uploading');
        const availableSlots = maxConcurrent - uploadingItems.length;

        if (availableSlots > 0) {
          // Start new uploads
          const itemsToStart = pendingItems.slice(0, availableSlots);
          const uploadPromises = itemsToStart.map(item => this.uploadSingleItem(item, onProgress));
          
          // Wait for at least one to complete before continuing
          if (uploadPromises.length > 0) {
            await Promise.race(uploadPromises);
          }
        } else {
          // Wait a bit before checking again
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Wait for all remaining uploads to complete
      const remainingUploads = this.uploadQueue.filter(item => item.status === 'uploading');
      if (remainingUploads.length > 0) {
        await new Promise<void>((resolve) => {
          const checkComplete = () => {
            const stillUploading = this.uploadQueue.filter(item => item.status === 'uploading');
            if (stillUploading.length === 0) {
              resolve();
            } else {
              setTimeout(checkComplete, 100);
            }
          };
          checkComplete();
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Upload a single item
   */
  private async uploadSingleItem(
    item: UploadItem,
    onProgress?: (items: UploadItem[]) => void
  ): Promise<void> {
    const controller = new AbortController();
    this.activeUploads.set(item.id, controller);

    try {
      item.status = 'uploading';
      item.progress = 0;
      onProgress?.(this.uploadQueue);

      // Step 1: Read file data
      const fileData = await this.readFileAsArrayBuffer(item.file.uri);
      
      item.progress = 25;
      onProgress?.(this.uploadQueue);

      // Step 2: Upload bytes to get upload token
      const uploadToken = await this.config.googlePhotosClient.uploadBytes(
        fileData,
        item.file.fileName
      );
      
      item.uploadToken = uploadToken;
      item.progress = 75;
      onProgress?.(this.uploadQueue);

      // Step 3: Create media item
      const newMediaItem: NewMediaItem = {
        description: `Uploaded via Pictia - ${item.file.fileName}`,
        simpleMediaItem: {
          fileName: item.file.fileName,
          uploadToken: uploadToken,
        },
      };

      const result = await this.config.googlePhotosClient.batchCreateMediaItems([newMediaItem]);
      
      if (result.newMediaItemResults.length > 0) {
        const mediaItemResult = result.newMediaItemResults[0];
        
        if (mediaItemResult && mediaItemResult.status.code === 0 && mediaItemResult.mediaItem) {
          item.status = 'completed';
          item.progress = 100;
          item.mediaItem = mediaItemResult.mediaItem;
        } else {
          throw new Error(mediaItemResult?.status.message || 'Upload failed');
        }
      } else {
        throw new Error('No media item result returned');
      }

    } catch (error) {
      if (controller.signal.aborted) {
        item.status = 'failed';
        item.error = 'Upload cancelled';
      } else {
        item.status = 'failed';
        item.error = error instanceof Error ? error.message : 'Unknown error';
        
        // Retry logic
        if (item.progress < 100 && this.shouldRetry(error)) {
          await this.retryWithBackoff(item, onProgress);
        }
      }
    } finally {
      this.activeUploads.delete(item.id);
      onProgress?.(this.uploadQueue);
    }
  }

  /**
   * Read file as ArrayBuffer
   */
  private async readFileAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`Failed to read file: ${response.statusText}`);
    }
    return await response.arrayBuffer();
  }

  /**
   * Check if error should trigger a retry
   */
  private shouldRetry(error: any): boolean {
    if (error?.type === 'rate_limit_exceeded' || error?.type === 'network_error') {
      return true;
    }
    
    if (error?.statusCode >= 500) {
      return true;
    }
    
    return false;
  }

  /**
   * Retry upload with exponential backoff
   */
  private async retryWithBackoff(
    item: UploadItem,
    onProgress?: (items: UploadItem[]) => void,
    attempt: number = 1
  ): Promise<void> {
    if (attempt > (this.config.retryAttempts || 3)) {
      return;
    }

    const delay = (this.config.retryDelay || 1000) * Math.pow(2, attempt - 1);
    await new Promise(resolve => setTimeout(resolve, delay));

    item.status = 'pending';
    item.progress = 0;
    delete item.error;

    await this.uploadSingleItem(item, onProgress);
  }

  /**
   * Check if MIME type is supported by Google Photos
   */
  private isSupportedMimeType(mimeType: string): boolean {
    const supportedTypes = [
      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/tiff',
      'image/bmp',
      'image/heic',
      'image/heif',
      // Videos
      'video/mp4',
      'video/quicktime',
      'video/avi',
      'video/mov',
      'video/wmv',
      'video/flv',
      'video/webm',
      'video/3gp',
      'video/mkv',
    ];

    return supportedTypes.includes(mimeType.toLowerCase());
  }



  /**
   * Get upload statistics
   */
  getUploadStats(): {
    totalItems: number;
    pendingItems: number;
    uploadingItems: number;
    completedItems: number;
    failedItems: number;
  } {
    return {
      totalItems: this.uploadQueue.length,
      pendingItems: this.uploadQueue.filter(item => item.status === 'pending').length,
      uploadingItems: this.uploadQueue.filter(item => item.status === 'uploading').length,
      completedItems: this.uploadQueue.filter(item => item.status === 'completed').length,
      failedItems: this.uploadQueue.filter(item => item.status === 'failed').length,
    };
  }

  /**
   * Clear completed uploads from queue
   */
  clearCompleted(): void {
    this.uploadQueue = this.uploadQueue.filter(item => 
      item.status !== 'completed' && item.status !== 'failed'
    );
  }

  /**
   * Clear all uploads and cancel active ones
   */
  clearAll(): void {
    // Cancel all active uploads
    for (const [itemId, controller] of this.activeUploads) {
      controller.abort();
    }
    this.activeUploads.clear();
    
    // Clear queue
    this.uploadQueue = [];
    this.isProcessing = false;
  }
}