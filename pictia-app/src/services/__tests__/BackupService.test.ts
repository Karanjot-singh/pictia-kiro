import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackupService, BackupServiceConfig } from '../BackupService';
import { GooglePhotosClient } from '../GooglePhotosClient';
import { NotificationService } from '../NotificationService';
import { BackupConfig, CachedMediaItem } from '../../types';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(),
}));

// Mock GooglePhotosClient
jest.mock('../GooglePhotosClient');
const MockedGooglePhotosClient = GooglePhotosClient as jest.MockedClass<typeof GooglePhotosClient>;

// Mock NotificationService
jest.mock('../NotificationService', () => ({
  NotificationService: jest.fn().mockImplementation(() => ({
    scheduleBackupReminder: jest.fn(),
    cancelNotification: jest.fn(),
    getPermissionStatus: jest.fn().mockResolvedValue({ granted: true }),
  })),
}));

describe('BackupService', () => {
  let backupService: BackupService;
  let mockGooglePhotosClient: jest.Mocked<GooglePhotosClient>;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockAsyncStorage: jest.Mocked<typeof AsyncStorage>;

  const mockConfig: BackupServiceConfig = {
    maxRetries: 2,
    retryDelay: 1000,
    batchSize: 5,
    maxConcurrentUploads: 2,
    enableProgressTracking: true,
    enableNotifications: true,
  };

  const mockMediaItem: CachedMediaItem = {
    id: 'test-media-1',
    filename: 'test-photo.jpg',
    mimeType: 'image/jpeg',
    baseUrl: 'https://example.com/photo.jpg',
    mediaMetadata: {
      creationTime: '2024-01-01T00:00:00Z',
      width: '1920',
      height: '1080',
    },
    cachedAt: Date.now(),
    lastAccessed: Date.now(),
    organizationStatus: 'keep',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockAsyncStorage.removeItem.mockResolvedValue();

    mockGooglePhotosClient = new MockedGooglePhotosClient({
      accessToken: 'test-token',
    }) as jest.Mocked<GooglePhotosClient>;

    mockNotificationService = {
      scheduleBackupReminder: jest.fn(),
      cancelNotification: jest.fn(),
      getPermissionStatus: jest.fn().mockResolvedValue({ granted: true }),
    } as any;

    backupService = new BackupService(
      mockGooglePhotosClient,
      mockNotificationService,
      mockConfig
    );
  });

  describe('Configuration Management', () => {
    it('should validate backup configuration correctly', async () => {
      const validConfig: BackupConfig = {
        frequency: 'weekly',
        dayOfWeek: 1,
        notificationEnabled: true,
        notificationOffset: 24,
      };

      const result = backupService.validateBackupConfig(validConfig);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid backup configuration', async () => {
      const invalidConfig: BackupConfig = {
        frequency: 'invalid' as any,
        dayOfMonth: 35, // Invalid day
        notificationEnabled: true,
        notificationOffset: -5, // Invalid offset
      };

      const result = backupService.validateBackupConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should save and retrieve backup configuration', async () => {
      const config: BackupConfig = {
        frequency: 'monthly',
        dayOfMonth: 15,
        notificationEnabled: true,
        notificationOffset: 48,
      };

      await backupService.setBackupConfig(config);
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'backup_config',
        JSON.stringify(config)
      );

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(config));
      const retrievedConfig = await backupService.getBackupConfig();
      
      expect(retrievedConfig).toEqual(config);
    });

    it('should throw error for invalid configuration', async () => {
      const invalidConfig: BackupConfig = {
        frequency: 'invalid' as any,
        notificationEnabled: true,
        notificationOffset: 24,
      };

      await expect(backupService.setBackupConfig(invalidConfig)).rejects.toThrow(
        'Invalid backup configuration'
      );
    });
  });

  describe('Manual Backup', () => {
    it('should trigger manual backup successfully', async () => {
      const mediaItems = [mockMediaItem];
      
      mockGooglePhotosClient.batchCreateMediaItems.mockResolvedValue({
        newMediaItemResults: [{
          uploadToken: 'test-token',
          status: { code: 0, message: 'Success' },
          mediaItem: mockMediaItem,
        }],
      });

      const result = await backupService.triggerManualBackup(mediaItems);

      expect(result.success).toBe(true);
      expect(result.uploadedCount).toBe(1);
      expect(result.totalCount).toBe(1);
      expect(result.failedItems).toHaveLength(0);
    });

    it('should handle backup failures and retry logic', async () => {
      const mediaItems = [mockMediaItem];
      
      // Mock failure on first attempts, success on retry
      mockGooglePhotosClient.batchCreateMediaItems
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          newMediaItemResults: [{
            uploadToken: 'test-token',
            status: { code: 0, message: 'Success' },
            mediaItem: mockMediaItem,
          }],
        });

      const result = await backupService.triggerManualBackup(mediaItems);

      expect(result.success).toBe(true);
      expect(mockGooglePhotosClient.batchCreateMediaItems).toHaveBeenCalledTimes(3);
    });

    it('should prevent concurrent backups', async () => {
      const mediaItems = [mockMediaItem];
      
      // Mock a slow backup
      mockGooglePhotosClient.batchCreateMediaItems.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      const backup1Promise = backupService.triggerManualBackup(mediaItems);
      
      await expect(backupService.triggerManualBackup(mediaItems)).rejects.toThrow(
        'Backup already in progress'
      );

      await backup1Promise;
    });

    it('should track backup progress', async () => {
      const mediaItems = [mockMediaItem, { ...mockMediaItem, id: 'test-media-2' }];
      let progressUpdates: any[] = [];

      backupService.addProgressCallback((progress) => {
        progressUpdates.push(progress);
      });

      mockGooglePhotosClient.batchCreateMediaItems.mockResolvedValue({
        newMediaItemResults: [{
          uploadToken: 'test-token',
          status: { code: 0, message: 'Success' },
          mediaItem: mockMediaItem,
        }],
      });

      await backupService.triggerManualBackup(mediaItems);

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1].totalItems).toBe(2);
    });
  });

  describe('Backup Queue Management', () => {
    it('should persist and restore backup queue', async () => {
      const queueData = JSON.stringify([{
        id: 'queue-item-1',
        mediaItem: mockMediaItem,
        retryCount: 1,
        priority: 'normal',
      }]);

      mockAsyncStorage.getItem.mockResolvedValueOnce(queueData);

      // Create new service instance to test initialization
      const newService = new BackupService(
        mockGooglePhotosClient,
        mockNotificationService,
        mockConfig
      );

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      const queueStatus = newService.getBackupQueueStatus();
      expect(queueStatus.total).toBe(1);
    });

    it('should handle failed uploads and retry logic', async () => {
      const failedUploads = [{
        id: 'failed-item-1',
        mediaItem: mockMediaItem,
        retryCount: 3,
        priority: 'high' as const,
        error: 'Upload failed',
      }];

      mockAsyncStorage.getItem
        .mockResolvedValueOnce(null) // backup_queue
        .mockResolvedValueOnce(JSON.stringify(failedUploads)); // failed_uploads

      // Create new service instance
      const newService = new BackupService(
        mockGooglePhotosClient,
        mockNotificationService,
        mockConfig
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      const queueStatus = newService.getBackupQueueStatus();
      expect(queueStatus.total).toBe(1);
    });

    it('should retry failed uploads', async () => {
      const failedUploads = [{
        id: 'failed-item-1',
        mediaItem: mockMediaItem,
        retryCount: 3,
        priority: 'high' as const,
        error: 'Upload failed',
      }];

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(failedUploads));
      mockGooglePhotosClient.batchCreateMediaItems.mockResolvedValue({
        newMediaItemResults: [{
          uploadToken: 'test-token',
          status: { code: 0, message: 'Success' },
          mediaItem: mockMediaItem,
        }],
      });

      const result = await backupService.retryFailedUploads();

      expect(result.success).toBe(true);
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('failed_uploads');
    });

    it('should throw error when no failed uploads to retry', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);

      await expect(backupService.retryFailedUploads()).rejects.toThrow(
        'No failed uploads to retry'
      );
    });
  });

  describe('Backup History', () => {
    it('should save and retrieve backup history', async () => {
      const mockLog = {
        id: 'backup-1',
        type: 'manual' as const,
        startTime: new Date('2024-01-01T00:00:00Z'),
        endTime: new Date('2024-01-01T00:05:00Z'),
        status: 'completed' as const,
        itemsUploaded: 5,
        totalItems: 5,
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([mockLog]));

      const history = await backupService.getBackupHistory();

      expect(history).toHaveLength(1);
      expect(history[0]?.id).toBe('backup-1');
      expect(history[0]?.startTime).toBeInstanceOf(Date);
    });

    it('should limit backup history to 50 entries', async () => {
      const existingLogs = Array.from({ length: 50 }, (_, i) => ({
        id: `backup-${i}`,
        type: 'manual' as const,
        startTime: new Date(),
        status: 'completed' as const,
        itemsUploaded: 1,
        totalItems: 1,
      }));

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(existingLogs));

      const mediaItems = [mockMediaItem];
      mockGooglePhotosClient.batchCreateMediaItems.mockResolvedValue({
        newMediaItemResults: [{
          uploadToken: 'test-token',
          status: { code: 0, message: 'Success' },
          mediaItem: mockMediaItem,
        }],
      });

      await backupService.triggerManualBackup(mediaItems);

      // Check that setItem was called with exactly 50 logs
      const setItemCalls = mockAsyncStorage.setItem.mock.calls.filter(
        call => call[0] === 'backup_logs'
      );
      const lastCall = setItemCalls[setItemCalls.length - 1];
      if (lastCall) {
        const savedLogs = JSON.parse(lastCall[1]);
        expect(savedLogs).toHaveLength(50);
      }
    });
  });

  describe('Backup Scheduling', () => {
    it('should schedule backup with notifications', async () => {
      const config: BackupConfig = {
        frequency: 'weekly',
        dayOfWeek: 1, // Monday
        notificationEnabled: true,
        notificationOffset: 24, // 24 hours before
      };

      await backupService.scheduleBackup(config);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'backup_config',
        JSON.stringify(config)
      );
      expect(mockNotificationService.scheduleBackupReminder).toHaveBeenCalled();
    });

    it('should cancel scheduled backup', async () => {
      await backupService.cancelScheduledBackup();

      expect(mockNotificationService.cancelNotification).toHaveBeenCalledWith(
        'scheduled_backup_reminder'
      );
    });
  });

  describe('Progress Tracking', () => {
    it('should provide current backup progress', async () => {
      expect(backupService.getCurrentBackupProgress()).toBeNull();

      const mediaItems = [mockMediaItem];
      mockGooglePhotosClient.batchCreateMediaItems.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          newMediaItemResults: [{
            uploadToken: 'test-token',
            status: { code: 0, message: 'Success' },
            mediaItem: mockMediaItem,
          }],
        }), 100))
      );

      const backupPromise = backupService.triggerManualBackup(mediaItems);
      
      // Wait a bit for backup to start
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const progress = backupService.getCurrentBackupProgress();
      expect(progress).not.toBeNull();
      expect(progress?.totalItems).toBe(1);

      await backupPromise;
    });

    it('should manage progress callbacks', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      backupService.addProgressCallback(callback1);
      backupService.addProgressCallback(callback2);

      backupService.removeProgressCallback(callback1);

      // Test that callbacks are managed correctly
      expect(backupService['progressCallbacks']).toHaveLength(1);
      expect(backupService['progressCallbacks']).toContain(callback2);
    });
  });

  describe('Service Status', () => {
    it('should report backup running status', () => {
      expect(backupService.isBackupRunning()).toBe(false);
    });

    it('should provide backup queue status', () => {
      const status = backupService.getBackupQueueStatus();
      
      expect(status).toHaveProperty('pending');
      expect(status).toHaveProperty('failed');
      expect(status).toHaveProperty('total');
      expect(typeof status.pending).toBe('number');
      expect(typeof status.failed).toBe('number');
      expect(typeof status.total).toBe('number');
    });
  });
});