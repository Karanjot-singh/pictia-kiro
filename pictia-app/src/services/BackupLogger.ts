import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackupLog } from '@/types';

export interface BackupLogEntry {
  id: string;
  backupId: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  details?: any;
  category: 'upload' | 'auth' | 'network' | 'validation' | 'system';
}

export interface BackupErrorDetails {
  errorCode?: string;
  httpStatus?: number;
  retryCount?: number;
  fileName?: string;
  fileSize?: number;
  stackTrace?: string;
  networkInfo?: {
    isConnected: boolean;
    connectionType?: string;
  };
}

export interface BackupStatistics {
  totalBackups: number;
  successfulBackups: number;
  failedBackups: number;
  totalItemsUploaded: number;
  totalBytesUploaded: number;
  averageBackupDuration: number;
  mostCommonErrors: Array<{
    error: string;
    count: number;
  }>;
  lastBackupDate?: Date;
}

/**
 * BackupLogger provides comprehensive logging and analytics for backup operations
 */
export class BackupLogger {
  private static readonly LOG_ENTRIES_KEY = 'backup_log_entries';
  private static readonly MAX_LOG_ENTRIES = 1000;
  private static readonly LOG_RETENTION_DAYS = 30;

  /**
   * Log an info message
   */
  static async logInfo(
    backupId: string,
    message: string,
    details?: any,
    category: BackupLogEntry['category'] = 'system'
  ): Promise<void> {
    await this.addLogEntry({
      id: this.generateLogId(),
      backupId,
      timestamp: new Date(),
      level: 'info',
      message,
      details,
      category,
    });
  }

  /**
   * Log a warning message
   */
  static async logWarning(
    backupId: string,
    message: string,
    details?: any,
    category: BackupLogEntry['category'] = 'system'
  ): Promise<void> {
    await this.addLogEntry({
      id: this.generateLogId(),
      backupId,
      timestamp: new Date(),
      level: 'warning',
      message,
      details,
      category,
    });
  }

  /**
   * Log an error with detailed information
   */
  static async logError(
    backupId: string,
    message: string,
    error?: Error,
    errorDetails?: BackupErrorDetails,
    category: BackupLogEntry['category'] = 'system'
  ): Promise<void> {
    const details = {
      ...errorDetails,
      ...(error && {
        errorName: error.name,
        errorMessage: error.message,
        stackTrace: error.stack,
      }),
    };

    await this.addLogEntry({
      id: this.generateLogId(),
      backupId,
      timestamp: new Date(),
      level: 'error',
      message,
      details,
      category,
    });
  }

  /**
   * Log debug information (only in development)
   */
  static async logDebug(
    backupId: string,
    message: string,
    details?: any,
    category: BackupLogEntry['category'] = 'system'
  ): Promise<void> {
    if (__DEV__) {
      await this.addLogEntry({
        id: this.generateLogId(),
        backupId,
        timestamp: new Date(),
        level: 'debug',
        message,
        details,
        category,
      });
    }
  }

  /**
   * Log backup start
   */
  static async logBackupStart(backupLog: BackupLog): Promise<void> {
    await this.logInfo(
      backupLog.id,
      `Backup started: ${backupLog.type}`,
      {
        totalItems: backupLog.totalItems,
        startTime: backupLog.startTime,
      },
      'system'
    );
  }

  /**
   * Log backup completion
   */
  static async logBackupComplete(backupLog: BackupLog): Promise<void> {
    const duration = backupLog.endTime && backupLog.startTime
      ? (backupLog.endTime.getTime() - backupLog.startTime.getTime()) / 1000
      : 0;

    await this.logInfo(
      backupLog.id,
      `Backup completed: ${backupLog.status}`,
      {
        itemsUploaded: backupLog.itemsUploaded,
        totalItems: backupLog.totalItems,
        duration,
        successRate: (backupLog.itemsUploaded / backupLog.totalItems) * 100,
      },
      'system'
    );
  }

