import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { GooglePhotosClient } from './GooglePhotosClient';
import { NotificationService } from './NotificationService';
import { BackupLogger } from './BackupLogger';
import { 
  BackupConfig, 
  BackupLog, 
  CachedMediaItem
} from '../types';
import {
  NewMediaItem,
  GooglePhotosError,
  GooglePhotosErrorType 
} from '../types/googlePhotos';

// Enhanced backup types for the service
export interface BackupProgress {
  backupId: string;
  currentItem: number;
  totalItems: number;
  currentFileName: string;
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
  estimatedTimeRemaining?: number;
  uploadSpeed?: number; // bytes per second
}

export interface BackupQueueItem {
  id: string;
  mediaItem: CachedMediaItem;
  retryCount: number;
  lastAttempt?: Date;
  error?: string;
  priority: 'high' | 'normal' | 'low';
}

export interface BackupResult {
  success: boolean;
  backupLog: BackupLog;
  failedItems: BackupQueueItem[];
  uploadedCount: number;
  totalCount: number;
}

export interface BackupServiceConfig {
  maxRetries: number;
  retryDelay: number; // milliseconds
  batchSize: number;
  maxConcurrentUploads: number;
  enableProgressTracking: boolean;
  enableNotifications: boolean;
}

/**
 * BackupService handles photo backup operations with queue management,
 * progress tracking, and error recovery
 */
export class BackupService {
  private googlePhotosClient: GooglePhotosClient;
  private notificationService: NotificationService;
  private config: BackupServiceConfig;
  private currentBackup: BackupLog | null = null;
  private backupQueue: BackupQueueItem[] = [];
  private progressCallbacks: ((progress: BackupProgress) => void)[] = [];
  private isBackupInProgress = false;

  // Storage keys
  private static readonly BACKUP_CONFIG_KEY = 'backup_config';
  private static readonly BACKUP_LOGS_KEY = 'backup_logs';
  private static readonly BACKUP_QUEUE_KEY = 'backup_queue';
  private static readonly FAILED_UPLOADS_KEY = 'failed_uploads';

  constructor(
    googlePhotosClient: GooglePhotosClient,
    notificationService: NotificationService,
    config: Partial<BackupServiceConfig> = {}
  ) {
    this.googlePhotosClient = googlePhotosClient;
    this.notificationService = notificationService;
    this.config = {
      maxRetries: 3,
      retryDelay: 5000, // 5 seconds
      batchSize: 10,
      maxConcurrentUploads: 3,
      enableProgressTracking: true,
      enableNotifications: true,
      ...config
    };

    // Initialize backup queue from storage
    this.initializeBackupQueue();
  }

