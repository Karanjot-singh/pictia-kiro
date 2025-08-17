import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CachedMediaItem, MediaOrganization, SwipeAction, MediaOrganizationCache } from '../../types';
import { googlePhotosApi } from '../api/googlePhotosApi';

interface OrganizationSession {
  id: string;
  startTime: number;
  endTime?: number;
  startingPhotoId?: string;
  startMode: 'gallery' | 'natural';
  totalItems: number;
  processedItems: number;
  keepCount: number;
  deleteCount: number;
  isCommitted: boolean;
  pendingActions: Array<{
    mediaItemId: string;
    action: SwipeAction;
    timestamp: number;
  }>;
}

interface OrganizationState {
  currentIndex: number;
  mediaItems: CachedMediaItem[];
  keepItems: CachedMediaItem[];
  deleteItems: CachedMediaItem[];
  lastAction: SwipeAction | null;
  undoAvailable: boolean;
  isLoading: boolean;
  error: string | null;
  // Enhanced session management
  currentSession: OrganizationSession | null;
  sessionHistory: OrganizationSession[];
  hasUnsavedChanges: boolean;
  // Enhanced caching and pagination
  sessionId: string;
  totalItems: number;
  hasNextPage: boolean;
  nextPageToken?: string | undefined;
  cacheExpiry: number;
  undoStack: Array<{
    mediaItemId: string;
    previousDecision?: SwipeAction | undefined;
    timestamp: number;
  }>;
  // Performance tracking
  lastUpdated: number;
  processingStats: {
    totalProcessed: number;
    keepCount: number;
    deleteCount: number;
    undoCount: number;
    sessionStartTime: number;
  };
}

const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const initialState: OrganizationState = {
  currentIndex: 0,
  mediaItems: [],
  keepItems: [],
  deleteItems: [],
  lastAction: null,
  undoAvailable: false,
  isLoading: false,
  error: null,
  currentSession: null,
  sessionHistory: [],
  hasUnsavedChanges: false,
  sessionId: generateSessionId(),
  totalItems: 0,
  hasNextPage: false,
  nextPageToken: undefined,
  cacheExpiry: Date.now() + (10 * 60 * 1000), // 10 minutes
  undoStack: [],
  lastUpdated: Date.now(),
  processingStats: {
    totalProcessed: 0,
    keepCount: 0,
    deleteCount: 0,
    undoCount: 0,
    sessionStartTime: Date.now(),
  },
};

