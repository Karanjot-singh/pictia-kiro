import { AuthResult, AuthService, UserProfile, AuthError, AuthErrorType } from '@/types';
import { createAuthError } from '@/utils/authErrors';
import { delay } from '@/utils';

/**
 * Mock authentication service for development/testing
 * Use this when Google OAuth is not configured
 */
export class MockAuthService implements AuthService {
  private mockUser: UserProfile = {
    id: 'mock-user-123',
    email: 'test@example.com',
    name: 'Test User',
    profilePictureUrl: 'https://via.placeholder.com/150',
    quotaUsed: 5 * 1024 * 1024 * 1024, // 5GB
    quotaLimit: 15 * 1024 * 1024 * 1024, // 15GB
  };

  private mockAccessToken = 'mock-access-token-12345';
  private isAuthenticatedState = false;

  async authenticate(): Promise<AuthResult> {
    // Simulate network delay
    await delay(1500);

    // Simulate random authentication failure for testing
    if (Math.random() < 0.1) {
      throw createAuthError(
        AuthErrorType.NETWORK_ERROR,
        'Mock network error for testing'
      );
    }

    this.isAuthenticatedState = true;

    return {
      accessToken: this.mockAccessToken,
      refreshToken: 'mock-refresh-token-12345',
      expiresIn: 3600,
      user: this.mockUser,
    };
  }

  async refreshToken(): Promise<string> {
    await delay(500);
    
    // Simulate occasional refresh failure
    if (Math.random() < 0.05) {
      throw createAuthError(
        AuthErrorType.TOKEN_EXPIRED,
        'Mock token refresh failure'
      );
    }

    return 'mock-refreshed-access-token-67890';
  }

  async logout(): Promise<void> {
    await delay(300);
    this.isAuthenticatedState = false;
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedState;
  }

  async validateStoredTokens(): Promise<boolean> {
    await delay(800);
    return this.isAuthenticatedState;
  }

  async getStoredUserProfile(): Promise<UserProfile | null> {
    return this.isAuthenticatedState ? this.mockUser : null;
  }

  async getStoredAccessToken(): Promise<string | null> {
    return this.isAuthenticatedState ? this.mockAccessToken : null;
  }
}

export const mockAuthService = new MockAuthService();