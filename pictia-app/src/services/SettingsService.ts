import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppPreferences, SettingsValidationResult, SettingsError } from '@/types';

/**
 * SettingsService handles app preferences storage, validation, and management
 */
export class SettingsService {
  private static readonly PREFERENCES_KEY = 'app_preferences';
  private static readonly PREFERENCES_VERSION = '1.0';
  
  // Default preferences
  private static readonly DEFAULT_PREFERENCES: AppPreferences = {
    theme: 'system',
    language: 'en',
    autoBackupEnabled: true,
    highQualityUploads: true,
    wifiOnlyUploads: true,
    showOnboardingTips: true,
    enableAnalytics: false,
    enableCrashReporting: false,
    maxCacheSize: 500, // 500MB
    undoTimeoutSeconds: 5,
    gestureThreshold: 0.3,
    hapticFeedbackEnabled: true,
  };

  /**
   * Get current app preferences
   */
  static async getPreferences(): Promise<AppPreferences> {
    try {
      const preferencesData = await AsyncStorage.getItem(this.PREFERENCES_KEY);
      
      if (!preferencesData) {
        // Return default preferences if none exist
        await this.setPreferences(this.DEFAULT_PREFERENCES);
        return { ...this.DEFAULT_PREFERENCES };
      }

      const stored = JSON.parse(preferencesData);
      
      // Merge with defaults to handle new preference fields
      const preferences = {
        ...this.DEFAULT_PREFERENCES,
        ...stored,
      };

      return preferences;
    } catch (error) {
      console.error('Failed to get preferences:', error);
      return { ...this.DEFAULT_PREFERENCES };
    }
  }

  /**
   * Set app preferences with validation
   */
  static async setPreferences(preferences: Partial<AppPreferences>): Promise<void> {
    try {
      const currentPreferences = await this.getPreferences();
      const updatedPreferences = {
        ...currentPreferences,
        ...preferences,
      };

      // Validate preferences
      const validation = this.validatePreferences(updatedPreferences);
      if (!validation.isValid) {
        throw new Error(`Invalid preferences: ${validation.errors.join(', ')}`);
      }

      // Add version info for future migrations
      const preferencesWithMeta = {
        ...updatedPreferences,
        _version: this.PREFERENCES_VERSION,
        _lastUpdated: new Date().toISOString(),
      };

      await AsyncStorage.setItem(
        this.PREFERENCES_KEY,
        JSON.stringify(preferencesWithMeta)
      );
    } catch (error) {
      console.error('Failed to set preferences:', error);
      throw error;
    }
  }

  /**
   * Update a single preference
   */
  static async updatePreference<K extends keyof AppPreferences>(
    key: K,
    value: AppPreferences[K]
  ): Promise<void> {
    const preferences = await this.getPreferences();
    await this.setPreferences({
      ...preferences,
      [key]: value,
    });
  }

  /**
   * Reset preferences to defaults
   */
  static async resetToDefaults(): Promise<void> {
    await this.setPreferences(this.DEFAULT_PREFERENCES);
  }

  /**
   * Validate preferences
   */
  static validatePreferences(preferences: AppPreferences): SettingsValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Theme validation
    if (!['light', 'dark', 'system'].includes(preferences.theme)) {
      errors.push('Theme must be "light", "dark", or "system"');
    }

    // Language validation (basic check)
    if (!preferences.language || preferences.language.length < 2) {
      errors.push('Language must be a valid language code');
    }

    // Cache size validation
    if (preferences.maxCacheSize < 50 || preferences.maxCacheSize > 2000) {
      errors.push('Cache size must be between 50MB and 2000MB');
    }

    // Undo timeout validation
    if (preferences.undoTimeoutSeconds < 1 || preferences.undoTimeoutSeconds > 30) {
      errors.push('Undo timeout must be between 1 and 30 seconds');
    }

    // Gesture threshold validation
    if (preferences.gestureThreshold < 0.1 || preferences.gestureThreshold > 1.0) {
      errors.push('Gesture threshold must be between 0.1 and 1.0');
    }

    // Warnings for potentially problematic settings
    if (!preferences.wifiOnlyUploads && preferences.highQualityUploads) {
      warnings.push('High quality uploads over cellular data may use significant bandwidth');
    }

    if (preferences.maxCacheSize > 1000) {
      warnings.push('Large cache size may impact device storage');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get storage usage information
   */
  static async getStorageInfo(): Promise<{
    preferencesSize: number;
    totalAppStorage: number;
    availableStorage?: number;
  }> {
    try {
      const preferencesData = await AsyncStorage.getItem(this.PREFERENCES_KEY);
      const preferencesSize = preferencesData ? new Blob([preferencesData]).size : 0;

      // Get all AsyncStorage keys for this app
      const allKeys = await AsyncStorage.getAllKeys();
      let totalAppStorage = 0;

      for (const key of allKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            totalAppStorage += new Blob([data]).size;
          }
        } catch (error) {
          // Skip keys that can't be read
          continue;
        }
      }

      return {
        preferencesSize,
        totalAppStorage,
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return {
        preferencesSize: 0,
        totalAppStorage: 0,
      };
    }
  }

  /**
   * Export preferences for backup/sharing
   */
  static async exportPreferences(): Promise<string> {
    try {
      const preferences = await this.getPreferences();
      return JSON.stringify(preferences, null, 2);
    } catch (error) {
      console.error('Failed to export preferences:', error);
      throw error;
    }
  }

  /**
   * Import preferences from backup
   */
  static async importPreferences(preferencesJson: string): Promise<void> {
    try {
      const preferences = JSON.parse(preferencesJson) as AppPreferences;
      
      // Validate imported preferences
      const validation = this.validatePreferences(preferences);
      if (!validation.isValid) {
        throw new Error(`Invalid imported preferences: ${validation.errors.join(', ')}`);
      }

      await this.setPreferences(preferences);
    } catch (error) {
      console.error('Failed to import preferences:', error);
      throw error;
    }
  }

  /**
   * Clear all preferences (for debugging/testing)
   */
  static async clearPreferences(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.PREFERENCES_KEY);
    } catch (error) {
      console.error('Failed to clear preferences:', error);
      throw error;
    }
  }

  /**
   * Get default preferences (useful for reset confirmation)
   */
  static getDefaultPreferences(): AppPreferences {
    return { ...this.DEFAULT_PREFERENCES };
  }

  /**
   * Check if preferences have been customized from defaults
   */
  static async hasCustomPreferences(): Promise<boolean> {
    try {
      const current = await this.getPreferences();
      const defaults = this.DEFAULT_PREFERENCES;
      
      // Compare each preference
      for (const key in defaults) {
        const prefKey = key as keyof AppPreferences;
        if (current[prefKey] !== defaults[prefKey]) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Failed to check custom preferences:', error);
      return false;
    }
  }

  /**
   * Migrate preferences from older versions
   */
  static async migratePreferences(): Promise<void> {
    try {
      const preferencesData = await AsyncStorage.getItem(this.PREFERENCES_KEY);
      
      if (!preferencesData) {
        return; // No preferences to migrate
      }

      const stored = JSON.parse(preferencesData);
      
      // Check if migration is needed
      if (stored._version === this.PREFERENCES_VERSION) {
        return; // Already current version
      }

      // Perform migration based on version
      // For now, just merge with current defaults
      const migrated = {
        ...this.DEFAULT_PREFERENCES,
        ...stored,
      };

      await this.setPreferences(migrated);
      
      console.log('Preferences migrated successfully');
    } catch (error) {
      console.error('Failed to migrate preferences:', error);
      // Don't throw - fallback to defaults
    }
  }
}