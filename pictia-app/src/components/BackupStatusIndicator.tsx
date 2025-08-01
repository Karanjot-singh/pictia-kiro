import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BackupLog } from '@/types';

interface BackupStatusIndicatorProps {
  status: 'idle' | 'in_progress' | 'completed' | 'failed';
  progress?: number;
  currentItem?: number;
  totalItems?: number;
  lastBackup?: BackupLog;
  onPress?: () => void;
  compact?: boolean;
}

export const BackupStatusIndicator: React.FC<BackupStatusIndicatorProps> = ({
  status,
  progress = 0,
  currentItem = 0,
  totalItems = 0,
  lastBackup,
  onPress,
  compact = false,
}) => {
  const [pulseAnim] = React.useState(new Animated.Value(1));

  React.useEffect(() => {
    if (status === 'in_progress') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.7,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
      return undefined;
    }
  }, [status]);

  const getStatusConfig = () => {
    switch (status) {
      case 'in_progress':
        return {
          icon: 'cloud-upload-outline',
          color: '#007AFF',
          backgroundColor: '#E3F2FD',
          text: compact ? 'Backing up...' : `Backing up ${currentItem}/${totalItems}`,
          showProgress: true,
        };
      case 'completed':
        return {
          icon: 'checkmark-circle',
          color: '#34C759',
          backgroundColor: '#E8F5E8',
          text: compact ? 'Completed' : 'Backup completed successfully',
          showProgress: false,
        };
      case 'failed':
        return {
          icon: 'alert-circle',
          color: '#FF3B30',
          backgroundColor: '#FFEBEE',
          text: compact ? 'Failed' : 'Backup failed - tap to retry',
          showProgress: false,
        };
      default:
        return {
          icon: 'cloud-outline',
          color: '#666',
          backgroundColor: '#F2F2F7',
          text: compact ? 'Ready' : getIdleText(),
          showProgress: false,
        };
    }
  };

  const getIdleText = () => {
    if (lastBackup) {
      const timeSince = getTimeSinceLastBackup(lastBackup.startTime);
      return `Last backup: ${timeSince}`;
    }
    return 'No recent backups';
  };

  const getTimeSinceLastBackup = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const config = getStatusConfig();

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactContainer, { backgroundColor: config.backgroundColor }]}
        onPress={onPress}
        disabled={!onPress}
      >
        <Animated.View style={{ opacity: pulseAnim }}>
          <Ionicons name={config.icon as any} size={16} color={config.color} />
        </Animated.View>
        <Text style={[styles.compactText, { color: config.color }]}>
          {config.text}
        </Text>
        {config.showProgress && progress > 0 && (
          <Text style={[styles.compactProgress, { color: config.color }]}>
            {Math.round(progress)}%
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: config.backgroundColor }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Animated.View style={{ opacity: pulseAnim }}>
            <Ionicons name={config.icon as any} size={24} color={config.color} />
          </Animated.View>
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[styles.statusText, { color: config.color }]}>
            {config.text}
          </Text>
          
          {config.showProgress && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progress}%`,
                      backgroundColor: config.color,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, { color: config.color }]}>
                {Math.round(progress)}%
              </Text>
            </View>
          )}
          
          {status === 'failed' && lastBackup?.errorMessage && (
            <Text style={styles.errorText} numberOfLines={2}>
              {lastBackup.errorMessage}
            </Text>
          )}
        </View>
        
        {onPress && (
          <View style={styles.chevronContainer}>
            <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  compactText: {
    fontSize: 14,
    fontWeight: '500',
  },
  compactProgress: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
    marginRight: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 35,
    textAlign: 'right',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
    fontStyle: 'italic',
  },
  chevronContainer: {
    marginLeft: 8,
  },
});