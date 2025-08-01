import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '@/store';

// Base selector
const selectNotificationState = (state: RootState) => state.notification;

// Basic selectors
export const selectNotificationConfig = createSelector(
  selectNotificationState,
  (notification) => notification.config
);

export const selectNotificationPermissions = createSelector(
  selectNotificationState,
  (notification) => notification.permissions
);

export const selectScheduledReminders = createSelector(
  selectNotificationState,
  (notification) => notification.scheduledReminders
);

export const selectNotificationLoading = createSelector(
  selectNotificationState,
  (notification) => notification.isLoading
);

export const selectNotificationError = createSelector(
  selectNotificationState,
  (notification) => notification.error
);

export const selectLastTestNotificationSent = createSelector(
  selectNotificationState,
  (notification) => notification.lastTestNotificationSent
);

// Computed selectors
export const selectNotificationsEnabled = createSelector(
  selectNotificationConfig,
  selectNotificationPermissions,
  (config, permissions) => config.enabled && permissions?.granted === true
);

export const selectActiveReminders = createSelector(
  selectScheduledReminders,
  (reminders) => {
    const now = new Date();
    return reminders.filter(reminder => reminder.notificationDate > now);
  }
);

export const selectExpiredReminders = createSelector(
  selectScheduledReminders,
  (reminders) => {
    const now = new Date();
    return reminders.filter(reminder => reminder.notificationDate <= now);
  }
);

export const selectUpcomingReminders = createSelector(
  selectActiveReminders,
  (activeReminders) => {
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    return activeReminders.filter(
      reminder => reminder.notificationDate <= next24Hours
    ).sort((a, b) => a.notificationDate.getTime() - b.notificationDate.getTime());
  }
);

export const selectReminderById = createSelector(
  [selectScheduledReminders, (_, reminderId: string) => reminderId],
  (reminders, reminderId) => reminders.find(reminder => reminder.id === reminderId)
);

export const selectNotificationStats = createSelector(
  selectScheduledReminders,
  selectNotificationPermissions,
  selectNotificationConfig,
  (reminders, permissions, config) => {
    const now = new Date();
    const activeCount = reminders.filter(r => r.notificationDate > now).length;
    const expiredCount = reminders.filter(r => r.notificationDate <= now).length;
    
    return {
      totalReminders: reminders.length,
      activeReminders: activeCount,
      expiredReminders: expiredCount,
      permissionsGranted: permissions?.granted === true,
      notificationsEnabled: config.enabled,
      hoursBeforeBackup: config.hoursBeforeBackup,
    };
  }
);

export const selectCanSendNotifications = createSelector(
  selectNotificationPermissions,
  selectNotificationConfig,
  (permissions, config) => {
    return config.enabled && permissions?.granted === true;
  }
);

export const selectNotificationSettingsValid = createSelector(
  selectNotificationConfig,
  (config) => {
    return (
      config.hoursBeforeBackup > 0 && 
      config.hoursBeforeBackup <= 168 && // Max 1 week
      typeof config.enabled === 'boolean'
    );
  }
);