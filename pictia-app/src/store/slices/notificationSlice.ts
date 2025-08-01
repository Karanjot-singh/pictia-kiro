import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  NotificationService, 
  NotificationConfig, 
  BackupReminder, 
  NotificationPermissionStatus 
} from '@/services';

export interface NotificationState {
  config: NotificationConfig;
  permissions: NotificationPermissionStatus | null;
  scheduledReminders: BackupReminder[];
  isLoading: boolean;
  error: string | null;
  lastTestNotificationSent: Date | null;
}

const initialState: NotificationState = {
  config: {
    enabled: true,
    hoursBeforeBackup: 24,
  },
  permissions: null,
  scheduledReminders: [],
  isLoading: false,
  error: null,
  lastTestNotificationSent: null,
};

// Async thunks
export const requestNotificationPermissions = createAsyncThunk(
  'notification/requestPermissions',
  async (_, { rejectWithValue }) => {
    try {
      const notificationService = NotificationService.getInstance();
      return await notificationService.requestPermissions();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to request permissions');
    }
  }
);

export const loadNotificationConfig = createAsyncThunk(
  'notification/loadConfig',
  async (_, { rejectWithValue }) => {
    try {
      const notificationService = NotificationService.getInstance();
      return await notificationService.loadNotificationConfig();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load config');
    }
  }
);

export const saveNotificationConfig = createAsyncThunk(
  'notification/saveConfig',
  async (config: NotificationConfig, { rejectWithValue }) => {
    try {
      const notificationService = NotificationService.getInstance();
      await notificationService.saveNotificationConfig(config);
      return config;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to save config');
    }
  }
);

export const scheduleBackupReminder = createAsyncThunk(
  'notification/scheduleReminder',
  async (
    { backupDate, config }: { backupDate: Date; config: NotificationConfig },
    { rejectWithValue }
  ) => {
    try {
      const notificationService = NotificationService.getInstance();
      const notificationId = await notificationService.scheduleBackupReminder(backupDate, config);
      
      const reminder: BackupReminder = {
        id: notificationId,
        backupDate,
        notificationDate: new Date(backupDate.getTime() - config.hoursBeforeBackup * 60 * 60 * 1000),
        message: config.customMessage || `Time to organize your photos! Backup scheduled for ${backupDate.toLocaleDateString()}`,
      };
      
      return reminder;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to schedule reminder');
    }
  }
);

export const cancelNotification = createAsyncThunk(
  'notification/cancelNotification',
  async (notificationId: string, { rejectWithValue }) => {
    try {
      const notificationService = NotificationService.getInstance();
      await notificationService.cancelNotification(notificationId);
      return notificationId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to cancel notification');
    }
  }
);

export const loadScheduledReminders = createAsyncThunk(
  'notification/loadReminders',
  async (_, { rejectWithValue }) => {
    try {
      const notificationService = NotificationService.getInstance();
      return await notificationService.getScheduledReminders();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load reminders');
    }
  }
);

export const sendTestNotification = createAsyncThunk(
  'notification/sendTest',
  async (_, { rejectWithValue }) => {
    try {
      const notificationService = NotificationService.getInstance();
      await notificationService.sendTestNotification();
      return new Date();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to send test notification');
    }
  }
);

export const cleanupExpiredReminders = createAsyncThunk(
  'notification/cleanupExpired',
  async (_, { rejectWithValue }) => {
    try {
      const notificationService = NotificationService.getInstance();
      await notificationService.cleanupExpiredReminders();
      // Reload reminders after cleanup
      return await notificationService.getScheduledReminders();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to cleanup reminders');
    }
  }
);

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateConfig: (state, action: PayloadAction<Partial<NotificationConfig>>) => {
      state.config = { ...state.config, ...action.payload };
    },
    setPermissions: (state, action: PayloadAction<NotificationPermissionStatus>) => {
      state.permissions = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Request permissions
      .addCase(requestNotificationPermissions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(requestNotificationPermissions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.permissions = action.payload;
      })
      .addCase(requestNotificationPermissions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Load config
      .addCase(loadNotificationConfig.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadNotificationConfig.fulfilled, (state, action) => {
        state.isLoading = false;
        state.config = action.payload;
      })
      .addCase(loadNotificationConfig.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Save config
      .addCase(saveNotificationConfig.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(saveNotificationConfig.fulfilled, (state, action) => {
        state.isLoading = false;
        state.config = action.payload;
      })
      .addCase(saveNotificationConfig.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Schedule reminder
      .addCase(scheduleBackupReminder.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(scheduleBackupReminder.fulfilled, (state, action) => {
        state.isLoading = false;
        state.scheduledReminders.push(action.payload);
      })
      .addCase(scheduleBackupReminder.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Cancel notification
      .addCase(cancelNotification.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(cancelNotification.fulfilled, (state, action) => {
        state.isLoading = false;
        state.scheduledReminders = state.scheduledReminders.filter(
          reminder => reminder.id !== action.payload
        );
      })
      .addCase(cancelNotification.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Load reminders
      .addCase(loadScheduledReminders.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadScheduledReminders.fulfilled, (state, action) => {
        state.isLoading = false;
        state.scheduledReminders = action.payload;
      })
      .addCase(loadScheduledReminders.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Send test notification
      .addCase(sendTestNotification.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendTestNotification.fulfilled, (state, action) => {
        state.isLoading = false;
        state.lastTestNotificationSent = action.payload;
      })
      .addCase(sendTestNotification.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Cleanup expired reminders
      .addCase(cleanupExpiredReminders.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(cleanupExpiredReminders.fulfilled, (state, action) => {
        state.isLoading = false;
        state.scheduledReminders = action.payload;
      })
      .addCase(cleanupExpiredReminders.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, updateConfig, setPermissions } = notificationSlice.actions;
export default notificationSlice.reducer;