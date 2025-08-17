import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
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
  commitOrganizationSession,
  discardOrganizationSession,
  startOrganizationSession,
  restoreSessionProgress,
  resetOrganization,
} from '../store/slices/organizationSlice';
import { useGetMediaItemsQuery } from '../store/api/googlePhotosApi';
import { CachedMediaItem, SwipeAction } from '../types';
import OrganizationSessionService from '../services/OrganizationSessionService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ORGANIZATION_STORAGE_KEY = 'organization_decisions';

interface OrganizationDecision {
  mediaItemId: string;
  action: SwipeAction;
  timestamp: number;
}

const OrganizeScreen: React.FC = () => {
  const dispatch = useDispatch();
  const [isInitialized, setIsInitialized] = useState(false);
  const [showSessionExitModal, setShowSessionExitModal] = useState(false);
  const [isCommittingSession, setIsCommittingSession] = useState(false);
  
  // Redux selectors
  const organizationState = useSelector((state: RootState) => state.organization);
  const currentMediaItem = useSelector(selectCurrentMediaItem);
  const progress = useSelector(selectOrganizationProgress);
  const canUndo = useSelector(selectCanUndo);
  const currentSession = useSelector(selectCurrentSession);
  const hasUnsavedChanges = useSelector(selectHasUnsavedChanges);
  const sessionStats = useSelector(selectSessionStats);
  
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
        
        // Start a new session in natural mode (default)
        dispatch(startOrganizationSession({
          startMode: 'natural',
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
    dispatch(swipeAction({ item, action: 'delete' }));
    // Session progress will be automatically saved via useEffect
  };

  const handleSwipeRight = (item: CachedMediaItem) => {
    dispatch(swipeAction({ item, action: 'keep' }));
    // Session progress will be automatically saved via useEffect
  };

  const handleUndo = () => {
    dispatch(undoLastAction());
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
      // Commit the session in Redux
      dispatch(commitOrganizationSession());
      
      // Save the committed session to history
      const finalSession = {
        ...currentSession,
        endTime: Date.now(),
        isCommitted: true,
        processedItems: currentSession.pendingActions.length,
      };
      await OrganizationSessionService.saveToHistory(finalSession);
      
      // Clear current session from storage
      await OrganizationSessionService.clearCurrentSession();
      
      setShowSessionExitModal(false);
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
      <Text style={styles.progressText}>
        {progress.current} of {progress.total} photos
      </Text>
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill, 
            { width: `${progress.percentage}%` }
          ]} 
        />
      </View>
      
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

  const renderCompletionScreen = () => (
    <View style={styles.completionContainer}>
      <Text style={styles.completionTitle}>Organization Complete!</Text>
      <Text style={styles.completionText}>
        You've organized {progress.total} photos
      </Text>
      <Text style={styles.completionStats}>
        Kept: {organizationState.processingStats.keepCount} photos{'\n'}
        Deleted: {organizationState.processingStats.deleteCount} photos
      </Text>
      
      {/* Here you could add buttons for backup, export, etc. */}
    </View>
  );

  const renderLoadingScreen = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
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

  // Completion state
  if (progress.current >= progress.total) {
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
          canUndo={canUndo}
          undoTimeoutMs={5000}

          undoPosition="bottom"
        />
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText}>
          Swipe left to delete • Swipe right to keep
        </Text>
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
  instructionsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
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
    color: '#007AFF',
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
});

export default OrganizeScreen;