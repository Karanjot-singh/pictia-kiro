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

interface GalleryScreenProps {}

const GalleryScreen: React.FC<GalleryScreenProps> = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();

  // Local state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [reviewedItems, setReviewedItems] = useState<Set<string>>(new Set());
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

  const mediaItems = useMemo(() => mediaData?.mediaItems || [], [mediaData]);

  // Initialize review tracker and load reviewed items
  useEffect(() => {
    const initializeReviewData = async () => {
      try {
        await reviewTracker.initialize();
        
        if (mediaItems.length > 0) {
          const reviewStatusMap = await reviewTracker.getMultipleReviewStatus(
            mediaItems.map(item => item.id)
          );
          
          const reviewedSet = new Set<string>();
          reviewStatusMap.forEach((isReviewed, itemId) => {
            if (isReviewed) {
              reviewedSet.add(itemId);
            }
          });
          
          setReviewedItems(reviewedSet);
        }
      } catch (error) {
        console.error('Failed to initialize review data:', error);
      }
    };

    initializeReviewData();
  }, [mediaItems, reviewTracker]);

  // Handle photo press (single tap)
  const handlePhotoPress = useCallback((item: CachedMediaItem) => {
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
      const index = mediaItems.findIndex(mediaItem => mediaItem.id === item.id);
      setCurrentPhotoIndex(index);
      setFullScreenItem(item);
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

    // Navigate to organize screen with starting photo
    // This would need to be implemented based on your navigation structure
    Alert.alert(
      'Start Organization',
      'This will start the swipe-based organization mode from this photo.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start', 
          onPress: () => {
            // TODO: Navigate to organize screen with starting photo
            console.log('Starting organization from photo:', fullScreenItem.id);
          }
        },
      ]
    );
  }, [fullScreenItem]);

  // Handle navigation in full-screen viewer
  const handleNavigatePrevious = useCallback(() => {
    if (currentPhotoIndex > 0) {
      const newIndex = currentPhotoIndex - 1;
      setCurrentPhotoIndex(newIndex);
      setFullScreenItem(mediaItems[newIndex]);
    }
  }, [currentPhotoIndex, mediaItems]);

  const handleNavigateNext = useCallback(() => {
    if (currentPhotoIndex < mediaItems.length - 1) {
      const newIndex = currentPhotoIndex + 1;
      setCurrentPhotoIndex(newIndex);
      setFullScreenItem(mediaItems[newIndex]);
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
      setSelectedItems(new Set());
      setIsMultiSelectMode(false);

      Alert.alert(
        'Photos Deleted',
        `${items.length} photo${items.length > 1 ? 's' : ''} marked for deletion.`,
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
          error={error}
          onRetry={handleRefresh}
          title="Unable to Load Photos"
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
          mediaItems.find(item => item.id === id)!
        ).filter(Boolean)}
        isVisible={isMultiSelectMode}
        onDelete={handleBatchDelete}
        onCancel={handleCancelMultiSelect}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
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