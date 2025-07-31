// Export all services from this file
export { GoogleAuthService } from './AuthService';
export { MockAuthService, mockAuthService } from './MockAuthService';
export { GooglePhotosClient, createGooglePhotosClient } from './GooglePhotosClient';

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