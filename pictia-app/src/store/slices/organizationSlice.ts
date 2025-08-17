import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CachedMediaItem, MediaOrganization, SwipeAction, MediaOrganizationCache } from '../../types';
import { googlePhotosApi } from '../api/googlePhotosApi';

interface OrganizationState {
  currentIndex: number;
  mediaItems: CachedMediaItem[];
  keepItems: CachedMediaItem[];
  deleteItems: CachedMediaItem[];
  lastAction: SwipeAction | null;
  undoAvailable: boolean;
  isLoading: boolean;
  error: string | null;
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
    
    // Enhanced swipe action with undo stack
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

    // Enhanced undo with stack support
    undoLastAction: state => {
      if (state.undoStack.length === 0 || !state.undoAvailable) {
        return;
      }

      const lastUndo = state.undoStack.pop()!;
      
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

export default organizationSlice.reducer;
