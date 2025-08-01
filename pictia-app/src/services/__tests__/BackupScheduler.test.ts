import AsyncStorage from '@react-native-async-storage/async-storage';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { BackupScheduler, ScheduledBackupInfo, BackupScheduleHistory } from '../BackupScheduler';
import { BackupService } from '../BackupService';
import { NotificationService } from '../NotificationService';
import { BackupConfig } from '../../types';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-task-manager');
jest.mock('expo-background-fetch');

// Mock BackupService
const mockBackupService = {
  validateBackupConfig: jest.fn(),
  triggerManualBackup: jest.fn(),
} as unknown as BackupService;

// Mock NotificationService
const mockNotificationService = {
  scheduleBackupReminder: jest.fn(),
  cancelNotification: jest.fn(),
} as unknown as NotificationService;

describe('BackupScheduler', () => {
  let backupScheduler: BackupScheduler;
  const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
  const mockTaskManager = TaskManager as jest.Mocked<typeof TaskManager>;
  const mockBackgroundFetch = BackgroundFetch as jest.Mocked<typeof BackgroundFetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockTaskManager.defineTask.mockImplementation(() => {});
    mockTaskManager.isTaskRegisteredAsync.mockResolvedValue(false);
    mockBackgroundFetch.registerTaskAsync.mockResolvedValue();
    mockBackgroundFetch.unregisterTaskAsync.mockResolvedValue();
    mockBackgroundFetch.getStatusAsync.mockResolvedValue(BackgroundFetch.BackgroundFetchStatus.Available);
    
    (mockBackupService.validateBackupConfig as jest.Mock).mockReturnValue({
      isValid: true,
      errors: []
    });

    backupScheduler = new BackupScheduler(mockBackupService, mockNotificationService);
  });

  describe('scheduleBackup', () => {
    const validConfig: BackupConfig = {
      frequency: 'weekly',
      dayOfWeek: 1, // Monday
      notificationEnabled: true,
      notificationOffset: 2
    };

    it('should schedule a weekly backup successfully', async () => {
      const result = await backupScheduler.scheduleBackup(validConfig);

      expect(result).toMatchObject({
        config: validConfig,
        isActive: true,
        executionCount: 0
      });
      expect(result.id).toBeDefined();
      expect(result.nextExecutionDate).toBeInstanceOf(Date);
      expect(result.createdAt).toBeInstanceOf(Date);

      // Verify storage was called
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'scheduled_backup_config',
        expect.stringContaining(result.id)
      );

      // Verify background task registration
      expect(mockBackgroundFetch.registerTaskAsync).toHaveBeenCalled();

      // Verify notification scheduling
      expect(mockNotificationService.scheduleBackupReminder).toHaveBeenCalled();
    });

    it('should schedule a monthly backup successfully', async () => {
      const monthlyConfig: BackupConfig = {
        frequency: 'monthly',
        dayOfMonth: 15,
        notificationEnabled: false,
        notificationOffset: 24
      };

      const result = await backupScheduler.scheduleBackup(monthlyConfig);

      expect(result.config.frequency).toBe('monthly');
      expect(result.config.dayOfMonth).toBe(15);
      expect(mockNotificationService.scheduleBackupReminder).not.toHaveBeenCalled();
    });

    it('should throw error for invalid configuration', async () => {
      const invalidConfig = {
        frequency: 'invalid',
        notificationEnabled: false,
        notificationOffset: 0
      } as any;

      (mockBackupService.validateBackupConfig as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['Invalid frequency']
      });

      await expect(backupScheduler.scheduleBackup(invalidConfig)).rejects.toThrow(
        'Invalid backup configuration: Invalid frequency'
      );
    });

    it('should cancel existing schedule before creating new one', async () => {
      // First schedule
      await backupScheduler.scheduleBackup(validConfig);
      
      // Mock existing schedule in storage
      const existingSchedule: ScheduledBackupInfo = {
        id: 'existing_schedule',
        config: validConfig,
        nextExecutionDate: new Date(),
        isActive: true,
        createdAt: new Date(),
        executionCount: 0
      };
      
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(existingSchedule));

      // Schedule again
      await backupScheduler.scheduleBackup(validConfig);

      // Verify cancellation was called
      expect(mockBackgroundFetch.unregisterTaskAsync).toHaveBeenCalled();
      expect(mockNotificationService.cancelNotification).toHaveBeenCalled();
    });
  });

  describe('cancelScheduledBackup', () => {
    it('should cancel active backup schedule', async () => {
      const schedule: ScheduledBackupInfo = {
        id: 'test_schedule',
        config: {
          frequency: 'weekly',
          dayOfWeek: 1,
          notificationEnabled: true,
          notificationOffset: 2
        },
        nextExecutionDate: new Date(),
        isActive: true,
        createdAt: new Date(),
        executionCount: 0
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(schedule));

      await backupScheduler.cancelScheduledBackup();

      // Verify schedule was marked inactive
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'scheduled_backup_config',
        expect.stringContaining('"isActive":false')
      );

      // Verify background task unregistration
      expect(mockBackgroundFetch.unregisterTaskAsync).toHaveBeenCalled();

      // Verify notification cancellation
      expect(mockNotificationService.cancelNotification).toHaveBeenCalledWith('scheduled_backup_reminder');
    });

    it('should handle cancellation when no schedule exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);

      await expect(backupScheduler.cancelScheduledBackup()).resolves.not.toThrow();
    });
  });

  describe('rescheduleBackup', () => {
    it('should cancel existing and create new schedule', async () => {
      const newConfig: BackupConfig = {
        frequency: 'monthly',
        dayOfMonth: 1,
        notificationEnabled: false,
        notificationOffset: 12
      };

      const result = await backupScheduler.rescheduleBackup(newConfig);

      expect(result.config).toEqual(newConfig);
      expect(mockBackgroundFetch.unregisterTaskAsync).toHaveBeenCalled();
      expect(mockBackgroundFetch.registerTaskAsync).toHaveBeenCalled();
    });
  });

  describe('getCurrentSchedule', () => {
    it('should return null when no schedule exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);

      const result = await backupScheduler.getCurrentSchedule();

      expect(result).toBeNull();
    });

    it('should return parsed schedule from storage', async () => {
      const schedule: ScheduledBackupInfo = {
        id: 'test_schedule',
        config: {
          frequency: 'weekly',
          dayOfWeek: 1,
          notificationEnabled: true,
          notificationOffset: 2
        },
        nextExecutionDate: new Date('2024-01-15T12:00:00Z'),
        isActive: true,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        executionCount: 5
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(schedule));

      const result = await backupScheduler.getCurrentSchedule();

      expect(result).toMatchObject({
        id: 'test_schedule',
        config: schedule.config,
        isActive: true,
        executionCount: 5
      });
      expect(result?.nextExecutionDate).toBeInstanceOf(Date);
      expect(result?.createdAt).toBeInstanceOf(Date);
    });

    it('should handle storage errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage error'));

      const result = await backupScheduler.getCurrentSchedule();

      expect(result).toBeNull();
    });
  });

  describe('getScheduleHistory', () => {
    it('should return empty array when no history exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);

      const result = await backupScheduler.getScheduleHistory();

      expect(result).toEqual([]);
    });

    it('should return parsed history from storage', async () => {
      const history: BackupScheduleHistory[] = [
        {
          scheduleId: 'schedule_1',
          executionDate: new Date('2024-01-15T12:00:00Z'),
          status: 'success',
          backupLogId: 'backup_1'
        },
        {
          scheduleId: 'schedule_1',
          executionDate: new Date('2024-01-08T12:00:00Z'),
          status: 'failed',
          errorMessage: 'Network error'
        }
      ];

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(history));

      const result = await backupScheduler.getScheduleHistory();

      expect(result).toHaveLength(2);
      expect(result[0]?.status).toBe('success');
      expect(result[0]?.executionDate).toBeInstanceOf(Date);
      expect(result[1]?.status).toBe('failed');
      expect(result[1]?.errorMessage).toBe('Network error');
    });
  });

  describe('isBackgroundTaskSupported', () => {
    it('should return true when background fetch is available', async () => {
      mockBackgroundFetch.getStatusAsync.mockResolvedValueOnce(BackgroundFetch.BackgroundFetchStatus.Available);

      const result = await backupScheduler.isBackgroundTaskSupported();

      expect(result).toBe(true);
    });

    it('should return false when background fetch is restricted', async () => {
      mockBackgroundFetch.getStatusAsync.mockResolvedValueOnce(BackgroundFetch.BackgroundFetchStatus.Restricted);

      const result = await backupScheduler.isBackgroundTaskSupported();

      expect(result).toBe(false);
    });

    it('should return false when status check fails', async () => {
      mockBackgroundFetch.getStatusAsync.mockRejectedValueOnce(new Error('Status check failed'));

      const result = await backupScheduler.isBackgroundTaskSupported();

      expect(result).toBe(false);
    });
  });

  describe('getBackgroundFetchStatus', () => {
    it('should return correct status strings', async () => {
      mockBackgroundFetch.getStatusAsync.mockResolvedValueOnce(BackgroundFetch.BackgroundFetchStatus.Available);
      expect(await backupScheduler.getBackgroundFetchStatus()).toBe('available');

      mockBackgroundFetch.getStatusAsync.mockResolvedValueOnce(BackgroundFetch.BackgroundFetchStatus.Denied);
      expect(await backupScheduler.getBackgroundFetchStatus()).toBe('denied');

      mockBackgroundFetch.getStatusAsync.mockResolvedValueOnce(BackgroundFetch.BackgroundFetchStatus.Restricted);
      expect(await backupScheduler.getBackgroundFetchStatus()).toBe('restricted');
    });

    it('should return error when status check fails', async () => {
      mockBackgroundFetch.getStatusAsync.mockRejectedValueOnce(new Error('Status check failed'));

      const result = await backupScheduler.getBackgroundFetchStatus();

      expect(result).toBe('error');
    });
  });

  describe('getTimeUntilNextBackup', () => {
    it('should return null when no schedule exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);

      const result = await backupScheduler.getTimeUntilNextBackup();

      expect(result).toBeNull();
    });

    it('should return time until next backup', async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      const schedule: ScheduledBackupInfo = {
        id: 'test_schedule',
        config: {
          frequency: 'weekly',
          dayOfWeek: 1,
          notificationEnabled: true,
          notificationOffset: 2
        },
        nextExecutionDate: futureDate,
        isActive: true,
        createdAt: new Date(),
        executionCount: 0
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(schedule));

      const result = await backupScheduler.getTimeUntilNextBackup();

      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(60 * 60 * 1000); // Should be around 1 hour
    });

    it('should return 0 when backup is overdue', async () => {
      const pastDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      const schedule: ScheduledBackupInfo = {
        id: 'test_schedule',
        config: {
          frequency: 'weekly',
          dayOfWeek: 1,
          notificationEnabled: true,
          notificationOffset: 2
        },
        nextExecutionDate: pastDate,
        isActive: true,
        createdAt: new Date(),
        executionCount: 0
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(schedule));

      const result = await backupScheduler.getTimeUntilNextBackup();

      expect(result).toBe(0);
    });
  });

  describe('isBackupScheduled', () => {
    it('should return true when active schedule exists', async () => {
      const schedule: ScheduledBackupInfo = {
        id: 'test_schedule',
        config: {
          frequency: 'weekly',
          dayOfWeek: 1,
          notificationEnabled: true,
          notificationOffset: 2
        },
        nextExecutionDate: new Date(),
        isActive: true,
        createdAt: new Date(),
        executionCount: 0
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(schedule));

      const result = await backupScheduler.isBackupScheduled();

      expect(result).toBe(true);
    });

    it('should return false when no schedule exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);

      const result = await backupScheduler.isBackupScheduled();

      expect(result).toBe(false);
    });

    it('should return false when schedule is inactive', async () => {
      const schedule: ScheduledBackupInfo = {
        id: 'test_schedule',
        config: {
          frequency: 'weekly',
          dayOfWeek: 1,
          notificationEnabled: true,
          notificationOffset: 2
        },
        nextExecutionDate: new Date(),
        isActive: false,
        createdAt: new Date(),
        executionCount: 0
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(schedule));

      const result = await backupScheduler.isBackupScheduled();

      expect(result).toBe(false);
    });
  });

  describe('getScheduleSummary', () => {
    it('should return summary for active schedule', async () => {
      const nextBackup = new Date('2024-01-15T12:00:00Z');
      const lastExecuted = new Date('2024-01-08T12:00:00Z');
      
      const schedule: ScheduledBackupInfo = {
        id: 'test_schedule',
        config: {
          frequency: 'weekly',
          dayOfWeek: 1,
          notificationEnabled: true,
          notificationOffset: 2
        },
        nextExecutionDate: nextBackup,
        isActive: true,
        createdAt: new Date(),
        lastExecuted,
        executionCount: 3
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(schedule));

      const result = await backupScheduler.getScheduleSummary();

      expect(result).toEqual({
        isScheduled: true,
        frequency: 'weekly',
        nextBackup,
        lastExecuted,
        executionCount: 3
      });
    });

    it('should return not scheduled when no active schedule', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);

      const result = await backupScheduler.getScheduleSummary();

      expect(result).toEqual({
        isScheduled: false
      });
    });
  });

  describe('date calculations', () => {
    it('should calculate next weekly backup correctly', async () => {
      // Mock current date to be Wednesday (day 3)
      const mockDate = new Date('2024-01-10T10:00:00Z'); // Wednesday
      jest.spyOn(global, 'Date').mockImplementation(((...args: any[]) => {
        if (args.length === 0) {
          return mockDate as any;
        }
        return new (Date as any)(...args);
      }) as any);

      const config: BackupConfig = {
        frequency: 'weekly',
        dayOfWeek: 1, // Monday
        notificationEnabled: false,
        notificationOffset: 0
      };

      const result = await backupScheduler.scheduleBackup(config);

      // Next Monday should be 5 days from Wednesday
      const expectedDate = new Date('2024-01-15T12:00:00Z');
      expect(result.nextExecutionDate.getDay()).toBe(1); // Monday
      expect(result.nextExecutionDate.getHours()).toBe(12); // Noon

      jest.restoreAllMocks();
    });

    it('should calculate next monthly backup correctly', async () => {
      // Mock current date to be January 10th
      const mockDate = new Date('2024-01-10T10:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(((...args: any[]) => {
        if (args.length === 0) {
          return mockDate as any;
        }
        return new (Date as any)(...args);
      }) as any);

      const config: BackupConfig = {
        frequency: 'monthly',
        dayOfMonth: 15,
        notificationEnabled: false,
        notificationOffset: 0
      };

      const result = await backupScheduler.scheduleBackup(config);

      // Should be January 15th (same month since 15th hasn't passed)
      expect(result.nextExecutionDate.getDate()).toBe(15);
      expect(result.nextExecutionDate.getMonth()).toBe(0); // January
      expect(result.nextExecutionDate.getHours()).toBe(12); // Noon

      jest.restoreAllMocks();
    });

    it('should move to next month when day has passed', async () => {
      // Mock current date to be January 20th
      const mockDate = new Date('2024-01-20T10:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(((...args: any[]) => {
        if (args.length === 0) {
          return mockDate as any;
        }
        return new (Date as any)(...args);
      }) as any);

      const config: BackupConfig = {
        frequency: 'monthly',
        dayOfMonth: 15,
        notificationEnabled: false,
        notificationOffset: 0
      };

      const result = await backupScheduler.scheduleBackup(config);

      // Should be February 15th (next month since 15th has passed)
      expect(result.nextExecutionDate.getDate()).toBe(15);
      expect(result.nextExecutionDate.getMonth()).toBe(1); // February

      jest.restoreAllMocks();
    });
  });
});