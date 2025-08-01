import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationConfig {
  enabled: boolean;
  hoursBeforeBackup: number;
  customMessage?: string | undefined;
}

export interface BackupReminder {
  id: string;
  backupDate: Date;
  notificationDate: Date;
  message: string;
}

export interface NotificationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: Notifications.PermissionStatus;
}

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  private static instance: NotificationService;
  private readonly STORAGE_KEY = 'notification_config';
  private readonly REMINDERS_KEY = 'backup_reminders';

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Request notification permissions from the user
   */
  public async requestPermissions(): Promise<NotificationPermissionStatus> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      // For Android, also request exact alarm permissions if available
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('backup-reminders', {
          name: 'Backup Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
        });
      }

      return {
        granted: finalStatus === 'granted',
        canAskAgain: finalStatus !== 'denied',
        status: finalStatus,
      };
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied' as Notifications.PermissionStatus,
      };
    }
  }

  /**
   * Get current notification permissions status
   */
  public async getPermissionStatus(): Promise<NotificationPermissionStatus> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return {
        granted: status === 'granted',
        canAskAgain: status !== 'denied',
        status,
      };
    } catch (error) {
      console.error('Error getting notification permissions:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied' as Notifications.PermissionStatus,
      };
    }
  }

  /**
   * Schedule a backup reminder notification
   */
  public async scheduleBackupReminder(
    backupDate: Date,
    config: NotificationConfig
  ): Promise<string> {
    try {
      const permissions = await this.getPermissionStatus();
      if (!permissions.granted) {
        throw new Error('Notification permissions not granted');
      }

      // Calculate notification date
      const notificationDate = new Date(backupDate);
      notificationDate.setHours(notificationDate.getHours() - config.hoursBeforeBackup);

      // Don't schedule notifications for past dates
      if (notificationDate <= new Date()) {
        throw new Error('Cannot schedule notification for past date');
      }

      const message = config.customMessage || 
        `Time to organize your photos! Backup scheduled for ${backupDate.toLocaleDateString()}`;

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Pictia Backup Reminder',
          body: message,
          sound: 'default',
          priority: 'high',
          data: {
            type: 'backup_reminder',
            backupDate: backupDate.toISOString(),
            action: 'open_organize',
          },
        },
        trigger: {
          date: notificationDate,
        } as any, // Type assertion to work around expo-notifications type issues
      });

      // Store reminder info
      const reminder: BackupReminder = {
        id: notificationId,
        backupDate,
        notificationDate,
        message,
      };

      await this.storeReminder(reminder);

      return notificationId;
    } catch (error) {
      console.error('Error scheduling backup reminder:', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  public async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      await this.removeReminder(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
      throw error;
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  public async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await AsyncStorage.removeItem(this.REMINDERS_KEY);
    } catch (error) {
      console.error('Error canceling all notifications:', error);
      throw error;
    }
  }

  /**
   * Get all scheduled reminders
   */
  public async getScheduledReminders(): Promise<BackupReminder[]> {
    try {
      const remindersJson = await AsyncStorage.getItem(this.REMINDERS_KEY);
      if (!remindersJson) return [];

      const reminders: BackupReminder[] = JSON.parse(remindersJson);
      
      // Convert date strings back to Date objects
      return reminders.map(reminder => ({
        ...reminder,
        backupDate: new Date(reminder.backupDate),
        notificationDate: new Date(reminder.notificationDate),
      }));
    } catch (error) {
      console.error('Error getting scheduled reminders:', error);
      return [];
    }
  }

  /**
   * Send an immediate test notification
   */
  public async sendTestNotification(): Promise<void> {
    try {
      const permissions = await this.getPermissionStatus();
      if (!permissions.granted) {
        throw new Error('Notification permissions not granted');
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Pictia Test Notification',
          body: 'This is a test notification to verify your settings are working correctly.',
          sound: 'default',
          data: {
            type: 'test',
          },
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  }

  /**
   * Save notification configuration
   */
  public async saveNotificationConfig(config: NotificationConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Error saving notification config:', error);
      throw error;
    }
  }

  /**
   * Load notification configuration
   */
  public async loadNotificationConfig(): Promise<NotificationConfig> {
    try {
      const configJson = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (!configJson) {
        // Return default configuration
        return {
          enabled: true,
          hoursBeforeBackup: 24, // 1 day before
        };
      }

      return JSON.parse(configJson);
    } catch (error) {
      console.error('Error loading notification config:', error);
      // Return default configuration on error
      return {
        enabled: true,
        hoursBeforeBackup: 24,
      };
    }
  }

  /**
   * Handle notification tap events
   */
  public setupNotificationHandlers(
    onBackupReminderTap: () => void,
    onTestNotificationTap?: () => void
  ): void {
    // Handle notification tap when app is in foreground
    Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
    });

    // Handle notification tap when app is in background or closed
    Notifications.addNotificationResponseReceivedListener((response) => {
      const { data } = response.notification.request.content;
      
      switch (data?.type) {
        case 'backup_reminder':
          onBackupReminderTap();
          break;
        case 'test':
          onTestNotificationTap?.();
          break;
        default:
          console.log('Unknown notification type:', data?.type);
      }
    });
  }

  /**
   * Clean up expired reminders
   */
  public async cleanupExpiredReminders(): Promise<void> {
    try {
      const reminders = await this.getScheduledReminders();
      const now = new Date();
      
      const activeReminders = reminders.filter(
        reminder => reminder.notificationDate > now
      );

      await AsyncStorage.setItem(this.REMINDERS_KEY, JSON.stringify(activeReminders));
    } catch (error) {
      console.error('Error cleaning up expired reminders:', error);
    }
  }

  /**
   * Store a reminder in AsyncStorage
   */
  private async storeReminder(reminder: BackupReminder): Promise<void> {
    try {
      const existingReminders = await this.getScheduledReminders();
      const updatedReminders = [...existingReminders, reminder];
      await AsyncStorage.setItem(this.REMINDERS_KEY, JSON.stringify(updatedReminders));
    } catch (error) {
      console.error('Error storing reminder:', error);
      throw error;
    }
  }

  /**
   * Remove a reminder from AsyncStorage
   */
  private async removeReminder(notificationId: string): Promise<void> {
    try {
      const existingReminders = await this.getScheduledReminders();
      const updatedReminders = existingReminders.filter(
        reminder => reminder.id !== notificationId
      );
      await AsyncStorage.setItem(this.REMINDERS_KEY, JSON.stringify(updatedReminders));
    } catch (error) {
      console.error('Error removing reminder:', error);
    }
  }
}

export default NotificationService;