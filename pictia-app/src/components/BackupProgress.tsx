import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BackupProgress as BackupProgressType, BackupLog } from '@/types';

interface BackupProgressProps {
  progress: BackupProgressType | null;
  isVisible: boolean;
  onClose: () => void;
  onCancel?: () => void;
  logs?: BackupLog[];
  showHistory?: boolean;
}

export const BackupProgress: React.FC<BackupProgressProps> = ({
  progress,
  isVisible,
  onClose,
  onCancel,
  logs = [],
  showHistory = false,
}) => {
  const [animatedProgress] = useState(new Animated.Value(0));
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (progress) {
      Animated.timing(animatedProgress, {
        toValue: progress.percentage,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [progress?.percentage]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    return `${formatFileSize(bytesPerSecond)}/s`;
  };

  const getStatusColor = (status: BackupLog['status']) => {
    switch (status) {
      case 'completed':
        return '#34C759';
      case 'failed':
        return '#FF3B30';
      case 'in_progress':
        return '#007AFF';
      default:
        return '#666';
    }
  };

  const getStatusIcon = (status: BackupLog['status']) => {
    switch (status) {
      case 'completed':
        return 'checkmark-circle';
      case 'failed':
        return 'alert-circle';
      case 'in_progress':
        return 'cloud-upload-outline';
      default:
        return 'time-outline';
    }
  };

  const renderProgressBar = () => {
    if (!progress) return null;

    return (
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Backup Progress</Text>
          <Text style={styles.progressPercentage}>{Math.round(progress.percentage)}%</Text>
        </View>
        
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: animatedProgress.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                    extrapolate: 'clamp',
                  }),
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.progressDetails}>
          <Text style={styles.progressText}>
            {progress.currentItem} of {progress.totalItems} items
          </Text>
          <Text style={styles.progressText}>
            {formatFileSize(progress.bytesUploaded)} / {formatFileSize(progress.totalBytes)}
          </Text>
        </View>

        {progress.currentFileName && (
          <View style={styles.currentFileContainer}>
            <Ionicons name="document-outline" size={16} color="#666" />
            <Text style={styles.currentFileName} numberOfLines={1}>
              {progress.currentFileName}
            </Text>
          </View>
        )}

        {(progress.uploadSpeed || progress.estimatedTimeRemaining) && (
          <View style={styles.speedContainer}>
            {progress.uploadSpeed && (
              <Text style={styles.speedText}>
                Speed: {formatSpeed(progress.uploadSpeed)}
              </Text>
            )}
            {progress.estimatedTimeRemaining && (
              <Text style={styles.speedText}>
                ETA: {formatDuration(progress.estimatedTimeRemaining)}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderHistoryItem = (log: BackupLog, index: number) => {
    const duration = log.endTime && log.startTime 
      ? (log.endTime.getTime() - log.startTime.getTime()) / 1000
      : 0;

    return (
      <View key={log.id} style={styles.historyItem}>
        <View style={styles.historyHeader}>
          <View style={styles.historyStatus}>
            <Ionicons 
              name={getStatusIcon(log.status)} 
              size={20} 
              color={getStatusColor(log.status)} 
            />
            <Text style={styles.historyType}>
              {log.type === 'manual' ? 'Manual Backup' : 'Scheduled Backup'}
            </Text>
          </View>
          <Text style={styles.historyDate}>
            {log.startTime.toLocaleDateString()} {log.startTime.toLocaleTimeString()}
          </Text>
        </View>

        <View style={styles.historyStats}>
          <View style={styles.historyStat}>
            <Text style={styles.historyStatLabel}>Items</Text>
            <Text style={styles.historyStatValue}>
              {log.itemsUploaded}/{log.totalItems}
            </Text>
          </View>
          
          {duration > 0 && (
            <View style={styles.historyStat}>
              <Text style={styles.historyStatLabel}>Duration</Text>
              <Text style={styles.historyStatValue}>
                {formatDuration(duration)}
              </Text>
            </View>
          )}

          <View style={styles.historyStat}>
            <Text style={styles.historyStatLabel}>Status</Text>
            <Text style={[
              styles.historyStatValue,
              { color: getStatusColor(log.status) }
            ]}>
              {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
            </Text>
          </View>
        </View>

        {log.errorMessage && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={16} color="#FF3B30" />
            <Text style={styles.errorText}>{log.errorMessage}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          
          <Text style={styles.title}>
            {showHistory ? 'Backup History' : 'Backup Progress'}
          </Text>
          
          {!showHistory && (
            <TouchableOpacity 
              onPress={() => setShowDetails(!showDetails)}
              style={styles.detailsButton}
            >
              <Ionicons 
                name={showDetails ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#007AFF" 
              />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {!showHistory && progress && renderProgressBar()}
          
          {showDetails && !showHistory && (
            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>Backup Details</Text>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Backup ID:</Text>
                <Text style={styles.detailValue}>{progress?.backupId}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Started:</Text>
                <Text style={styles.detailValue}>
                  {new Date().toLocaleTimeString()}
                </Text>
              </View>
            </View>
          )}

          {(showHistory || logs.length > 0) && (
            <View style={styles.historySection}>
              <Text style={styles.sectionTitle}>
                {showHistory ? 'Recent Backups' : 'Previous Backups'}
              </Text>
              {logs.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="archive-outline" size={48} color="#C7C7CC" />
                  <Text style={styles.emptyStateText}>No backup history</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Your completed backups will appear here
                  </Text>
                </View>
              ) : (
                logs.slice(0, showHistory ? undefined : 3).map(renderHistoryItem)
              )}
            </View>
          )}
        </ScrollView>

        {!showHistory && progress && onCancel && (
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel Backup</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};
const
 styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  detailsButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  progressSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
  },
  progressBarContainer: {
    marginBottom: 16,
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
  progressDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  currentFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  currentFileName: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  speedContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  speedText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  detailsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  historySection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historyItem: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  historyDate: {
    fontSize: 12,
    color: '#666',
  },
  historyStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  historyStat: {
    alignItems: 'center',
  },
  historyStatLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  historyStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF2F2',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginLeft: 8,
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});