  /**
   * Log upload progress
   */
  static async logUploadProgress(
    backupId: string,
    fileName: string,
    progress: number,
    bytesUploaded: number,
    totalBytes: number
  ): Promise<void> {
    await this.logDebug(
      backupId,
      `Upload progress: ${fileName}`,
      {
        fileName,
        progress,
        bytesUploaded,
        totalBytes,
      },
      'upload'
    );
  }

  /**
   * Log upload error with retry information
   */
  static async logUploadError(
    backupId: string,
    fileName: string,
    error: Error,
    retryCount: number,
    fileSize?: number
  ): Promise<void> {
    await this.logError(
      backupId,
      `Upload failed: ${fileName}`,
      error,
      {
        fileName,
        ...(fileSize !== undefined && { fileSize }),
        retryCount,
      },
      'upload'
    );
  }

  /**
   * Log authentication error
   */
  static async logAuthError(
    backupId: string,
    error: Error,
    errorCode?: string
  ): Promise<void> {
    await this.logError(
      backupId,
      'Authentication error during backup',
      error,
      {
        ...(errorCode && { errorCode }),
      },
      'auth'
    );
  }

  /**
   * Log network error
   */
  static async logNetworkError(
    backupId: string,
    error: Error,
    httpStatus?: number,
    isConnected?: boolean
  ): Promise<void> {
    await this.logError(
      backupId,
      'Network error during backup',
      error,
      {
        ...(httpStatus !== undefined && { httpStatus }),
        networkInfo: {
          isConnected: isConnected ?? true,
        },
      },
      'network'
    );
  }

  /**
   * Get log entries for a specific backup
   */
  static async getBackupLogs(backupId: string): Promise<BackupLogEntry[]> {
    try {
      const allEntries = await this.getAllLogEntries();
      return allEntries.filter(entry => entry.backupId === backupId);
    } catch (error) {
      console.error('Failed to get backup logs:', error);
      return [];
    }
  }

  /**
   * Get log entries by level
   */
  static async getLogsByLevel(level: BackupLogEntry['level']): Promise<BackupLogEntry[]> {
    try {
      const allEntries = await this.getAllLogEntries();
      return allEntries.filter(entry => entry.level === level);
    } catch (error) {
      console.error('Failed to get logs by level:', error);
      return [];
    }
  }

  /**
   * Get log entries by category
   */
  static async getLogsByCategory(category: BackupLogEntry['category']): Promise<BackupLogEntry[]> {
    try {
      const allEntries = await this.getAllLogEntries();
      return allEntries.filter(entry => entry.category === category);
    } catch (error) {
      console.error('Failed to get logs by category:', error);
      return [];
    }
  }

  /**
   * Get recent log entries
   */
  static async getRecentLogs(limit: number = 50): Promise<BackupLogEntry[]> {
    try {
      const allEntries = await this.getAllLogEntries();
      return allEntries
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to get recent logs:', error);
      return [];
    }
  }

