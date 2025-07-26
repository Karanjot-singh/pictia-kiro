import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MediaItem, MediaOrganization, SwipeAction } from '@/types';

interface OrganizationState {
  currentIndex: number;
  mediaItems: MediaItem[];
  keepItems: MediaItem[];
  deleteItems: MediaItem[];
  lastAction: SwipeAction | null;
  undoAvailable: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: OrganizationState = {
  currentIndex: 0,
  mediaItems: [],
  keepItems: [],
  deleteItems: [],
  lastAction: null,
  undoAvailable: false,
  isLoading: false,
  error: null,
};

const organizationSlice = createSlice({
  name: 'organization',
  initialState,
  reducers: {
    loadMediaItemsStart: state => {
      state.isLoading = true;
      state.error = null;
    },
    loadMediaItemsSuccess: (state, action: PayloadAction<MediaItem[]>) => {
      state.mediaItems = action.payload;
      state.currentIndex = 0;
      state.isLoading = false;
      state.error = null;
    },
    loadMediaItemsFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    swipeAction: (
      state,
      action: PayloadAction<{ item: MediaItem; action: SwipeAction }>
    ) => {
      const { item, action: swipeAction } = action.payload;

      if (swipeAction === 'keep') {
        state.keepItems.push(item);
      } else {
        state.deleteItems.push(item);
      }

      state.lastAction = swipeAction;
      state.undoAvailable = true;
      state.currentIndex += 1;
    },
    undoLastAction: state => {
      if (state.lastAction && state.undoAvailable) {
        if (state.lastAction === 'keep') {
          state.keepItems.pop();
        } else {
          state.deleteItems.pop();
        }

        state.currentIndex -= 1;
        state.lastAction = null;
        state.undoAvailable = false;
      }
    },
    clearUndo: state => {
      state.undoAvailable = false;
      state.lastAction = null;
    },
    resetOrganization: state => {
      state.currentIndex = 0;
      state.keepItems = [];
      state.deleteItems = [];
      state.lastAction = null;
      state.undoAvailable = false;
    },
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
} = organizationSlice.actions;

export default organizationSlice.reducer;
