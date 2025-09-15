/**
 * Specialized error state components for common error scenarios
 * Provides consistent error handling across the application
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ErrorDisplay } from './ErrorDisplay';
import ModernActionButton from './ModernActionButton';
import { THEME_COLORS, SPACING, BORDER_RADIUS, SHADOWS, TEXT_STYLES, TYPOGRAPHY } from '@/theme';

// Network error component
interface NetworkErrorProps {
  onRetry?: () => void;
  onGoOffline?: () => void;
  style?: ViewStyle;
  variant?: 'inline' | 'card' | 'fullscreen';
}

export const NetworkError: React.FC<NetworkErrorProps> = ({
  onRetry,
  onGoOffline,
  style,
  variant = 'card',
}) => {
  return (
    <ErrorDisplay
      error="Unable to connect to the internet. Please check your connection and try again."
      title="Connection Error"
      severity="error"
      variant={variant}
      onRetry={onRetry}
      style={style}
    />
  );
};

// Authentication error component
interface AuthErrorProps {
  onSignIn?: () => void;
  onRetry?: () => void;
  style?: ViewStyle;
  variant?: 'inline' | 'card' | 'fullscreen';
}

export const AuthError: React.FC<AuthErrorProps> = ({
  onSignIn,
  onRetry,
  style,
  variant = 'card',
}) => {
  return (
    <ErrorDisplay
      error="Your session has expired. Please sign in again to continue."
      title="Authentication Required"
      severity="warning"
      variant={variant}
      onRetry={onSignIn || onRetry}
      style={style}
    />
  );
};

// Permission error component
interface PermissionErrorProps {
  permissionType: 'photos' | 'camera' | 'notifications' | 'storage';
  onOpenSettings?: () => void;
  onDismiss?: () => void;
  style?: ViewStyle;
  variant?: 'inline' | 'card' | 'fullscreen';
}

export const PermissionError: React.FC<PermissionErrorProps> = ({
  permissionType,
  onOpenSettings,
  onDismiss,
  style,
  variant = 'card',
}) => {
  const permissionMessages = {
    photos: 'Photo library access is required to organize your photos. Please enable it in Settings.',
    camera: 'Camera access is required to take photos. Please enable it in Settings.',
    notifications: 'Notification permission is needed for backup reminders. Please enable it in Settings.',
    storage: 'Storage access is required to save your photos. Please enable it in Settings.',
  };

  return (
    <ErrorDisplay
      error={permissionMessages[permissionType]}
      title="Permission Required"
      severity="warning"
      variant={variant}
      onRetry={onOpenSettings}
      onDismiss={onDismiss}
      style={style}
    />
  );
};

// Upload error component
interface UploadErrorProps {
  fileName?: string;
  onRetry?: () => void;
  onSkip?: () => void;
  style?: ViewStyle;
  variant?: 'inline' | 'card' | 'fullscreen';
}

export const UploadError: React.FC<UploadErrorProps> = ({
  fileName,
  onRetry,
  onSkip,
  style,
  variant = 'inline',
}) => {
  const message = fileName 
    ? `Failed to upload "${fileName}". Please try again.`
    : 'Upload failed. Please check your connection and try again.';

  return (
    <ErrorDisplay
      error={message}
      title="Upload Failed"
      severity="error"
      variant={variant}
      onRetry={onRetry}
      onDismiss={onSkip}
      style={style}
    />
  );
};

// Backup error component
interface BackupErrorProps {
  onRetry?: () => void;
  onViewLogs?: () => void;
  style?: ViewStyle;
  variant?: 'inline' | 'card' | 'fullscreen';
}

export const BackupError: React.FC<BackupErrorProps> = ({
  onRetry,
  onViewLogs,
  style,
  variant = 'card',
}) => {
  return (
    <ErrorDisplay
      error="Backup process encountered an error. Your photos are safe, but the backup was not completed."
      title="Backup Failed"
      severity="error"
      variant={variant}
      onRetry={onRetry}
      onDismiss={onViewLogs}
      style={style}
    />
  );
};

// Sync error component
interface SyncErrorProps {
  onRetry?: () => void;
  onForceSync?: () => void;
  style?: ViewStyle;
  variant?: 'inline' | 'card' | 'fullscreen';
}

export const SyncError: React.FC<SyncErrorProps> = ({
  onRetry,
  onForceSync,
  style,
  variant = 'inline',
}) => {
  return (
    <ErrorDisplay
      error="Unable to sync with Google Photos. Some changes may not be reflected."
      title="Sync Error"
      severity="warning"
      variant={variant}
      onRetry={onRetry}
      onDismiss={onForceSync}
      style={style}
    />
  );
};

// Generic API error component
interface ApiErrorProps {
  error: Error | string;
  operation?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  style?: ViewStyle;
  variant?: 'inline' | 'card' | 'fullscreen';
}

export const ApiError: React.FC<ApiErrorProps> = ({
  error,
  operation = 'operation',
  onRetry,
  onDismiss,
  style,
  variant = 'card',
}) => {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const title = `${operation.charAt(0).toUpperCase() + operation.slice(1)} Failed`;

  return (
    <ErrorDisplay
      error={errorMessage}
      title={title}
      severity="error"
      variant={variant}
      onRetry={onRetry}
      onDismiss={onDismiss}
      style={style}
    />
  );
};

// Error boundary fallback component
interface ErrorBoundaryFallbackProps {
  error: Error;
  onReset?: () => void;
  onReportError?: (error: Error) => void;
  style?: ViewStyle;
}

export const ErrorBoundaryFallback: React.FC<ErrorBoundaryFallbackProps> = ({
  error,
  onReset,
  onReportError,
  style,
}) => {
  return (
    <View style={[styles.boundaryContainer, style]}>
      <View style={styles.boundaryContent}>
        <View style={styles.boundaryIconContainer}>
          <Ionicons
            name="bug-outline"
            size={64}
            color={THEME_COLORS.DANGER}
          />
        </View>
        
        <Text style={styles.boundaryTitle}>
          Oops! Something went wrong
        </Text>
        
        <Text style={styles.boundaryMessage}>
          The app encountered an unexpected error. Don't worry, your data is safe.
        </Text>
        
        <View style={styles.boundaryActions}>
          {onReset && (
            <ModernActionButton
              variant="primary"
              size="medium"
              shape="pill"
              text="Try Again"
              onPress={onReset}
              style={styles.boundaryPrimaryAction}
            />
          )}
          
          {onReportError && (
            <ModernActionButton
              variant="minimal"
              size="medium"
              shape="pill"
              text="Report Issue"
              onPress={() => onReportError(error)}
              style={styles.boundarySecondaryAction}
            />
          )}
        </View>
        
        {__DEV__ && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugTitle}>Debug Info:</Text>
            <Text style={styles.debugText}>{error.message}</Text>
            <Text style={styles.debugText}>{error.stack}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// Toast error notification
interface ErrorToastProps {
  message: string;
  visible: boolean;
  onDismiss?: () => void;
  duration?: number;
  severity?: 'error' | 'warning' | 'info';
}

export const ErrorToast: React.FC<ErrorToastProps> = ({
  message,
  visible,
  onDismiss,
  duration = 4000,
  severity = 'error',
}) => {
  React.useEffect(() => {
    if (visible && duration > 0) {
      const timer = setTimeout(() => {
        onDismiss?.();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onDismiss]);

  if (!visible) return null;

  return (
    <ErrorDisplay
      error={message}
      severity={severity}
      variant="toast"
      onDismiss={onDismiss}
      showAnimation={true}
    />
  );
};

const styles = StyleSheet.create({
  // Error boundary styles
  boundaryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME_COLORS.BACKGROUND_PRIMARY,
    paddingHorizontal: SPACING.XL,
  },

  boundaryContent: {
    alignItems: 'center',
    maxWidth: 320,
  },

  boundaryIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${THEME_COLORS.DANGER}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.XL,
    ...SHADOWS.CARD,
  },

  boundaryTitle: {
    ...TEXT_STYLES.heading,
    fontSize: TYPOGRAPHY.HEADING_MEDIUM,
    fontWeight: TYPOGRAPHY.WEIGHT_BOLD,
    color: THEME_COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: SPACING.MD,
  },

  boundaryMessage: {
    ...TEXT_STYLES.body,
    color: THEME_COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.LINE_HEIGHT_RELAXED * TYPOGRAPHY.BODY_LARGE,
    marginBottom: SPACING.XL,
  },

  boundaryActions: {
    alignItems: 'center',
    width: '100%',
  },

  boundaryPrimaryAction: {
    marginBottom: SPACING.MD,
    minWidth: 160,
  },

  boundarySecondaryAction: {
    minWidth: 140,
  },

  // Debug styles (development only)
  debugContainer: {
    marginTop: SPACING.XL,
    padding: SPACING.MD,
    backgroundColor: THEME_COLORS.LIGHT_GRAY,
    borderRadius: BORDER_RADIUS.SM,
    width: '100%',
  },

  debugTitle: {
    ...TEXT_STYLES.caption,
    fontWeight: TYPOGRAPHY.WEIGHT_SEMIBOLD,
    color: THEME_COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },

  debugText: {
    ...TEXT_STYLES.caption,
    color: THEME_COLORS.TEXT_SECONDARY,
    fontFamily: 'monospace',
    fontSize: 10,
  },
});

export default {
  NetworkError,
  AuthError,
  PermissionError,
  UploadError,
  BackupError,
  SyncError,
  ApiError,
  ErrorBoundaryFallback,
  ErrorToast,
};