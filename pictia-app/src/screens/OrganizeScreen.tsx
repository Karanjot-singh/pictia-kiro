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
import { SwipeCardStackWithUndo } from '../components';
import { RootState } from '../store';
import {
  swipeAction,
  undoLastAction,
  selectCurrentMediaItem,
  selectOrganizationProgress,
  selectCanUndo,
  resetOrganization,
} from '../store/slices/organizationSlice';
import { useGetMediaItemsQuery } from '../store/api/googlePhotosApi';
import { CachedMediaItem, SwipeAction } from '../types';

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
  
  // Redux selectors
  const organizationState = useSelector((state: RootState) => state.organization);
  const currentMediaItem = useSelector(selectCurrentMediaItem);
  const progress = useSelector(selectOrganizationProgress);
  const canUndo = useSelector(selectCanUndo);
  
  // API query
  const {
    data: mediaData,
    isLoading: isLoadingMedia,
    error: mediaError,
    refetch: refetchMedia,
  } = useGetMediaItemsQuery({
    pageSize: 50,
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

  const initializeOrganization = async () => {
    try {
      // Load saved organization decisions
      const savedDecisions = await loadOrganizationDecisions();
      
      // If we have saved decisions, we could restore them here
      // For now, we'll start fresh each time
      
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
  };

  const handleSwipeRight = (item: CachedMediaItem) => {
    dispatch(swipeAction({ item, action: 'keep' }));
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
            } catch (error) {
              console.error('Failed to clear saved decisions:', error);
            }
          },
        },
      ]
    );
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
      <Text style={styles.statsText}>
        Keep: {organizationState.processingStats.keepCount} • 
        Delete: {organizationState.processingStats.deleteCount}
      </Text>
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
          showUndoCountdown={true}
          undoPosition="bottom"
        />
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText}>
          Swipe left to delete • Swipe right to keep
        </Text>
      </View>
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