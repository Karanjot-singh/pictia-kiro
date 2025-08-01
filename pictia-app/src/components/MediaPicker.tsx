import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  Dimensions
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { MediaPickerResult } from '@/types';

interface MediaPickerProps {
  onMediaSelected: (media: MediaPickerResult[]) => void;
  maxSelection?: number;
  allowsEditing?: boolean;
  quality?: number;
  mediaTypes?: ImagePicker.MediaTypeOptions;
}

const { width: screenWidth } = Dimensions.get('window');
const ITEM_SIZE = (screenWidth - 60) / 3; // 3 items per row with margins

export const MediaPicker: React.FC<MediaPickerProps> = ({
  onMediaSelected,
  maxSelection = 10,
  allowsEditing = false,
  quality = 0.8,
  mediaTypes = ImagePicker.MediaTypeOptions.All
}) => {
  const [selectedMedia, setSelectedMedia] = useState<MediaPickerResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const requestPermissions = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Sorry, we need camera roll permissions to upload photos and videos.',
        [{ text: 'OK' }]
      );
      return false;
    }
    
    return true;
  };

  const pickFromLibrary = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    setIsLoading(true);
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
        allowsMultipleSelection: true,
        allowsEditing,
        quality,
        selectionLimit: maxSelection - selectedMedia.length,
      });

      if (!result.canceled && result.assets) {
        const newMedia: MediaPickerResult[] = result.assets.map((asset, index) => ({
          uri: asset.uri,
          fileName: asset.fileName || `media_${Date.now()}_${index}`,
          mimeType: asset.mimeType || 'image/jpeg',
          fileSize: asset.fileSize || 0,
          width: asset.width,
          height: asset.height,
        }));

        const updatedMedia = [...selectedMedia, ...newMedia];
        setSelectedMedia(updatedMedia);
        onMediaSelected(updatedMedia);
      }
    } catch (error) {
      console.error('Error picking media:', error);
      Alert.alert('Error', 'Failed to pick media. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Sorry, we need camera permissions to take photos.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes,
        allowsEditing,
        quality,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const newMedia: MediaPickerResult = {
          uri: asset.uri,
          fileName: asset.fileName || `photo_${Date.now()}`,
          mimeType: asset.mimeType || 'image/jpeg',
          fileSize: asset.fileSize || 0,
          width: asset.width,
          height: asset.height,
        };

        const updatedMedia = [...selectedMedia, newMedia];
        setSelectedMedia(updatedMedia);
        onMediaSelected(updatedMedia);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const removeMedia = (index: number) => {
    const updatedMedia = selectedMedia.filter((_, i) => i !== index);
    setSelectedMedia(updatedMedia);
    onMediaSelected(updatedMedia);
  };

  const clearAll = () => {
    setSelectedMedia([]);
    onMediaSelected([]);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const canAddMore = selectedMedia.length < maxSelection;

  return (
    <View style={styles.container}>
      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, !canAddMore && styles.disabledButton]}
          onPress={pickFromLibrary}
          disabled={!canAddMore || isLoading}
        >
          <Ionicons name="images" size={24} color={canAddMore ? "#007AFF" : "#999"} />
          <Text style={[styles.actionButtonText, !canAddMore && styles.disabledText]}>
            Choose from Library
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, !canAddMore && styles.disabledButton]}
          onPress={takePhoto}
          disabled={!canAddMore || isLoading}
        >
          <Ionicons name="camera" size={24} color={canAddMore ? "#007AFF" : "#999"} />
          <Text style={[styles.actionButtonText, !canAddMore && styles.disabledText]}>
            Take Photo
          </Text>
        </TouchableOpacity>
      </View>

      {/* Selection Info */}
      {selectedMedia.length > 0 && (
        <View style={styles.selectionInfo}>
          <Text style={styles.selectionText}>
            {selectedMedia.length} of {maxSelection} selected
          </Text>
          <TouchableOpacity onPress={clearAll} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Selected Media Grid */}
      {selectedMedia.length > 0 && (
        <ScrollView style={styles.mediaGrid} showsVerticalScrollIndicator={false}>
          <View style={styles.gridContainer}>
            {selectedMedia.map((media, index) => (
              <View key={index} style={styles.mediaItem}>
                <Image source={{ uri: media.uri }} style={styles.mediaImage} />
                
                {/* Remove Button */}
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeMedia(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#FF3B30" />
                </TouchableOpacity>

                {/* Media Info */}
                <View style={styles.mediaInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {media.fileName}
                  </Text>
                  <Text style={styles.fileSize}>
                    {formatFileSize(media.fileSize)}
                  </Text>
                  {media.width && media.height && (
                    <Text style={styles.dimensions}>
                      {media.width} × {media.height}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Empty State */}
      {selectedMedia.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="cloud-upload-outline" size={64} color="#999" />
          <Text style={styles.emptyStateTitle}>No media selected</Text>
          <Text style={styles.emptyStateText}>
            Choose photos or videos from your library or take a new photo
          </Text>
        </View>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#F8F8F8',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  disabledText: {
    color: '#999',
  },
  selectionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  selectionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  clearButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearButtonText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '500',
  },
  mediaGrid: {
    flex: 1,
    paddingHorizontal: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  mediaItem: {
    width: ITEM_SIZE,
    marginBottom: 16,
  },
  mediaImage: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mediaInfo: {
    marginTop: 8,
  },
  fileName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  fileSize: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  dimensions: {
    fontSize: 11,
    color: '#666',
    marginTop: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
});