  /**
   * Generate backup statistics
   */
  static async generateStatistics(backupLogs: BackupLog[]): Promise<BackupStatistics> {
    try {
      const totalBackups = backupLogs.length;
      const successfulBackups = backupLogs.filter(log => log.status === 'completed').length;
      const failedBackups = backupLogs.filter(log => log.status === 'failed').length;
      
      const totalItemsUploaded = backupLogs.reduce((sum, log) => sum + log.itemsUploaded, 0);
      
      // Estimate total bytes (rough calculation)
      const totalBytesUploaded = totalItemsUploaded * 5 * 1024 * 1024; // 5MB average per item
      
      // Calculate average duration
      const completedBackups = backupLogs.filter(log => log.endTime && log.startTime);
      const totalDuration = completedBackups.reduce((sum, log) => {
        const duration = log.endTime!.getTime() - log.startTime.getTime();
        return sum + duration;
      }, 0);
      const averageBackupDuration = completedBackups.length > 0 
        ? totalDuration / completedBackups.length / 1000 // Convert to seconds
        : 0;

      // Get most common errors
      const errorLogs = await this.getLogsByLevel('error');
      const errorCounts = new Map<string, number>();
      
      errorLogs.forEach(log => {
        const errorKey = log.message;
        errorCounts.set(errorKey, (errorCounts.get(errorKey) || 0) + 1);
      });

      const mostCommonErrors = Array.from(errorCounts.entries())
        .map(([error, count]) => ({ error, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const lastBackupDate = backupLogs.length > 0
        ? backupLogs.sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0]?.startTime
        : undefined;

      return {
        totalBackups,
        successfulBackups,
        failedBackups,
        totalItemsUploaded,
        totalBytesUploaded,
        averageBackupDuration,
        mostCommonErrors,
        ...(lastBackupDate && { lastBackupDate }),
      };
    } catch (error) {
      console.error('Failed to generate statistics:', error);
      return {
        totalBackups: 0,
        successfulBackups: 0,
        failedBackups: 0,
        totalItemsUploaded: 0,
        totalBytesUploaded: 0,
        averageBackupDuration: 0,
        mostCommonErrors: [],
      };
    }
  }

  /**
   * Clear old log entries
   */
  static async clearOldLogs(): Promise<void> {
    try {
      const allEntries = await this.getAllLogEntries();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.LOG_RETENTION_DAYS);

      const recentEntries = allEntries.filter(
        entry => entry.timestamp.getTime() > cutoffDate.getTime()
      );

      await AsyncStorage.setItem(
        this.LOG_ENTRIES_KEY,
        JSON.stringify(recentEntries)
      );
    } catch (error) {
      console.error('Failed to clear old logs:', error);
    }
  }

  /**
   * Export logs for debugging
   */
  static async exportLogs(): Promise<string> {
    try {
      const allEntries = await this.getAllLogEntries();
      return JSON.stringify(allEntries, null, 2);
    } catch (error) {
      console.error('Failed to export logs:', error);
      return '[]';
    }
  }

  /**
   * Clear all logs
   */
  static async clearAllLogs(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.LOG_ENTRIES_KEY);
    } catch (error) {
      console.error('Failed to clear all logs:', error);
    }
  }

  /**
   * Add a log entry to storage
   */
  private static async addLogEntry(entry: BackupLogEntry): Promise<void> {
    try {
      const existingEntries = await this.getAllLogEntries();
      const updatedEntries = [...existingEntries, entry];

      // Keep only the most recent entries
      if (updatedEntries.length > this.MAX_LOG_ENTRIES) {
        updatedEntries.splice(0, updatedEntries.length - this.MAX_LOG_ENTRIES);
      }

      await AsyncStorage.setItem(
        this.LOG_ENTRIES_KEY,
        JSON.stringify(updatedEntries)
      );

      // Also log to console in development
      if (__DEV__) {
        const logMethod = entry.level === 'error' ? console.error : 
                         entry.level === 'warning' ? console.warn : 
                         console.log;
        
        logMethod(`[${entry.level.toUpperCase()}] ${entry.message}`, entry.details);
      }
    } catch (error) {
      console.error('Failed to add log entry:', error);
    }
  }

  /**
   * Get all log entries from storage
   */
  private static async getAllLogEntries(): Promise<BackupLogEntry[]> {
    try {
      const entriesData = await AsyncStorage.getItem(this.LOG_ENTRIES_KEY);
      if (!entriesData) return [];

      const entries: BackupLogEntry[] = JSON.parse(entriesData);
      
      // Convert timestamp strings back to Date objects
      return entries.map(entry => ({
        ...entry,
        timestamp: new Date(entry.timestamp),
      }));
    } catch (error) {
      console.error('Failed to get log entries:', error);
      return [];
    }
  }

  /**
   * Generate unique log entry ID
   */
  private static generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}