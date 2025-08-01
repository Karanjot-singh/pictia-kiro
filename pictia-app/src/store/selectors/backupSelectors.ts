import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../index';

// Base selector
const selectBackupState = (state: RootState) => state.backup;

// Basic selectors
export const selectBackupConfig = createSelector(
  [selectBackupState],
  (backup) => backup.config
);

export const selectBackupLogs = createSelector(
  [selectBackupState],
  (backup) => backup.logs
);

export const selectCurrentBackup = createSelector(
  [selectBackupState],
  (backup) => backup.currentBackup
);

export const selectIsBackupInProgress = createSelector(
  [selectBackupState],
  (backup) => backup.isBackupInProgress
);

export const selectBackupProgress = createSelector(
  [selectBackupState],
  (backup) => backup.progress
);

export const selectBackupQueueStatus = createSelector(
  [selectBackupState],
  (backup) => backup.queueStatus
);

export const selectBackupLogEntries = createSelector(
  [selectBackupState],
  (backup) => backup.logEntries
);

export const selectBackupStatistics = createSelector(
  [selectBackupState],
  (backup) => backup.statistics
);

export const selectBackupLoading = createSelector(
  [selectBackupState],
  (backup) => backup.isLoading
);

export const selectBackupError = createSelector(
  [selectBackupState],
  (backup) => backup.error
);

// Computed selectors
export const selectHasBackupConfig = createSelector(
  [selectBackupConfig],
  (config) => config !== null
);

export const selectIsBackupConfigured = createSelector(
  [selectBackupConfig],
  (config) => {
    if (!config) return false;
    
    // Check if config has required fields
    if (!config.frequency) return false;
    
    if (config.frequency === 'weekly' && config.dayOfWeek === undefined) {
      return false;
    }
    
    if (config.frequency === 'monthly' && config.dayOfMonth === undefined) {
      return false;
    }
    
    return true;
  }
);

export const selectBackupFrequency = createSelector(
  [selectBackupConfig],
  (config) => config?.frequency || null
);

export const selectBackupDay = createSelector(
  [selectBackupConfig],
  (config) => {
    if (!config) return null;
    
    if (config.frequency === 'weekly') {
      return config.dayOfWeek;
    } else if (config.frequency === 'monthly') {
      return config.dayOfMonth;
    }
    
    return null;
  }
);

export const selectNotificationEnabled = createSelector(
  [selectBackupConfig],
  (config) => config?.notificationEnabled ?? false
);

export const selectNotificationOffset = createSelector(
  [selectBackupConfig],
  (config) => config?.notificationOffset || 24
);

export const selectBackupSummary = createSelector(
  [selectBackupConfig],
  (config) => {
    if (!config) return null;
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    let summary = '';
    
    if (config.frequency === 'weekly') {
      const dayName = config.dayOfWeek !== undefined ? dayNames[config.dayOfWeek] : 'Unknown';
      summary = `Weekly on ${dayName}`;
    } else if (config.frequency === 'monthly') {
      const day = config.dayOfMonth || 1;
      const suffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th';
      summary = `Monthly on the ${day}${suffix}`;
    }
    
    if (config.notificationEnabled) {
      const hours = config.notificationOffset;
      const timeDesc = hours === 1 ? '1 hour' : 
                      hours === 24 ? '1 day' : 
                      hours === 48 ? '2 days' : 
                      hours === 72 ? '3 days' : 
                      `${hours} hours`;
      summary += ` (reminder ${timeDesc} before)`;
    }
    
    return summary;
  }
);

export const selectRecentBackupLogs = createSelector(
  [selectBackupLogs],
  (logs) => logs.slice(0, 5) // Get the 5 most recent logs
);

export const selectLastSuccessfulBackup = createSelector(
  [selectBackupLogs],
  (logs) => {
    return logs.find(log => log.status === 'completed') || null;
  }
);

export const selectFailedBackupsCount = createSelector(
  [selectBackupLogs],
  (logs) => logs.filter(log => log.status === 'failed').length
);

export const selectTotalBackupsCount = createSelector(
  [selectBackupLogs],
  (logs) => logs.length
);

export const selectBackupProgressPercentage = createSelector(
  [selectBackupProgress],
  (progress) => progress?.percentage || 0
);

export const selectBackupProgressText = createSelector(
  [selectBackupProgress],
  (progress) => {
    if (!progress) return null;
    
    return `${progress.currentItem} of ${progress.totalItems} items`;
  }
);

export const selectQueueStatusSummary = createSelector(
  [selectBackupQueueStatus],
  (queueStatus) => {
    if (!queueStatus) return null;
    
    return {
      pending: queueStatus.pending,
      failed: queueStatus.failed,
      total: queueStatus.total,
      hasItems: queueStatus.total > 0,
      hasFailed: queueStatus.failed > 0,
    };
  }
);