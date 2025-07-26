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
