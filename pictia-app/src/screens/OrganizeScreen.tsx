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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { SwipeCardStackWithUndo, SessionExitModal, SessionStatistics } from '../components';
import { useNavigationGuard } from '../hooks/useNavigationGuard';
import { RootState } from '../store';
import {
  swipeAction,
  undoLastAction,
  selectCurrentMediaItem,
  selectOrganizationProgress,
  selectCanUndo,
  selectCurrentSession,
  selectHasUnsavedChanges,
  selectSessionStats,
  selectCompletionStatus,
  commitOrganizationSession,
  discardOrganizationSession,
  startOrganizationSession,
  restoreSessionProgress,
  resetOrganization,
  setFilteredMediaItems,
  updateFilteredMediaItems,
  setCompletionStatus,
  setHasMorePhotosAvailable,
  setTotalAvailableItems,
  resetCompletionTracking,
  checkCompletionStatus,
} from '../store/slices/organizationSlice';
import { useGetMediaItemsQuery } from '../store/api/googlePhotosApi';
import { CachedMediaItem, SwipeAction, OrganiseStackParamList } from '../types';
import OrganizationSessionService from '../services/OrganizationSessionService';
import ReviewTracker from '../services/ReviewTracker';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ORGANIZATION_STORAGE_KEY = 'organization_decisions';

interface OrganizationDecision {
  mediaItemId: string;
  action: SwipeAction;
  timestamp: number;
}

type OrganizeScreenRouteProp = RouteProp<OrganiseStackParamList, 'SwipeMode'>;

