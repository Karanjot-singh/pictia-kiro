import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from './AuthService';
import { getGooglePhotosClient } from './serviceInitializer';
import DebugService from './DebugService';

export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config: {
    hasGoogleCloudProject: boolean;
    hasOAuthCredentials: boolean;
    hasCorrectScopes: boolean;
    hasValidRedirectURI: boolean;
    apiQuotaStatus: 'unknown' | 'ok' | 'warning' | 'exceeded';
  };
  recommendations: string[];
}

export interface QuotaStatus {
  requestsUsed: number;
  requestsLimit: number;
  quotaExceeded: boolean;
  resetTime?: Date;
}

class ConfigValidator {
  private static instance: ConfigValidator;
  private debugService: DebugService;

  private constructor() {
    this.debugService = DebugService.getInstance();
  }

  static getInstance(): ConfigValidator {
    if (!ConfigValidator.instance) {
      ConfigValidator.instance = new ConfigValidator();
    }
    return ConfigValidator.instance;
  }

  async validateGoogleCloudSetup(): Promise<ConfigValidationResult> {
    const result: ConfigValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      config: {
        hasGoogleCloudProject: false,
        hasOAuthCredentials: false,
        hasCorrectScopes: false,
        hasValidRedirectURI: false,
        apiQuotaStatus: 'unknown',
      },
      recommendations: [],
    };

    try {
      this.debugService.log('info', 'Config Validator', 'Starting Google Cloud setup validation');

      // Check environment variables
      const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
      if (!googleClientId || googleClientId === 'your_google_client_id_here') {
        result.errors.push('Google Client ID not configured in environment variables');
        result.recommendations.push('Set EXPO_PUBLIC_GOOGLE_CLIENT_ID in your .env file');
        result.isValid = false;
      }

      // Check OAuth credentials
      try {
        result.config.hasOAuthCredentials = authService.isAuthenticated();
        
        if (!result.config.hasOAuthCredentials) {
          result.warnings.push('User not authenticated - OAuth flow not completed');
          result.recommendations.push('Complete Google authentication to test full setup');
        }
      } catch (error) {
        result.errors.push(`OAuth credentials check failed: ${error}`);
        result.isValid = false;
      }

      // Test Google Photos API access
      if (result.config.hasOAuthCredentials) {
        try {
          const googlePhotosClient = getGooglePhotosClient();
          const testResponse = await googlePhotosClient.getMediaItems({ pageSize: 1 });
          
          result.config.hasGoogleCloudProject = true;
          result.config.hasCorrectScopes = true;
          result.config.hasValidRedirectURI = true;
          
          this.debugService.log('info', 'Config Validator', 'Google Photos API access successful');
        } catch (error: any) {
          if (error.message?.includes('403')) {
            result.errors.push('Google Photos Library API not enabled in Google Cloud Console');
            result.recommendations.push('Enable Google Photos Library API in Google Cloud Console');
          } else if (error.message?.includes('401')) {
            result.errors.push('Invalid OAuth credentials or expired tokens');
            result.recommendations.push('Check OAuth client configuration and re-authenticate');
          } else if (error.message?.includes('quota')) {
            result.warnings.push('API quota exceeded or limited');
            result.config.apiQuotaStatus = 'exceeded';
            result.recommendations.push('Check API quota limits in Google Cloud Console');
          } else {
            result.errors.push(`Google Photos API test failed: ${error.message}`);
          }
          result.isValid = false;
        }
      }

      // Check redirect URI configuration
      if (result.config.hasOAuthCredentials) {
        // This is a simplified check - in a real implementation, you'd validate
        // the redirect URI against the OAuth configuration
        result.config.hasValidRedirectURI = true;
      } else {
        result.warnings.push('Cannot validate redirect URI without authentication');
        result.recommendations.push('Ensure redirect URI in Google Cloud Console matches your app configuration');
      }

      // Check API quota status
      try {
        const quotaStatus = await this.checkAPIQuotaStatus();
        if (quotaStatus.quotaExceeded) {
          result.config.apiQuotaStatus = 'exceeded';
          result.warnings.push('API quota exceeded - requests may be limited');
          result.recommendations.push('Monitor API usage in Google Cloud Console');
        } else if (quotaStatus.requestsUsed / quotaStatus.requestsLimit > 0.8) {
          result.config.apiQuotaStatus = 'warning';
          result.warnings.push('API quota usage is high (>80%)');
          result.recommendations.push('Consider optimizing API usage or requesting quota increase');
        } else {
          result.config.apiQuotaStatus = 'ok';
        }
      } catch (error) {
        result.config.apiQuotaStatus = 'unknown';
        result.warnings.push('Could not check API quota status');
      }

      this.debugService.log('info', 'Config Validator', 'Google Cloud setup validation completed', result);

    } catch (error) {
      result.errors.push(`Configuration validation failed: ${error}`);
      result.isValid = false;
      this.debugService.log('error', 'Config Validator', 'Configuration validation failed', error);
    }

