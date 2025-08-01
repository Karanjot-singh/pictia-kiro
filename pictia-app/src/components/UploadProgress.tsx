import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UploadItem } from '@/types';

interface UploadProgressProps {
  items: UploadItem[];
  onRetry?: (itemId: string) => void;
  onCancel?: (itemId: string) => void;
  onRemove?: (itemId: string) => void;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  items,
  onRetry,
  onCancel,
  onRemove,
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: UploadItem['status']) => {
    switch (status) {
      case 'pending':
        return <Ionicons name="time-outline" size={20} color="#666" />;
      case 'uploading':
        return <Ionicons name="cloud-upload-outline" size={20} color="#007AFF" />;
      case 'completed':
        return <Ionicons name="checkmark-circle" size={20} color="#34C759" />;
      case 'failed':
        return <Ionicons name="alert-circle" size={20} color="#FF3B30" />;
      default:
        return <Ionicons name="help-circle" size={20} color="#666" />;
    }
  };

  const getStatusText = (status: UploadItem['status']) => {
    switch (status) {
      case 'pending':
        return 'Waiting...';
      case 'uploading':
        return 'Uploading...';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const ProgressBar: React.FC<{ progress: number; status: UploadItem['status'] }> = ({
    progress,
    status,
  }) => {
    const animatedWidth = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
      Animated.timing(animatedWidth, {
        toValue: progress,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }, [progress]);

    const getProgressColor = () => {
      switch (status) {
        case 'uploading':
          return '#007AFF';
        case 'completed':
          return '#34C759';
        case 'failed':
          return '#FF3B30';
        default:
          return '#E5E5EA';
      }
    };

    return (
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: animatedWidth.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                  extrapolate: 'clamp',
                }),
                backgroundColor: getProgressColor(),
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>{Math.round(progress)}%</Text>
      </View>
    );
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload Progress</Text>
      
      {items.map((item) => (
        <View key={item.id} style={styles.uploadItem}>
          {/* Media Preview */}
          <Image source={{ uri: item.file.uri }} style={styles.thumbnail} />
          
          {/* Upload Info */}
          <View style={styles.uploadInfo}>
            <View style={styles.fileInfo}>
              <Text style={styles.fileName} numberOfLines={1}>
                {item.file.fileName}
              </Text>
              <Text style={styles.fileSize}>
                {formatFileSize(item.file.fileSize)}
              </Text>
            </View>
            
            {/* Status and Progress */}
            <View style={styles.statusContainer}>
              <View style={styles.statusRow}>
                {getStatusIcon(item.status)}
                <Text style={styles.statusText}>
                  {getStatusText(item.status)}
                </Text>
              </View>
              
              {item.status === 'uploading' && (
                <ProgressBar progress={item.progress} status={item.status} />
              )}
              
              {item.status === 'failed' && item.error && (
                <Text style={styles.errorText} numberOfLines={2}>
                  {item.error}
                </Text>
              )}
            </View>
          </View>
          
          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {item.status === 'failed' && onRetry && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onRetry(item.id)}
              >
                <Ionicons name="refresh" size={18} color="#007AFF" />
              </TouchableOpacity>
            )}
            
            {item.status === 'uploading' && onCancel && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onCancel(item.id)}
              >
                <Ionicons name="stop" size={18} color="#FF3B30" />
              </TouchableOpacity>
            )}
            
            {(item.status === 'completed' || item.status === 'failed') && onRemove && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onRemove(item.id)}
              >
                <Ionicons name="close" size={18} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
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
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  uploadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    marginRight: 12,
  },
  uploadInfo: {
    flex: 1,
    marginRight: 12,
  },
  fileInfo: {
    marginBottom: 8,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    color: '#666',
  },
  statusContainer: {
    gap: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarBackground: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
    minWidth: 35,
    textAlign: 'right',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
});