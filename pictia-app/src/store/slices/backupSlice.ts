import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { BackupConfig, BackupLog } from '@/types';

interface BackupState {
  config: BackupConfig | null;
  logs: BackupLog[];
  currentBackup: BackupLog | null;
  isBackupInProgress: boolean;
  progress: {
    currentItem: number;
    totalItems: number;
    currentFileName: string;
  } | null;
  error: string | null;
}

const initialState: BackupState = {
  config: null,
  logs: [],
  currentBackup: null,
  isBackupInProgress: false,
  progress: null,
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
        currentItem: 0,
        totalItems: action.payload.totalItems,
        currentFileName: '',
      };
      state.error = null;
    },
    updateBackupProgress: (
      state,
      action: PayloadAction<{
        currentItem: number;
        currentFileName: string;
      }>
    ) => {
      if (state.progress) {
        state.progress.currentItem = action.payload.currentItem;
        state.progress.currentFileName = action.payload.currentFileName;
      }
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
  },
});

export const {
  setBackupConfig,
  startBackup,
  updateBackupProgress,
  completeBackup,
  failBackup,
  clearBackupError,
} = backupSlice.actions;

export default backupSlice.reducer;
