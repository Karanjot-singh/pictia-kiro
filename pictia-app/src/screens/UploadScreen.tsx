import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MediaPicker } from '@/components/MediaPicker';
import { UploadProgress } from '@/components/UploadProgress';
import { MediaPickerResult, UploadItem, UploadSession } from '@/types';
import { UploadService } from '@/services/UploadService';
import { useAppSelector } from '@/store/hooks';
import { createGooglePhotosClient } from '@/services/GooglePhotosClient';

export const UploadScreen: React.FC = () => {
  const [selectedMedia, setSelectedMedia] = useState<MediaPickerResult[]>([]);
  const [uploadSession, setUploadSession] = useState<UploadSession | null>(null);
  const [uploadService, setUploadService] = useState<UploadService | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  // Get auth token from Redux store
  const accessToken = useAppSelector(state => state.auth.accessToken);

  // Initialize upload service when access token is available
  useEffect(() => {
    if (accessToken) {
      const googlePhotosClient = createGooglePhotosClient(accessToken);
      const service = new UploadService({
        googlePhotosClient,
        maxConcurrentUploads: 3,
        retryAttempts: 3,
        retryDelay: 1000,
      });
      setUploadService(service);
    }
  }, [accessToken]);

  // Validate media when selection changes
  useEffect(() => {
    if (selectedMedia.length > 0 && uploadService) {
      const validation = uploadService.validateMedia(selectedMedia);
      setValidationErrors(validation.errors);
      setValidationWarnings(validation.warnings);
    } else {
      setValidationErrors([]);
      setValidationWarnings([]);
    }
  }, [selectedMedia, uploadService]);

  const handleMediaSelected = (media: MediaPickerResult[]) => {
    setSelectedMedia(media);
    // Clear previous upload session when new media is selected
    if (uploadSession) {
      setUploadSession(null);
    }
  };

  const handleStartUpload = async () => {
    if (!uploadService || selectedMedia.length === 0) {
      return;
    }

    if (validationErrors.length > 0) {
      Alert.alert(
        'Validation Errors',
        `Please fix the following issues:\n\n${validationErrors.join('\n')}`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Show warnings if any
    if (validationWarnings.length > 0) {
      Alert.alert(
        'Upload Warnings',
        `${validationWarnings.join('\n')}\n\nDo you want to continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => startUploadProcess() }
        ]
      );
    } else {
      startUploadProcess();
    }
  };

  const startUploadProcess = async () => {
    if (!uploadService) return;

    try {
      setIsUploading(true);
      
      const session = await uploadService.startUploadSession(
        selectedMedia,
        (updatedSession) => {
          setUploadSession(updatedSession);
        }
      );
      
      setUploadSession(session);
    } catch (error) {
      console.error('Upload failed:', error);
      Alert.alert(
        'Upload Failed',
        error instanceof Error ? error.message : 'Unknown error occurred',
        [{ text: 'OK' }]
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleRetryUpload = async (itemId: string) => {
    if (!uploadService) return;

    try {
      await uploadService.retryUpload(itemId, (items) => {
        if (uploadSession) {
          const updatedSession = { ...uploadSession };
          updatedSession.items = items;
          updatedSession.completedItems = items.filter(item => item.status === 'completed').length;
          updatedSession.failedItems = items.filter(item => item.status === 'failed').length;
          setUploadSession(updatedSession);
        }
      });
    } catch (error) {
      console.error('Retry failed:', error);
      Alert.alert('Retry Failed', 'Unable to retry upload. Please try again.');
    }
  };

  const handleCancelUpload = (itemId: string) => {
    if (!uploadService) return;

    Alert.alert(
      'Cancel Upload',
      'Are you sure you want to cancel this upload?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: () => {
            uploadService.cancelUpload(itemId);
          }
        }
      ]
    );
  };

  const handleRemoveItem = (itemId: string) => {
    if (!uploadSession) return;

    const updatedItems = uploadSession.items.filter(item => item.id !== itemId);
    const updatedSession = {
      ...uploadSession,
      items: updatedItems,
      totalItems: updatedItems.length,
      completedItems: updatedItems.filter(item => item.status === 'completed').length,
      failedItems: updatedItems.filter(item => item.status === 'failed').length,
    };
    
    setUploadSession(updatedSession);

    // Also remove from selected media if upload hasn't started
    if (updatedItems.every(item => item.status === 'pending')) {
      const updatedMedia = selectedMedia.filter((_, index) => {
        const itemIndex = uploadSession.items.findIndex(item => item.id === itemId);
        return index !== itemIndex;
      });
      setSelectedMedia(updatedMedia);
    }
  };

  const handleClearCompleted = () => {
    if (!uploadService || !uploadSession) return;

    const remainingItems = uploadSession.items.filter(
      item => item.status !== 'completed' && item.status !== 'failed'
    );

    if (remainingItems.length === 0) {
      // All items are completed/failed, reset everything
      setUploadSession(null);
      setSelectedMedia([]);
      uploadService.clearAll();
    } else {
      // Update session with remaining items
      const updatedSession = {
        ...uploadSession,
        items: remainingItems,
        totalItems: remainingItems.length,
        completedItems: remainingItems.filter(item => item.status === 'completed').length,
        failedItems: remainingItems.filter(item => item.status === 'failed').length,
      };
      setUploadSession(updatedSession);
      uploadService.clearCompleted();
    }
  };

  const getUploadStats = () => {
    if (!uploadSession) return null;

    const { items } = uploadSession;
    const pending = items.filter(item => item.status === 'pending').length;
    const uploading = items.filter(item => item.status === 'uploading').length;
    const completed = items.filter(item => item.status === 'completed').length;
    const failed = items.filter(item => item.status === 'failed').length;

    return { pending, uploading, completed, failed, total: items.length };
  };

  const stats = getUploadStats();
  const hasCompletedOrFailed = stats && (stats.completed > 0 || stats.failed > 0);
  const canStartUpload = selectedMedia.length > 0 && !isUploading && validationErrors.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Upload Photos & Videos</Text>
          <Text style={styles.subtitle}>
            Select media from your device to upload to Google Photos
          </Text>
        </View>

        {/* Validation Messages */}
        {validationErrors.length > 0 && (
          <View style={styles.validationContainer}>
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color="#FF3B30" />
              <Text style={styles.errorTitle}>Validation Errors</Text>
            </View>
            {validationErrors.map((error, index) => (
              <Text key={index} style={styles.errorText}>
                • {error}
              </Text>
            ))}
          </View>
        )}

        {validationWarnings.length > 0 && (
          <View style={styles.validationContainer}>
            <View style={styles.warningContainer}>
              <Ionicons name="warning" size={20} color="#FF9500" />
              <Text style={styles.warningTitle}>Warnings</Text>
            </View>
            {validationWarnings.map((warning, index) => (
              <Text key={index} style={styles.warningText}>
                • {warning}
              </Text>
            ))}
          </View>
        )}

        {/* Media Picker */}
        <View style={styles.section}>
          <MediaPicker
            onMediaSelected={handleMediaSelected}
            maxSelection={20}
            allowsEditing={false}
            quality={0.8}
          />
        </View>

        {/* Upload Controls */}
        {selectedMedia.length > 0 && (
          <View style={styles.uploadControls}>
            <TouchableOpacity
              style={[
                styles.uploadButton,
                !canStartUpload && styles.uploadButtonDisabled
              ]}
              onPress={handleStartUpload}
              disabled={!canStartUpload}
            >
              <Ionicons 
                name="cloud-upload" 
                size={20} 
                color={canStartUpload ? "#fff" : "#999"} 
              />
              <Text style={[
                styles.uploadButtonText,
                !canStartUpload && styles.uploadButtonTextDisabled
              ]}>
                {isUploading ? 'Starting Upload...' : `Upload ${selectedMedia.length} Items`}
              </Text>
            </TouchableOpacity>

            {hasCompletedOrFailed && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClearCompleted}
              >
                <Ionicons name="trash-outline" size={18} color="#666" />
                <Text style={styles.clearButtonText}>Clear Completed</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Upload Statistics */}
        {stats && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>Upload Status</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.pending}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: '#007AFF' }]}>{stats.uploading}</Text>
                <Text style={styles.statLabel}>Uploading</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: '#34C759' }]}>{stats.completed}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: '#FF3B30' }]}>{stats.failed}</Text>
                <Text style={styles.statLabel}>Failed</Text>
              </View>
            </View>
          </View>
        )}

        {/* Upload Progress */}
        {uploadSession && uploadSession.items.length > 0 && (
          <UploadProgress
            items={uploadSession.items}
            onRetry={handleRetryUpload}
            onCancel={handleCancelUpload}
            onRemove={handleRemoveItem}
          />
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
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
  },
  validationContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderColor: '#FF3B30',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginLeft: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginLeft: 4,
    marginBottom: 4,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderColor: '#FF9500',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9500',
    marginLeft: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#FF9500',
    marginLeft: 4,
    marginBottom: 4,
  },
  uploadControls: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  uploadButtonDisabled: {
    backgroundColor: '#E5E5EA',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  uploadButtonTextDisabled: {
    color: '#999',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  statsContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
});