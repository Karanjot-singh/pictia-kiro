import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackupConfig, BackupLog } from '../types';
import { BackupService } from './BackupService';
import { NotificationService } from './NotificationService';

// Background task name
const BACKUP_TASK_NAME = 'SCHEDULED_BACKUP_TASK';

// Storage keys
const SCHEDULED_BACKUP_KEY = 'scheduled_backup_config';
const BACKUP_SCHEDULE_HISTORY_KEY = 'backup_schedule_history';

export interface ScheduledBackupInfo {
  id: string;
  config: BackupConfig;
  nextExecutionDate: Date;
  isActive: boolean;
  createdAt: Date;
  lastExecuted?: Date;
  executionCount: number;
}

export interface BackupScheduleHistory {
  scheduleId: string;
  executionDate: Date;
  status: 'success' | 'failed' | 'cancelled';
  backupLogId?: string;
  errorMessage?: string;
}

/**
 * BackupScheduler handles scheduling and execution of automated backups
 * using Expo TaskManager for background tasks
 */
export class BackupScheduler {
  private backupService: BackupService;
  private notificationService: NotificationService;
  private currentSchedule: ScheduledBackupInfo | null = null;

  constructor(backupService: BackupService, notificationService: NotificationService) {
    this.backupService = backupService;
    this.notificationService = notificationService;
    
    // Initialize background task
    this.initializeBackgroundTask();
  }

