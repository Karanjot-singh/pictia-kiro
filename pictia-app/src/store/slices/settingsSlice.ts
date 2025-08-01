import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppPreferences, SettingsError } from '@/types';

interface SettingsState {
  preferences: AppPreferences | null;
  isLoading: boolean;
  error: SettingsError | null;
  hasUnsavedChanges: boolean;
  storageInfo: {
    preferencesSize: number;
    totalAppStorage: number;
    availableStorage?: number;
  } | null;
}

const initialState: SettingsState = {
  preferences: null,
  isLoading: false,
  error: null,
  hasUnsavedChanges: false,
  storageInfo: null,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setPreferences: (state, action: PayloadAction<AppPreferences>) => {
      state.preferences = action.payload;
      state.hasUnsavedChanges = false;
      state.error = null;
    },
    updatePreference: <K extends keyof AppPreferences>(
      state: SettingsState,
      action: PayloadAction<{ key: K; value: AppPreferences[K] }>
    ) => {
      if (state.preferences) {
        state.preferences[action.payload.key] = action.payload.value;
        state.hasUnsavedChanges = true;
        state.error = null;
      }
    },
    setError: (state, action: PayloadAction<SettingsError>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
    setUnsavedChanges: (state, action: PayloadAction<boolean>) => {
      state.hasUnsavedChanges = action.payload;
    },
    setStorageInfo: (state, action: PayloadAction<{
      preferencesSize: number;
      totalAppStorage: number;
      availableStorage?: number;
    }>) => {
      state.storageInfo = action.payload;
    },
    resetPreferences: (state) => {
      // This will be handled by the thunk, just clear the unsaved changes flag
      state.hasUnsavedChanges = false;
      state.error = null;
    },
  },
});

export const {
  setLoading,
  setPreferences,
  updatePreference,
  setError,
  clearError,
  setUnsavedChanges,
  setStorageInfo,
  resetPreferences,
} = settingsSlice.actions;

export default settingsSlice.reducer;