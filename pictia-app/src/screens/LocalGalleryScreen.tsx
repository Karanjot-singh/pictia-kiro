import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { OrganiseStackParamList, CachedMediaItem } from '@/types';
import { FullScreenViewer, BatchActionBar } from '@/components';
import ReviewTracker from '@/services/ReviewTracker';

const { width: screenWidth } = Dimensions.get('window');
const GRID_SPACING = 2;
const NUM_COLUMNS = 3;

interface LocalMediaItem {
  id: string;
  uri: string;
  filename: string;
  mediaType: 'photo' | 'video';
  creationTime: number;
  width: number;
  height: number;
}

type LocalGalleryScreenNavigationProp = StackNavigationProp<OrganiseStackParamList, 'Gallery'>;

const LocalGalleryScreen: React.FC = () => {
  const navigation = useNavigation<LocalGalleryScreenNavigationProp>();
  
  // State
  const [mediaItems, setMediaItems] = useState<LocalMediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [fullScreenItem, setFullScreenItem] = useState<LocalMediaItem | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [reviewedItems, setReviewedItems] = useState<Set<string>>(new Set());
  const [deletedItems, setDeletedItems] = useState<Set<string>>(new Set());
  const [reviewTracker] = useState(() => ReviewTracker.getInstance());

  // Calculate thumbnail size
  const thumbnailSize = (screenWidth - GRID_SPACING * (NUM_COLUMNS + 1)) / NUM_COLUMNS;

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

  const initializeReviewData = async (items: LocalMediaItem[]) => {
    try {
      await reviewTracker.initialize();
      
      if (items.length > 0) {
        const reviewedSet = new Set<string>();
        const deletedSet = new Set<string>();
        
        // Convert LocalMediaItem to CachedMediaItem format for ReviewTracker
        const cachedItems: CachedMediaItem[] = items.map(item => ({
          id: item.id,
          filename: item.filename,
          mimeType: item.mediaType === 'photo' ? 'image/jpeg' : 'video/mp4',
          baseUrl: item.uri,
          mediaMetadata: {
            creationTime: new Date(item.creationTime).toISOString(),
            width: item.width.toString(),
            height: item.height.toString(),
          },
          cachedAt: Date.now(),
          lastAccessed: Date.now(),
        }));
        
        // Get deleted photos first (these are filtered out)
        const deletedPhotos = await reviewTracker.getPhotosByAction(cachedItems, 'delete');
        deletedPhotos.forEach(photo => {
          deletedSet.add(photo.id);
          reviewedSet.add(photo.id);
        });
        
        // Get kept photos
        const keptPhotos = await reviewTracker.getPhotosByAction(cachedItems, 'keep');
        keptPhotos.forEach(photo => {
          reviewedSet.add(photo.id);
        });
        
        setReviewedItems(reviewedSet);
        setDeletedItems(deletedSet);
      }
    } catch (error) {
      console.error('Failed to initialize review data:', error);
    }
  };

  const loadMediaItems = async () => {
    try {
      const media = await MediaLibrary.getAssetsAsync({
        mediaType: ['photo'],
        first: 100,
        sortBy: MediaLibrary.SortBy.creationTime,
      });

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

      setMediaItems(formattedItems);
      
      // Initialize review data
      await initializeReviewData(formattedItems);
    } catch (error) {
      console.error('Error loading media items:', error);
      Alert.alert(
        'Error Loading Photos', 
        'Failed to load photos from your device.',
        [{ text: 'OK' }]
      );
    }
  };

  // Handle photo press (single tap)
  const handlePhotoPress = useCallback((item: LocalMediaItem) => {
    try {
      if (!item || !item.id) {
        console.warn('Invalid item passed to handlePhotoPress');
        return;
      }

      if (isMultiSelectMode) {
        // Toggle selection in multi-select mode
        setSelectedItems(prev => {
          const newSet = new Set(prev);
          if (newSet.has(item.id)) {
            newSet.delete(item.id);
          } else {
            newSet.add(item.id);
          }
          return newSet;
        });
      } else {
        // Open full-screen viewer
        const index = mediaItems.findIndex(mediaItem => mediaItem && mediaItem.id === item.id);
        if (index >= 0) {
          setCurrentPhotoIndex(index);
          setFullScreenItem(item);
        }
      }
    } catch (error) {
      console.error('Error handling photo press:', error);
    }
  }, [isMultiSelectMode, mediaItems]);

  // Handle photo long press
  const handlePhotoLongPress = useCallback((item: LocalMediaItem) => {
    if (!isMultiSelectMode) {
      setIsMultiSelectMode(true);
      setSelectedItems(new Set([item.id]));
    }
  }, [isMultiSelectMode]);

  // Handle full-screen viewer close
  const handleFullScreenClose = useCallback(() => {
    setFullScreenItem(null);
  }, []);

  // Handle start swipe mode from full-screen viewer
  const handleStartSwipeMode = useCallback(() => {
    if (!fullScreenItem) return;

    setFullScreenItem(null);
    navigation.navigate('SwipeMode', {
      startingPhotoId: fullScreenItem.id,
      startMode: 'gallery',
    });
  }, [fullScreenItem, navigation]);

  // Handle navigation in full-screen viewer
  const handleNavigatePrevious = useCallback(() => {
    try {
      if (currentPhotoIndex > 0 && mediaItems && mediaItems.length > 0) {
        const newIndex = currentPhotoIndex - 1;
        setCurrentPhotoIndex(newIndex);
        const item = mediaItems[newIndex];
        if (item) {
          setFullScreenItem(item);
        }
      }
    } catch (error) {
      console.error('Error navigating to previous photo:', error);
    }
  }, [currentPhotoIndex, mediaItems]);

  const handleNavigateNext = useCallback(() => {
    try {
      if (currentPhotoIndex < mediaItems.length - 1 && mediaItems && mediaItems.length > 0) {
        const newIndex = currentPhotoIndex + 1;
        setCurrentPhotoIndex(newIndex);
        const item = mediaItems[newIndex];
        if (item) {
          setFullScreenItem(item);
        }
      }
    } catch (error) {
      console.error('Error navigating to next photo:', error);
    }
  }, [currentPhotoIndex, mediaItems]);

  // Handle batch delete
  const handleBatchDelete = useCallback(async (items: CachedMediaItem[]) => {
    try {
      const itemIds = items.map(item => item.id);
      await MediaLibrary.deleteAssetsAsync(itemIds);
      
      // Mark items as reviewed with delete action
      await reviewTracker.markMultipleAsReviewed(itemIds, 'delete');
      
      // Update reviewed items
      const deletedIds = new Set(itemIds);
      setReviewedItems(prev => new Set([...prev, ...deletedIds]));
      setDeletedItems(prev => new Set([...prev, ...deletedIds]));
      setSelectedItems(new Set());
      setIsMultiSelectMode(false);

      // Reload media items
      await loadMediaItems();

      Alert.alert(
        'Photos Deleted',
        `${items.length} photo${items.length > 1 ? 's' : ''} deleted successfully.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to delete photos:', error);
      Alert.alert(
        'Error',
        'Failed to delete photos. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [reviewTracker]);

  // Handle mark as unreviewed
  const handleMarkAsUnreviewed = useCallback(async (items: CachedMediaItem[]) => {
    try {
      // Remove review status for selected items
      for (const item of items) {
        await reviewTracker.removeReviewStatus(item.id);
      }

      // Update local state
      const unreviewedIds = new Set(items.map(item => item.id));
      setReviewedItems(prev => {
        const newSet = new Set(prev);
        unreviewedIds.forEach(id => newSet.delete(id));
        return newSet;
      });
      setDeletedItems(prev => {
        const newSet = new Set(prev);
        unreviewedIds.forEach(id => newSet.delete(id));
        return newSet;
      });
      setSelectedItems(new Set());
      setIsMultiSelectMode(false);

      Alert.alert(
        'Marked as Unreviewed',
        `${items.length} photo${items.length > 1 ? 's' : ''} marked as unreviewed. They will appear in organize mode again.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to mark photos as unreviewed:', error);
      Alert.alert(
        'Error',
        'Failed to mark photos as unreviewed. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [reviewTracker]);

  // Handle cancel multi-select mode
  const handleCancelMultiSelect = useCallback(() => {
    setIsMultiSelectMode(false);
    setSelectedItems(new Set());
  }, []);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    setSelectedItems(new Set(mediaItems.map(item => item.id)));
  }, [mediaItems]);

  // Handle deselect all
  const handleDeselectAll = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  // Render photo thumbnail
  const renderPhotoThumbnail = useCallback(({ item }: { item: LocalMediaItem }) => {
    const isSelected = selectedItems.has(item.id);
    const isReviewed = reviewedItems.has(item.id);
    const isVideo = item.mediaType === 'video';

    return (
      <TouchableOpacity
        style={[
          styles.thumbnailContainer,
          { width: thumbnailSize, height: thumbnailSize },
          isSelected && styles.selectedThumbnail,
        ]}
        onPress={() => handlePhotoPress(item)}
        onLongPress={() => handlePhotoLongPress(item)}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: item.uri }}
          style={[
            styles.thumbnail,
            { width: thumbnailSize, height: thumbnailSize },
            isSelected && styles.selectedImage,
          ]}
          resizeMode="cover"
          onError={(error) => {
            console.warn('Failed to load thumbnail:', item.filename, error.nativeEvent.error);
          }}
        />

        {/* Video indicator */}
        {isVideo && (
          <View style={styles.videoIndicator}>
            <Ionicons name="play-circle" size={24} color="white" />
          </View>
        )}

        {/* Multi-select mode checkbox */}
        {isMultiSelectMode && (
          <View style={styles.checkboxContainer}>
            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
              {isSelected && (
                <Ionicons name="checkmark" size={16} color="white" />
              )}
            </View>
          </View>
        )}

        {/* Review status indicator */}
        {!isMultiSelectMode && isReviewed && (
          <View style={styles.reviewIndicator}>
            <View style={styles.reviewBadge}>
              <Ionicons name="checkmark" size={12} color="white" />
            </View>
          </View>
        )}

        {/* Selection overlay */}
        {isSelected && <View style={styles.selectionOverlay} />}
      </TouchableOpacity>
    );
  }, [selectedItems, reviewedItems, isMultiSelectMode, thumbnailSize, handlePhotoPress, handlePhotoLongPress]);

  // Render permission screen
  const renderPermissionScreen = () => (
    <View style={styles.centerContainer}>
      <Ionicons name="images-outline" size={64} color="#ccc" />
      <Text style={styles.title}>Media Access Required</Text>
      <Text style={styles.subtitle}>
        Pictia needs access to your photos to help you organize them.
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={requestPermissionAndLoadMedia}
      >
        <Text style={styles.buttonText}>Grant Permission</Text>
      </TouchableOpacity>
    </View>
  );

  // Render loading screen
  const renderLoadingScreen = () => (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color="#7444C0" />
      <Text style={styles.loadingText}>Loading your photos...</Text>
    </View>
  );

  // Render empty screen
  const renderEmptyScreen = () => (
    <View style={styles.centerContainer}>
      <Ionicons name="images-outline" size={64} color="#ccc" />
      <Text style={styles.title}>No Photos Found</Text>
      <Text style={styles.subtitle}>
        No photos were found on your device.
      </Text>
    </View>
  );

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderLoadingScreen()}
      </SafeAreaView>
    );
  }

  // Permission denied
  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        {renderPermissionScreen()}
      </SafeAreaView>
    );
  }

  // No photos
  if (mediaItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        {renderEmptyScreen()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Local Gallery</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate('SwipeMode', { startMode: 'natural' })}
        >
          <Ionicons name="albums" size={24} color="#7444C0" />
          <Text style={styles.headerButtonText}>Organize</Text>
        </TouchableOpacity>
      </View>

      {/* Photo grid */}
      <FlatList
        data={mediaItems.filter(item => !deletedItems.has(item.id))}
        renderItem={renderPhotoThumbnail}
        keyExtractor={(item) => item.id}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={styles.gridContainer}
        columnWrapperStyle={styles.row}
        ItemSeparatorComponent={() => <View style={{ height: GRID_SPACING }} />}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={15}
        windowSize={10}
        initialNumToRender={15}
        updateCellsBatchingPeriod={50}
        getItemLayout={(data, index) => ({
          length: thumbnailSize + GRID_SPACING,
          offset: (thumbnailSize + GRID_SPACING) * Math.floor(index / NUM_COLUMNS),
          index,
        })}
      />

      {/* Batch action bar */}
      <BatchActionBar
        selectedItems={Array.from(selectedItems).map(id => {
          const item = mediaItems.find(item => item.id === id);
          if (!item) return null;
          return {
            id: item.id,
            filename: item.filename,
            mimeType: item.mediaType === 'photo' ? 'image/jpeg' : 'video/mp4',
            baseUrl: item.uri,
            mediaMetadata: {
              creationTime: new Date(item.creationTime).toISOString(),
              width: item.width.toString(),
              height: item.height.toString(),
            },
            cachedAt: Date.now(),
            lastAccessed: Date.now(),
          };
        }).filter(Boolean) as CachedMediaItem[]}
        isVisible={isMultiSelectMode}
        onDelete={handleBatchDelete}
        onCancel={handleCancelMultiSelect}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onMarkAsUnreviewed={handleMarkAsUnreviewed}
        totalItems={mediaItems.filter(item => !deletedItems.has(item.id)).length}
      />

      {/* Full-screen viewer */}
      {fullScreenItem && (
        <FullScreenViewer
          mediaItem={{
            id: fullScreenItem.id,
            filename: fullScreenItem.filename,
            mimeType: fullScreenItem.mediaType === 'photo' ? 'image/jpeg' : 'video/mp4',
            baseUrl: fullScreenItem.uri,
            mediaMetadata: {
              creationTime: new Date(fullScreenItem.creationTime).toISOString(),
              width: fullScreenItem.width.toString(),
              height: fullScreenItem.height.toString(),
            },
            cachedAt: Date.now(),
            lastAccessed: Date.now(),
          }}
          isVisible={!!fullScreenItem}
          onClose={handleFullScreenClose}
          onStartSwipeMode={handleStartSwipeMode}
          onNavigatePrevious={currentPhotoIndex > 0 ? handleNavigatePrevious : undefined}
          onNavigateNext={currentPhotoIndex < mediaItems.length - 1 ? handleNavigateNext : undefined}
          showNavigation={true}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7444C0',
    marginLeft: 6,
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
    backgroundColor: '#7444C0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  gridContainer: {
    paddingHorizontal: GRID_SPACING,
    paddingTop: GRID_SPACING,
    paddingBottom: 100, // Add extra padding to avoid overlap with bottom navigation
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: GRID_SPACING,
  },
  thumbnailContainer: {
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  selectedThumbnail: {
    borderWidth: 3,
    borderColor: '#7444C0',
  },
  thumbnail: {
    borderRadius: 4,
  },
  selectedImage: {
    opacity: 0.8,
  },
  videoIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -12 }, { translateY: -12 }],
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'white',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#7444C0',
    borderColor: '#7444C0',
  },
  reviewIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  reviewBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  selectionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    borderRadius: 4,
  },
});

export default LocalGalleryScreen;