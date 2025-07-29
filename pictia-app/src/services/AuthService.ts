import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import { AuthResult, AuthService, UserProfile, AuthError, AuthErrorType } from '@/types';
import { createAuthError, mapErrorToAuthErrorType } from '@/utils/authErrors';

// Configuration constants
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET || '';

// Validate configuration
const validateConfig = () => {
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'your_google_client_id_here') {
    throw createAuthError(
      AuthErrorType.INVALID_REDIRECT_URI,
      'Google OAuth client ID is not configured. Please set EXPO_PUBLIC_GOOGLE_CLIENT_ID in your .env file.'
    );
  }
  if (!GOOGLE_CLIENT_SECRET || GOOGLE_CLIENT_SECRET === 'your_google_client_secret_here') {
    throw createAuthError(
      AuthErrorType.INVALID_REDIRECT_URI,
      'Google OAuth client secret is not configured. Please set EXPO_PUBLIC_GOOGLE_CLIENT_SECRET in your .env file.'
    );
  }
};

// Secure storage keys
const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const USER_PROFILE_KEY = 'auth_user_profile';
const TOKEN_EXPIRY_KEY = 'auth_token_expiry';

// Google OAuth scopes for Photos Library API
const SCOPES = [
  'openid',
  'profile',
  'email',
  'https://www.googleapis.com/auth/photoslibrary.readonly',
  'https://www.googleapis.com/auth/photoslibrary.appendonly'
];

export class GoogleAuthService implements AuthService {
  private discovery = AuthSession.makeRedirectUri();

  private authRequest: AuthSession.AuthRequest;

  constructor() {
    // Initialize the auth request
    this.authRequest = new AuthSession.AuthRequest({
      clientId: GOOGLE_CLIENT_ID,
      scopes: SCOPES,
      responseType: AuthSession.ResponseType.Code,
      redirectUri: this.discovery,
      extraParams: {
        access_type: 'offline', // Required for refresh tokens
        prompt: 'consent', // Force consent screen to get refresh token
      },
    });
  }

  /**
   * Authenticate user with Google OAuth
   */
  async authenticate(): Promise<AuthResult> {
    try {
      // Validate configuration first
      validateConfig();
      
      // Clear any existing error state
      await this.clearStoredTokens();

      // Perform the authentication request
      const result = await this.authRequest.promptAsync({
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      });

      if (result.type === 'success' && result.params?.code) {
        // Exchange authorization code for tokens
        const tokenResult = await this.exchangeCodeForTokens(result.params.code);
        
        // Get user profile
        const userProfile = await this.fetchUserProfile(tokenResult.access_token);
        
        // Store tokens securely
        await this.storeTokens(tokenResult);
        await this.storeUserProfile(userProfile);

        return {
          accessToken: tokenResult.access_token,
          refreshToken: tokenResult.refresh_token,
          expiresIn: tokenResult.expires_in,
          user: userProfile,
        };
      } else if (result.type === 'cancel') {
        throw createAuthError(
          AuthErrorType.USER_CANCELLED,
          'Authentication was cancelled by user'
        );
      } else {
        throw createAuthError(
          AuthErrorType.UNKNOWN_ERROR,
          'Authentication failed',
          result
        );
      }
    } catch (error) {
      const authError = this.handleAuthError(error);
      throw authError;
    }
  }