  /**
   * Initialize the background task for scheduled backups
   */
  private initializeBackgroundTask(): void {
    // Define the background task
    TaskManager.defineTask(BACKUP_TASK_NAME, async ({ data, error }) => {
      if (error) {
        console.error('Background backup task error:', error);
        await this.logScheduleExecution('failed', undefined, error.message);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }

      try {
        console.log('Executing scheduled backup task');
        
        // Get current schedule
        const schedule = await this.getCurrentSchedule();
        if (!schedule || !schedule.isActive) {
          console.log('No active backup schedule found');
          return BackgroundFetch.BackgroundFetchResult.NoData;
        }

        // Check if it's time to execute backup
        const now = new Date();
        if (now < schedule.nextExecutionDate) {
          console.log('Not yet time for scheduled backup');
          return BackgroundFetch.BackgroundFetchResult.NoData;
        }

        // Execute backup
        const result = await this.executeScheduledBackup(schedule);
        
        if (result.success) {
          await this.logScheduleExecution('success', result.backupLogId);
          await this.updateScheduleAfterExecution(schedule);
          return BackgroundFetch.BackgroundFetchResult.NewData;
        } else {
          await this.logScheduleExecution('failed', result.backupLogId, result.error);
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }
      } catch (error) {
        console.error('Scheduled backup execution failed:', error);
        await this.logScheduleExecution('failed', undefined, error instanceof Error ? error.message : 'Unknown error');
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });
  }

  /**
   * Schedule a backup with the given configuration
   */
  async scheduleBackup(config: BackupConfig): Promise<ScheduledBackupInfo> {
    // Validate configuration
    const validation = this.backupService.validateBackupConfig(config);
    if (!validation.isValid) {
      throw new Error(`Invalid backup configuration: ${validation.errors.join(', ')}`);
    }

    // Cancel existing schedule if any
    await this.cancelScheduledBackup();

    // Create new schedule
    const scheduleId = this.generateScheduleId();
    const nextExecutionDate = this.calculateNextBackupDate(config);
    
    const scheduleInfo: ScheduledBackupInfo = {
      id: scheduleId,
      config,
      nextExecutionDate,
      isActive: true,
      createdAt: new Date(),
      executionCount: 0
    };

    // Save schedule to storage
    await AsyncStorage.setItem(SCHEDULED_BACKUP_KEY, JSON.stringify(scheduleInfo));
    this.currentSchedule = scheduleInfo;

    // Register background task
    await this.registerBackgroundTask();

    // Schedule notification reminder if enabled
    if (config.notificationEnabled) {
      const reminderDate = new Date(nextExecutionDate.getTime() - (config.notificationOffset * 60 * 60 * 1000));
      
      const notificationConfig = {
        enabled: true,
        hoursBeforeBackup: config.notificationOffset,
        customMessage: 'Your scheduled photo backup is coming up. Organize your photos now!',
      };
      
      await this.notificationService.scheduleBackupReminder(nextExecutionDate, notificationConfig);
    }

    console.log(`Backup scheduled for ${nextExecutionDate.toISOString()}`);
    return scheduleInfo;
  }

  /**
   * Cancel the currently scheduled backup
   */
  async cancelScheduledBackup(): Promise<void> {
    const currentSchedule = await this.getCurrentSchedule();
    
    if (currentSchedule) {
      // Mark schedule as inactive
      currentSchedule.isActive = false;
      await AsyncStorage.setItem(SCHEDULED_BACKUP_KEY, JSON.stringify(currentSchedule));
      
      // Log cancellation
      await this.logScheduleExecution('cancelled');
    }

    // Unregister background task
    await this.unregisterBackgroundTask();

    // Cancel notification reminders
    await this.notificationService.cancelNotification('scheduled_backup_reminder');

    this.currentSchedule = null;
    console.log('Scheduled backup cancelled');
  }

  /**
   * Reschedule backup with new configuration
   */
  async rescheduleBackup(config: BackupConfig): Promise<ScheduledBackupInfo> {
    await this.cancelScheduledBackup();
    return this.scheduleBackup(config);
  }

  /**
   * Get current backup schedule information
   */
  async getCurrentSchedule(): Promise<ScheduledBackupInfo | null> {
    if (this.currentSchedule) {
      return this.currentSchedule;
    }

    try {
      const scheduleData = await AsyncStorage.getItem(SCHEDULED_BACKUP_KEY);
      if (!scheduleData) return null;

      const schedule: ScheduledBackupInfo = JSON.parse(scheduleData);
      // Convert date strings back to Date objects
      schedule.nextExecutionDate = new Date(schedule.nextExecutionDate);
      schedule.createdAt = new Date(schedule.createdAt);
      if (schedule.lastExecuted) {
        schedule.lastExecuted = new Date(schedule.lastExecuted);
      }

      this.currentSchedule = schedule;
      return schedule;
    } catch (error) {
      console.error('Failed to get current schedule:', error);
      return null;
    }
  }

  /**
   * Get backup schedule execution history
   */
  async getScheduleHistory(): Promise<BackupScheduleHistory[]> {
    try {
      const historyData = await AsyncStorage.getItem(BACKUP_SCHEDULE_HISTORY_KEY);
      if (!historyData) return [];

      const history: BackupScheduleHistory[] = JSON.parse(historyData);
      // Convert date strings back to Date objects
      return history.map(entry => ({
        ...entry,
        executionDate: new Date(entry.executionDate)
      }));
    } catch (error) {
      console.error('Failed to get schedule history:', error);
      return [];
    }
  }

  /**
   * Check if backup scheduling is supported on the current platform
   */
  async isBackgroundTaskSupported(): Promise<boolean> {
    try {
      return await BackgroundFetch.getStatusAsync() !== BackgroundFetch.BackgroundFetchStatus.Restricted;
    } catch (error) {
      console.error('Failed to check background task support:', error);
      return false;
    }
  }

  /**
   * Get the status of background fetch
   */
  async getBackgroundFetchStatus(): Promise<string> {
    try {
      const status = await BackgroundFetch.getStatusAsync();
      switch (status) {
        case BackgroundFetch.BackgroundFetchStatus.Available:
          return 'available';
        case BackgroundFetch.BackgroundFetchStatus.Denied:
          return 'denied';
        case BackgroundFetch.BackgroundFetchStatus.Restricted:
          return 'restricted';
        default:
          return 'unknown';
      }
    } catch (error) {
      console.error('Failed to get background fetch status:', error);
      return 'error';
    }
  }

  /**
   * Execute a scheduled backup
   */
  private async executeScheduledBackup(schedule: ScheduledBackupInfo): Promise<{
    success: boolean;
    backupLogId?: string;
    error?: string;
  }> {
    try {
      // Get media items to backup (this would typically come from organization state)
      // For now, we'll simulate with an empty array since we don't have access to the actual media
      const mediaItems: any[] = []; // In real implementation, get from organization state
      
      if (mediaItems.length === 0) {
        console.log('No media items to backup');
        return { success: true };
      }

      // Trigger backup
      const result = await this.backupService.triggerManualBackup(mediaItems);
      
      if (result.success) {
        return {
          success: true,
          backupLogId: result.backupLog.id
        };
      } else {
        return {
          success: false,
          backupLogId: result.backupLog.id,
          error: 'Backup failed with errors'
        };
      }
    } catch (error) {
      console.error('Scheduled backup execution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update schedule information after successful execution
   */
  private async updateScheduleAfterExecution(schedule: ScheduledBackupInfo): Promise<void> {
    schedule.lastExecuted = new Date();
    schedule.executionCount++;
    schedule.nextExecutionDate = this.calculateNextBackupDate(schedule.config);

    await AsyncStorage.setItem(SCHEDULED_BACKUP_KEY, JSON.stringify(schedule));
    this.currentSchedule = schedule;

    // Reschedule notification if enabled
    if (schedule.config.notificationEnabled) {
      const reminderDate = new Date(
        schedule.nextExecutionDate.getTime() - (schedule.config.notificationOffset * 60 * 60 * 1000)
      );
      
      const notificationConfig = {
        enabled: true,
        hoursBeforeBackup: schedule.config.notificationOffset,
        customMessage: 'Your scheduled photo backup is coming up. Organize your photos now!',
      };
      
      await this.notificationService.scheduleBackupReminder(schedule.nextExecutionDate, notificationConfig);
    }

    console.log(`Next backup scheduled for ${schedule.nextExecutionDate.toISOString()}`);
  }

  /**
   * Log schedule execution to history
   */
  private async logScheduleExecution(
    status: 'success' | 'failed' | 'cancelled',
    backupLogId?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      const currentSchedule = await this.getCurrentSchedule();
      if (!currentSchedule) return;

      const historyEntry: BackupScheduleHistory = {
        scheduleId: currentSchedule.id,
        executionDate: new Date(),
        status,
        ...(backupLogId && { backupLogId }),
        ...(errorMessage && { errorMessage })
      };

      const existingHistory = await this.getScheduleHistory();
      const updatedHistory = [...existingHistory, historyEntry];

      // Keep only last 100 entries
      if (updatedHistory.length > 100) {
        updatedHistory.splice(0, updatedHistory.length - 100);
      }

      await AsyncStorage.setItem(BACKUP_SCHEDULE_HISTORY_KEY, JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Failed to log schedule execution:', error);
    }
  }

  /**
   * Register background task for scheduled backups
   */
  private async registerBackgroundTask(): Promise<void> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKUP_TASK_NAME);
      
      if (!isRegistered) {
        await BackgroundFetch.registerTaskAsync(BACKUP_TASK_NAME, {
          minimumInterval: 60 * 60 * 1000, // 1 hour minimum interval
          stopOnTerminate: false, // Continue running when app is terminated
          startOnBoot: true, // Start when device boots
        });
        
        console.log('Background backup task registered');
      }
    } catch (error) {
      console.error('Failed to register background task:', error);
      throw error;
    }
  }

  /**
   * Unregister background task
   */
  private async unregisterBackgroundTask(): Promise<void> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKUP_TASK_NAME);
      
