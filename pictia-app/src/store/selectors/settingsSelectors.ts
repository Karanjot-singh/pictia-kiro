import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../index';

// Base selector
const selectSettingsState = (state: RootState) => state.settings;

// Basic selectors
export const selectPreferences = createSelector(
  [selectSettingsState],
  (settings) => settings.preferences
);

export const selectSettingsLoading = createSelector(
  [selectSettingsState],
  (settings) => settings.isLoading
);

export const selectSettingsError = createSelector(
  [selectSettingsState],
  (settings) => settings.error
);

export const selectHasUnsavedChanges = createSelector(
  [selectSettingsState],
  (settings) => settings.hasUnsavedChanges
);

export const selectStorageInfo = createSelector(
  [selectSettingsState],
  (settings) => settings.storageInfo
);

// Specific preference selectors
export const selectTheme = createSelector(
  [selectPreferences],
  (preferences) => preferences?.theme || 'system'
);

export const selectLanguage = createSelector(
  [selectPreferences],
  (preferences) => preferences?.language || 'en'
);

export const selectAutoBackupEnabled = createSelector(
  [selectPreferences],
  (preferences) => preferences?.autoBackupEnabled ?? true
);

export const selectHighQualityUploads = createSelector(
  [selectPreferences],
  (preferences) => preferences?.highQualityUploads ?? true
);

export const selectWifiOnlyUploads = createSelector(
  [selectPreferences],
  (preferences) => preferences?.wifiOnlyUploads ?? true
);

export const selectShowOnboardingTips = createSelector(
  [selectPreferences],
  (preferences) => preferences?.showOnboardingTips ?? true
);

export const selectEnableAnalytics = createSelector(
  [selectPreferences],
  (preferences) => preferences?.enableAnalytics ?? false
);

export const selectEnableCrashReporting = createSelector(
  [selectPreferences],
  (preferences) => preferences?.enableCrashReporting ?? false
);

export const selectMaxCacheSize = createSelector(
  [selectPreferences],
  (preferences) => preferences?.maxCacheSize || 500
);

export const selectUndoTimeoutSeconds = createSelector(
  [selectPreferences],
  (preferences) => preferences?.undoTimeoutSeconds || 5
);

export const selectGestureThreshold = createSelector(
  [selectPreferences],
  (preferences) => preferences?.gestureThreshold || 0.3
);

export const selectHapticFeedbackEnabled = createSelector(
  [selectPreferences],
  (preferences) => preferences?.hapticFeedbackEnabled ?? true
);

// Computed selectors
export const selectFormattedStorageInfo = createSelector(
  [selectStorageInfo],
  (storageInfo) => {
    if (!storageInfo) return null;

    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return {
      preferencesSize: formatBytes(storageInfo.preferencesSize),
      totalAppStorage: formatBytes(storageInfo.totalAppStorage),
      availableStorage: storageInfo.availableStorage 
        ? formatBytes(storageInfo.availableStorage) 
        : 'Unknown',
    };
  }
);

export const selectIsPreferencesLoaded = createSelector(
  [selectPreferences],
  (preferences) => preferences !== null
);

export const selectHasSettingsError = createSelector(
  [selectSettingsError],
  (error) => error !== null
);

export const selectSettingsErrorMessage = createSelector(
  [selectSettingsError],
  (error) => error?.message || null
);

export const selectSettingsErrorField = createSelector(
  [selectSettingsError],
  (error) => error?.field || null
);

export const selectSettingsErrorType = createSelector(
  [selectSettingsError],
  (error) => error?.type || null
);

// Privacy-related preferences
export const selectPrivacyPreferences = createSelector(
  [selectPreferences],
  (preferences) => {
    if (!preferences) return null;
    
    return {
      enableAnalytics: preferences.enableAnalytics,
      enableCrashReporting: preferences.enableCrashReporting,
    };
  }
);

// Upload-related preferences
export const selectUploadPreferences = createSelector(
  [selectPreferences],
  (preferences) => {
    if (!preferences) return null;
    
    return {
      autoBackupEnabled: preferences.autoBackupEnabled,
      highQualityUploads: preferences.highQualityUploads,
      wifiOnlyUploads: preferences.wifiOnlyUploads,
    };
  }
);

// UI-related preferences
export const selectUIPreferences = createSelector(
  [selectPreferences],
  (preferences) => {
    if (!preferences) return null;
    
    return {
      theme: preferences.theme,
      language: preferences.language,
      showOnboardingTips: preferences.showOnboardingTips,
      hapticFeedbackEnabled: preferences.hapticFeedbackEnabled,
    };
  }
);

// Performance-related preferences
export const selectPerformancePreferences = createSelector(
  [selectPreferences],
  (preferences) => {
    if (!preferences) return null;
    
    return {
      maxCacheSize: preferences.maxCacheSize,
      undoTimeoutSeconds: preferences.undoTimeoutSeconds,
      gestureThreshold: preferences.gestureThreshold,
    };
  }
);