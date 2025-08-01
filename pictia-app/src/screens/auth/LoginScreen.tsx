import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator 
} from 'react-native';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { 
  selectAuthLoading, 
  selectAuthError, 
  selectIsAuthenticated 
} from '@/store/selectors/authSelectors';
import { authenticateUser } from '@/store/thunks/authThunks';
import { clearError, setLocalMode } from '@/store/slices/authSlice';
import { ErrorDisplay } from '@/components';

const LoginScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  useEffect(() => {
    // Clear any existing errors when component mounts
    if (error) {
      dispatch(clearError());
    }
  }, []);



  const handleGoogleSignIn = async () => {
    try {
      await dispatch(authenticateUser()).unwrap();
    } catch (error) {
      // Error is handled by the useEffect above
      console.log('Authentication failed:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to Pictia</Text>
        <Text style={styles.subtitle}>
          Sign in with Google to organize your photos, or use local gallery mode
        </Text>
        
        {!process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || 
         process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID === 'your_google_client_id_here' ? (
          <View style={styles.devNotice}>
            <Text style={styles.devNoticeText}>
              🔧 Development Mode: Using mock authentication
            </Text>
            <Text style={styles.devNoticeSubtext}>
              Configure Google OAuth in .env file for real authentication
            </Text>
          </View>
        ) : null}
        
        <TouchableOpacity
          style={[styles.googleButton, isLoading && styles.buttonDisabled]}
          onPress={handleGoogleSignIn}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.googleButtonText}>🔍</Text>
              <Text style={styles.googleButtonText}>Sign in with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => dispatch(setLocalMode(true))}
        >
          <Text style={styles.skipButtonText}>Skip - Use Local Gallery Only</Text>
        </TouchableOpacity>

        {error && (
          <ErrorDisplay
            error={error}
            onRetry={handleGoogleSignIn}
            onDismiss={() => dispatch(clearError())}
          />
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By signing in, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285F4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  skipButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
    marginTop: 16,
  },
  skipButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },

  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 16,
  },
  devNotice: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFEAA7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  devNoticeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    textAlign: 'center',
    marginBottom: 4,
  },
  devNoticeSubtext: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center',
  },
});

export default LoginScreen;