const OrganizeScreen: React.FC = () => {
  const dispatch = useDispatch();
  const route = useRoute<OrganizeScreenRouteProp>();
  const [isInitialized, setIsInitialized] = useState(false);
  const [showSessionExitModal, setShowSessionExitModal] = useState(false);
  const [isCommittingSession, setIsCommittingSession] = useState(false);
  
  // Get navigation parameters
  const { startingPhotoId, startMode = 'natural' } = route.params || {};
  
  // Redux selectors
  const organizationState = useSelector((state: RootState) => state.organization);
  const currentMediaItem = useSelector(selectCurrentMediaItem);
  const progress = useSelector(selectOrganizationProgress);
  const canUndo = useSelector(selectCanUndo);
  const currentSession = useSelector(selectCurrentSession);
  const hasUnsavedChanges = useSelector(selectHasUnsavedChanges);
  const sessionStats = useSelector(selectSessionStats);
  const completionStatus = useSelector(selectCompletionStatus);
  
  // API query
  const {
    data: mediaData,
    isLoading: isLoadingMedia,
    error: mediaError,
    refetch: refetchMedia,
  } = useGetMediaItemsQuery({
    pageSize: 50,
  });

  // Navigation guard to prevent leaving with unsaved changes
  useNavigationGuard({
    hasUnsavedChanges,
    onNavigationBlocked: () => setShowSessionExitModal(true),
    enabled: isInitialized,
  });

  // Initialize screen and load saved decisions
  useEffect(() => {
    initializeOrganization();
  }, []);

  // Re-filter photos when screen comes into focus (e.g., returning from gallery after commit)
  useFocusEffect(
    React.useCallback(() => {
      const refilterPhotos = async () => {
        if (startMode === 'natural' && mediaData?.items && isInitialized) {
          const reviewTracker = ReviewTracker.getInstance();
          await reviewTracker.initialize();
          
          // Refresh the unreviewed queue with latest data
          await reviewTracker.refreshUnreviewedQueue(mediaData.items);
          const filteredMediaItems = await reviewTracker.getUnreviewedQueue();
          
          // Use intelligent completion checking - this will handle the completion status properly
          dispatch(checkCompletionStatus({
            hasUnreviewedPhotos: filteredMediaItems.length > 0,
            canLoadMore: organizationState.hasMorePhotosAvailable,
          }));
          
          // Always update filtered media items to ensure fresh data
          dispatch(setFilteredMediaItems(filteredMediaItems));
          
          // Reset current index if we're at or past the end of filtered items
          if (organizationState.currentIndex >= filteredMediaItems.length && filteredMediaItems.length > 0) {
            dispatch(startOrganizationSession({
              startMode,
              ...(startingPhotoId && { startingPhotoId }),
            }));
          }
        }
      };

      refilterPhotos();
    }, [startMode, mediaData, isInitialized, dispatch, startingPhotoId, organizationState.hasMorePhotosAvailable])
  );

  // Save decisions to AsyncStorage whenever they change
  useEffect(() => {
    if (isInitialized) {
      saveOrganizationDecisions();
    }
  }, [organizationState.keepItems, organizationState.deleteItems, isInitialized]);

  // Save session progress whenever it changes
  useEffect(() => {
    if (isInitialized && currentSession && !currentSession.isCommitted) {
      const saveSessionProgress = async () => {
        try {
          await OrganizationSessionService.saveCurrentSession(currentSession);
        } catch (error) {
          console.error('Failed to save session progress:', error);
        }
      };
      
      saveSessionProgress();
    }
  }, [currentSession, isInitialized]);

  const initializeOrganization = async () => {
    try {
      // Initialize review tracker
      const reviewTracker = ReviewTracker.getInstance();
      await reviewTracker.initialize();
      
      // Load saved organization decisions
      const savedDecisions = await loadOrganizationDecisions();
      
      // Check for existing session and restore if found
      const existingSession = await OrganizationSessionService.loadCurrentSession();
      if (existingSession && !existingSession.isCommitted && !OrganizationSessionService.isSessionExpired(existingSession)) {
        // Show restoration message
        Alert.alert(
          'Session Restored',
          `Your previous organization session has been restored. You had organized ${existingSession.processedItems} photos.`,
          [{ text: 'Continue', style: 'default' }]
        );
        
        // Restore the existing session
        dispatch(restoreSessionProgress(existingSession));
      } else {
        // Clear any expired session
        if (existingSession) {
          await OrganizationSessionService.clearCurrentSession();
        }
        
        // Set up pagination and total information
        if (mediaData?.items) {
          const totalAvailable = mediaData.totalCount || mediaData.items.length;
          const hasMore = !!mediaData.nextPageToken;
          
          dispatch(setTotalAvailableItems(totalAvailable));
          dispatch(setHasMorePhotosAvailable(hasMore));
          
          // Filter out reviewed photos for natural mode
          if (startMode === 'natural') {
            await reviewTracker.refreshUnreviewedQueue(mediaData.items);
            const filteredMediaItems = await reviewTracker.getUnreviewedQueue();
            
            // Use intelligent completion checking
            dispatch(checkCompletionStatus({
              hasUnreviewedPhotos: filteredMediaItems.length > 0,
              canLoadMore: hasMore,
              isInitialLoad: true,
            }));
            
            if (filteredMediaItems.length === 0) {
              if (hasMore) {
                // TODO: Implement loading more photos here
                Alert.alert(
                  'Batch Complete',
                  'You have reviewed all photos in this batch. Loading more photos...',
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert(
                  'All Photos Reviewed',
                  'You have already reviewed all available photos. Great job!',
                  [{ text: 'OK', onPress: () => setIsInitialized(true) }]
                );
              }
              return;
            }
            
            // Set filtered media items for natural mode
            dispatch(setFilteredMediaItems(filteredMediaItems));
          } else {
            // For gallery mode, use all items
            dispatch(setFilteredMediaItems(mediaData.items));
          }
        }
        
        // Start a new session with the provided parameters
        dispatch(startOrganizationSession({
          startMode,
          ...(startingPhotoId && { startingPhotoId }),
        }));
      }
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize organization:', error);
      setIsInitialized(true);
    }
  };

  const loadOrganizationDecisions = async (): Promise<OrganizationDecision[]> => {
    try {
      const savedData = await AsyncStorage.getItem(ORGANIZATION_STORAGE_KEY);
      if (savedData) {
        return JSON.parse(savedData);
      }
    } catch (error) {
      console.error('Failed to load organization decisions:', error);
    }
    return [];
  };

  const saveOrganizationDecisions = async () => {
    try {
      const decisions: OrganizationDecision[] = [
        ...organizationState.keepItems.map(item => ({
          mediaItemId: item.id,
          action: 'keep' as SwipeAction,
          timestamp: Date.now(),
        })),
        ...organizationState.deleteItems.map(item => ({
          mediaItemId: item.id,
          action: 'delete' as SwipeAction,
          timestamp: Date.now(),
        })),
      ];

      await AsyncStorage.setItem(ORGANIZATION_STORAGE_KEY, JSON.stringify(decisions));
    } catch (error) {
      console.error('Failed to save organization decisions:', error);
    }
  };

  const handleSwipeLeft = (item: CachedMediaItem) => {
    if (!item || !item.id) {
      console.warn('Invalid item passed to handleSwipeLeft');
      return;
    }

    dispatch(swipeAction({ item, action: 'delete' }));
    
    // Mark as reviewed immediately for real-time filtering (non-blocking)
    setTimeout(async () => {
      try {
        const reviewTracker = ReviewTracker.getInstance();
        await reviewTracker.markAsReviewed(item.id, 'delete', currentSession?.id);
        
        // Update filtered media items in real-time for natural mode
        if (startMode === 'natural') {
          const updatedQueue = await reviewTracker.getUnreviewedQueue();
          dispatch(updateFilteredMediaItems(updatedQueue));
          
          // Intelligent completion check
          dispatch(checkCompletionStatus({
            hasUnreviewedPhotos: updatedQueue.length > 0,
            canLoadMore: organizationState.hasMorePhotosAvailable,
          }));
        }
      } catch (error) {
        console.error('Failed to mark item as reviewed:', error);
      }
    }, 0);
  };

  const handleSwipeRight = (item: CachedMediaItem) => {
    if (!item || !item.id) {
      console.warn('Invalid item passed to handleSwipeRight');
      return;
    }

    dispatch(swipeAction({ item, action: 'keep' }));
    
    // Mark as reviewed immediately for real-time filtering (non-blocking)
    setTimeout(async () => {
      try {
        const reviewTracker = ReviewTracker.getInstance();
        await reviewTracker.markAsReviewed(item.id, 'keep', currentSession?.id);
        
        // Update filtered media items in real-time for natural mode
        if (startMode === 'natural') {
          const updatedQueue = await reviewTracker.getUnreviewedQueue();
          dispatch(updateFilteredMediaItems(updatedQueue));
          
          // Intelligent completion check
          dispatch(checkCompletionStatus({
            hasUnreviewedPhotos: updatedQueue.length > 0,
            canLoadMore: organizationState.hasMorePhotosAvailable,
          }));
        }
      } catch (error) {
        console.error('Failed to mark item as reviewed:', error);
      }
    }, 0);
  };

  const handleUndo = () => {
    // Get the last action before undoing
    const lastAction = organizationState.undoStack[organizationState.undoStack.length - 1];
    
    dispatch(undoLastAction());
    
    // Remove the review status for the undone item and refresh queue (non-blocking)
    if (lastAction) {
      setTimeout(async () => {
        try {
          const reviewTracker = ReviewTracker.getInstance();
          await reviewTracker.removeReviewStatus(lastAction.mediaItemId);
          
          // Refresh the queue for natural mode
          if (startMode === 'natural' && mediaData?.items) {
            await reviewTracker.refreshUnreviewedQueue(mediaData.items);
            const updatedQueue = await reviewTracker.getUnreviewedQueue();
            dispatch(updateFilteredMediaItems(updatedQueue));
            
            // Intelligent completion check after undo
            dispatch(checkCompletionStatus({
              hasUnreviewedPhotos: updatedQueue.length > 0,
              canLoadMore: organizationState.hasMorePhotosAvailable,
            }));
          }
        } catch (error) {
          console.error('Failed to remove review status during undo:', error);
        }
      }, 0);
    }
  };

  const handleResetOrganization = () => {
    Alert.alert(
      'Reset Organization',
      'Are you sure you want to reset all organization decisions? This cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            dispatch(resetOrganization());
            try {
              await AsyncStorage.removeItem(ORGANIZATION_STORAGE_KEY);
              await OrganizationSessionService.clearCurrentSession();
            } catch (error) {
              console.error('Failed to clear saved decisions:', error);
            }
          },
        },
      ]
    );
  };

  // Session management functions
  const handleCommitSession = async () => {
    if (!currentSession) return;

    setIsCommittingSession(true);
    try {
      const reviewTracker = ReviewTracker.getInstance();
      
      // Count photos marked for deletion
      const deleteActions = currentSession.pendingActions.filter(action => action.action === 'delete');
      const keepActions = currentSession.pendingActions.filter(action => action.action === 'keep');
      
      // Mark all photos that were seen but not acted upon as reviewed (keep action)
      // Include the current photo being viewed even if no action was taken
      const seenPhotoIds = new Set<string>();
      const maxIndex = Math.max(organizationState.currentIndex, 0);
      for (let i = 0; i <= maxIndex && i < organizationState.mediaItems.length; i++) {
        const item = organizationState.mediaItems[i];
        if (item) {
          seenPhotoIds.add(item.id);
        }
      }
      
      // Remove photos that already have actions
      const actionedPhotoIds = new Set(currentSession.pendingActions.map(action => action.mediaItemId));
      const viewedButNotActionedPhotoIds = Array.from(seenPhotoIds).filter(id => !actionedPhotoIds.has(id));
      
      // Check if there's anything to commit (either explicit actions or viewed photos)
      const totalToProcess = currentSession.pendingActions.length + viewedButNotActionedPhotoIds.length;
      
      // Allow commit even if no explicit actions were taken, as long as photos were viewed
      if (totalToProcess === 0 && seenPhotoIds.size === 0) {
        Alert.alert(
          'Nothing to Commit',
          'No photos have been viewed in this session yet.',
          [{ text: 'OK' }]
        );
        setIsCommittingSession(false);
        return;
      }
      
      // Mark all photos in the session as reviewed with their actions
      for (const action of currentSession.pendingActions) {
        await reviewTracker.markAsReviewed(
          action.mediaItemId,
          action.action,
          currentSession.id
        );
      }
      
      // Mark viewed but not actioned photos as reviewed with 'keep' action
      for (const photoId of viewedButNotActionedPhotoIds) {
        await reviewTracker.markAsReviewed(photoId, 'keep', currentSession.id);
      }
      
      // Commit the session in Redux
      dispatch(commitOrganizationSession());
      
      // Save the committed session to history
      const finalSession = {
        ...currentSession,
        endTime: Date.now(),
        isCommitted: true,
        processedItems: totalToProcess,
      };
      await OrganizationSessionService.saveToHistory(finalSession);
      
      // Clear current session from storage
      await OrganizationSessionService.clearCurrentSession();
      
      setShowSessionExitModal(false);
      
      // Show completion message
      const totalKept = keepActions.length + viewedButNotActionedPhotoIds.length;
      
      if (deleteActions.length > 0) {
        Alert.alert(
          'Session Committed',
          `Successfully organized ${totalToProcess} photos:\n• ${totalKept} kept\n• ${deleteActions.length} marked for deletion\n\nNote: Photos marked for deletion are hidden from the gallery but remain in your Google Photos. Use Google Photos directly to permanently delete them if desired.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Session Committed',
          `Successfully organized ${totalToProcess} photos. All viewed photos are now marked as reviewed.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Failed to commit session:', error);
      Alert.alert('Error', 'Failed to save session. Please try again.');
    } finally {
      setIsCommittingSession(false);
    }
  };

  const handleDiscardSession = async () => {
    try {
      // Discard the session in Redux
      dispatch(discardOrganizationSession());
      
      // Clear current session from storage
      await OrganizationSessionService.clearCurrentSession();
      
      setShowSessionExitModal(false);
    } catch (error) {
      console.error('Failed to discard session:', error);
    }
  };

  const handleCancelExit = () => {
    setShowSessionExitModal(false);
  };

  const renderProgressIndicator = () => (
    <View style={styles.progressContainer}>
      {/* Current batch progress */}
      <Text style={styles.progressText}>
        {progress.current} of {progress.total} photos in current batch
      </Text>
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill, 
            { width: `${progress.batchPercentage}%` }
          ]} 
        />
      </View>
      
      {/* Overall session progress */}
      {progress.isNaturalMode && progress.overallTotal > 0 && (
        <>
          <Text style={styles.overallProgressText}>
            Session: {progress.processed} of {progress.overallTotal} photos reviewed ({Math.round(progress.percentage)}%)
          </Text>
          <View style={styles.overallProgressBar}>
            <View 
              style={[
                styles.overallProgressFill, 
                { width: `${progress.percentage}%` }
              ]} 
            />
          </View>
        </>
      )}
      
      {/* Session Statistics */}
      {sessionStats && (
        <View style={styles.sessionStatsContainer}>
          <SessionStatistics
            totalProcessed={sessionStats.processedItems}
            keepCount={sessionStats.keepCount}
            deleteCount={sessionStats.deleteCount}
            sessionDuration={sessionStats.duration}
            isCurrentSession={true}
            compact={true}
          />
        </View>
      )}
    </View>
  );

  const renderCompletionScreen = () => {
    const { status, hasMorePhotosAvailable, isLoading } = completionStatus;
    
    // Loading state for checking more photos
    if (isLoading) {
      return (
        <View style={styles.completionContainer}>
          <ActivityIndicator size="large" color="#7444C0" />
          <Text style={styles.completionTitle}>
            {status === 'checking_more' ? 'Checking for more photos...' : 'Loading more photos...'}
          </Text>
          <Text style={styles.completionText}>
            Please wait while we check for additional photos to organize.
          </Text>
        </View>
      );
    }
    
    // Batch complete but more photos available
    if (status === 'batch_complete' && hasMorePhotosAvailable) {
      return (
        <View style={styles.completionContainer}>
          <Text style={styles.completionTitle}>Batch Complete!</Text>
          <Text style={styles.completionText}>
            You've organized {progress.processed} photos in this session
          </Text>
          <Text style={styles.completionStats}>
            Kept: {organizationState.processingStats.keepCount} photos{'\n'}
            Deleted: {organizationState.processingStats.deleteCount} photos
          </Text>
          <TouchableOpacity
            style={styles.loadMoreButton}
            onPress={() => {
              // TODO: Implement load more functionality
              Alert.alert('Load More', 'Loading more photos functionality will be implemented here.');
            }}
          >
            <Text style={styles.loadMoreButtonText}>Load More Photos</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    // All photos complete
    return (
      <View style={styles.completionContainer}>
        <Text style={styles.completionTitle}>Organization Complete!</Text>
        <Text style={styles.completionText}>
          You've organized {progress.processed} photos
          {progress.overallTotal > progress.processed && ` out of ${progress.overallTotal} total`}
        </Text>
        <Text style={styles.completionStats}>
          Kept: {organizationState.processingStats.keepCount} photos{'\n'}
          Deleted: {organizationState.processingStats.deleteCount} photos
        </Text>
        
        <TouchableOpacity
          style={styles.startOverButton}
          onPress={() => {
            dispatch(resetCompletionTracking());
            dispatch(resetOrganization());
          }}
        >
          <Text style={styles.startOverButtonText}>Start Over</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderLoadingScreen = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#7444C0" />
      <Text style={styles.loadingText}>Loading photos...</Text>
    </View>
  );

  const renderErrorScreen = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Unable to Load Photos</Text>
      <Text style={styles.errorText}>
        {mediaError?.toString() || 'An unexpected error occurred'}
      </Text>
      <Text style={styles.retryText} onPress={() => refetchMedia()}>
        Tap to retry
      </Text>
    </View>
  );

  // Loading state
  if (!isInitialized || isLoadingMedia) {
    return (
      <SafeAreaView style={styles.container}>
        {renderLoadingScreen()}
      </SafeAreaView>
    );
  }

  // Error state
  if (mediaError) {
    return (
      <SafeAreaView style={styles.container}>
        {renderErrorScreen()}
      </SafeAreaView>
    );
  }

  // No media items
  if (!organizationState.mediaItems.length) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Photos Found</Text>
          <Text style={styles.emptyText}>
            Connect to Google Photos to start organizing your photos
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Completion state - use the new robust completion detection
  if (completionStatus.isBatchComplete || completionStatus.isComplete) {
    return (
      <SafeAreaView style={styles.container}>
        {renderCompletionScreen()}
      </SafeAreaView>
    );
  }

  // Main organization interface
  return (
    <SafeAreaView style={styles.container}>
      {renderProgressIndicator()}
      
      <View style={styles.cardContainer}>
        <SwipeCardStackWithUndo
          mediaItems={organizationState.mediaItems}
          currentIndex={organizationState.currentIndex}
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
          onUndo={handleUndo}
          onCommit={handleCommitSession}
          canUndo={canUndo}
          canCommit={true}
          undoTimeoutMs={5000}
          actionBarPosition="bottom"
        />
      </View>

      {/* Session Exit Modal */}
      {sessionStats && (
        <SessionExitModal
          visible={showSessionExitModal}
          isCommitting={isCommittingSession}
          sessionStats={{
            totalProcessed: sessionStats.processedItems,
            keepCount: sessionStats.keepCount,
            deleteCount: sessionStats.deleteCount,
            sessionDuration: sessionStats.duration,
          }}
          onCommit={handleCommitSession}
          onDiscard={handleDiscardSession}
          onCancel={handleCancelExit}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#7444C0',
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
  keepColor: {
    color: '#34C759',
  },
  deleteColor: {
    color: '#FF3B30',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryText: {
    fontSize: 16,
    color: '#7444C0',
    textAlign: 'center',
    textDecorationLine: 'underline',
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
  completionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  completionText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  completionStats: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  overallProgressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  overallProgressBar: {
    height: 3,
    backgroundColor: '#e0e0e0',
    borderRadius: 1.5,
    marginBottom: 8,
  },
  overallProgressFill: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 1.5,
  },
  loadMoreButton: {
    backgroundColor: '#7444C0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  loadMoreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  startOverButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  startOverButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OrganizeScreen;