const organizationSlice = createSlice({
  name: 'organization',
  initialState,
  reducers: {
    // Enhanced loading actions
    loadMediaItemsStart: state => {
      state.isLoading = true;
      state.error = null;
    },
    loadMediaItemsSuccess: (state, action: PayloadAction<{
      items: CachedMediaItem[];
      nextPageToken?: string | undefined;
      totalCount?: number | undefined;
      append?: boolean | undefined;
    }>) => {
      const { items, nextPageToken, totalCount, append = false } = action.payload;
      
      if (append) {
        // Append new items for pagination
        state.mediaItems = [...state.mediaItems, ...items];
      } else {
        // Replace items for fresh load
        state.mediaItems = items;
        state.currentIndex = 0;
      }
      
      state.nextPageToken = nextPageToken;
      state.hasNextPage = !!nextPageToken;
      state.totalItems = totalCount || state.mediaItems.length;
      state.isLoading = false;
      state.error = null;
      state.lastUpdated = Date.now();
      state.cacheExpiry = Date.now() + (10 * 60 * 1000);
    },
    loadMediaItemsFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    
    // Enhanced swipe action with session support
    swipeAction: (
      state,
      action: PayloadAction<{ item: CachedMediaItem; action: SwipeAction }>
    ) => {
      const { item, action: swipeAction } = action.payload;
      const now = Date.now();

      // Update item organization status
      const updatedItem = {
        ...item,
        organizationStatus: swipeAction,
        lastAccessed: now
      } as CachedMediaItem;

      // Add to undo stack
      state.undoStack.push({
        mediaItemId: item.id,
        previousDecision: (state.lastAction || undefined) as SwipeAction | undefined,
        timestamp: now
      });

      // Keep only last 10 undo actions
      if (state.undoStack.length > 10) {
        state.undoStack.shift();
      }

      // Add to session pending actions if session exists
      if (state.currentSession) {
        state.currentSession.pendingActions.push({
          mediaItemId: item.id,
          action: swipeAction,
          timestamp: now,
        });
        state.hasUnsavedChanges = true;
      }

      if (swipeAction === 'keep') {
        state.keepItems.push(updatedItem);
        state.processingStats.keepCount += 1;
      } else {
        state.deleteItems.push(updatedItem);
        state.processingStats.deleteCount += 1;
      }

      state.lastAction = swipeAction;
      state.undoAvailable = true;
      state.currentIndex += 1;
      state.processingStats.totalProcessed += 1;
      state.lastUpdated = now;
    },

    // Enhanced undo with session support
    undoLastAction: state => {
      if (state.undoStack.length === 0 || !state.undoAvailable) {
        return;
      }

      const lastUndo = state.undoStack.pop()!;
      
      // Remove from session pending actions if session exists
      if (state.currentSession) {
        const actionIndex = state.currentSession.pendingActions.findIndex(
          action => action.mediaItemId === lastUndo.mediaItemId
        );
        if (actionIndex >= 0) {
          state.currentSession.pendingActions.splice(actionIndex, 1);
        }
        state.hasUnsavedChanges = state.currentSession.pendingActions.length > 0;
      }
      
      if (state.lastAction === 'keep') {
        const removedItem = state.keepItems.pop();
        if (removedItem) {
          removedItem.organizationStatus = 'pending';
          state.processingStats.keepCount -= 1;
        }
      } else if (state.lastAction === 'delete') {
        const removedItem = state.deleteItems.pop();
        if (removedItem) {
          removedItem.organizationStatus = 'pending';
          state.processingStats.deleteCount -= 1;
        }
      }

      state.currentIndex = Math.max(0, state.currentIndex - 1);
      state.lastAction = lastUndo.previousDecision || null;
      state.undoAvailable = state.undoStack.length > 0;
      state.processingStats.totalProcessed = Math.max(0, state.processingStats.totalProcessed - 1);
      state.processingStats.undoCount += 1;
      state.lastUpdated = Date.now();
    },

    clearUndo: state => {
      state.undoAvailable = false;
      state.lastAction = null;
      state.undoStack = [];
    },

    // Enhanced reset with session management
    resetOrganization: state => {
      state.currentIndex = 0;
      state.keepItems = [];
      state.deleteItems = [];
      state.lastAction = null;
      state.undoAvailable = false;
      state.undoStack = [];
      state.sessionId = generateSessionId();
      state.processingStats = {
        totalProcessed: 0,
        keepCount: 0,
        deleteCount: 0,
        undoCount: 0,
        sessionStartTime: Date.now(),
      };
      state.lastUpdated = Date.now();
    },

    // New actions for pagination and caching
    loadNextPage: state => {
      if (state.hasNextPage && !state.isLoading) {
        state.isLoading = true;
        state.error = null;
      }
    },

    updateCacheExpiry: (state, action: PayloadAction<number>) => {
      state.cacheExpiry = action.payload;
    },

    markItemAsProcessed: (state, action: PayloadAction<string>) => {
      const itemId = action.payload;
      const item = state.mediaItems.find(item => item.id === itemId);
      if (item) {
        item.organizationStatus = 'processed';
        item.lastAccessed = Date.now();
      }
    },

    updateItemThumbnail: (state, action: PayloadAction<{ itemId: string; thumbnailUrl: string }>) => {
      const { itemId, thumbnailUrl } = action.payload;
      const item = state.mediaItems.find(item => item.id === itemId);
      if (item) {
        item.thumbnailUrl = thumbnailUrl;
        item.lastAccessed = Date.now();
      }
    },

    // Bulk operations
    markMultipleItems: (state, action: PayloadAction<{ itemIds: string[]; action: SwipeAction }>) => {
      const { itemIds, action: swipeAction } = action.payload;
      const now = Date.now();

      itemIds.forEach(itemId => {
        const item = state.mediaItems.find(item => item.id === itemId);
        if (item) {
          const updatedItem = {
            ...item,
            organizationStatus: swipeAction,
            lastAccessed: now
          } as CachedMediaItem;

          if (swipeAction === 'keep') {
            state.keepItems.push(updatedItem);
            state.processingStats.keepCount += 1;
          } else {
            state.deleteItems.push(updatedItem);
            state.processingStats.deleteCount += 1;
          }
          
          state.processingStats.totalProcessed += 1;
        }
      });

      state.lastUpdated = now;
    },

    // Session management actions
    startOrganizationSession: (state, action: PayloadAction<{
      startingPhotoId?: string;
      startMode: 'gallery' | 'natural';
    }>) => {
      const { startingPhotoId, startMode } = action.payload;
      const now = Date.now();

      // Save current session if it exists and has unsaved changes
      if (state.currentSession && state.hasUnsavedChanges) {
        state.sessionHistory.push(state.currentSession);
      }

      // Create new session
      state.currentSession = {
        id: generateSessionId(),
        startTime: now,
        startingPhotoId: startingPhotoId || undefined,
        startMode,
        totalItems: state.totalItems,
        processedItems: 0,
        keepCount: 0,
        deleteCount: 0,
        isCommitted: false,
        pendingActions: [],
      };

      // Reset organization state for new session
      state.keepItems = [];
      state.deleteItems = [];
      state.undoStack = [];
      state.hasUnsavedChanges = false;
      state.lastAction = null;
      state.undoAvailable = false;

      // Set starting index based on mode and starting photo
      if (startMode === 'gallery' && startingPhotoId) {
        const startIndex = state.mediaItems.findIndex(item => item.id === startingPhotoId);
        state.currentIndex = startIndex >= 0 ? startIndex : 0;
      } else {
        // Natural mode: start from oldest unreviewed photo
        const unreviewed = state.mediaItems.filter(item => 
          item.organizationStatus !== 'processed' && 
          item.organizationStatus !== 'keep' && 
          item.organizationStatus !== 'delete'
        );
        state.currentIndex = unreviewed.length > 0 && unreviewed[0] ? 
          state.mediaItems.findIndex(item => item.id === unreviewed[0].id) : 0;
      }

      state.lastUpdated = now;
    },

    commitOrganizationSession: (state) => {
      if (!state.currentSession) return;

      const now = Date.now();
      
      // Mark all pending actions as committed
      state.currentSession.pendingActions.forEach(action => {
        const item = state.mediaItems.find(item => item.id === action.mediaItemId);
        if (item) {
          item.organizationStatus = action.action === 'keep' ? 'processed' : 'delete';
        }
      });

      // Finalize session
      state.currentSession.endTime = now;
      state.currentSession.isCommitted = true;
      state.currentSession.processedItems = state.currentSession.pendingActions.length;

      // Add to history
      state.sessionHistory.push(state.currentSession);

      // Clear current session
      state.currentSession = null;
      state.hasUnsavedChanges = false;
      state.undoStack = [];
      state.lastUpdated = now;
    },

    discardOrganizationSession: (state) => {
      if (!state.currentSession) return;

      // Revert all pending actions
      state.currentSession.pendingActions.forEach(action => {
        const item = state.mediaItems.find(item => item.id === action.mediaItemId);
        if (item) {
          item.organizationStatus = 'pending';
        }
      });

      // Clear session data
      state.currentSession = null;
      state.hasUnsavedChanges = false;
      state.keepItems = [];
      state.deleteItems = [];
      state.undoStack = [];
      state.lastAction = null;
      state.undoAvailable = false;
      state.lastUpdated = Date.now();
    },

    saveSessionProgress: (state) => {
      if (!state.currentSession) return;

      // Update session with current progress
      state.currentSession.processedItems = state.processingStats.totalProcessed;
      state.currentSession.keepCount = state.processingStats.keepCount;
      state.currentSession.deleteCount = state.processingStats.deleteCount;
      
      // Save to localStorage or AsyncStorage would happen in middleware
      state.lastUpdated = Date.now();
    },

    restoreSessionProgress: (state, action: PayloadAction<OrganizationSession>) => {
      const session = action.payload;
      
      state.currentSession = session;
      state.hasUnsavedChanges = session.pendingActions.length > 0;
      
      // Restore organization state from session
      session.pendingActions.forEach(action => {
        const item = state.mediaItems.find(item => item.id === action.mediaItemId);
        if (item) {
          const updatedItem = {
            ...item,
            organizationStatus: action.action,
            lastAccessed: action.timestamp
          } as CachedMediaItem;

          if (action.action === 'keep') {
            state.keepItems.push(updatedItem);
          } else {
            state.deleteItems.push(updatedItem);
          }
        }
      });

      state.lastUpdated = Date.now();
    },
  },
  
  // Handle RTK Query actions
  extraReducers: (builder) => {
    builder
      // Handle getMediaItems query
      .addMatcher(
        googlePhotosApi.endpoints.getMediaItems.matchPending,
        (state) => {
          state.isLoading = true;
          state.error = null;
        }
      )
      .addMatcher(
        googlePhotosApi.endpoints.getMediaItems.matchFulfilled,
        (state, action) => {
          const { items, nextPageToken, totalCount } = action.payload;
          const append = !!(action.meta.arg as any).pageToken;
          
          organizationSlice.caseReducers.loadMediaItemsSuccess(state, {
            type: 'loadMediaItemsSuccess',
            payload: { items, nextPageToken, totalCount, append }
          });
        }
      )
      .addMatcher(
        googlePhotosApi.endpoints.getMediaItems.matchRejected,
        (state, action) => {
          state.isLoading = false;
          state.error = action.error.message || 'Failed to load media items';
        }
      )
      // Handle searchMediaItems query
      .addMatcher(
        googlePhotosApi.endpoints.searchMediaItems.matchFulfilled,
        (state, action) => {
          const { items, nextPageToken, totalCount } = action.payload;
          const append = !!(action.meta.arg as any).pagination?.pageToken;
          
          organizationSlice.caseReducers.loadMediaItemsSuccess(state, {
            type: 'loadMediaItemsSuccess',
            payload: { items, nextPageToken, totalCount, append }
          });
        }
      );
  },
});

