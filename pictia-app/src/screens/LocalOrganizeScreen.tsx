import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Image,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { useAppSelector } from '@/store/hooks';
import { selectIsLocalMode } from '@/store/selectors/authSelectors';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface LocalMediaItem {
  id: string;
  uri: string;
  filename: string;
  mediaType: 'photo' | 'video';
  creationTime: number;
  width: number;
  height: number;
}

const LocalOrganizeScreen: React.FC = () => {
  const [mediaItems, setMediaItems] = useState<LocalMediaItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [keepCount, setKeepCount] = useState(0);
  const [deleteCount, setDeleteCount] = useState(0);
  const [deletedItems, setDeletedItems] = useState<Set<string>>(new Set());
  
  const isLocalMode = useAppSelector(selectIsLocalMode);

  useEffect(() => {
    requestPermissionAndLoadMedia();
  }, []);

  const requestPermissionAndLoadMedia = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setHasPermission(status === 'granted');
      
      if (status === 'granted') {
        await loadMediaItems();
      }
    } catch (error) {
      console.error('Error requesting media library permission:', error);
      setHasPermission(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMediaItems = async () => {
    try {
      const media = await MediaLibrary.getAssetsAsync({
        mediaType: ['photo'],
        first: 50, // Load more items for better experience
        sortBy: MediaLibrary.SortBy.creationTime,
      });

      console.log('Found media items:', media.assets.length);

      if (media.assets.length === 0) {
        console.log('No media items found');
        setMediaItems([]);
        return;
      }

      // Get asset info for each item to get proper URIs
      const formattedItems: LocalMediaItem[] = [];
      
      for (const asset of media.assets) {
        try {
          const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
          
          formattedItems.push({
            id: asset.id,
            uri: assetInfo.localUri || asset.uri,
            filename: asset.filename,
            mediaType: asset.mediaType === MediaLibrary.MediaType.photo ? 'photo' : 'video',
            creationTime: asset.creationTime,
            width: asset.width,
            height: asset.height,
          });
        } catch (assetError) {
          console.warn('Failed to get asset info for:', asset.filename, assetError);
          // Fallback to basic asset info
          formattedItems.push({
            id: asset.id,
            uri: asset.uri,
            filename: asset.filename,
            mediaType: asset.mediaType === MediaLibrary.MediaType.photo ? 'photo' : 'video',
            creationTime: asset.creationTime,
            width: asset.width,
            height: asset.height,
          });
        }
      }

      console.log('Formatted items:', formattedItems.length);
      setMediaItems(formattedItems);
    } catch (error) {
      console.error('Error loading media items:', error);
      Alert.alert(
        'Error Loading Photos', 
        'Failed to load photos from your device. Please check that the app has permission to access your photos.',
        [
          {
            text: 'Retry',
            onPress: loadMediaItems,
          },
          {
            text: 'OK',
            style: 'cancel',
          },
        ]
      );
    }
  };

  const handleSwipeLeft = async () => {
    // Delete action
    const currentItem = mediaItems[currentIndex];
    if (!currentItem) return;

    try {
      // Mark for deletion (in a real app, you might want to move to trash first)
      setDeletedItems(prev => new Set([...prev, currentItem.id]));
      setDeleteCount(prev => prev + 1);
      
      // Move to next item
      setCurrentIndex(prev => prev + 1);
      
      // Show confirmation
      Alert.alert(
        'Photo Marked for Deletion',
        `${currentItem.filename} will be deleted from your device.`,
        [
          {
            text: 'Undo',
            onPress: () => {
              setDeletedItems(prev => {
                const newSet = new Set(prev);
                newSet.delete(currentItem.id);
                return newSet;
              });
              setDeleteCount(prev => prev - 1);
            },
          },
          {
            text: 'OK',
            style: 'default',
          },
        ]
      );
    } catch (error) {
      console.error('Error marking item for deletion:', error);
      Alert.alert('Error', 'Failed to mark item for deletion.');
    }
  };

  const handleSwipeRight = () => {
    // Keep action
    setKeepCount(prev => prev + 1);
    setCurrentIndex(prev => prev + 1);
  };

  const handleActualDelete = async () => {
    if (deletedItems.size === 0) {
      Alert.alert('No Items', 'No items are marked for deletion.');
      return;
    }

    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to permanently delete ${deletedItems.size} items? This cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const itemsToDelete = Array.from(deletedItems);
              await MediaLibrary.deleteAssetsAsync(itemsToDelete);
              
              Alert.alert('Success', `${itemsToDelete.length} items deleted successfully.`);
              
              // Reload media items
              setDeletedItems(new Set());
              setCurrentIndex(0);
              setKeepCount(0);
              setDeleteCount(0);
              await loadMediaItems();
            } catch (error) {
              console.error('Error deleting items:', error);
              Alert.alert('Error', 'Failed to delete some items.');
            }
          },
        },
      ]
    );
  };

  const renderPermissionScreen = () => (
    <View style={styles.centerContainer}>
      <Text style={styles.title}>Media Access Required</Text>
      <Text style={styles.subtitle}>
        Pictia needs access to your photos and videos to help you organize them.
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={requestPermissionAndLoadMedia}
      >
        <Text style={styles.buttonText}>Grant Permission</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoadingScreen = () => (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>Loading your photos...</Text>
    </View>
  );

  const renderCompletionScreen = () => (
    <View style={styles.centerContainer}>
      <Text style={styles.title}>Organization Complete!</Text>
      <Text style={styles.subtitle}>
        You've organized {mediaItems.length} items
      </Text>
      <Text style={styles.stats}>
        Kept: {keepCount} • Marked for deletion: {deleteCount}
      </Text>
      
      {deleteCount > 0 && (
        <TouchableOpacity
          style={[styles.button, styles.deleteButton]}
          onPress={handleActualDelete}
        >
          <Text style={styles.buttonText}>Delete Marked Items</Text>
        </TouchableOpacity>
      )}
      
      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          setCurrentIndex(0);
          setKeepCount(0);
          setDeleteCount(0);
          setDeletedItems(new Set());
        }}
      >
        <Text style={styles.buttonText}>Start Over</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyScreen = () => (
    <View style={styles.centerContainer}>
      <Text style={styles.title}>No Photos Found</Text>
      <Text style={styles.subtitle}>
        No photos or videos were found on your device.
      </Text>
    </View>
  );

  const currentItem = mediaItems[currentIndex];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderLoadingScreen()}
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        {renderPermissionScreen()}
      </SafeAreaView>
    );
  }

  if (mediaItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        {renderEmptyScreen()}
      </SafeAreaView>
    );
  }

  if (currentIndex >= mediaItems.length) {
    return (
      <SafeAreaView style={styles.container}>
        {renderCompletionScreen()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          {currentIndex + 1} of {mediaItems.length}
        </Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${((currentIndex + 1) / mediaItems.length) * 100}%` }
            ]} 
          />
        </View>
        <Text style={styles.statsText}>
          Keep: {keepCount} • Delete: {deleteCount}
        </Text>
      </View>

      {/* Current photo */}
      <View style={styles.photoContainer}>
        {currentItem && (
          <>
            <Image
              source={{ uri: currentItem.uri }}
              style={styles.photo}
              resizeMode="contain"
              onError={(error) => {
                console.error('Image load error for', currentItem.filename, ':', error.nativeEvent.error);
                Alert.alert(
                  'Image Load Error',
                  `Failed to load ${currentItem.filename}. Skipping to next photo.`,
                  [
                    {
                      text: 'OK',
                      onPress: () => setCurrentIndex(prev => prev + 1),
                    },
                  ]
                );
              }}
              onLoad={() => {
                console.log('Image loaded successfully:', currentItem.filename);
              }}
            />
            <Text style={styles.photoInfo}>
              {currentItem.filename}
            </Text>
          </>
        )}
      </View>

      {/* Action buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handleSwipeLeft}
        >
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.keepButton]}
          onPress={handleSwipeRight}
        >
          <Text style={styles.actionButtonText}>Keep</Text>
        </TouchableOpacity>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText}>
          Tap Delete to remove • Tap Keep to save
        </Text>
        {isLocalMode && (
          <Text style={styles.localModeText}>
            Local Gallery Mode - No Google Photos sync
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  statsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  stats: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  photoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  photo: {
    width: screenWidth - 40,
    height: screenHeight * 0.5,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  photoInfo: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    justifyContent: 'space-around',
  },
  actionButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    minWidth: 120,
    alignItems: 'center',
  },
  keepButton: {
    backgroundColor: '#34C759',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  instructionsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  localModeText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default LocalOrganizeScreen;