// Common type definitions for the application

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
  isLoading: boolean;
  user: UserProfile | null;
  accessToken: string | null;
  error: AuthError | null;
}

// Media types
export interface MediaItem {
  id: string;
  filename: string;
  mimeType: string;
  baseUrl: string;
  mediaMetadata: MediaMetadata;
}

export interface MediaMetadata {
  creationTime: string;
  width: string;
  height: string;
  photo?: PhotoMetadata;
  video?: VideoMetadata;
}

export interface PhotoMetadata {
  cameraMake?: string;
  cameraModel?: string;
  focalLength?: number;
  apertureFNumber?: number;
  isoEquivalent?: number;
}

export interface VideoMetadata {
  fps?: number;
  status?: string;
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
  Organize: undefined;
  Backup: undefined;
  Upload: undefined;
  Settings: undefined;
};
