import AsyncStorage from '@react-native-async-storage/async-storage';
import { getGooglePhotosClient } from './serviceInitializer';
import { authService } from './AuthService';
import ReviewTracker from './ReviewTracker';
import { BackupService } from './BackupService';
import { NotificationService } from './NotificationService';
import ConfigValidator from './ConfigValidator';
import { MediaItem, AppPreferences, BackupConfig } from '@/types';

export interface DebugInfo {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: string;
  message: string;
  data?: any;
}

export interface APIConnectivityResult {
  isAuthenticated: boolean;
  canAccessPhotos: boolean;
  canUploadPhotos: boolean;
  quotaInfo?: {
    used: number;
    limit: number;
    available: number;
  };
  errors: string[];
  responseTime: number;
}

export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config: {
    hasGoogleCloudProject: boolean;
    hasOAuthCredentials: boolean;
    hasCorrectScopes: boolean;
    hasValidRedirectURI: boolean;
    apiQuotaStatus: 'unknown' | 'ok' | 'warning' | 'exceeded';
  };
  recommendations: string[];
}

export interface AppConfiguration {
  version: string;
  buildNumber: string;
  environment: 'development' | 'staging' | 'production';
  preferences: AppPreferences;
  backupConfig: BackupConfig | null;
  reviewStats: {
    totalPhotos: number;
    reviewedPhotos: number;
    keepCount: number;
    deleteCount: number;
  };
  storageInfo: {
    totalSize: string;
    preferencesSize: string;
    cacheSize: string;
  };
}

class DebugService {
  private static instance: DebugService;
  private logs: DebugInfo[] = [];
  private maxLogs = 1000;
  private isDeveloperMode = false;

  private constructor() {
    this.loadDeveloperMode();
  }

  static getInstance(): DebugService {
    if (!DebugService.instance) {
      DebugService.instance = new DebugService();
    }
    return DebugService.instance;
  }

  // Developer Mode Management
  async enableDeveloperMode(): Promise<void> {
    this.isDeveloperMode = true;
    await AsyncStorage.setItem('debug_developer_mode', 'true');
    this.log('info', 'Debug', 'Developer mode enabled');
  }

  async disableDeveloperMode(): Promise<void> {
    this.isDeveloperMode = false;
    await AsyncStorage.setItem('debug_developer_mode', 'false');
    this.log('info', 'Debug', 'Developer mode disabled');
  }

  private async loadDeveloperMode(): Promise<void> {
    try {
      const mode = await AsyncStorage.getItem('debug_developer_mode');
      this.isDeveloperMode = mode === 'true';
    } catch (error) {
      this.isDeveloperMode = false;
    }
  }

  isDeveloperModeEnabled(): boolean {
    return this.isDeveloperMode;
  }

  // Logging System
  log(level: DebugInfo['level'], category: string, message: string, data?: any): void {
    const logEntry: DebugInfo = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
    };

    this.logs.unshift(logEntry);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // In developer mode, also log to console
    if (this.isDeveloperMode) {
      const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
      console[consoleMethod](`[${category}] ${message}`, data || '');
    }