      if (isRegistered) {
        await BackgroundFetch.unregisterTaskAsync(BACKUP_TASK_NAME);
        console.log('Background backup task unregistered');
      }
    } catch (error) {
      console.error('Failed to unregister background task:', error);
    }
  }

  /**
   * Calculate next backup date based on configuration
   */
  private calculateNextBackupDate(config: BackupConfig): Date {
    const now = new Date();
    const nextBackup = new Date(now);

    if (config.frequency === 'weekly') {
      const dayOfWeek = config.dayOfWeek || 0; // Default to Sunday
      const daysUntilBackup = (dayOfWeek - now.getDay() + 7) % 7;
      nextBackup.setDate(now.getDate() + (daysUntilBackup === 0 ? 7 : daysUntilBackup));
    } else if (config.frequency === 'monthly') {
      const dayOfMonth = config.dayOfMonth || 1;
      nextBackup.setDate(dayOfMonth);
      
      // If the day has already passed this month, move to next month
      if (nextBackup <= now) {
        nextBackup.setMonth(nextBackup.getMonth() + 1);
        
        // Handle edge case where the target day doesn't exist in the next month
        if (nextBackup.getDate() !== dayOfMonth) {
          nextBackup.setDate(0); // Go to last day of previous month
        }
      }
    }

    // Set time to noon to avoid timezone issues
    nextBackup.setHours(12, 0, 0, 0);
    
    return nextBackup;
  }

  /**
   * Generate unique schedule ID
   */
  private generateScheduleId(): string {
    return `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get time until next scheduled backup
   */
  async getTimeUntilNextBackup(): Promise<number | null> {
    const schedule = await this.getCurrentSchedule();
    if (!schedule || !schedule.isActive) {
      return null;
    }

    const now = new Date();
    const timeUntil = schedule.nextExecutionDate.getTime() - now.getTime();
    
    return timeUntil > 0 ? timeUntil : 0;
  }

  /**
   * Check if a backup is currently scheduled
   */
  async isBackupScheduled(): Promise<boolean> {
    const schedule = await this.getCurrentSchedule();
    return schedule !== null && schedule.isActive;
  }

  /**
   * Get backup schedule summary for UI display
   */
  async getScheduleSummary(): Promise<{
    isScheduled: boolean;
    frequency?: string;
    nextBackup?: Date;
    lastExecuted?: Date;
    executionCount?: number;
  }> {
    const schedule = await this.getCurrentSchedule();
    
    if (!schedule || !schedule.isActive) {
      return { isScheduled: false };
    }

    return {
      isScheduled: true,
      frequency: schedule.config.frequency,
      nextBackup: schedule.nextExecutionDate,
      ...(schedule.lastExecuted && { lastExecuted: schedule.lastExecuted }),
      executionCount: schedule.executionCount
    };
  }
}