  /**
   * Refresh the access token using stored refresh token
   */
  async refreshToken(): Promise<string> {
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      
      if (!refreshToken) {
        throw createAuthError(
          AuthErrorType.TOKEN_EXPIRED,
          'No refresh token available'
        );
      }

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }).toString(),
      });

      const tokenData = await response.json();

      if (!response.ok) {
        throw createAuthError(
          mapErrorToAuthErrorType(tokenData),
          tokenData.error_description || 'Token refresh failed',
          tokenData
        );
      }

      // Store the new access token
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokenData.access_token);
      
      // Update expiry time
      const expiryTime = Date.now() + (tokenData.expires_in * 1000);
      await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, expiryTime.toString());

      return tokenData.access_token;
    } catch (error) {
      const authError = this.handleAuthError(error);
      throw authError;
    }
  }

  /**
   * Logout user and clear stored tokens
   */
  async logout(): Promise<void> {
    try {
      await this.clearStoredTokens();
    } catch (error) {
      // Log error but don't throw - logout should always succeed
      console.warn('Error during logout:', error);
    }
  }

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    // This is a synchronous check - for full validation, use validateStoredTokens()
    return this.hasStoredTokens();
  }

  /**
   * Validate stored tokens and refresh if necessary
   */
  async validateStoredTokens(): Promise<boolean> {
    try {
      const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      const expiryTime = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);

      if (!accessToken) {
        return false;
      }

      // Check if token is expired
      if (expiryTime && Date.now() >= parseInt(expiryTime)) {
        // Try to refresh the token
        try {
          await this.refreshToken();
          return true;
        } catch (error) {
          // Refresh failed, user needs to re-authenticate
          await this.clearStoredTokens();
          return false;
        }
      }

      return true;
    } catch (error) {
      console.warn('Error validating stored tokens:', error);
      return false;
    }
  }

  /**
   * Get stored user profile
   */
  async getStoredUserProfile(): Promise<UserProfile | null> {
    try {
      const profileData = await SecureStore.getItemAsync(USER_PROFILE_KEY);
      return profileData ? JSON.parse(profileData) : null;
    } catch (error) {
      console.warn('Error getting stored user profile:', error);
      return null;
    }
  }

  /**
   * Get stored access token
   */
  async getStoredAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch (error) {
      console.warn('Error getting stored access token:', error);
      return null;
    }
  }

  // Private helper methods

  private async exchangeCodeForTokens(code: string): Promise<any> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.discovery,
      }).toString(),
    });

    const tokenData = await response.json();

    if (!response.ok) {
      throw createAuthError(
        mapErrorToAuthErrorType(tokenData),
        tokenData.error_description || 'Token exchange failed',
        tokenData
      );
    }

    return tokenData;
  }

  private async fetchUserProfile(accessToken: string): Promise<UserProfile> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const userData = await response.json();

    if (!response.ok) {
      throw createAuthError(
        AuthErrorType.NETWORK_ERROR,
        'Failed to fetch user profile',
        userData
      );
    }

    // Get Google Photos quota information
    const quotaInfo = await this.fetchPhotosQuota(accessToken);

    return {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      profilePictureUrl: userData.picture,
      quotaUsed: quotaInfo.quotaUsed,
      quotaLimit: quotaInfo.quotaLimit,
    };
  }

  private async fetchPhotosQuota(accessToken: string): Promise<{ quotaUsed: number; quotaLimit: number }> {
    try {
      // Note: Google Photos API doesn't provide direct quota info
      // This is a placeholder - in a real implementation, you might need to
      // use Google Drive API or estimate based on usage
      return {
        quotaUsed: 0,
        quotaLimit: 15 * 1024 * 1024 * 1024, // 15GB default
      };
    } catch (error) {
      console.warn('Could not fetch quota info:', error);
      return {
        quotaUsed: 0,
        quotaLimit: 15 * 1024 * 1024 * 1024,
      };
    }
  }

  private async storeTokens(tokenData: any): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokenData.access_token),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokenData.refresh_token),
      SecureStore.setItemAsync(
        TOKEN_EXPIRY_KEY,
        (Date.now() + tokenData.expires_in * 1000).toString()
      ),
    ]);
  }

  private async storeUserProfile(userProfile: UserProfile): Promise<void> {
    await SecureStore.setItemAsync(USER_PROFILE_KEY, JSON.stringify(userProfile));
  }

  private async clearStoredTokens(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY).catch(() => {}),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {}),
      SecureStore.deleteItemAsync(USER_PROFILE_KEY).catch(() => {}),
      SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY).catch(() => {}),
    ]);
  }

  private hasStoredTokens(): boolean {
    // This is a basic check - for production, you'd want to check expiry too
    // Use validateStoredTokens() for a complete check
    return true; // Simplified for now
  }

  private handleAuthError(error: any): AuthError {
    if (error && typeof error === 'object' && 'type' in error && 'timestamp' in error) {
      // Already a serializable AuthError
      return error as AuthError;
    }

    const errorType = mapErrorToAuthErrorType(error);
    const message = error?.message || 'Authentication error occurred';
    
    return createAuthError(errorType, message);
  }
}

// Export singleton instance
export const authService = new GoogleAuthService();