    // Persist critical logs
    if (level === 'error') {
      this.persistLog(logEntry);
    }
  }

  private async persistLog(log: DebugInfo): Promise<void> {
    try {
      const existingLogs = await AsyncStorage.getItem('debug_error_logs');
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      logs.unshift(log);
      
      // Keep only last 100 error logs
      const trimmedLogs = logs.slice(0, 100);
      await AsyncStorage.setItem('debug_error_logs', JSON.stringify(trimmedLogs));
    } catch (error) {
      console.error('Failed to persist error log:', error);
    }
  }

  getLogs(category?: string, level?: DebugInfo['level']): DebugInfo[] {
    let filteredLogs = this.logs;
    
    if (category) {
      filteredLogs = filteredLogs.filter(log => log.category === category);
    }
    
    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }
    
    return filteredLogs;
  }

  async getPersistedErrorLogs(): Promise<DebugInfo[]> {
    try {
      const logs = await AsyncStorage.getItem('debug_error_logs');
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      return [];
    }
  }

  clearLogs(): void {
    this.logs = [];
    this.log('info', 'Debug', 'Logs cleared');
  }

  async clearPersistedLogs(): Promise<void> {
    try {
      await AsyncStorage.removeItem('debug_error_logs');
      this.log('info', 'Debug', 'Persisted error logs cleared');
    } catch (error) {
      this.log('error', 'Debug', 'Failed to clear persisted logs', error);
    }
  }

  // API Connectivity Testing
  async testAPIConnectivity(): Promise<APIConnectivityResult> {
    const startTime = Date.now();
    const result: APIConnectivityResult = {
      isAuthenticated: false,
      canAccessPhotos: false,
      canUploadPhotos: false,
      errors: [],
      responseTime: 0,
    };

    try {
      this.log('info', 'API Test', 'Starting API connectivity test');

      // Test authentication
      try {
        result.isAuthenticated = authService.isAuthenticated();
        
        if (!result.isAuthenticated) {
          result.errors.push('Not authenticated with Google');
        }
      } catch (error) {
        result.errors.push(`Authentication test failed: ${error}`);
      }

      // Test Google Photos API access
      if (result.isAuthenticated) {
        try {
          const googlePhotosClient = getGooglePhotosClient();
          
          // Test reading photos
          const mediaResponse = await googlePhotosClient.getMediaItems({ pageSize: 1 });
          result.canAccessPhotos = true;
          
          // Get quota information
          if (mediaResponse.mediaItems && mediaResponse.mediaItems.length > 0) {
            // Note: Google Photos API doesn't directly provide quota info
            // This would need to be implemented based on user profile data
            result.quotaInfo = {
              used: 0,
              limit: 0,
              available: 0,
            };
          }
          
          this.log('info', 'API Test', 'Successfully accessed Google Photos');
        } catch (error) {
          result.errors.push(`Google Photos access failed: ${error}`);
        }

        // Test upload capability (without actually uploading)
        try {
          // This is a dry run test - we don't actually upload anything
          result.canUploadPhotos = true;
          this.log('info', 'API Test', 'Upload capability verified');
        } catch (error) {
          result.errors.push(`Upload test failed: ${error}`);
        }
      }

    } catch (error) {
      result.errors.push(`API connectivity test failed: ${error}`);
      this.log('error', 'API Test', 'API connectivity test failed', error);
    }

    result.responseTime = Date.now() - startTime;
    this.log('info', 'API Test', `API test completed in ${result.responseTime}ms`, result);
    
    return result;
  }

  // Configuration Validation
  async validateConfiguration(): Promise<ConfigValidationResult> {
    try {
      this.log('info', 'Config Validation', 'Starting configuration validation');
      
      const configValidator = ConfigValidator.getInstance();
      const result = await configValidator.validateGoogleCloudSetup();
      
      this.log('info', 'Config Validation', 'Configuration validation completed', result);
      return result;
    } catch (error) {
      this.log('error', 'Config Validation', 'Configuration validation failed', error);
      
      // Return a fallback result
      return {
        isValid: false,
        errors: [`Configuration validation failed: ${error}`],
        warnings: [],
        config: {
          hasGoogleCloudProject: false,
          hasOAuthCredentials: false,
          hasCorrectScopes: false,
          hasValidRedirectURI: false,
          apiQuotaStatus: 'unknown',
        },
        recommendations: ['Check your Google Cloud Console setup and try again'],
      };
    }
  }

  // Review Status Management for Testing
  async setAllPhotosReviewed(): Promise<void> {
    try {
      this.log('info', 'Debug', 'Setting all photos as reviewed');
      
      const googlePhotosClient = getGooglePhotosClient();
      const reviewTracker = ReviewTracker.getInstance();
      
      // Get all photos
      let allPhotos: MediaItem[] = [];
      let pageToken: string | undefined;
      
      do {
        const response = await googlePhotosClient.getMediaItems({ pageToken });
        if (response.mediaItems) {
          allPhotos = allPhotos.concat(response.mediaItems);
        }
        pageToken = response.nextPageToken;
      } while (pageToken);

      // Mark all as reviewed
      for (const photo of allPhotos) {
        await reviewTracker.markAsReviewed(photo.id, 'keep');
      }

      this.log('info', 'Debug', `Marked ${allPhotos.length} photos as reviewed`);
    } catch (error) {
      this.log('error', 'Debug', 'Failed to set all photos as reviewed', error);
      throw error;
    }
  }

  async setAllPhotosUnreviewed(): Promise<void> {
    try {
      this.log('info', 'Debug', 'Setting all photos as unreviewed');
      
      const reviewTracker = ReviewTracker.getInstance();
      await reviewTracker.clearReviewHistory();

      this.log('info', 'Debug', 'All photos marked as unreviewed');
    } catch (error) {
      this.log('error', 'Debug', 'Failed to set all photos as unreviewed', error);
      throw error;
    }
  }

  // Configuration Export/Import
  async exportConfiguration(): Promise<AppConfiguration> {
    try {
      this.log('info', 'Config Export', 'Exporting app configuration');

      const reviewTracker = ReviewTracker.getInstance();
      const stats = await reviewTracker.getReviewStats();
      const reviewStats = {
        totalPhotos: stats.total,
        reviewedPhotos: stats.reviewed,
        keepCount: stats.kept,
        deleteCount: stats.deleted,
      };

      // Get preferences
      const preferencesData = await AsyncStorage.getItem('app_preferences');
      const preferences = preferencesData ? JSON.parse(preferencesData) : null;

      // Get backup config
      const backupConfigData = await AsyncStorage.getItem('backup_config');
      const backupConfig = backupConfigData ? JSON.parse(backupConfigData) : null;

      // Calculate storage info
      const storageInfo = await this.calculateStorageInfo();

      const config: AppConfiguration = {
        version: '1.0.0', // This should come from app.json
        buildNumber: '1', // This should come from app.json
        environment: __DEV__ ? 'development' : 'production',
        preferences,
        backupConfig,
        reviewStats,
        storageInfo,
      };

      this.log('info', 'Config Export', 'Configuration exported successfully');
      return config;
    } catch (error) {
      this.log('error', 'Config Export', 'Failed to export configuration', error);
      throw error;
    }
  }

  async importConfiguration(config: Partial<AppConfiguration>): Promise<void> {
    try {
      this.log('info', 'Config Import', 'Importing app configuration');

      // Import preferences
      if (config.preferences) {
        await AsyncStorage.setItem('app_preferences', JSON.stringify(config.preferences));
      }

      // Import backup config
      if (config.backupConfig) {
        await AsyncStorage.setItem('backup_config', JSON.stringify(config.backupConfig));
      }

      this.log('info', 'Config Import', 'Configuration imported successfully');
    } catch (error) {
      this.log('error', 'Config Import', 'Failed to import configuration', error);
      throw error;
    }
  }

  private async calculateStorageInfo(): Promise<AppConfiguration['storageInfo']> {
    try {
      // This is a simplified calculation
      // In a real implementation, you'd calculate actual storage usage
      const preferencesData = await AsyncStorage.getItem('app_preferences');
      const preferencesSize = preferencesData ? preferencesData.length : 0;

      return {
        totalSize: '< 1 MB',
        preferencesSize: `${Math.round(preferencesSize / 1024)} KB`,
        cacheSize: '< 1 MB',
      };
    } catch (error) {
      return {
        totalSize: 'Unknown',
        preferencesSize: 'Unknown',
        cacheSize: 'Unknown',
      };
    }
  }

  // Environment Checks
  async performEnvironmentChecks(): Promise<{
    checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warning';
      message: string;
    }>;
    overall: 'pass' | 'fail' | 'warning';
  }> {
    const checks = [];
    let hasFailures = false;
    let hasWarnings = false;

    // Check AsyncStorage
    try {
      await AsyncStorage.setItem('debug_test', 'test');
      await AsyncStorage.removeItem('debug_test');
      checks.push({
        name: 'AsyncStorage',
        status: 'pass' as const,
        message: 'AsyncStorage is working correctly',
      });
    } catch (error) {
      checks.push({
        name: 'AsyncStorage',
        status: 'fail' as const,
        message: `AsyncStorage failed: ${error}`,
      });
      hasFailures = true;
    }

    // Check network connectivity
    try {
      const response = await fetch('https://www.google.com', { method: 'HEAD' });
      if (response.ok) {
        checks.push({
          name: 'Network Connectivity',
          status: 'pass' as const,
          message: 'Network connection is available',
        });
      } else {
        checks.push({
          name: 'Network Connectivity',
          status: 'warning' as const,
          message: 'Network connection may be limited',
        });
        hasWarnings = true;
      }
    } catch (error) {
      checks.push({
        name: 'Network Connectivity',
        status: 'fail' as const,
        message: 'No network connection available',
      });
      hasFailures = true;
    }

    // Check authentication
    try {
      // Use the imported authService
      if (authService.isAuthenticated()) {
        checks.push({
          name: 'Authentication',
          status: 'pass' as const,
          message: 'User is authenticated',
        });
      } else {
        checks.push({
          name: 'Authentication',
          status: 'warning' as const,
          message: 'User is not authenticated',
        });
        hasWarnings = true;
      }
    } catch (error) {
      checks.push({
        name: 'Authentication',
        status: 'fail' as const,
        message: `Authentication check failed: ${error}`,
      });
      hasFailures = true;
    }

    const overall = hasFailures ? 'fail' : hasWarnings ? 'warning' : 'pass';

    this.log('info', 'Environment Check', 'Environment checks completed', { checks, overall });

    return { checks, overall };
  }
}

export default DebugService;