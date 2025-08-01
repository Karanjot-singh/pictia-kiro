import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { BackupControls } from '@/components/BackupControls';
import { BackupProgress } from '@/components/BackupProgress';
import { BackupConfig, BackupLog, BackupProgress as BackupProgressType } from '@/types';
import { BackupService } from '@/services/BackupService';
import { NotificationService } from '@/services/NotificationService';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { createGooglePhotosClient } from '@/services/GooglePhotosClient';

export const BackupScreen: React.FC = () => {
  const [backupService, setBackupService] = useState<BackupService | null>(null);
  const [backupConfig, setBackupConfig] = useState<BackupConfig>({
    frequency: 'monthly',
    dayOfMonth: 1,
    notificationEnabled: true,
    notificationOffset: 24,
  });
  const [isBackupInProgress, setIsBackupInProgress] = useState(false);
  const [backupProgress, setBackupProgress] = useState<BackupProgressType | null>(null);
  const [backupHistory, setBackupHistory] = useState<BackupLog[]>([]);
  const [lastBackupDate, setLastBackupDate] = useState<Date | null>(null);
  const [nextScheduledBackup, setNextScheduledBackup] = useState<Date | null>(null);

  // Get auth token from Redux store
  const accessToken = useAppSelector(state => state.auth.accessToken);
  const dispatch = useAppDispatch();

  // Initialize backup service when access token is available
  useEffect(() => {
    if (accessToken) {
      const googlePhotosClient = createGooglePhotosClient(accessToken);
      const notificationService = NotificationService.getInstance();
      
      const service = new BackupService(
        googlePhotosClient,
        notificationService,
        {
          maxRetries: 3,
          retryDelay: 5000,
          batchSize: 10,
          maxConcurrentUploads: 3,
          enableProgressTracking: true,
          enableNotifications: true,
        }
      );
      
      // Add progress callback
      service.addProgressCallback((progress) => {
        setBackupProgress(progress);
      });
      
      setBackupService(service);
      
      // Load existing configuration and history
      loadBackupData(service);
    }
  }, [accessToken]);

  // Calculate next scheduled backup when config changes
  useEffect(() => {
    if (backupConfig) {
      const nextBackup = calculateNextBackupDate(backupConfig);
      setNextScheduledBackup(nextBackup);
    }
  }, [backupConfig]);

  const loadBackupData = async (service: BackupService) => {
    try {
      // Load backup configuration
      const savedConfig = await service.getBackupConfig();
      if (savedConfig) {
        setBackupConfig(savedConfig);
      }

      // Load backup history
      const history = await service.getBackupHistory();
      setBackupHistory(history);

      // Set last backup date
      const lastBackup = history.find(log => log.status === 'completed');
      if (lastBackup && lastBackup.endTime) {
        setLastBackupDate(lastBackup.endTime);
      }
    } catch (error) {
      console.error('Failed to load backup data:', error);
    }
  };

  const calculateNextBackupDate = (config: BackupConfig): Date => {
    const now = new Date();
    const nextBackup = new Date();

    if (config.frequency === 'weekly') {
      const currentDay = now.getDay();
      const targetDay = config.dayOfWeek || 0;
      const daysUntilTarget = (targetDay - currentDay + 7) % 7;
      
      if (daysUntilTarget === 0) {
        // If it's the same day, schedule for next week
        nextBackup.setDate(now.getDate() + 7);
      } else {
        nextBackup.setDate(now.getDate() + daysUntilTarget);
      }
    } else {
      // Monthly
      const targetDay = config.dayOfMonth || 1;
      nextBackup.setDate(targetDay);
      
      // If the target day has already passed this month, move to next month
      if (nextBackup <= now) {
        nextBackup.setMonth(nextBackup.getMonth() + 1);
      }
    }

    // Set time to 9 AM
    nextBackup.setHours(9, 0, 0, 0);
    
    return nextBackup;
  };

  const handleTriggerBackup = async () => {
    if (!backupService) {
      Alert.alert('Error', 'Backup service not initialized');
      return;
    }

    try {
      setIsBackupInProgress(true);
      
      // For now, we'll use empty array since we need to get organized media items
      // In a real implementation, this would get the organized photos from the organization state
      const mediaItems: any[] = []; // This should be populated with actual organized media
      
      const result = await backupService.triggerManualBackup(mediaItems);
      
      setIsBackupInProgress(false);
      setBackupProgress(null);
      setBackupHistory(prev => [result.backupLog, ...prev]);
      
      if (result.backupLog.endTime) {
        setLastBackupDate(result.backupLog.endTime);
      }
      
      if (result.success) {
        Alert.alert(
          'Backup Complete',
          `Successfully backed up ${result.uploadedCount} items.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Backup Completed with Errors',
          `Backed up ${result.uploadedCount} of ${result.totalCount} items. ${result.failedItems.length} items failed.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      setIsBackupInProgress(false);
      setBackupProgress(null);
      throw error; // Re-throw to be handled by BackupControls
    }
  };

  const handleConfigureBackup = async (config: BackupConfig) => {
    if (!backupService) {
      Alert.alert('Error', 'Backup service not initialized');
      return;
    }

    try {
      await backupService.scheduleBackup(config);
      setBackupConfig(config);
    } catch (error) {
      console.error('Failed to configure backup:', error);
      Alert.alert(
        'Configuration Error',
        'Failed to save backup configuration. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const formatBackupStatus = (log: BackupLog): string => {
    switch (log.status) {
      case 'completed':
        return `✅ Completed - ${log.itemsUploaded} items`;
      case 'failed':
        return `❌ Failed - ${log.errorMessage || 'Unknown error'}`;
      case 'in_progress':
        return `⏳ In Progress - ${log.itemsUploaded}/${log.totalItems} items`;
      case 'pending':
        return '⏸️ Pending';
      default:
        return '❓ Unknown status';
    }
  };

  const formatDuration = (startTime: Date, endTime?: Date): string => {
    if (!endTime) return 'In progress...';
    
    const duration = endTime.getTime() - startTime.getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Backup & Sync</Text>
          <Text style={styles.subtitle}>
            Keep your organized photos safely backed up to Google Photos
          </Text>
        </View>

        {/* Backup Controls */}
        <BackupControls
          onTriggerBackup={handleTriggerBackup}
          onConfigureBackup={handleConfigureBackup}
          currentConfig={backupConfig}
          isBackupInProgress={isBackupInProgress}
          lastBackupDate={lastBackupDate ?? undefined}
          nextScheduledBackup={nextScheduledBackup ?? undefined}
        />

        {/* Backup Progress */}
        {backupProgress && (
          <View style={styles.progressSection}>
            <View style={styles.progressContainer}>
              <Text style={styles.progressTitle}>Backup in Progress</Text>
              <View style={styles.progressInfo}>
                <Text style={styles.progressText}>
                  {backupProgress.currentItem} of {backupProgress.totalItems} items
                </Text>
                <Text style={styles.progressPercentage}>
                  {backupProgress.percentage}%
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                  <View 
                    style={[
                      styles.progressBarFill,
                      { width: `${backupProgress.percentage}%` }
                    ]} 
                  />
                </View>
              </View>
              {backupProgress.currentFileName && (
                <Text style={styles.currentFileName}>
                  Uploading: {backupProgress.currentFileName}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Backup History */}
        {backupHistory.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>Recent Backups</Text>
            
            {backupHistory.slice(0, 10).map((log) => (
              <View key={log.id} style={styles.historyItem}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyType}>
                    {log.type === 'manual' ? '👤 Manual' : '⏰ Scheduled'}
                  </Text>
                  <Text style={styles.historyDate}>
                    {log.startTime.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                
                <Text style={styles.historyStatus}>
                  {formatBackupStatus(log)}
                </Text>
                
                <View style={styles.historyDetails}>
                  <Text style={styles.historyDuration}>
                    Duration: {formatDuration(log.startTime, log.endTime)}
                  </Text>
                  {log.status === 'completed' && (
                    <Text style={styles.historySuccess}>
                      {log.itemsUploaded} of {log.totalItems} items uploaded
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {backupHistory.length === 0 && !isBackupInProgress && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No Backups Yet</Text>
            <Text style={styles.emptyStateText}>
              Start your first backup to keep your photos safe in Google Photos
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  progressSection: {
    marginTop: 16,
  },
  historySection: {
    backgroundColor: '#fff',
    marginTop: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  historyItem: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  historyDate: {
    fontSize: 12,
    color: '#666',
  },
  historyStatus: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  historyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyDuration: {
    fontSize: 12,
    color: '#666',
  },
  historySuccess: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  progressContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  progressBarContainer: {
    marginBottom: 12,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  currentFileName: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});