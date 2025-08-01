import { BackupService, BackupServiceConfig } from './BackupService';
import { BackupScheduler } from './BackupScheduler';
import { GooglePhotosClient, createGooglePhotosClient } from './GooglePhotosClient';
import { NotificationService } from './NotificationService';
import { setBackupServiceInstance } from '@/store/thunks/backupThunks';

/**
 * Service container for managing service instances and dependencies
 */
class ServiceContainer {
  private static instance: ServiceContainer;
  private backupService: BackupService | null = null;
  private backupScheduler: BackupScheduler | null = null;
  private googlePhotosClient: GooglePhotosClient | null = null;
  private notificationService: NotificationService | null = null;

  private constructor() {}

  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  /**
   * Initialize all services with proper dependencies
   */
  async initializeServices(accessToken: string, config?: Partial<BackupServiceConfig>): Promise<void> {
    try {
      // Initialize Google Photos client
      this.googlePhotosClient = createGooglePhotosClient(accessToken);

      // Initialize notification service
      this.notificationService = NotificationService.getInstance();

      // Initialize backup service with dependencies
      if (this.googlePhotosClient && this.notificationService) {
        this.backupService = new BackupService(
          this.googlePhotosClient,
          this.notificationService,
          config
        );

        // Initialize backup scheduler with dependencies
        this.backupScheduler = new BackupScheduler(
          this.backupService,
          this.notificationService
        );

        // Set the backup service instance for thunks
        setBackupServiceInstance(this.backupService);
      }

      console.log('✅ Services initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize services:', error);
      throw error;
    }
  }

  /**
   * Get backup service instance
   */
  getBackupService(): BackupService {
    if (!this.backupService) {
      throw new Error('BackupService not initialized. Call initializeServices first.');
    }
    return this.backupService;
  }

  /**
   * Get Google Photos client instance
   */
  getGooglePhotosClient(): GooglePhotosClient {
    if (!this.googlePhotosClient) {
      throw new Error('GooglePhotosClient not initialized. Call initializeServices first.');
    }
    return this.googlePhotosClient;
  }

  /**
   * Get notification service instance
   */
  getNotificationService(): NotificationService {
    if (!this.notificationService) {
      throw new Error('NotificationService not initialized. Call initializeServices first.');
    }
    return this.notificationService;
  }

  /**
   * Get backup scheduler instance
   */
  getBackupScheduler(): BackupScheduler {
    if (!this.backupScheduler) {
      throw new Error('BackupScheduler not initialized. Call initializeServices first.');
    }
    return this.backupScheduler;
  }

  /**
   * Update access token for all services
   */
  updateAccessToken(accessToken: string): void {
    if (this.googlePhotosClient) {
      // Update the client's access token
      this.googlePhotosClient.updateAccessToken(accessToken);
    }
  }

  /**
   * Clean up services (useful for logout)
   */
  cleanup(): void {
    this.backupService = null;
    this.backupScheduler = null;
    this.googlePhotosClient = null;
    this.notificationService = null;
    console.log('🧹 Services cleaned up');
  }

  /**
   * Check if services are initialized
   */
  isInitialized(): boolean {
    return !!(this.backupService && this.backupScheduler && this.googlePhotosClient && this.notificationService);
  }
}

// Export singleton instance
export const serviceContainer = ServiceContainer.getInstance();

/**
 * Initialize services with default configuration
 */
export const initializeServices = async (
  accessToken: string, 
  config?: Partial<BackupServiceConfig>
): Promise<void> => {
  const defaultConfig: Partial<BackupServiceConfig> = {
    maxRetries: 3,
    retryDelay: 5000,
    batchSize: 10,
    maxConcurrentUploads: 3,
    enableProgressTracking: true,
    enableNotifications: true,
    ...config
  };

  await serviceContainer.initializeServices(accessToken, defaultConfig);
};

/**
 * Get backup service instance
 */
export const getBackupService = (): BackupService => {
  return serviceContainer.getBackupService();
};

/**
 * Get Google Photos client instance
 */
export const getGooglePhotosClient = (): GooglePhotosClient => {
  return serviceContainer.getGooglePhotosClient();
};

/**
 * Get notification service instance
 */
export const getNotificationService = (): NotificationService => {
  return serviceContainer.getNotificationService();
};

/**
 * Get backup scheduler instance
 */
export const getBackupScheduler = (): BackupScheduler => {
  return serviceContainer.getBackupScheduler();
};

/**
 * Update access token for all services
 */
export const updateServicesAccessToken = (accessToken: string): void => {
  serviceContainer.updateAccessToken(accessToken);
};

/**
 * Clean up all services
 */
export const cleanupServices = (): void => {
  serviceContainer.cleanup();
};

/**
 * Check if services are initialized
 */
export const areServicesInitialized = (): boolean => {
  return serviceContainer.isInitialized();
};