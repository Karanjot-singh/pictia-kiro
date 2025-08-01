import AsyncStorage from '@react-native-async-storage/async-storage';
import { SettingsService } from '../SettingsService';
import { AppPreferences } from '@/types';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('SettingsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPreferences', () => {
    it('should return default preferences when none exist', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();

      const preferences = await SettingsService.getPreferences();

      expect(preferences).toEqual(
        expect.objectContaining({
          theme: 'system',
          language: 'en',
          autoBackupEnabled: true,
          highQualityUploads: true,
          wifiOnlyUploads: true,
          showOnboardingTips: true,
          enableAnalytics: false,
          enableCrashReporting: false,
          maxCacheSize: 500,
          undoTimeoutSeconds: 5,
          gestureThreshold: 0.3,
          hapticFeedbackEnabled: true,
        })
      );

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'app_preferences',
        expect.stringContaining('"theme":"system"')
      );
    });

    it('should return stored preferences when they exist', async () => {
      const storedPreferences = {
        theme: 'dark',
        language: 'es',
        autoBackupEnabled: false,
        highQualityUploads: false,
        wifiOnlyUploads: false,
        showOnboardingTips: false,
        enableAnalytics: true,
        enableCrashReporting: true,
        maxCacheSize: 1000,
        undoTimeoutSeconds: 10,
        gestureThreshold: 0.5,
        hapticFeedbackEnabled: false,
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedPreferences));

      const preferences = await SettingsService.getPreferences();

      expect(preferences).toEqual(expect.objectContaining(storedPreferences));
    });

    it('should merge stored preferences with defaults for new fields', async () => {
      const partialStoredPreferences = {
        theme: 'dark',
        language: 'es',
        autoBackupEnabled: false,
        // Missing newer fields
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(partialStoredPreferences));

      const preferences = await SettingsService.getPreferences();

      expect(preferences).toEqual(
        expect.objectContaining({
          theme: 'dark',
          language: 'es',
          autoBackupEnabled: false,
          // Should have defaults for missing fields
          highQualityUploads: true,
          wifiOnlyUploads: true,
          showOnboardingTips: true,
          enableAnalytics: false,
          enableCrashReporting: false,
          maxCacheSize: 500,
          undoTimeoutSeconds: 5,
          gestureThreshold: 0.3,
          hapticFeedbackEnabled: true,
        })
      );
    });

    it('should return defaults when storage throws error', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const preferences = await SettingsService.getPreferences();

      expect(preferences).toEqual(
        expect.objectContaining({
          theme: 'system',
          language: 'en',
          autoBackupEnabled: true,
        })
      );
    });
  });

  describe('setPreferences', () => {
    it('should save valid preferences', async () => {
      const currentPreferences: AppPreferences = {
        theme: 'system',
        language: 'en',
        autoBackupEnabled: true,
        highQualityUploads: true,
        wifiOnlyUploads: true,
        showOnboardingTips: true,
        enableAnalytics: false,
        enableCrashReporting: false,
        maxCacheSize: 500,
        undoTimeoutSeconds: 5,
        gestureThreshold: 0.3,
        hapticFeedbackEnabled: true,
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(currentPreferences));
      mockAsyncStorage.setItem.mockResolvedValue();

      const updates = { theme: 'dark' as const, maxCacheSize: 1000 };

      await SettingsService.setPreferences(updates);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'app_preferences',
        expect.stringContaining('"theme":"dark"')
      );
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'app_preferences',
        expect.stringContaining('"maxCacheSize":1000')
      );
    });

    it('should reject invalid preferences', async () => {
      const currentPreferences: AppPreferences = {
        theme: 'system',
        language: 'en',
        autoBackupEnabled: true,
        highQualityUploads: true,
        wifiOnlyUploads: true,
        showOnboardingTips: true,
        enableAnalytics: false,
        enableCrashReporting: false,
        maxCacheSize: 500,
        undoTimeoutSeconds: 5,
        gestureThreshold: 0.3,
        hapticFeedbackEnabled: true,
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(currentPreferences));

      const invalidUpdates = { maxCacheSize: 5000 }; // Too large

      await expect(SettingsService.setPreferences(invalidUpdates)).rejects.toThrow(
        'Invalid preferences'
      );

      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('updatePreference', () => {
    it('should update a single preference', async () => {
      const currentPreferences: AppPreferences = {
        theme: 'system',
        language: 'en',
        autoBackupEnabled: true,
        highQualityUploads: true,
        wifiOnlyUploads: true,
        showOnboardingTips: true,
        enableAnalytics: false,
        enableCrashReporting: false,
        maxCacheSize: 500,
        undoTimeoutSeconds: 5,
        gestureThreshold: 0.3,
        hapticFeedbackEnabled: true,
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(currentPreferences));
      mockAsyncStorage.setItem.mockResolvedValue();

      await SettingsService.updatePreference('theme', 'dark');

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'app_preferences',
        expect.stringContaining('"theme":"dark"')
      );
    });
  });

  describe('validatePreferences', () => {
    it('should validate correct preferences', () => {
      const validPreferences: AppPreferences = {
        theme: 'system',
        language: 'en',
        autoBackupEnabled: true,
        highQualityUploads: true,
        wifiOnlyUploads: true,
        showOnboardingTips: true,
        enableAnalytics: false,
        enableCrashReporting: false,
        maxCacheSize: 500,
        undoTimeoutSeconds: 5,
        gestureThreshold: 0.3,
        hapticFeedbackEnabled: true,
      };

      const result = SettingsService.validatePreferences(validPreferences);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid theme', () => {
      const invalidPreferences = {
        theme: 'invalid',
        language: 'en',
        autoBackupEnabled: true,
        highQualityUploads: true,
        wifiOnlyUploads: true,
        showOnboardingTips: true,
        enableAnalytics: false,
        enableCrashReporting: false,
        maxCacheSize: 500,
        undoTimeoutSeconds: 5,
        gestureThreshold: 0.3,
        hapticFeedbackEnabled: true,
      } as any;

      const result = SettingsService.validatePreferences(invalidPreferences);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Theme must be "light", "dark", or "system"');
    });

    it('should reject invalid cache size', () => {
      const invalidPreferences: AppPreferences = {
        theme: 'system',
        language: 'en',
        autoBackupEnabled: true,
        highQualityUploads: true,
        wifiOnlyUploads: true,
        showOnboardingTips: true,
        enableAnalytics: false,
        enableCrashReporting: false,
        maxCacheSize: 5000, // Too large
        undoTimeoutSeconds: 5,
        gestureThreshold: 0.3,
        hapticFeedbackEnabled: true,
      };

      const result = SettingsService.validatePreferences(invalidPreferences);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cache size must be between 50MB and 2000MB');
    });

    it('should provide warnings for potentially problematic settings', () => {
      const preferences: AppPreferences = {
        theme: 'system',
        language: 'en',
        autoBackupEnabled: true,
        highQualityUploads: true,
        wifiOnlyUploads: false, // This should trigger a warning
        showOnboardingTips: true,
        enableAnalytics: false,
        enableCrashReporting: false,
        maxCacheSize: 500,
        undoTimeoutSeconds: 5,
        gestureThreshold: 0.3,
        hapticFeedbackEnabled: true,
      };

      const result = SettingsService.validatePreferences(preferences);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        'High quality uploads over cellular data may use significant bandwidth'
      );
    });
  });

  describe('resetToDefaults', () => {
    it('should reset preferences to defaults', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('{}');
      mockAsyncStorage.setItem.mockResolvedValue();

      await SettingsService.resetToDefaults();

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'app_preferences',
        expect.stringContaining('"theme":"system"')
      );
    });
  });

  describe('getStorageInfo', () => {
    it('should return storage information', async () => {
      const mockPreferences = JSON.stringify({ theme: 'system' });
      mockAsyncStorage.getItem.mockResolvedValue(mockPreferences);
      mockAsyncStorage.getAllKeys.mockResolvedValue(['app_preferences', 'other_key']);
      
      // Mock getItem for different keys
      mockAsyncStorage.getItem
        .mockResolvedValueOnce(mockPreferences) // First call for preferences
        .mockResolvedValueOnce(mockPreferences) // Second call for preferences in getAllKeys loop
        .mockResolvedValueOnce('other data'); // Third call for other_key

      const storageInfo = await SettingsService.getStorageInfo();

      expect(storageInfo).toEqual({
        preferencesSize: expect.any(Number),
        totalAppStorage: expect.any(Number),
      });
      expect(storageInfo.preferencesSize).toBeGreaterThan(0);
      expect(storageInfo.totalAppStorage).toBeGreaterThanOrEqual(storageInfo.preferencesSize);
    });
  });
});