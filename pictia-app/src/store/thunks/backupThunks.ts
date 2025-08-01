import { createAsyncThunk } from '@reduxjs/toolkit';
import { BackupService } from '@/services';
import { BackupConfig, BackupLog, CachedMediaItem } from '@/types';
import { 
  setBackupConfig,
  startBackup,
  updateBackupProgress,
  completeBackup,
  failBackup,
  clearBackupError,
  setLogEntries,
  setStatistics
} from '../slices/backupSlice';
import { BackupLogger } from '@/services';

// Create backup service instance (this would typically be injected)
let backupServiceInstance: BackupService | null = null;

export const setBackupServiceInstance = (service: BackupService) => {
  backupServiceInstance = service;
};

/**
 * Configure backup settings
 */
export const configureBackup = createAsyncThunk(
  'backup/configure',
  async (config: BackupConfig, { dispatch, rejectWithValue }) => {
    try {
      if (!backupServiceInstance) {
        throw new Error('BackupService not initialized');
      }

      await backupServiceInstance.setBackupConfig(config);
      await backupServiceInstance.scheduleBackup(config);
      
      dispatch(setBackupConfig(config));
      return config;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to configure backup';
      return rejectWithValue(message);
    }
  }
);

/**
 * Trigger manual backup
 */
export const triggerManualBackup = createAsyncThunk(
  'backup/triggerManual',
  async (mediaItems: CachedMediaItem[], { dispatch, rejectWithValue }) => {
    try {
      if (!backupServiceInstance) {
        throw new Error('BackupService not initialized');
      }

      // Create initial backup log
      const backupLog: BackupLog = {
        id: `backup_${Date.now()}`,
        type: 'manual',
        startTime: new Date(),
        status: 'in_progress',
        itemsUploaded: 0,
        totalItems: mediaItems.length
      };

      dispatch(startBackup(backupLog));

      // Set up progress tracking
      const progressCallback = (progress: any) => {
        dispatch(updateBackupProgress(progress));
      };

      backupServiceInstance.addProgressCallback(progressCallback);

      try {
        const result = await backupServiceInstance.triggerManualBackup(mediaItems);
        
        // Remove progress callback
        backupServiceInstance.removeProgressCallback(progressCallback);

        const completedLog: BackupLog = {
          ...backupLog,
          endTime: new Date(),
          status: result.success ? 'completed' : 'failed',
          itemsUploaded: result.uploadedCount,
          ...(result.failedItems.length > 0 && {
            errorMessage: `${result.failedItems.length} items failed to upload`
          })
        };

        dispatch(completeBackup(completedLog));
        return result;
      } catch (error) {
        backupServiceInstance.removeProgressCallback(progressCallback);
        throw error;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Backup failed';
      dispatch(failBackup(message));
      return rejectWithValue(message);
    }
  }
);

/**
 * Retry failed uploads
 */
export const retryFailedUploads = createAsyncThunk(
  'backup/retryFailed',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      if (!backupServiceInstance) {
        throw new Error('BackupService not initialized');
      }

      const result = await backupServiceInstance.retryFailedUploads();
      
      const completedLog: BackupLog = {
        ...result.backupLog,
        endTime: new Date(),
        status: result.success ? 'completed' : 'failed',
        itemsUploaded: result.uploadedCount
      };

      dispatch(completeBackup(completedLog));
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to retry uploads';
      dispatch(failBackup(message));
      return rejectWithValue(message);
    }
  }
);

/**
 * Load backup configuration
 */
export const loadBackupConfig = createAsyncThunk(
  'backup/loadConfig',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      if (!backupServiceInstance) {
        throw new Error('BackupService not initialized');
      }

      const config = await backupServiceInstance.getBackupConfig();
      if (config) {
        dispatch(setBackupConfig(config));
      }
      return config;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load backup config';
      return rejectWithValue(message);
    }
  }
);

/**
 * Load backup history
 */
export const loadBackupHistory = createAsyncThunk(
  'backup/loadHistory',
  async (_, { rejectWithValue }) => {
    try {
      if (!backupServiceInstance) {
        throw new Error('BackupService not initialized');
      }

      const history = await backupServiceInstance.getBackupHistory();
      return history;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load backup history';
      return rejectWithValue(message);
    }
  }
);

/**
 * Cancel scheduled backup
 */
export const cancelScheduledBackup = createAsyncThunk(
  'backup/cancelScheduled',
  async (_, { rejectWithValue }) => {
    try {
      if (!backupServiceInstance) {
        throw new Error('BackupService not initialized');
      }

      await backupServiceInstance.cancelScheduledBackup();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel backup';
      return rejectWithValue(message);
    }
  }
);

/**
 * Get backup queue status
 */
export const getBackupQueueStatus = createAsyncThunk(
  'backup/getQueueStatus',
  async (_, { rejectWithValue }) => {
    try {
      if (!backupServiceInstance) {
        throw new Error('BackupService not initialized');
      }

      const status = backupServiceInstance.getBackupQueueStatus();
      return status;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get queue status';
      return rejectWithValue(message);
    }
  }
);

/**
 * Clear backup error
 */
export const clearBackupErrorAction = createAsyncThunk(
  'backup/clearError',
  async (_, { dispatch }) => {
    dispatch(clearBackupError());
    return true;
  }
);

/**
 * Load backup log entries
 */
export const loadBackupLogEntries = createAsyncThunk(
  'backup/loadLogEntries',
  async (backupId: string | undefined, { dispatch, rejectWithValue }) => {
    try {
      const logEntries = backupId 
        ? await BackupLogger.getBackupLogs(backupId)
        : await BackupLogger.getRecentLogs(100);
      
      dispatch(setLogEntries(logEntries));
      return logEntries;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load log entries';
      return rejectWithValue(message);
    }
  }
);

/**
 * Generate backup statistics
 */
export const generateBackupStatistics = createAsyncThunk(
  'backup/generateStatistics',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      if (!backupServiceInstance) {
        throw new Error('BackupService not initialized');
      }

      const backupHistory = await backupServiceInstance.getBackupHistory();
      const statistics = await BackupLogger.generateStatistics(backupHistory);
      
      dispatch(setStatistics(statistics));
      return statistics;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate statistics';
      return rejectWithValue(message);
    }
  }
);

/**
 * Clear old backup logs
 */
export const clearOldBackupLogs = createAsyncThunk(
  'backup/clearOldLogs',
  async (_, { rejectWithValue }) => {
    try {
      await BackupLogger.clearOldLogs();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to clear old logs';
      return rejectWithValue(message);
    }
  }
);