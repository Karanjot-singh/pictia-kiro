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
import { SwipeCard, SessionExitModal, SessionStatistics } from '@/components';
import { CachedMediaItem } from '@/types';

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
      
      // Convert to CachedMediaItem format for SwipeCardStackWithUndo
      const cachedItems: CachedMediaItem[] = formattedItems.map(item => ({
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
      
      console.log('Sample cached item:', cachedItems[0]);
      console.log('Total cached items:', cachedItems.length);
      console.log('Sample URI:', cachedItems[0]?.baseUrl);
      
      setCachedMediaItems(cachedItems);
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
  }, []);

  const handleSwipeRight = useCallback((item: CachedMediaItem) => {
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
  }, [undoStack]);

  const handleCommitSession = useCallback(async () => {
    if (deletedItems.size === 0) {
      Alert.alert('No Changes', 'No items are marked for deletion.');
      return;
    }

    Alert.alert(
      'Commit Session',
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
              
              // Reset session
              setDeletedItems(new Set());
              setCurrentIndex(0);
              setKeepCount(0);
              setDeleteCount(0);
              setUndoStack([]);
              await loadMediaItems();
            } catch (error) {
              console.error('Error deleting items:', error);
              Alert.alert('Error', 'Failed to delete some items.');
            }
          },
        },
      ]
    );
  }, [deletedItems]);

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
        <TouchableOpacity
          style={[styles.button, styles.deleteButton]}
          onPress={handleCommitSession}
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
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          {currentIndex + 1} of {cachedMediaItems.length}
        </Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${((currentIndex + 1) / cachedMediaItems.length) * 100}%` }
            ]} 
          />
        </View>
        <Text style={styles.statsText}>
          Keep: {keepCount} • Delete: {deleteCount}
        </Text>
        
        {/* Session Statistics */}
        <View style={styles.sessionStatsContainer}>
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
      </View>

      {/* Swipe Card Stack */}
      <View style={styles.cardContainer}>
        {cachedMediaItems.length > 0 && currentIndex < cachedMediaItems.length ? (
          <View style={styles.cardWrapper}>
            {/* Simple fallback image display for testing */}
            <View style={styles.simpleCard}>
              <Image
                source={{ uri: cachedMediaItems[currentIndex]?.baseUrl || '' }}
                style={styles.simpleImage}
                resizeMode="cover"
                onError={(error) => {
                  console.error('Failed to load image:', error.nativeEvent.error);
                }}
                onLoad={() => {
                  console.log('Image loaded successfully');
                }}
              />
              <View style={styles.simpleCardInfo}>
                <Text style={styles.simpleCardText}>
                  {cachedMediaItems[currentIndex]?.filename || 'Unknown'}
                </Text>
              </View>
            </View>
            
            {/* Action buttons */}
            <View style={styles.simpleActions}>
              <TouchableOpacity
                style={[styles.simpleActionButton, styles.deleteActionButton]}
                onPress={() => {
                  const currentItem = cachedMediaItems[currentIndex];
                  if (currentItem) {
                    handleSwipeLeft(currentItem);
                  }
                }}
                activeOpacity={0.8}
                disabled={!cachedMediaItems[currentIndex]}
              >
                <Text style={styles.simpleActionButtonText}>🗑️ Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.simpleActionButton, styles.keepActionButton]}
                onPress={() => {
                  const currentItem = cachedMediaItems[currentIndex];
                  if (currentItem) {
                    handleSwipeRight(currentItem);
                  }
                }}
                activeOpacity={0.8}
                disabled={!cachedMediaItems[currentIndex]}
              >
                <Text style={styles.simpleActionButtonText}>✅ Keep</Text>
              </TouchableOpacity>
            </View>
            
            {/* Debug info */}
            <View style={styles.debugInfo}>
              <Text style={styles.debugText}>
                Current: {currentIndex + 1}/{cachedMediaItems.length}
              </Text>
              <Text style={styles.debugText}>
                File: {cachedMediaItems[currentIndex]?.filename}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.centerContainer}>
            <Text style={styles.loadingText}>
              {cachedMediaItems.length === 0 ? 'Preparing photos...' : 'No more photos'}
            </Text>
            <Text style={styles.debugText}>
              Items: {cachedMediaItems.length}, Index: {currentIndex}
            </Text>
          </View>
        )}
      </View>

      {/* Action Bar - Always show when there are actions */}
      <View style={styles.actionBarContainer}>
        {canUndo && (
          <TouchableOpacity
            style={styles.undoButton}
            onPress={handleUndo}
          >
            <Text style={styles.undoButtonText}>Undo Last Action</Text>
          </TouchableOpacity>
        )}
        {hasUnsavedChanges && (
          <TouchableOpacity
            style={styles.commitButton}
            onPress={handleCommitSession}
          >
            <Text style={styles.commitButtonText}>
              Commit Session ({deleteCount} to delete)
            </Text>
          </TouchableOpacity>
        )}
        {!canUndo && !hasUnsavedChanges && (
          <View style={styles.noActionsContainer}>
            {/* Removed instructional text - actions are now clear through buttons */}
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => {
            const currentItem = cachedMediaItems[currentIndex];
            if (currentItem) {
              handleSwipeLeft(currentItem);
            }
          }}
          activeOpacity={0.8}
          disabled={!cachedMediaItems[currentIndex]}
        >
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.keepButton]}
          onPress={() => {
            const currentItem = cachedMediaItems[currentIndex];
            if (currentItem) {
              handleSwipeRight(currentItem);
            }
          }}
          activeOpacity={0.8}
          disabled={!cachedMediaItems[currentIndex]}
        >
          <Text style={styles.actionButtonText}>Keep</Text>
        </TouchableOpacity>
      </View>
      
      {isLocalMode && (
        <View style={styles.localModeIndicator}>
          <Text style={styles.localModeText}>
            Local Gallery Mode - No Google Photos sync
          </Text>
        </View>
      )}

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
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  sessionStatsContainer: {
    marginTop: 12,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    justifyContent: 'space-between',
    gap: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  keepButton: {
    backgroundColor: '#34C759',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  localModeIndicator: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  localModeText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  actionBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    minHeight: 60,
    gap: 12,
  },
  undoButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  undoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  commitButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  commitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cardWrapper: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  debugInfo: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 4,
  },
  debugText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  simpleCard: {
    width: screenWidth * 0.9,
    height: screenHeight * 0.6,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  simpleImage: {
    width: '100%',
    height: '85%',
  },
  simpleCardInfo: {
    padding: 12,
    backgroundColor: '#fff',
  },
  simpleCardText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  simpleActions: {
    flexDirection: 'row',
    marginTop: 20,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    width: '100%',
  },
  simpleActionButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    minWidth: 120,
    flex: 1,
    marginHorizontal: 10,
  },
  deleteActionButton: {
    backgroundColor: '#FF3B30',
  },
  keepActionButton: {
    backgroundColor: '#34C759',
  },
  simpleActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  sessionStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
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
  noActionsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LocalOrganizeScreen;