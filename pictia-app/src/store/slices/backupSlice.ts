import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { BackupConfig, BackupLog, BackupProgress } from '@/types';
import { BackupLogEntry, BackupStatistics } from '@/services';
import {
  configureBackup,
  triggerManualBackup,
  retryFailedUploads,
  loadBackupConfig,
  loadBackupHistory,
  cancelScheduledBackup,
  getBackupQueueStatus
} from '../thunks/backupThunks';

interface BackupState {
  config: BackupConfig | null;
  logs: BackupLog[];
  currentBackup: BackupLog | null;
  isBackupInProgress: boolean;
  progress: BackupProgress | null;
  queueStatus: {
    pending: number;
    failed: number;
    total: number;
  } | null;
  logEntries: BackupLogEntry[];
  statistics: BackupStatistics | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: BackupState = {
  config: null,
  logs: [],
  currentBackup: null,
  isBackupInProgress: false,
  progress: null,
  queueStatus: null,
  logEntries: [],
  statistics: null,
  isLoading: false,
  error: null,
};

const backupSlice = createSlice({
  name: 'backup',
  initialState,
  reducers: {
    setBackupConfig: (state, action: PayloadAction<BackupConfig>) => {
      state.config = action.payload;
    },
    startBackup: (state, action: PayloadAction<BackupLog>) => {
      state.currentBackup = action.payload;
      state.isBackupInProgress = true;
      state.progress = {
        backupId: action.payload.id,
        currentItem: 0,
        totalItems: action.payload.totalItems,
        currentFileName: '',
        bytesUploaded: 0,
        totalBytes: 0,
        percentage: 0,
      };
      state.error = null;
    },
    updateBackupProgress: (state, action: PayloadAction<BackupProgress>) => {
      state.progress = action.payload;
    },
    completeBackup: (state, action: PayloadAction<BackupLog>) => {
      state.logs.push(action.payload);
      state.currentBackup = null;
      state.isBackupInProgress = false;
      state.progress = null;
      state.error = null;
    },
    failBackup: (state, action: PayloadAction<string>) => {
      if (state.currentBackup) {
        const failedBackup: BackupLog = {
          ...state.currentBackup,
          status: 'failed',
          endTime: new Date(),
          errorMessage: action.payload,
        };
        state.logs.push(failedBackup);
      }

      state.currentBackup = null;
      state.isBackupInProgress = false;
      state.progress = null;
      state.error = action.payload;
    },
    clearBackupError: state => {
      state.error = null;
    },
    setQueueStatus: (state, action: PayloadAction<{ pending: number; failed: number; total: number }>) => {
      state.queueStatus = action.payload;
    },
    setLogEntries: (state, action: PayloadAction<BackupLogEntry[]>) => {
      state.logEntries = action.payload;
    },
    addLogEntry: (state, action: PayloadAction<BackupLogEntry>) => {
      state.logEntries.unshift(action.payload);
      // Keep only the most recent 100 entries in state
      if (state.logEntries.length > 100) {
        state.logEntries = state.logEntries.slice(0, 100);
      }
    },
    setStatistics: (state, action: PayloadAction<BackupStatistics>) => {
      state.statistics = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Configure backup
    builder
      .addCase(configureBackup.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(configureBackup.fulfilled, (state, action) => {
        state.isLoading = false;
        state.config = action.payload;
      })
      .addCase(configureBackup.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Trigger manual backup
    builder
      .addCase(triggerManualBackup.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(triggerManualBackup.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(triggerManualBackup.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Retry failed uploads
    builder
      .addCase(retryFailedUploads.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(retryFailedUploads.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(retryFailedUploads.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Load backup config
    builder
      .addCase(loadBackupConfig.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadBackupConfig.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.config = action.payload;
        }
      })
      .addCase(loadBackupConfig.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Load backup history
    builder
      .addCase(loadBackupHistory.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadBackupHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.logs = action.payload;
      })
      .addCase(loadBackupHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Cancel scheduled backup
    builder
      .addCase(cancelScheduledBackup.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(cancelScheduledBackup.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(cancelScheduledBackup.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Get backup queue status
    builder
      .addCase(getBackupQueueStatus.fulfilled, (state, action) => {
        state.queueStatus = action.payload;
      });
  },
});

export const {
  setBackupConfig,
  startBackup,
  updateBackupProgress,
  completeBackup,
  failBackup,
  clearBackupError,
  setQueueStatus,
  setLogEntries,
  addLogEntry,
  setStatistics,
} = backupSlice.actions;

export default backupSlice.reducer;
