import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { OrganiseStackParamList } from '@/types';
import {
  PhotoGrid,
  FullScreenViewer,
  BatchActionBar,
  ErrorDisplay,
} from '@/components';
import { RootState } from '@/store';
import { useGetMediaItemsQuery } from '@/store/api/googlePhotosApi';
import { CachedMediaItem } from '@/types';
import ReviewTracker from '@/services/ReviewTracker';

type GalleryScreenNavigationProp = StackNavigationProp<OrganiseStackParamList, 'Gallery'>;

interface GalleryScreenProps {}

const GalleryScreen: React.FC<GalleryScreenProps> = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation<GalleryScreenNavigationProp>();

  // Local state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [reviewedItems, setReviewedItems] = useState<Set<string>>(new Set());
  const [deletedItems, setDeletedItems] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [fullScreenItem, setFullScreenItem] = useState<CachedMediaItem | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [reviewTracker] = useState(() => ReviewTracker.getInstance());

  // Redux selectors
  const authState = useSelector((state: RootState) => state.auth);

  // API query
  const {
    data: mediaData,
    isLoading,
    error,
    refetch,
  } = useGetMediaItemsQuery({
    pageSize: 100,
  });

  // Filter out deleted photos from the gallery
  const mediaItems = useMemo(() => {
    const allItems = mediaData?.items || [];
    // Filter out photos that have been marked as deleted
    return allItems.filter(item => !deletedItems.has(item.id));
  }, [mediaData, deletedItems]);

  // Initialize review tracker and load reviewed items
  useEffect(() => {
    const initializeReviewData = async () => {
      try {
        await reviewTracker.initialize();
        
        if (mediaData?.items && mediaData.items.length > 0) {
          // Get all review statuses at once for better performance
          const allItems = mediaData.items;
          const reviewedSet = new Set<string>();
          const deletedSet = new Set<string>();
          
          // Get deleted photos first (these are filtered out)
          const deletedPhotos = await reviewTracker.getPhotosByAction(allItems, 'delete');
          deletedPhotos.forEach(photo => {
            deletedSet.add(photo.id);
            reviewedSet.add(photo.id);
          });
          
          // Get kept photos
          const keptPhotos = await reviewTracker.getPhotosByAction(allItems, 'keep');
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

    initializeReviewData();
  }, [mediaData, reviewTracker]);

  // Handle photo press (single tap)
  const handlePhotoPress = useCallback((item: CachedMediaItem) => {
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
  const handlePhotoLongPress = useCallback((item: CachedMediaItem) => {
    if (!isMultiSelectMode) {
      // Enter multi-select mode and select this item
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

    // Close full-screen viewer first
    setFullScreenItem(null);
    
    // Navigate to swipe mode with starting photo
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
      // Mark items as reviewed with delete action
      await reviewTracker.markMultipleAsReviewed(
        items.map(item => item.id),
        'delete'
      );

      // Update local state
      const deletedIds = new Set(items.map(item => item.id));
      setReviewedItems(prev => new Set([...prev, ...deletedIds]));
      setDeletedItems(prev => new Set([...prev, ...deletedIds]));
      setSelectedItems(new Set());
      setIsMultiSelectMode(false);

      Alert.alert(
        'Photos Deleted',
        `${items.length} photo${items.length > 1 ? 's' : ''} marked for deletion and hidden from gallery.`,
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
        `${items.length} photo${items.length > 1 ? 's' : ''} marked as unreviewed. They will appear in organize mode and gallery again.`,
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

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Loading state
  if (isLoading && mediaItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading photos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error && mediaItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ErrorDisplay
          error={error ? { message: `Unable to Load Photos: ${error.toString()}` } : null}
          onRetry={handleRefresh}
        />
      </SafeAreaView>
    );
  }

  // Empty state
  if (mediaItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Photos Found</Text>
          <Text style={styles.emptyText}>
            Connect to Google Photos to view your photo library
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Photo grid */}
      <PhotoGrid
        mediaItems={mediaItems}
        selectedItems={selectedItems}
        reviewedItems={reviewedItems}
        isMultiSelectMode={isMultiSelectMode}
        isLoading={isLoading}
        onPhotoPress={handlePhotoPress}
        onPhotoLongPress={handlePhotoLongPress}
        onRefresh={handleRefresh}
        numColumns={3}
      />

      {/* Batch action bar */}
      <BatchActionBar
        selectedItems={Array.from(selectedItems).map(id => 
          mediaItems.find(item => item && item.id === id)
        ).filter((item): item is CachedMediaItem => Boolean(item))}
        isVisible={isMultiSelectMode}
        onDelete={handleBatchDelete}
        onCancel={handleCancelMultiSelect}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onMarkAsUnreviewed={handleMarkAsUnreviewed}
        totalItems={mediaItems.length}
      />

      {/* Full-screen viewer */}
      {fullScreenItem && (
        <FullScreenViewer
          mediaItem={fullScreenItem}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default GalleryScreen;