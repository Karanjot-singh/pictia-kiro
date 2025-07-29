import { AuthError, AuthErrorType } from '@/types';

/**
 * Creates a standardized AuthError instance (serializable for Redux)
 */
export function createAuthError(
  type: AuthErrorType,
  message: string,
  originalError?: any
): AuthError {
  return {
    type,
    message,
    timestamp: Date.now(),
  };
}

/**
 * Maps common OAuth/API errors to AuthErrorType
 */
export function mapErrorToAuthErrorType(error: any): AuthErrorType {
  if (!error) return AuthErrorType.UNKNOWN_ERROR;

  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code || error.error;

  // OAuth specific errors
  if (errorCode === 'user_cancelled' || errorMessage.includes('user cancelled')) {
    return AuthErrorType.USER_CANCELLED;
  }

  if (errorCode === 'invalid_grant' || errorMessage.includes('invalid_grant')) {
    return AuthErrorType.TOKEN_EXPIRED;
  }

  if (errorCode === 'invalid_client' || errorMessage.includes('redirect_uri')) {
    return AuthErrorType.INVALID_REDIRECT_URI;
  }

  if (errorCode === 'insufficient_scope' || errorMessage.includes('scope')) {
    return AuthErrorType.SCOPE_INSUFFICIENT;
  }

  if (errorCode === 'access_denied' || errorMessage.includes('access_denied')) {
    return AuthErrorType.PERMISSION_DENIED;
  }

  // Network errors
  if (errorMessage.includes('network') || errorMessage.includes('connection')) {
    return AuthErrorType.NETWORK_ERROR;
  }

  // Invalid credentials
  if (errorCode === 'invalid_credentials' || errorMessage.includes('unauthorized')) {
    return AuthErrorType.INVALID_CREDENTIALS;
  }

  return AuthErrorType.UNKNOWN_ERROR;
}

/**
 * Gets user-friendly error messages for AuthErrorType
 */
export function getAuthErrorMessage(errorType: AuthErrorType): string {
  switch (errorType) {
    case AuthErrorType.INVALID_CREDENTIALS:
      return 'Invalid credentials. Please try signing in again.';
    case AuthErrorType.TOKEN_EXPIRED:
      return 'Your session has expired. Please sign in again.';
    case AuthErrorType.NETWORK_ERROR:
      return 'Network error. Please check your connection and try again.';
    case AuthErrorType.PERMISSION_DENIED:
      return 'Permission denied. Please ensure you grant the necessary permissions.';
    case AuthErrorType.INVALID_REDIRECT_URI:
      return 'Configuration error. Please contact support.';
    case AuthErrorType.SCOPE_INSUFFICIENT:
      return 'Insufficient permissions. Please contact support.';
    case AuthErrorType.USER_CANCELLED:
      return 'Sign in was cancelled.';
    case AuthErrorType.UNKNOWN_ERROR:
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}