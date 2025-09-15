/**
 * Modern splash screen with brand colors and animations
 * Provides an engaging loading experience while the app initializes
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME_COLORS, SPACING, TYPOGRAPHY, TEXT_STYLES } from '@/theme';

interface SplashScreenProps {
  onAnimationComplete?: () => void;
  progress?: number; // 0-1 for loading progress
  message?: string;
}

const { width, height } = Dimensions.get('window');

const SplashScreen: React.FC<SplashScreenProps> = ({
  onAnimationComplete,
  progress = 0,
  message = 'Loading your photos...',
}) => {
  // Animation values
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const progressOpacity = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation sequence
    const entranceAnimation = Animated.sequence([
      // Logo entrance
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      // Title fade in
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
      // Progress bar fade in
      Animated.timing(progressOpacity, {
        toValue: 1,
        duration: 400,
        delay: 300,
        useNativeDriver: true,
      }),
    ]);

    entranceAnimation.start();
  }, []);

  useEffect(() => {
    // Update progress bar width
    Animated.timing(progressWidth, {
      toValue: progress * 100,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const handleAnimationComplete = () => {
    if (onAnimationComplete) {
      // Exit animation before calling completion
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(titleOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(progressOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onAnimationComplete();
      });
    }
  };

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

      {/* Content Container */}
      <View style={styles.content}>
        {/* Logo Section */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          {/* App Icon/Logo Placeholder */}
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>P</Text>
          </View>
        </Animated.View>

        {/* Title Section */}
        <Animated.View
          style={[
            styles.titleContainer,
            { opacity: titleOpacity },
          ]}
        >
          <Text style={styles.title}>Pictia</Text>
          <Text style={styles.subtitle}>Organize your memories</Text>
        </Animated.View>

        {/* Progress Section */}
        <Animated.View
          style={[
            styles.progressContainer,
            { opacity: progressOpacity },
          ]}
        >
          <Text style={styles.progressText}>{message}</Text>
          
          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: progressWidth.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                    extrapolate: 'clamp',
                  }),
                },
              ]}
            />
          </View>
        </Animated.View>
      </View>

      {/* Decorative Elements */}
      <View style={styles.decorativeElements}>
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
        <View style={[styles.circle, styles.circle3]} />
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
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: THEME_COLORS.WHITE,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: THEME_COLORS.BLACK,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },

  logoText: {
    fontSize: 48,
    fontWeight: TYPOGRAPHY.WEIGHT_BOLD,
    color: THEME_COLORS.PRIMARY,
  },

  titleContainer: {
    alignItems: 'center',
    marginBottom: SPACING.XXL * 2,
  },

  title: {
    ...TEXT_STYLES.heading1,
    fontSize: 36,
    color: THEME_COLORS.WHITE,
    marginBottom: SPACING.SM,
    textAlign: 'center',
  },

  subtitle: {
    ...TEXT_STYLES.bodyLarge,
    color: THEME_COLORS.WHITE,
    opacity: 0.9,
    textAlign: 'center',
  },

  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },

  progressText: {
    ...TEXT_STYLES.bodyMedium,
    color: THEME_COLORS.WHITE,
    opacity: 0.8,
    marginBottom: SPACING.LG,
    textAlign: 'center',
  },

  progressBarContainer: {
    width: '80%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },

  progressBar: {
    height: '100%',
    backgroundColor: THEME_COLORS.WHITE,
    borderRadius: 2,
  },

  // Decorative background elements
  decorativeElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
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
    top: height * 0.3,
    left: -50,
  },
});

export default SplashScreen;