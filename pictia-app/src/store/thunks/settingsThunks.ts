import { createAsyncThunk } from '@reduxjs/toolkit';
import { SettingsService } from '@/services';
import { AppPreferences, SettingsError } from '@/types';
import { 
  setPreferences, 
  setError, 
  setStorageInfo,
  setLoading 
} from '../slices/settingsSlice';

/**
 * Load app preferences from storage
 */
export const loadPreferences = createAsyncThunk(
  'settings/loadPreferences',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setLoading(true));
      
      // Migrate preferences if needed
      await SettingsService.migratePreferences();
      
      const preferences = await SettingsService.getPreferences();
      dispatch(setPreferences(preferences));
      
      return preferences;
    } catch (error) {
      const settingsError: SettingsError = {
        field: 'general',
        message: error instanceof Error ? error.message : 'Failed to load preferences',
        type: 'storage',
      };
      
      dispatch(setError(settingsError));
      return rejectWithValue(settingsError);
    } finally {
      dispatch(setLoading(false));
    }
  }
);

/**
 * Save app preferences to storage
 */
export const savePreferences = createAsyncThunk(
  'settings/savePreferences',
  async (preferences: Partial<AppPreferences>, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setLoading(true));
      
      await SettingsService.setPreferences(preferences);
      
      // Reload preferences to get the complete updated state
      const updatedPreferences = await SettingsService.getPreferences();
      dispatch(setPreferences(updatedPreferences));
      
      return updatedPreferences;
    } catch (error) {
      const settingsError: SettingsError = {
        field: 'general',
        message: error instanceof Error ? error.message : 'Failed to save preferences',
        type: 'storage',
      };
      
      dispatch(setError(settingsError));
      return rejectWithValue(settingsError);
    } finally {
      dispatch(setLoading(false));
    }
  }
);

/**
 * Update a single preference
 */
export const updateSinglePreference = createAsyncThunk(
  'settings/updateSinglePreference',
  async (
    { key, value }: { key: keyof AppPreferences; value: any },
    { dispatch, rejectWithValue }
  ) => {
    try {
      await SettingsService.updatePreference(key, value);
      
      // Reload preferences to get the complete updated state
      const updatedPreferences = await SettingsService.getPreferences();
      dispatch(setPreferences(updatedPreferences));
      
      return { key, value, preferences: updatedPreferences };
    } catch (error) {
      const settingsError: SettingsError = {
        field: key as string,
        message: error instanceof Error ? error.message : `Failed to update ${key}`,
        type: 'storage',
      };
      
      dispatch(setError(settingsError));
      return rejectWithValue(settingsError);
    }
  }
);

/**
 * Reset preferences to defaults
 */
export const resetPreferencesToDefaults = createAsyncThunk(
  'settings/resetToDefaults',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setLoading(true));
      
      await SettingsService.resetToDefaults();
      
      const defaultPreferences = await SettingsService.getPreferences();
      dispatch(setPreferences(defaultPreferences));
      
      return defaultPreferences;
    } catch (error) {
      const settingsError: SettingsError = {
        field: 'general',
        message: error instanceof Error ? error.message : 'Failed to reset preferences',
        type: 'storage',
      };
      
      dispatch(setError(settingsError));
      return rejectWithValue(settingsError);
    } finally {
      dispatch(setLoading(false));
    }
  }
);

/**
 * Load storage information
 */
export const loadStorageInfo = createAsyncThunk(
  'settings/loadStorageInfo',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const storageInfo = await SettingsService.getStorageInfo();
      dispatch(setStorageInfo(storageInfo));
      
      return storageInfo;
    } catch (error) {
      const settingsError: SettingsError = {
        field: 'storage',
        message: error instanceof Error ? error.message : 'Failed to load storage info',
        type: 'storage',
      };
      
      dispatch(setError(settingsError));
      return rejectWithValue(settingsError);
    }
  }
);

/**
 * Export preferences
 */
export const exportPreferences = createAsyncThunk(
  'settings/exportPreferences',
  async (_, { rejectWithValue }) => {
    try {
      const exportedData = await SettingsService.exportPreferences();
      return exportedData;
    } catch (error) {
      const settingsError: SettingsError = {
        field: 'export',
        message: error instanceof Error ? error.message : 'Failed to export preferences',
        type: 'storage',
      };
      
      return rejectWithValue(settingsError);
    }
  }
);

/**
 * Import preferences
 */
export const importPreferences = createAsyncThunk(
  'settings/importPreferences',
  async (preferencesJson: string, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setLoading(true));
      
      await SettingsService.importPreferences(preferencesJson);
      
      // Reload preferences to get the imported state
      const importedPreferences = await SettingsService.getPreferences();
      dispatch(setPreferences(importedPreferences));
      
      return importedPreferences;
    } catch (error) {
      const settingsError: SettingsError = {
        field: 'import',
        message: error instanceof Error ? error.message : 'Failed to import preferences',
        type: 'storage',
      };
      
      dispatch(setError(settingsError));
      return rejectWithValue(settingsError);
    } finally {
      dispatch(setLoading(false));
    }
  }
);

/**
 * Validate current preferences
 */
export const validatePreferences = createAsyncThunk(
  'settings/validatePreferences',
  async (preferences: AppPreferences, { dispatch, rejectWithValue }) => {
    try {
      const validation = SettingsService.validatePreferences(preferences);
      
      if (!validation.isValid) {
        const settingsError: SettingsError = {
          field: 'validation',
          message: validation.errors.join(', '),
          type: 'validation',
        };
        
        dispatch(setError(settingsError));
        return rejectWithValue(settingsError);
      }
      
      return validation;
    } catch (error) {
      const settingsError: SettingsError = {
        field: 'validation',
        message: error instanceof Error ? error.message : 'Validation failed',
        type: 'validation',
      };
      
      dispatch(setError(settingsError));
      return rejectWithValue(settingsError);
    }
  }
);

/**
 * Check if preferences have been customized
 */
export const checkCustomPreferences = createAsyncThunk(
  'settings/checkCustomPreferences',
  async (_, { rejectWithValue }) => {
    try {
      const hasCustom = await SettingsService.hasCustomPreferences();
      return hasCustom;
    } catch (error) {
      const settingsError: SettingsError = {
        field: 'general',
        message: error instanceof Error ? error.message : 'Failed to check custom preferences',
        type: 'storage',
      };
      
      return rejectWithValue(settingsError);
    }
  }
);