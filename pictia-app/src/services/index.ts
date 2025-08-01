// Export all services from this file
export { GoogleAuthService } from './AuthService';
export { MockAuthService, mockAuthService } from './MockAuthService';
export { GooglePhotosClient, createGooglePhotosClient } from './GooglePhotosClient';
export { NotificationService } from './NotificationService';
export { BackupService } from './BackupService';
export { BackupScheduler } from './BackupScheduler';
export { BackupLogger } from './BackupLogger';
export { SettingsService } from './SettingsService';
export type { 
  NotificationConfig, 
  BackupReminder, 
  NotificationPermissionStatus 
} from './NotificationService';
export type {
  BackupProgress,
  BackupQueueItem,
  BackupResult,
  BackupServiceConfig
} from './BackupService';
export type {
  ScheduledBackupInfo,
  BackupScheduleHistory
} from './BackupScheduler';
export type {
  BackupLogEntry,
  BackupErrorDetails,
  BackupStatistics
} from './BackupLogger';

// Create and export the appropriate auth service based on configuration
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
const isGoogleConfigured = GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'your_google_client_id_here';

let authService: any;

if (isGoogleConfigured) {
  const { authService: googleAuthService } = require('./AuthService');
  authService = googleAuthService;
} else {
  console.warn('⚠️  Google OAuth not configured, using mock authentication service');
  const { mockAuthService } = require('./MockAuthService');
  authService = mockAuthService;
}

export { authService };

// Service initialization utilities
export {
  serviceContainer,
  initializeServices,
  getBackupService,
  getBackupScheduler,
  getGooglePhotosClient,
  getNotificationService,
  updateServicesAccessToken,
  cleanupServices,
  areServicesInitialized
} from './serviceInitializer';