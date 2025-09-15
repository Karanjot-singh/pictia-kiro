import React, { useEffect, useState, useCallback } from 'react';
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
import { SwipeCardStackWithUndo, SessionExitModal, SessionStatistics, ModernActionButton } from '@/components';
import { CachedMediaItem } from '@/types';
import ReviewTracker from '@/services/ReviewTracker';

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
  const [cachedMediaItems, setCachedMediaItems] = useState<CachedMediaItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [keepCount, setKeepCount] = useState(0);
  const [deleteCount, setDeleteCount] = useState(0);
  const [deletedItems, setDeletedItems] = useState<Set<string>>(new Set());
  const [undoStack, setUndoStack] = useState<Array<{ item: CachedMediaItem; action: 'keep' | 'delete'; timestamp: number }>>([]);
  const [showSessionExitModal, setShowSessionExitModal] = useState(false);
  const [sessionStartTime] = useState(Date.now());
  
  const isLocalMode = useAppSelector(selectIsLocalMode);

  // Session management
  const hasUnsavedChanges = keepCount > 0 || deleteCount > 0;
  const canUndo = undoStack.length > 0;

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
        // Note: MediaLibrary doesn't have a direct descending option, so we'll sort manually
      });

      console.log('Found media items:', media.assets.length);
      console.log('Sample asset:', media.assets[0]);

      if (media.assets.length === 0) {
        console.log('No media items found');
        setMediaItems([]);
        return;
      }

      // Sort assets by creation time (newest first)
      const sortedAssets = media.assets.sort((a, b) => b.creationTime - a.creationTime);
      
      // Get asset info for each item to get proper URIs
      const formattedItems: LocalMediaItem[] = [];
      
      for (const asset of sortedAssets) {
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
      console.log('Sample formatted item:', formattedItems[0]);
      setMediaItems(formattedItems);
      
      // Convert to CachedMediaItem format for SwipeCardStackWithUndo
      const allCachedItems: CachedMediaItem[] = formattedItems.map(item => ({
        id: item.id,
        filename: item.filename,
        mimeType: item.mediaType === 'photo' ? 'image/jpeg' : 'video/mp4',
        baseUrl: item.uri, // Use the local URI directly
        mediaMetadata: {
          creationTime: new Date(item.creationTime).toISOString(),
          width: item.width.toString(),
          height: item.height.toString(),
        },
        cachedAt: Date.now(),
        lastAccessed: Date.now(),
        organizationStatus: 'pending',
      }));
      
      // Filter out reviewed photos
      const reviewTracker = ReviewTracker.getInstance();
      await reviewTracker.initialize();
      await reviewTracker.refreshUnreviewedQueue(allCachedItems);
      const unreviewedItems = await reviewTracker.getUnreviewedQueue();
      
      console.log('Sample cached item:', unreviewedItems[0]);
      console.log('Total unreviewed items:', unreviewedItems.length);
      console.log('Sample URI:', unreviewedItems[0]?.baseUrl);
      console.log('All cached items length:', allCachedItems.length);
      console.log('Unreviewed items length:', unreviewedItems.length);
      
      setCachedMediaItems(unreviewedItems);
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

  const handleSwipeLeft = useCallback((item: CachedMediaItem) => {
    if (!item || !item.id) {
      console.warn('Invalid item passed to handleSwipeLeft');
      return;
    }

    console.log('Swiping left (delete) on item:', item.filename);
    // Delete action
    setDeletedItems(prev => new Set([...prev, item.id]));
    setDeleteCount(prev => {
      const newCount = prev + 1;
      console.log('Delete count updated to:', newCount);
      return newCount;
    });
    setCurrentIndex(prev => prev + 1);
    
    // Add to undo stack
    setUndoStack(prev => [...prev, { item, action: 'delete', timestamp: Date.now() }]);
    
    // Mark as reviewed immediately for real-time filtering (non-blocking)
    setTimeout(async () => {
      try {
        const reviewTracker = ReviewTracker.getInstance();
        await reviewTracker.markAsReviewed(item.id, 'delete');
        
        // Update the cached media items to remove the reviewed photo
        const updatedQueue = await reviewTracker.getUnreviewedQueue();
        setCachedMediaItems(updatedQueue);
      } catch (error) {
        console.error('Failed to mark item as reviewed:', error);
      }
    }, 0);
  }, []);

  const handleSwipeRight = useCallback((item: CachedMediaItem) => {
    if (!item || !item.id) {
      console.warn('Invalid item passed to handleSwipeRight');
      return;
    }

    console.log('Swiping right (keep) on item:', item.filename);
    // Keep action
    setKeepCount(prev => {
      const newCount = prev + 1;
      console.log('Keep count updated to:', newCount);
      return newCount;
    });
    setCurrentIndex(prev => prev + 1);
    
    // Add to undo stack
    setUndoStack(prev => [...prev, { item, action: 'keep', timestamp: Date.now() }]);
    
    // Mark as reviewed immediately for real-time filtering (non-blocking)
    setTimeout(async () => {
      try {
        const reviewTracker = ReviewTracker.getInstance();
        await reviewTracker.markAsReviewed(item.id, 'keep');
        
        // Update the cached media items to remove the reviewed photo
        const updatedQueue = await reviewTracker.getUnreviewedQueue();
        setCachedMediaItems(updatedQueue);
      } catch (error) {
        console.error('Failed to mark item as reviewed:', error);
      }
    }, 0);
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    
    const lastAction = undoStack[undoStack.length - 1];
    if (!lastAction) return;
    
    // Revert the action
    if (lastAction.action === 'delete') {
      setDeletedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(lastAction.item.id);
        return newSet;
      });
      setDeleteCount(prev => prev - 1);
    } else {
      setKeepCount(prev => prev - 1);
    }
    
    // Move back to previous item
    setCurrentIndex(prev => prev - 1);
    
    // Remove from undo stack
    setUndoStack(prev => prev.slice(0, -1));
    
    // Remove the review status for the undone item and refresh queue (non-blocking)
    setTimeout(async () => {
      try {
        const reviewTracker = ReviewTracker.getInstance();
        await reviewTracker.removeReviewStatus(lastAction.item.id);
        
        // Rebuild the queue from all media items
        const allCachedItems: CachedMediaItem[] = mediaItems.map(item => ({
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
          organizationStatus: 'pending',
        }));
        
        await reviewTracker.refreshUnreviewedQueue(allCachedItems);
        const updatedQueue = await reviewTracker.getUnreviewedQueue();
        setCachedMediaItems(updatedQueue);
      } catch (error) {
        console.error('Failed to remove review status during undo:', error);
      }
    }, 0);
  }, [undoStack, mediaItems]);

  const handleCommitSession = useCallback(async () => {
    try {
      // Mark all viewed photos as reviewed (include current photo even if no action taken)
      const viewedPhotoIds: string[] = [];
      const maxIndex = Math.max(currentIndex, 0);
      for (let i = 0; i <= maxIndex && i < cachedMediaItems.length; i++) {
        const item = cachedMediaItems[i];
        if (item) {
          viewedPhotoIds.push(item.id);
        }
      }

      // Check if there's anything to commit
      if (viewedPhotoIds.length === 0 && deletedItems.size === 0 && keepCount === 0) {
        Alert.alert(
          'Nothing to Commit',
          'No photos have been viewed in this session yet.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Mark photos with their actions or as 'keep' if just viewed
      const tracker = ReviewTracker.getInstance();
      await tracker.initialize();
      
      for (const photoId of viewedPhotoIds) {
        if (deletedItems.has(photoId)) {
          await tracker.markAsReviewed(photoId, 'delete');
        } else {
          await tracker.markAsReviewed(photoId, 'keep');
        }
      }

      // Delete items marked for deletion
      if (deletedItems.size > 0) {
        const itemsToDelete = Array.from(deletedItems);
        await MediaLibrary.deleteAssetsAsync(itemsToDelete);
      }

      const totalProcessed = viewedPhotoIds.length;
      const totalDeleted = deletedItems.size;
      const totalKept = totalProcessed - totalDeleted;

      if (totalDeleted > 0) {
        Alert.alert(
          'Session Committed',
          `Successfully organized ${totalProcessed} photos:\n• ${totalKept} kept\n• ${totalDeleted} deleted permanently`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Session Committed',
          `Successfully organized ${totalProcessed} photos. All viewed photos are now marked as reviewed.`,
          [{ text: 'OK' }]
        );
      }

      // Reset session
      setDeletedItems(new Set());
      setCurrentIndex(0);
      setKeepCount(0);
      setDeleteCount(0);
      setUndoStack([]);
      await loadMediaItems();
    } catch (error) {
      console.error('Error committing session:', error);
      Alert.alert('Error', 'Failed to commit session. Please try again.');
    }
  }, [deletedItems, currentIndex, cachedMediaItems]);

  const handleDiscardSession = useCallback(() => {
    // Reset all session data
    setDeletedItems(new Set());
    setCurrentIndex(0);
    setKeepCount(0);
    setDeleteCount(0);
    setUndoStack([]);
    setShowSessionExitModal(false);
  }, []);

  const handleCancelExit = useCallback(() => {
    setShowSessionExitModal(false);
  }, []);

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
        You've organized {cachedMediaItems.length} items
      </Text>
      <Text style={styles.stats}>
        Kept: {keepCount} • Marked for deletion: {deleteCount}
      </Text>
      
      {deleteCount > 0 && (
        <View style={styles.modernButtonContainer}>
          <ModernActionButton
            variant="delete"
            size="large"
            onPress={handleCommitSession}
            enableHaptics={true}
          />
          <Text style={styles.modernButtonLabel}>Delete Marked Items</Text>
        </View>
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

  if (currentIndex >= cachedMediaItems.length) {
    return (
      <SafeAreaView style={styles.container}>
        {renderCompletionScreen()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress indicator */}
      <View style={styles.progressOverlay}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${((currentIndex + 1) / cachedMediaItems.length) * 100}%` }
            ]} 
          />
        </View>
      </View>

      {/* Action Buttons - Fixed position above cards */}
      {(canUndo || true) && (
        <View style={styles.actionButtonsContainer}>
          {canUndo && (
            <ModernActionButton
              variant="undo"
              size="medium"
              onPress={handleUndo}
              enableHaptics={true}
            />
          )}
          <ModernActionButton
            variant="commit"
            size="medium"
            onPress={handleCommitSession}
            enableHaptics={true}
          />
        </View>
      )}

      {/* Swipe Card Stack */}
      <View style={styles.cardContainer}>
        <SwipeCardStackWithUndo
          mediaItems={cachedMediaItems}
          currentIndex={currentIndex}
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
          onUndo={handleUndo}
          onCommit={handleCommitSession}
          canUndo={canUndo}
          canCommit={true}
          undoTimeoutMs={5000}
          actionBarPosition="bottom"
          enableHaptics={true}
          swipeThreshold={screenWidth * 0.3}
          showActionBar={false}
        />
      </View>

      {/* Session Statistics */}
      <View style={styles.statsOverlay}>
        <View style={styles.sessionStatsRow}>
          <View style={styles.sessionStat}>
            <Text style={styles.sessionStatNumber}>{keepCount + deleteCount}</Text>
            <Text style={styles.sessionStatLabel}>Total</Text>
          </View>
          <View style={styles.sessionStat}>
            <Text style={[styles.sessionStatNumber, styles.keepColor]}>{keepCount}</Text>
            <Text style={styles.sessionStatLabel}>Kept</Text>
          </View>
          <View style={styles.sessionStat}>
            <Text style={[styles.sessionStatNumber, styles.deleteColor]}>{deleteCount}</Text>
            <Text style={styles.sessionStatLabel}>Deleted</Text>
          </View>
        </View>
      </View>



      {/* Session Exit Modal */}
      <SessionExitModal
        visible={showSessionExitModal}
        isCommitting={false}
        sessionStats={{
          totalProcessed: keepCount + deleteCount,
          keepCount,
          deleteCount,
          sessionDuration: Date.now() - sessionStartTime,
        }}
        onCommit={handleCommitSession}
        onDiscard={handleDiscardSession}
        onCancel={handleCancelExit}
      />
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
  deleteButton: {
    backgroundColor: '#FF3B30',
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

  progressOverlay: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    gap: 20,
  },
  actionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  undoButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  commitButton: {
    backgroundColor: 'rgba(52, 199, 89, 0.9)',
  },
  actionButtonIcon: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsOverlay: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  sessionStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  sessionStat: {
    alignItems: 'center',
  },
  sessionStatNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  sessionStatLabel: {
    fontSize: 12,
    color: '#666',
  },
  keepColor: {
    color: '#34C759',
  },
  deleteColor: {
    color: '#FF3B30',
  },

  stats: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  modernButtonContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  modernButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default LocalOrganizeScreen;