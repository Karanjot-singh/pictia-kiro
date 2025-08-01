import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackupLogger, BackupLogEntry, BackupStatistics } from '../BackupLogger';
import { BackupLog } from '@/types';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('BackupLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
  });

  describe('logInfo', () => {
    it('should log info message correctly', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('[]');

      await BackupLogger.logInfo('backup_123', 'Test info message', { test: true }, 'system');

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'backup_log_entries',
        expect.stringContaining('"level":"info"')
      );
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'backup_log_entries',
        expect.stringContaining('"message":"Test info message"')
      );
    });
  });

  describe('logError', () => {
    it('should log error with details correctly', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('[]');
      const testError = new Error('Test error');

      await BackupLogger.logError(
        'backup_123',
        'Upload failed',
        testError,
        { fileName: 'test.jpg', retryCount: 1 },
        'upload'
      );

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'backup_log_entries',
        expect.stringContaining('"level":"error"')
      );
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'backup_log_entries',
        expect.stringContaining('"fileName":"test.jpg"')
      );
    });
  });

  describe('getBackupLogs', () => {
    it('should filter logs by backup ID', async () => {
      const mockLogs: BackupLogEntry[] = [
        {
          id: 'log_1',
          backupId: 'backup_123',
          timestamp: new Date(),
          level: 'info',
          message: 'Test message 1',
          category: 'system',
        },
        {
          id: 'log_2',
          backupId: 'backup_456',
          timestamp: new Date(),
          level: 'info',
          message: 'Test message 2',
          category: 'system',
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockLogs));

      const result = await BackupLogger.getBackupLogs('backup_123');

      expect(result).toHaveLength(1);
      expect(result[0]?.backupId).toBe('backup_123');
    });
  });

  describe('generateStatistics', () => {
    it('should generate correct statistics', async () => {
      const mockBackupLogs: BackupLog[] = [
        {
          id: 'backup_1',
          type: 'manual',
          startTime: new Date('2024-01-01T10:00:00Z'),
          endTime: new Date('2024-01-01T10:05:00Z'),
          status: 'completed',
          itemsUploaded: 10,
          totalItems: 10,
        },
        {
          id: 'backup_2',
          type: 'scheduled',
          startTime: new Date('2024-01-02T10:00:00Z'),
          endTime: new Date('2024-01-02T10:03:00Z'),
          status: 'failed',
          itemsUploaded: 5,
          totalItems: 10,
          errorMessage: 'Network error',
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValue('[]'); // No error logs

      const statistics = await BackupLogger.generateStatistics(mockBackupLogs);

      expect(statistics.totalBackups).toBe(2);
      expect(statistics.successfulBackups).toBe(1);
      expect(statistics.failedBackups).toBe(1);
      expect(statistics.totalItemsUploaded).toBe(15);
      expect(statistics.averageBackupDuration).toBeGreaterThan(0);
    });
  });

  describe('clearOldLogs', () => {
    it('should remove logs older than retention period', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35); // 35 days ago

      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 5); // 5 days ago

      const mockLogs: BackupLogEntry[] = [
        {
          id: 'log_old',
          backupId: 'backup_old',
          timestamp: oldDate,
          level: 'info',
          message: 'Old log',
          category: 'system',
        },
        {
          id: 'log_recent',
          backupId: 'backup_recent',
          timestamp: recentDate,
          level: 'info',
          message: 'Recent log',
          category: 'system',
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockLogs));

      await BackupLogger.clearOldLogs();

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'backup_log_entries',
        expect.not.stringContaining('Old log')
      );
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'backup_log_entries',
        expect.stringContaining('Recent log')
      );
    });
  });

  describe('exportLogs', () => {
    it('should export logs as JSON string', async () => {
      const mockLogs: BackupLogEntry[] = [
        {
          id: 'log_1',
          backupId: 'backup_123',
          timestamp: new Date(),
          level: 'info',
          message: 'Test message',
          category: 'system',
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockLogs));

      const exported = await BackupLogger.exportLogs();

      expect(exported).toContain('"message":"Test message"');
      expect(JSON.parse(exported)).toHaveLength(1);
    });
  });
});