import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  ActivityIndicator, 
  StyleSheet, 
  Animated,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectAuthLoading, selectIsAuthenticated } from '@/store/selectors/authSelectors';
import { validateStoredAuth } from '@/store/thunks/authThunks';
import { THEME_COLORS, SPACING, TEXT_STYLES } from '@/theme';

interface AuthLoadingScreenProps {
  message?: string;
}

const AuthLoadingScreen: React.FC<AuthLoadingScreenProps> = ({ 
  message = 'Authenticating...' 
}) => {
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector(selectAuthLoading);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Validate stored authentication on component mount
    dispatch(validateStoredAuth());

    // Entrance animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Pulse animation for loading indicator
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, [dispatch]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME_COLORS.PRIMARY} />
      
      {/* Gradient Background */}
      <LinearGradient
        colors={THEME_COLORS.PRIMARY_GRADIENT}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <Animated.View 
        style={[
          styles.content,
          { opacity: fadeAnim },
        ]}
      >
        {/* Loading Indicator */}
        <Animated.View
          style={[
            styles.loadingContainer,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <View style={styles.loadingCircle}>
            <ActivityIndicator size="large" color={THEME_COLORS.PRIMARY} />
          </View>
        </Animated.View>

        {/* Text Content */}
        <View style={styles.textContainer}>
          <Text style={styles.text}>{message}</Text>
          <Text style={styles.subtext}>
            Please wait while we verify your credentials
          </Text>
        </View>
      </Animated.View>
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

  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.XL,
  },

  loadingContainer: {
    marginBottom: SPACING.XXL,
  },

  loadingCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME_COLORS.WHITE,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: THEME_COLORS.BLACK,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },

  textContainer: {
    alignItems: 'center',
  },

  text: {
    ...TEXT_STYLES.heading3,
    color: THEME_COLORS.WHITE,
    textAlign: 'center',
    marginBottom: SPACING.SM,
  },

  subtext: {
    ...TEXT_STYLES.bodyMedium,
    color: THEME_COLORS.WHITE,
    opacity: 0.8,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default AuthLoadingScreen;
