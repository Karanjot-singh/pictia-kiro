// Common type definitions for the application

// Re-export Google Photos types
export * from './googlePhotos';
export type { CachedMediaItem } from './googlePhotos';

// Authentication types
export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserProfile;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  profilePictureUrl?: string;
  quotaUsed: number;
  quotaLimit: number;
}

// Authentication service interface
export interface AuthService {
  authenticate(): Promise<AuthResult>;
  refreshToken(): Promise<string>;
  logout(): Promise<void>;
  isAuthenticated(): boolean;
}

// Authentication error types
export enum AuthErrorType {
  INVALID_CREDENTIALS = 'invalid_credentials',
  TOKEN_EXPIRED = 'token_expired',
  NETWORK_ERROR = 'network_error',
  PERMISSION_DENIED = 'permission_denied',
  INVALID_REDIRECT_URI = 'invalid_redirect_uri',
  SCOPE_INSUFFICIENT = 'scope_insufficient',
  USER_CANCELLED = 'user_cancelled',
  UNKNOWN_ERROR = 'unknown_error'
}

// Serializable auth error for Redux state
export interface AuthError {
  type: AuthErrorType;
  message: string;
  timestamp: number;
}

// Authentication state types
export interface AuthState {
  isAuthenticated: boolean;
  isLocalMode: boolean; // New field for local-only mode
  isLoading: boolean;
  user: UserProfile | null;
  accessToken: string | null;
  error: AuthError | null;
}

// Organization types
export type SwipeAction = 'keep' | 'delete';

export interface MediaOrganization {
  mediaItemId: string;
  action: SwipeAction;
  timestamp: Date;
  undoExpiry?: Date;
}

// Backup types
export interface BackupConfig {
  frequency: 'weekly' | 'monthly';
  dayOfMonth?: number;
  dayOfWeek?: number;
  notificationEnabled: boolean;
  notificationOffset: number; // hours before backup
}

export interface BackupLog {
  id: string;
  type: 'scheduled' | 'manual';
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  itemsUploaded: number;
  totalItems: number;
  errorMessage?: string;
}

export interface BackupProgress {
  backupId: string;
  currentItem: number;
  totalItems: number;
  currentFileName: string;
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
  estimatedTimeRemaining?: number;
  uploadSpeed?: number; // bytes per second
}

// Upload types
export interface MediaPickerResult {
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
}

export interface UploadItem {
  id: string;
  file: MediaPickerResult;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number;
  uploadToken?: string;
  error?: string;
  mediaItem?: any; // MediaItem from Google Photos API
}

export interface UploadSession {
  id: string;
  items: UploadItem[];
  startTime: Date;
  endTime?: Date;
  totalItems: number;
  completedItems: number;
  failedItems: number;
}

// App preferences types
export interface AppPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  autoBackupEnabled: boolean;
  highQualityUploads: boolean;
  wifiOnlyUploads: boolean;
  showOnboardingTips: boolean;
  enableAnalytics: boolean;
  enableCrashReporting: boolean;
  maxCacheSize: number; // in MB
  undoTimeoutSeconds: number;
  gestureThreshold: number;
  hapticFeedbackEnabled: boolean;
}

export interface SettingsValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SettingsError {
  field: string;
  message: string;
  type: 'validation' | 'storage' | 'network';
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  AuthLoading: undefined;
};

export type MainTabParamList = {
  Organise: undefined;
  Organize: undefined;
  Backup: undefined;
  Upload: undefined;
  Settings: undefined;
  Debug: undefined;
  BackupSettings: undefined;
};

export type OrganiseStackParamList = {
  Gallery: undefined;
  SwipeMode: {
    startingPhotoId?: string;
    startMode?: 'gallery' | 'natural';
  };
};