    return result;
  }

  async checkAPIQuotaStatus(): Promise<QuotaStatus> {
    // This is a simplified implementation
    // In a real app, you'd need to track API usage or use Google Cloud Monitoring API
    const quotaStatus: QuotaStatus = {
      requestsUsed: 0,
      requestsLimit: 10000, // Default free tier limit
      quotaExceeded: false,
    };

    try {
      // Try to get stored quota information
      const storedQuota = await AsyncStorage.getItem('api_quota_status');
      if (storedQuota) {
        const parsed = JSON.parse(storedQuota);
        quotaStatus.requestsUsed = parsed.requestsUsed || 0;
        quotaStatus.quotaExceeded = parsed.quotaExceeded || false;
        if (parsed.resetTime) {
          quotaStatus.resetTime = new Date(parsed.resetTime);
        }
      }

      // In a real implementation, you'd make an API call to check current quota
      // For now, we'll simulate based on stored data
      
    } catch (error) {
      this.debugService.log('warn', 'Config Validator', 'Failed to check API quota status', error);
    }

    return quotaStatus;
  }

  async testAPIConnectivity(): Promise<{
    success: boolean;
    responseTime: number;
    errors: string[];
  }> {
    const startTime = Date.now();
    const result = {
      success: false,
      responseTime: 0,
      errors: [] as string[],
    };

    try {
      this.debugService.log('info', 'Config Validator', 'Testing API connectivity');

      // Test basic network connectivity
      try {
        const response = await fetch('https://www.googleapis.com', { 
          method: 'HEAD'
        });
        if (!response.ok) {
          result.errors.push('Cannot reach Google APIs');
          return result;
        }
      } catch (error) {
        result.errors.push('Network connectivity issue');
        return result;
      }

      // Test Google Photos API if authenticated
      try {
        if (authService.isAuthenticated()) {
          const googlePhotosClient = getGooglePhotosClient();
          await googlePhotosClient.getMediaItems({ pageSize: 1 });
          result.success = true;
        } else {
          result.errors.push('Not authenticated - cannot test Google Photos API');
        }
      } catch (error: any) {
        result.errors.push(`Google Photos API test failed: ${error.message}`);
      }

    } catch (error) {
      result.errors.push(`API connectivity test failed: ${error}`);
    } finally {
      result.responseTime = Date.now() - startTime;
      this.debugService.log('info', 'Config Validator', `API connectivity test completed in ${result.responseTime}ms`, result);
    }

    return result;
  }

  generateTroubleshootingGuide(validationResult: ConfigValidationResult): string {
    let guide = '# Pictia Configuration Troubleshooting Guide\n\n';

    if (validationResult.isValid) {
      guide += '✅ **Configuration is valid!** Your app should work correctly.\n\n';
    } else {
      guide += '❌ **Configuration issues detected.** Please follow the steps below:\n\n';
    }

    // Add errors section
    if (validationResult.errors.length > 0) {
      guide += '## 🚨 Critical Issues\n\n';
      validationResult.errors.forEach((error, index) => {
        guide += `${index + 1}. **${error}**\n`;
      });
      guide += '\n';
    }

    // Add warnings section
    if (validationResult.warnings.length > 0) {
      guide += '## ⚠️ Warnings\n\n';
      validationResult.warnings.forEach((warning, index) => {
        guide += `${index + 1}. ${warning}\n`;
      });
      guide += '\n';
    }

    // Add recommendations section
    if (validationResult.recommendations.length > 0) {
      guide += '## 💡 Recommendations\n\n';
      validationResult.recommendations.forEach((rec, index) => {
        guide += `${index + 1}. ${rec}\n`;
      });
      guide += '\n';
    }

    // Add configuration checklist
    guide += '## 📋 Configuration Checklist\n\n';
    guide += `- [${validationResult.config.hasGoogleCloudProject ? 'x' : ' '}] Google Cloud Project configured\n`;
    guide += `- [${validationResult.config.hasOAuthCredentials ? 'x' : ' '}] OAuth credentials valid\n`;
    guide += `- [${validationResult.config.hasCorrectScopes ? 'x' : ' '}] Correct API scopes\n`;
    guide += `- [${validationResult.config.hasValidRedirectURI ? 'x' : ' '}] Valid redirect URI\n`;
    guide += `- [${validationResult.config.apiQuotaStatus === 'ok' ? 'x' : ' '}] API quota OK\n\n`;

    // Add setup instructions
    guide += '## 🛠️ Setup Instructions\n\n';
    guide += '### 1. Google Cloud Console Setup\n';
    guide += '1. Go to [Google Cloud Console](https://console.cloud.google.com/)\n';
    guide += '2. Create or select a project\n';
    guide += '3. Enable Google Photos Library API\n';
    guide += '4. Create OAuth 2.0 credentials\n';
    guide += '5. Configure redirect URIs\n\n';

    guide += '### 2. App Configuration\n';
    guide += '1. Set `EXPO_PUBLIC_GOOGLE_CLIENT_ID` in your `.env` file\n';
    guide += '2. Update `app.json` with correct scheme\n';
    guide += '3. Test authentication flow\n\n';

    guide += '### 3. Required Scopes\n';
    guide += '- `https://www.googleapis.com/auth/photoslibrary.readonly`\n';
    guide += '- `https://www.googleapis.com/auth/photoslibrary.appendonly`\n\n';

    return guide;
  }

  async exportDeveloperConfiguration(): Promise<{
    environment: any;
    configuration: any;
    validation: ConfigValidationResult;
    troubleshooting: string;
  }> {
    const validation = await this.validateGoogleCloudSetup();
    const troubleshooting = this.generateTroubleshootingGuide(validation);

    return {
      environment: {
        EXPO_PUBLIC_GOOGLE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || 'Not set',
        NODE_ENV: process.env.NODE_ENV || 'development',
        __DEV__: __DEV__,
      },
      configuration: {
        hasGoogleCloudProject: validation.config.hasGoogleCloudProject,
        hasOAuthCredentials: validation.config.hasOAuthCredentials,
        hasCorrectScopes: validation.config.hasCorrectScopes,
        hasValidRedirectURI: validation.config.hasValidRedirectURI,
        apiQuotaStatus: validation.config.apiQuotaStatus,
      },
      validation,
      troubleshooting,
    };
  }
}

export default ConfigValidator;