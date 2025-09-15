import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { 
  selectAuthLoading, 
  selectAuthError, 
  selectIsAuthenticated 
} from '@/store/selectors/authSelectors';
import { authenticateUser } from '@/store/thunks/authThunks';
import { clearError, setLocalMode } from '@/store/slices/authSlice';
import { ErrorDisplay } from '@/components';
import { THEME_COLORS, SPACING, TEXT_STYLES, SHADOWS, BORDER_RADIUS } from '@/theme';

const { width, height } = Dimensions.get('window');

const LoginScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Clear any existing errors when component mounts
    if (error) {
      dispatch(clearError());
    }

    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);



  const handleGoogleSignIn = async () => {
    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      await dispatch(authenticateUser()).unwrap();
    } catch (error) {
      // Error is handled by the useEffect above
      console.log('Authentication failed:', error);
    }
  };

  const handleSkipPress = () => {
    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    dispatch(setLocalMode(true));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME_COLORS.PRIMARY} />
      
      {/* Gradient Background */}
      <View style={[styles.gradient, styles.primaryBackground]} />

      {/* Decorative Elements */}
      <View style={styles.decorativeElements}>
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
        <View style={[styles.circle, styles.circle3]} />
      </View>

      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Logo Section */}
        <Animated.View
          style={[
            styles.logoContainer,
            { transform: [{ scale: logoScale }] },
          ]}
        >
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>P</Text>
          </View>
        </Animated.View>

        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.title}>Welcome to Pictia</Text>
          <Text style={styles.subtitle}>
            Organize your memories with the power of swipe
          </Text>
        </View>
        
        {/* Development Notice */}
        {!process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || 
         process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID === 'your_google_client_id_here' ? (
          <View style={styles.devNotice}>
            <Text style={styles.devNoticeText}>
              🔧 Development Mode
            </Text>
            <Text style={styles.devNoticeSubtext}>
              Using mock authentication for testing
            </Text>
          </View>
        ) : null}
        
        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={[styles.googleButton, isLoading && styles.buttonDisabled]}
              onPress={handleGoogleSignIn}
              disabled={isLoading}
            >
              <View style={styles.buttonGradient}>
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={THEME_COLORS.WHITE} />
                    <Text style={styles.loadingText}>Signing in...</Text>
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.googleIcon}>G</Text>
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkipPress}
            >
              <View style={styles.skipButtonContent}>
                <View style={styles.skipButtonContentInner}>
                  <Ionicons name="images-outline" size={18} color={THEME_COLORS.WHITE} style={styles.galleryIcon} />
                  <Text style={styles.skipButtonText}>Use Local Gallery Only</Text>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <ErrorDisplay
              error={error}
              onRetry={handleGoogleSignIn}
              onDismiss={() => dispatch(clearError())}
            />
          </View>
        )}
      </Animated.View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME_COLORS.PRIMARY,
  },

  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },

  primaryBackground: {
    backgroundColor: THEME_COLORS.PRIMARY, // Solid color fallback
  },

  decorativeElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  circle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },

  circle1: {
    width: 200,
    height: 200,
    top: -100,
    right: -100,
  },

  circle2: {
    width: 150,
    height: 150,
    bottom: -75,
    left: -75,
  },

  circle3: {
    width: 100,
    height: 100,
    top: height * 0.2,
    left: -50,
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.XL,
    zIndex: 2,
  },

  logoContainer: {
    marginBottom: SPACING.XXL,
  },

  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: THEME_COLORS.WHITE,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.FLOATING,
  },

  logoText: {
    fontSize: 40,
    fontWeight: '700',
    color: THEME_COLORS.PRIMARY,
  },

  welcomeSection: {
    alignItems: 'center',
    marginBottom: SPACING.XXL,
  },

  title: {
    ...TEXT_STYLES.heading1,
    fontSize: 32,
    color: THEME_COLORS.WHITE,
    marginBottom: SPACING.SM,
    textAlign: 'center',
  },

  subtitle: {
    ...TEXT_STYLES.bodyLarge,
    color: THEME_COLORS.WHITE,
    opacity: 0.9,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: SPACING.MD,
  },

  devNotice: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    marginBottom: SPACING.LG,
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },

  devNoticeText: {
    ...TEXT_STYLES.bodyMedium,
    fontWeight: '600',
    color: THEME_COLORS.WHITE,
    textAlign: 'center',
    marginBottom: 4,
  },

  devNoticeSubtext: {
    ...TEXT_STYLES.bodySmall,
    color: THEME_COLORS.WHITE,
    opacity: 0.8,
    textAlign: 'center',
  },

  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },

  googleButton: {
    width: '100%',
    maxWidth: 300,
    height: 60,
    borderRadius: BORDER_RADIUS.LG,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
    ...SHADOWS.BUTTON,
  },

  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.XL,
    paddingVertical: SPACING.MD,
  },

  googleButtonBackground: {
    // Remove this - styling moved to googleButton
  },

  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  googleIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME_COLORS.WHITE,
    marginRight: SPACING.SM,
  },

  googleButtonText: {
    ...TEXT_STYLES.buttonText,
    color: THEME_COLORS.WHITE,
    fontSize: 16,
  },

  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    ...TEXT_STYLES.buttonText,
    color: THEME_COLORS.WHITE,
    marginLeft: SPACING.SM,
  },

  skipButton: {
    marginTop: SPACING.LG,
    width: '100%',
    maxWidth: 300,
    height: 60,
    borderRadius: BORDER_RADIUS.LG,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
    ...SHADOWS.BUTTON,
  },

  skipButtonContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.XL,
    paddingVertical: SPACING.MD,
  },

  skipButtonContentInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  galleryIcon: {
    marginRight: SPACING.SM,
  },

  skipButtonText: {
    ...TEXT_STYLES.buttonText,
    color: THEME_COLORS.WHITE,
    fontSize: 16,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  errorContainer: {
    width: '100%',
    marginTop: SPACING.LG,
  },

  footer: {
    paddingHorizontal: SPACING.XL,
    paddingBottom: SPACING.LG,
    alignItems: 'center',
    zIndex: 2,
  },

  footerText: {
    ...TEXT_STYLES.caption,
    color: THEME_COLORS.WHITE,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default LoginScreen;
