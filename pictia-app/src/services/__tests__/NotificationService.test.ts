import { NotificationService, NotificationConfig } from '../NotificationService';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: {
    HIGH: 'high',
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

describe('NotificationService', () => {
  let notificationService: NotificationService;
  const mockGetPermissionsAsync = Notifications.getPermissionsAsync as jest.Mock;
  const mockRequestPermissionsAsync = Notifications.requestPermissionsAsync as jest.Mock;
  const mockScheduleNotificationAsync = Notifications.scheduleNotificationAsync as jest.Mock;
  const mockCancelScheduledNotificationAsync = Notifications.cancelScheduledNotificationAsync as jest.Mock;
  const mockAsyncStorageGetItem = AsyncStorage.getItem as jest.Mock;
  const mockAsyncStorageSetItem = AsyncStorage.setItem as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    notificationService = NotificationService.getInstance();
  });

  describe('getInstance', () => {
    it('should return the same instance (singleton)', () => {
      const instance1 = NotificationService.getInstance();
      const instance2 = NotificationService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('requestPermissions', () => {
    it('should request permissions when not granted', async () => {
      mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
      mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' });

      const result = await notificationService.requestPermissions();

      expect(mockGetPermissionsAsync).toHaveBeenCalled();
      expect(mockRequestPermissionsAsync).toHaveBeenCalled();
      expect(result).toEqual({
        granted: true,
        canAskAgain: true,
        status: 'granted',
      });
    });

    it('should not request permissions when already granted', async () => {
      mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' });

      const result = await notificationService.requestPermissions();

      expect(mockGetPermissionsAsync).toHaveBeenCalled();
      expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
      expect(result).toEqual({
        granted: true,
        canAskAgain: true,
        status: 'granted',
      });
    });

    it('should handle permission denied', async () => {
      mockGetPermissionsAsync.mockResolvedValue({ status: 'denied' });

      const result = await notificationService.requestPermissions();

      expect(result).toEqual({
        granted: false,
        canAskAgain: false,
        status: 'denied',
      });
    });

    it('should handle errors gracefully', async () => {
      mockGetPermissionsAsync.mockRejectedValue(new Error('Permission error'));

      const result = await notificationService.requestPermissions();

      expect(result).toEqual({
        granted: false,
        canAskAgain: false,
        status: 'denied',
      });
    });
  });

  describe('scheduleBackupReminder', () => {
    const mockConfig: NotificationConfig = {
      enabled: true,
      hoursBeforeBackup: 24,
      customMessage: 'Test reminder',
    };

    beforeEach(() => {
      mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' });
      mockAsyncStorageGetItem.mockResolvedValue('[]');
      mockAsyncStorageSetItem.mockResolvedValue(undefined);
    });

    it('should schedule a backup reminder successfully', async () => {
      const backupDate = new Date('2024-12-01T10:00:00Z');
      const expectedNotificationId = 'notification-123';
      mockScheduleNotificationAsync.mockResolvedValue(expectedNotificationId);

      const result = await notificationService.scheduleBackupReminder(backupDate, mockConfig);

      expect(mockScheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Pictia Backup Reminder',
          body: 'Test reminder',
          sound: 'default',
          priority: 'high',
          data: {
            type: 'backup_reminder',
            backupDate: backupDate.toISOString(),
            action: 'open_organize',
          },
        },
        trigger: {
          date: new Date('2024-11-30T10:00:00Z'), // 24 hours before
          channelId: undefined, // iOS
        },
      });

      expect(result).toBe(expectedNotificationId);
    });

    it('should throw error when permissions not granted', async () => {
      mockGetPermissionsAsync.mockResolvedValue({ status: 'denied' });
      const backupDate = new Date('2024-12-01T10:00:00Z');

      await expect(
        notificationService.scheduleBackupReminder(backupDate, mockConfig)
      ).rejects.toThrow('Notification permissions not granted');
    });

    it('should throw error for past notification dates', async () => {
      const pastDate = new Date('2020-01-01T10:00:00Z');

      await expect(
        notificationService.scheduleBackupReminder(pastDate, mockConfig)
      ).rejects.toThrow('Cannot schedule notification for past date');
    });

    it('should use default message when custom message not provided', async () => {
      const backupDate = new Date('2024-12-01T10:00:00Z');
      const configWithoutMessage: NotificationConfig = { 
        ...mockConfig, 
        customMessage: undefined 
      };
      mockScheduleNotificationAsync.mockResolvedValue('notification-123');

      await notificationService.scheduleBackupReminder(backupDate, configWithoutMessage);

      expect(mockScheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            body: expect.stringContaining('Time to organize your photos!'),
          }),
        })
      );
    });
  });

  describe('cancelNotification', () => {
    it('should cancel a notification successfully', async () => {
      const notificationId = 'notification-123';
      mockAsyncStorageGetItem.mockResolvedValue(JSON.stringify([
        {
          id: notificationId,
          backupDate: '2024-12-01T10:00:00Z',
          notificationDate: '2024-11-30T10:00:00Z',
          message: 'Test',
        },
      ]));
      mockAsyncStorageSetItem.mockResolvedValue(undefined);

      await notificationService.cancelNotification(notificationId);

      expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith(notificationId);
      expect(mockAsyncStorageSetItem).toHaveBeenCalledWith(
        'backup_reminders',
        JSON.stringify([])
      );
    });
  });

  describe('loadNotificationConfig', () => {
    it('should load saved configuration', async () => {
      const savedConfig: NotificationConfig = {
        enabled: false,
        hoursBeforeBackup: 48,
        customMessage: 'Custom message',
      };
      mockAsyncStorageGetItem.mockResolvedValue(JSON.stringify(savedConfig));

      const result = await notificationService.loadNotificationConfig();

      expect(result).toEqual(savedConfig);
    });

    it('should return default configuration when none saved', async () => {
      mockAsyncStorageGetItem.mockResolvedValue(null);

      const result = await notificationService.loadNotificationConfig();

      expect(result).toEqual({
        enabled: true,
        hoursBeforeBackup: 24,
      });
    });

    it('should return default configuration on error', async () => {
      mockAsyncStorageGetItem.mockRejectedValue(new Error('Storage error'));

      const result = await notificationService.loadNotificationConfig();

      expect(result).toEqual({
        enabled: true,
        hoursBeforeBackup: 24,
      });
    });
  });

  describe('saveNotificationConfig', () => {
    it('should save configuration successfully', async () => {
      const config: NotificationConfig = {
        enabled: true,
        hoursBeforeBackup: 12,
        customMessage: 'Test message',
      };
      mockAsyncStorageSetItem.mockResolvedValue(undefined);

      await notificationService.saveNotificationConfig(config);

      expect(mockAsyncStorageSetItem).toHaveBeenCalledWith(
        'notification_config',
        JSON.stringify(config)
      );
    });

    it('should handle save errors', async () => {
      const config: NotificationConfig = {
        enabled: true,
        hoursBeforeBackup: 12,
      };
      mockAsyncStorageSetItem.mockRejectedValue(new Error('Storage error'));

      await expect(notificationService.saveNotificationConfig(config)).rejects.toThrow('Storage error');
    });
  });

  describe('sendTestNotification', () => {
    it('should send test notification when permissions granted', async () => {
      mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' });
      mockScheduleNotificationAsync.mockResolvedValue('test-notification');

      await notificationService.sendTestNotification();

      expect(mockScheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Pictia Test Notification',
          body: 'This is a test notification to verify your settings are working correctly.',
          sound: 'default',
          data: {
            type: 'test',
          },
        },
        trigger: null,
      });
    });

    it('should throw error when permissions not granted', async () => {
      mockGetPermissionsAsync.mockResolvedValue({ status: 'denied' });

      await expect(notificationService.sendTestNotification()).rejects.toThrow(
        'Notification permissions not granted'
      );
    });
  });

  describe('getScheduledReminders', () => {
    it('should return scheduled reminders with parsed dates', async () => {
      const remindersData = [
        {
          id: 'reminder-1',
          backupDate: '2024-12-01T10:00:00Z',
          notificationDate: '2024-11-30T10:00:00Z',
          message: 'Test reminder',
        },
      ];
      mockAsyncStorageGetItem.mockResolvedValue(JSON.stringify(remindersData));

      const result = await notificationService.getScheduledReminders();

      expect(result).toHaveLength(1);
      expect(result[0]?.backupDate).toBeInstanceOf(Date);
      expect(result[0]?.notificationDate).toBeInstanceOf(Date);
      expect(result[0]?.id).toBe('reminder-1');
    });

    it('should return empty array when no reminders stored', async () => {
      mockAsyncStorageGetItem.mockResolvedValue(null);

      const result = await notificationService.getScheduledReminders();

      expect(result).toEqual([]);
    });
  });

  describe('cleanupExpiredReminders', () => {
    it('should remove expired reminders', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const remindersData = [
        {
          id: 'active-reminder',
          backupDate: futureDate.toISOString(),
          notificationDate: futureDate.toISOString(),
          message: 'Active reminder',
        },
        {
          id: 'expired-reminder',
          backupDate: pastDate.toISOString(),
          notificationDate: pastDate.toISOString(),
          message: 'Expired reminder',
        },
      ];

      mockAsyncStorageGetItem.mockResolvedValue(JSON.stringify(remindersData));
      mockAsyncStorageSetItem.mockResolvedValue(undefined);

      await notificationService.cleanupExpiredReminders();

      expect(mockAsyncStorageSetItem).toHaveBeenCalledWith(
        'backup_reminders',
        expect.stringContaining('active-reminder')
      );
      expect(mockAsyncStorageSetItem).toHaveBeenCalledWith(
        'backup_reminders',
        expect.not.stringContaining('expired-reminder')
      );
    });
  });
});