export const {
  loadMediaItemsStart,
  loadMediaItemsSuccess,
  loadMediaItemsFailure,
  swipeAction,
  undoLastAction,
  clearUndo,
  resetOrganization,
  loadNextPage,
  updateCacheExpiry,
  markItemAsProcessed,
  updateItemThumbnail,
  markMultipleItems,
  startOrganizationSession,
  commitOrganizationSession,
  discardOrganizationSession,
  saveSessionProgress,
  restoreSessionProgress,
} = organizationSlice.actions;

// Selectors
export const selectOrganizationState = (state: { organization: OrganizationState }) => state.organization;
export const selectCurrentMediaItem = (state: { organization: OrganizationState }) => {
  const { mediaItems, currentIndex } = state.organization;
  return mediaItems[currentIndex] || null;
};
export const selectOrganizationProgress = (state: { organization: OrganizationState }) => {
  const { currentIndex, totalItems, processingStats } = state.organization;
  return {
    current: currentIndex,
    total: totalItems,
    percentage: totalItems > 0 ? (currentIndex / totalItems) * 100 : 0,
    processed: processingStats.totalProcessed,
    remaining: Math.max(0, totalItems - currentIndex),
  };
};
export const selectOrganizationStats = (state: { organization: OrganizationState }) => state.organization.processingStats;
export const selectCanUndo = (state: { organization: OrganizationState }) => state.organization.undoAvailable;
export const selectHasNextPage = (state: { organization: OrganizationState }) => state.organization.hasNextPage;
export const selectCacheStatus = (state: { organization: OrganizationState }) => {
  const { cacheExpiry, lastUpdated } = state.organization;
  const now = Date.now();
  return {
    isExpired: now > cacheExpiry,
    expiresIn: Math.max(0, cacheExpiry - now),
    lastUpdated,
    age: now - lastUpdated,
  };
};

// Session selectors
export const selectCurrentSession = (state: { organization: OrganizationState }) => 
  state.organization.currentSession;

export const selectHasUnsavedChanges = (state: { organization: OrganizationState }) => 
  state.organization.hasUnsavedChanges;

export const selectSessionHistory = (state: { organization: OrganizationState }) => 
  state.organization.sessionHistory;

export const selectSessionStats = (state: { organization: OrganizationState }) => {
  const session = state.organization.currentSession;
  if (!session) return null;
  
  return {
    sessionId: session.id,
    startTime: session.startTime,
    duration: session.endTime ? session.endTime - session.startTime : Date.now() - session.startTime,
    startMode: session.startMode,
    totalItems: session.totalItems,
    processedItems: session.processedItems,
    keepCount: session.keepCount,
    deleteCount: session.deleteCount,
    pendingActions: session.pendingActions.length,
    isCommitted: session.isCommitted,
  };
};

export const selectCanCommitSession = (state: { organization: OrganizationState }) => {
  const session = state.organization.currentSession;
  return session && session.pendingActions.length > 0 && !session.isCommitted;
};

export default organizationSlice.reducer;