  /**
   * Initialize backup queue from persistent storage
   */
  private async initializeBackupQueue(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem(BackupService.BACKUP_QUEUE_KEY);
      if (queueData) {
        this.backupQueue = JSON.parse(queueData);
      }

      const failedUploads = await AsyncStorage.getItem(BackupService.FAILED_UPLOADS_KEY);
      if (failedUploads) {
        const failed: BackupQueueItem[] = JSON.parse(failedUploads);
        // Add failed uploads back to queue with high priority
        failed.forEach(item => {
          item.priority = 'high';
          this.backupQueue.unshift(item);
        });
        await this.persistBackupQueue();
      }
    } catch (error) {
      console.error('Failed to initialize backup queue:', error);
    }
  }

  /**
   * Persist backup queue to storage
   */
  private async persistBackupQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        BackupService.BACKUP_QUEUE_KEY,
        JSON.stringify(this.backupQueue)
      );
    } catch (error) {
      console.error('Failed to persist backup queue:', error);
    }
  }

  /**
   * Get current backup configuration
   */
  async getBackupConfig(): Promise<BackupConfig | null> {
    try {
      const configData = await AsyncStorage.getItem(BackupService.BACKUP_CONFIG_KEY);
      return configData ? JSON.parse(configData) : null;
    } catch (error) {
      console.error('Failed to get backup config:', error);
      return null;
    }
  }

  /**
   * Save backup configuration with validation
   */
  async setBackupConfig(config: BackupConfig): Promise<void> {
    const validationResult = this.validateBackupConfig(config);
    if (!validationResult.isValid) {
      throw new Error(`Invalid backup configuration: ${validationResult.errors.join(', ')}`);
    }

    try {
      await AsyncStorage.setItem(
        BackupService.BACKUP_CONFIG_KEY,
        JSON.stringify(config)
      );
    } catch (error) {
      console.error('Failed to save backup config:', error);
      throw error;
    }
  }

  /**
   * Validate backup configuration
   */
  validateBackupConfig(config: BackupConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.frequency || !['weekly', 'monthly'].includes(config.frequency)) {
      errors.push('Frequency must be "weekly" or "monthly"');
    }

    if (config.frequency === 'monthly' && config.dayOfMonth) {
      if (config.dayOfMonth < 1 || config.dayOfMonth > 31) {
        errors.push('Day of month must be between 1 and 31');
      }
    }

    if (config.frequency === 'weekly' && config.dayOfWeek !== undefined) {
      if (config.dayOfWeek < 0 || config.dayOfWeek > 6) {
        errors.push('Day of week must be between 0 (Sunday) and 6 (Saturday)');
      }
    }

    if (config.notificationOffset < 0 || config.notificationOffset > 168) {
      errors.push('Notification offset must be between 0 and 168 hours');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Trigger manual backup
   */
  async triggerManualBackup(mediaItems: CachedMediaItem[]): Promise<BackupResult> {
    if (this.isBackupInProgress) {
      throw new Error('Backup already in progress');
    }

    const backupId = this.generateBackupId();
    const backupLog: BackupLog = {
      id: backupId,
      type: 'manual',
      startTime: new Date(),
      status: 'in_progress',
      itemsUploaded: 0,
      totalItems: mediaItems.length
    };

    this.currentBackup = backupLog;
    this.isBackupInProgress = true;

    // Log backup start
    await BackupLogger.logBackupStart(backupLog);

    try {
      // Add items to backup queue
      const queueItems = mediaItems.map(item => this.createBackupQueueItem(item));
      this.backupQueue.push(...queueItems);
      await this.persistBackupQueue();

      await BackupLogger.logInfo(
        backupId,
        `Added ${queueItems.length} items to backup queue`,
        { queueSize: this.backupQueue.length },
        'system'
      );

      // Start backup process
      const result = await this.processBackupQueue(backupLog);
      
      // Update backup log
      backupLog.endTime = new Date();
      backupLog.status = result.success ? 'completed' : 'failed';
      backupLog.itemsUploaded = result.uploadedCount;
      
      if (!result.success && result.failedItems.length > 0) {
        backupLog.errorMessage = `${result.failedItems.length} items failed to upload`;
        await BackupLogger.logWarning(
          backupId,
          `Backup completed with ${result.failedItems.length} failed items`,
          { failedItems: result.failedItems.map(item => item.mediaItem.filename) },
          'upload'
        );
      }

      await this.saveBackupLog(backupLog);
      await BackupLogger.logBackupComplete(backupLog);

      // Send completion notification
      if (this.config.enableNotifications) {
        await this.sendBackupCompletionNotification(backupLog);
      }

      return result;
    } catch (error) {
      backupLog.endTime = new Date();
      backupLog.status = 'failed';
      backupLog.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await BackupLogger.logError(
        backupId,
        'Backup failed with critical error',
        error instanceof Error ? error : new Error('Unknown error'),
        undefined,
        'system'
      );
      
      await this.saveBackupLog(backupLog);
      
      throw error;
    } finally {
      this.currentBackup = null;
      this.isBackupInProgress = false;
    }
  }

  /**
   * Schedule backup based on configuration
   * Note: This method is deprecated. Use BackupScheduler.scheduleBackup() instead.
   */
  async scheduleBackup(config: BackupConfig): Promise<void> {
    await this.setBackupConfig(config);
    
    if (config.notificationEnabled) {
      const nextBackupDate = this.calculateNextBackupDate(config);
      
      const notificationConfig = {
        enabled: true,
        hoursBeforeBackup: config.notificationOffset,
        customMessage: 'Your scheduled photo backup is coming up. Organize your photos now!',
      };
      
      await this.notificationService.scheduleBackupReminder(nextBackupDate, notificationConfig);
    }
  }

  /**
   * Cancel scheduled backup
   * Note: This method is deprecated. Use BackupScheduler.cancelScheduledBackup() instead.
   */
  async cancelScheduledBackup(): Promise<void> {
    await this.notificationService.cancelNotification('scheduled_backup_reminder');
  }

  /**
   * Get backup history
   */
  async getBackupHistory(): Promise<BackupLog[]> {
    try {
      const logsData = await AsyncStorage.getItem(BackupService.BACKUP_LOGS_KEY);
      if (!logsData) return [];
      
      const logs: BackupLog[] = JSON.parse(logsData);
      // Convert date strings back to Date objects
      return logs.map(log => ({
        ...log,
        startTime: new Date(log.startTime),
        ...(log.endTime && { endTime: new Date(log.endTime) })
      }));
    } catch (error) {
      console.error('Failed to get backup history:', error);
      return [];
    }
  }

  /**
   * Get current backup progress
   */
  getCurrentBackupProgress(): BackupProgress | null {
    if (!this.currentBackup || !this.isBackupInProgress) {
      return null;
    }

    const totalBytes = this.backupQueue.reduce((sum, item) => {
      // Estimate file size based on media type (rough estimates)
      const estimatedSize = item.mediaItem.mimeType.startsWith('video/') ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
      return sum + estimatedSize;
    }, 0);

    const uploadedBytes = Math.floor(totalBytes * (this.currentBackup.itemsUploaded / this.currentBackup.totalItems));

    return {
      backupId: this.currentBackup.id,
      currentItem: this.currentBackup.itemsUploaded,
      totalItems: this.currentBackup.totalItems,
      currentFileName: this.backupQueue[0]?.mediaItem.filename || '',
      bytesUploaded: uploadedBytes,
      totalBytes,
      percentage: Math.floor((this.currentBackup.itemsUploaded / this.currentBackup.totalItems) * 100)
    };
  }

  /**
   * Add progress callback for real-time updates
   */
  addProgressCallback(callback: (progress: BackupProgress) => void): void {
    this.progressCallbacks.push(callback);
  }

  /**
   * Remove progress callback
   */
  removeProgressCallback(callback: (progress: BackupProgress) => void): void {
    const index = this.progressCallbacks.indexOf(callback);
    if (index > -1) {
      this.progressCallbacks.splice(index, 1);
    }
  }

  /**
   * Get failed uploads for retry
   */
  async getFailedUploads(): Promise<BackupQueueItem[]> {
    try {
      const failedData = await AsyncStorage.getItem(BackupService.FAILED_UPLOADS_KEY);
      return failedData ? JSON.parse(failedData) : [];
    } catch (error) {
      console.error('Failed to get failed uploads:', error);
      return [];
    }
  }

  /**
   * Retry failed uploads
   */
  async retryFailedUploads(): Promise<BackupResult> {
    const failedItems = await this.getFailedUploads();
    if (failedItems.length === 0) {
      throw new Error('No failed uploads to retry');
    }

    // Reset retry count and add back to queue
    const retryItems = failedItems.map(item => ({
      ...item,
      retryCount: 0,
      priority: 'high' as const
    }));

    const mediaItems = retryItems.map(item => item.mediaItem);
    
    // Clear failed uploads storage
    await AsyncStorage.removeItem(BackupService.FAILED_UPLOADS_KEY);
    
    return this.triggerManualBackup(mediaItems);
  }

  /**
   * Process backup queue
   */
  private async processBackupQueue(backupLog: BackupLog): Promise<BackupResult> {
    const failedItems: BackupQueueItem[] = [];
    let uploadedCount = 0;

    // Process items in batches
    while (this.backupQueue.length > 0) {
      const batch = this.backupQueue.splice(0, this.config.batchSize);
      
      const batchPromises = batch.map(async (item) => {
        try {
          await this.uploadMediaItem(item);
          uploadedCount++;
          backupLog.itemsUploaded = uploadedCount;
          
          // Notify progress callbacks
          this.notifyProgressCallbacks();
          
          return { success: true, item };
        } catch (error) {
          item.retryCount++;
          item.lastAttempt = new Date();
          item.error = error instanceof Error ? error.message : 'Unknown error';
          
          if (item.retryCount < this.config.maxRetries) {
            // Add back to queue for retry
            this.backupQueue.push(item);
          } else {
            failedItems.push(item);
          }
          
          return { success: false, item, error };
        }
      });

      await Promise.allSettled(batchPromises);
      
      // Small delay between batches to avoid rate limiting
      if (this.backupQueue.length > 0) {
        await this.delay(1000);
      }
    }

    // Save failed items for later retry
    if (failedItems.length > 0) {
      await AsyncStorage.setItem(
        BackupService.FAILED_UPLOADS_KEY,
        JSON.stringify(failedItems)
      );
    }

    await this.persistBackupQueue();

    return {
      success: failedItems.length === 0,
      backupLog,
      failedItems,
      uploadedCount,
      totalCount: backupLog.totalItems
    };
  }

  /**
   * Upload individual media item
   */
  private async uploadMediaItem(queueItem: BackupQueueItem): Promise<void> {
    const { mediaItem } = queueItem;
    const backupId = this.currentBackup?.id || 'unknown';
    
    try {
      await BackupLogger.logDebug(
        backupId,
        `Starting upload for ${mediaItem.filename}`,
        { 
          fileName: mediaItem.filename,
          mimeType: mediaItem.mimeType,
          retryCount: queueItem.retryCount 
        },
        'upload'
      );

      // For now, we'll simulate the upload process since we don't have actual file data
      // In a real implementation, you would:
      // 1. Get the actual file data from the device
      // 2. Upload bytes to get upload token
      // 3. Create media item using the token
      
      const newMediaItem: NewMediaItem = {
        description: `Uploaded via Pictia - ${mediaItem.filename}`,
        simpleMediaItem: {
          fileName: mediaItem.filename,
          uploadToken: `mock_token_${Date.now()}` // This would be the real upload token
        }
      };

      // This would be the actual upload call
      await this.googlePhotosClient.batchCreateMediaItems([newMediaItem]);

      await BackupLogger.logInfo(
        backupId,
        `Successfully uploaded ${mediaItem.filename}`,
        { fileName: mediaItem.filename },
        'upload'
      );
    } catch (error) {
      await BackupLogger.logUploadError(
        backupId,
        mediaItem.filename,
        error instanceof Error ? error : new Error('Upload failed'),
        queueItem.retryCount
      );
      throw error;
    }
  }

  /**
   * Create backup queue item from media item
   */
  private createBackupQueueItem(mediaItem: CachedMediaItem): BackupQueueItem {
    return {
      id: `backup_${mediaItem.id}_${Date.now()}`,
      mediaItem,
      retryCount: 0,
      priority: 'normal'
    };
  }

  /**
   * Calculate next backup date based on configuration
   */
  private calculateNextBackupDate(config: BackupConfig): Date {
    const now = new Date();
    const nextBackup = new Date(now);

    if (config.frequency === 'weekly') {
      const dayOfWeek = config.dayOfWeek || 0; // Default to Sunday
      const daysUntilBackup = (dayOfWeek - now.getDay() + 7) % 7;
      nextBackup.setDate(now.getDate() + (daysUntilBackup === 0 ? 7 : daysUntilBackup));
    } else if (config.frequency === 'monthly') {
      const dayOfMonth = config.dayOfMonth || 1;
      nextBackup.setDate(dayOfMonth);
      
      // If the day has already passed this month, move to next month
      if (nextBackup <= now) {
        nextBackup.setMonth(nextBackup.getMonth() + 1);
      }
    }

    // Set time to noon to avoid timezone issues
    nextBackup.setHours(12, 0, 0, 0);
    
    return nextBackup;
  }

  /**
   * Save backup log to storage
   */
  private async saveBackupLog(backupLog: BackupLog): Promise<void> {
    try {
      const existingLogs = await this.getBackupHistory();
      const updatedLogs = [...existingLogs, backupLog];
      
      // Keep only last 50 logs
      if (updatedLogs.length > 50) {
        updatedLogs.splice(0, updatedLogs.length - 50);
      }
      
      await AsyncStorage.setItem(
        BackupService.BACKUP_LOGS_KEY,
        JSON.stringify(updatedLogs)
      );
    } catch (error) {
      console.error('Failed to save backup log:', error);
    }
  }

  /**
   * Send backup completion notification
   */
  private async sendBackupCompletionNotification(backupLog: BackupLog): Promise<void> {
    const title = backupLog.status === 'completed' ? 'Backup Completed' : 'Backup Failed';
    const body = backupLog.status === 'completed' 
      ? `Successfully backed up ${backupLog.itemsUploaded} photos`
      : `Backup failed: ${backupLog.errorMessage}`;

    // Use the same pattern as sendTestNotification to send immediate notification
    try {
      const permissions = await this.notificationService.getPermissionStatus();
      if (permissions.granted) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: 'default',
            data: { type: 'backup_completion', backupId: backupLog.id }
          },
          trigger: null, // Send immediately
        });
      }
    } catch (error) {
      console.error('Failed to send backup completion notification:', error);
    }
  }

  /**
   * Notify all progress callbacks
   */
  private notifyProgressCallbacks(): void {
    if (!this.config.enableProgressTracking) return;
    
    const progress = this.getCurrentBackupProgress();
    if (progress) {
      this.progressCallbacks.forEach(callback => {
        try {
          callback(progress);
        } catch (error) {
          console.error('Progress callback error:', error);
        }
      });
    }
  }

  /**
   * Generate unique backup ID
   */
  private generateBackupId(): string {
    return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if backup is currently in progress
   */
  isBackupRunning(): boolean {
    return this.isBackupInProgress;
  }

  /**
   * Get backup queue status
   */
  getBackupQueueStatus(): { pending: number; failed: number; total: number } {
    const failed = this.backupQueue.filter(item => item.retryCount >= this.config.maxRetries).length;
    const pending = this.backupQueue.length - failed;
    
    return {
      pending,
      failed,
      total: this.backupQueue.length
    };
  }
}