/**
 * Full-screen loading component with modern animations
 * Provides consistent loading experience across the app
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LoadingSpinner, ProgressIndicator } from './LoadingStates';
import { THEME_COLORS, SPACING, TYPOGRAPHY, TEXT_STYLES } from '@/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface LoadingScreenProps {
  message?: string;
  submessage?: string;
  progress?: number; // 0 to 1, if provided shows progress bar
  variant?: 'default' | 'gradient' | 'minimal';
  showLogo?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
  submessage,
  progress,
  variant = 'default',
  showLogo = true,
}) => {
  const fadeValue = new Animated.Value(0);
  const scaleValue = new Animated.Value(0.8);
  const slideValue = new Animated.Value(50);

  useEffect(() => {
    const animations = Animated.parallel([
      Animated.timing(fadeValue, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
      Animated.timing(slideValue, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    animations.start();
  }, []);

  const renderContent = () => (
    <Animated.View
      style={[
        styles.contentContainer,
        {
          opacity: fadeValue,
          transform: [
            { scale: scaleValue },
            { translateY: slideValue },
          ],
        },
      ]}
    >
      {showLogo && (
        <View style={styles.logoContainer}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>P</Text>
          </View>
        </View>
      )}

      <LoadingSpinner size="large" color={THEME_COLORS.PRIMARY} />

      <Text style={styles.messageText}>{message}</Text>
      
      {submessage && (
        <Text style={styles.submessageText}>{submessage}</Text>
      )}

      {typeof progress === 'number' && (
        <View style={styles.progressContainer}>
          <ProgressIndicator
            progress={progress}
            size="medium"
            color={THEME_COLORS.PRIMARY}
            style={styles.progressBar}
          />
          <Text style={styles.progressText}>
            {Math.round(progress * 100)}%
          </Text>
        </View>
      )}
    </Animated.View>
  );

  if (variant === 'gradient') {
    return (
      <LinearGradient
        colors={THEME_COLORS.PRIMARY_GRADIENT}
        style={styles.container}
      >
        <View style={styles.gradientOverlay}>
          {renderContent()}
        </View>
      </LinearGradient>
    );
  }

  if (variant === 'minimal') {
    return (
      <View style={[styles.container, styles.minimalContainer]}>
        <LoadingSpinner size="medium" color={THEME_COLORS.PRIMARY} />
        <Text style={styles.minimalText}>{message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderContent()}
    </View>
  );
};

// Inline loading component for use within other components
interface InlineLoadingProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  style?: any;
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({
  message,
  size = 'medium',
  color = THEME_COLORS.PRIMARY,
  style,
}) => {
  return (
    <View style={[styles.inlineContainer, style]}>
      <LoadingSpinner size={size} color={color} />
      {message && (
        <Text style={[styles.inlineMessage, { color }]}>{message}</Text>
      )}
    </View>
  );
};

// Loading overlay for use over existing content
interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  progress?: number;
  onRequestClose?: () => void;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message = 'Loading...',
  progress,
  onRequestClose,
}) => {
  const overlayOpacity = new Animated.Value(0);

  useEffect(() => {
    if (visible) {
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.overlayContainer,
        { opacity: overlayOpacity },
      ]}
    >
      <View style={styles.overlayContent}>
        <LoadingSpinner size="large" color={THEME_COLORS.PRIMARY} />
        <Text style={styles.overlayMessage}>{message}</Text>
        
        {typeof progress === 'number' && (
          <View style={styles.overlayProgressContainer}>
            <ProgressIndicator
              progress={progress}
              size="medium"
              color={THEME_COLORS.PRIMARY}
              style={styles.overlayProgressBar}
            />
            <Text style={styles.overlayProgressText}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME_COLORS.BACKGROUND_PRIMARY,
  },
  
  minimalContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.MD,
  },

  gradientOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },

  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: SPACING.XL,
  },

  logoContainer: {
    marginBottom: SPACING.XL,
  },

  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME_COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.LG,
  },

  logoText: {
    ...TEXT_STYLES.heading,
    fontSize: 36,
    color: THEME_COLORS.WHITE,
    fontWeight: TYPOGRAPHY.WEIGHT_BOLD,
  },

  messageText: {
    ...TEXT_STYLES.body,
    fontSize: TYPOGRAPHY.HEADING_SMALL,
    fontWeight: TYPOGRAPHY.WEIGHT_SEMIBOLD,
    color: THEME_COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginTop: SPACING.LG,
    marginBottom: SPACING.SM,
  },

  submessageText: {
    ...TEXT_STYLES.caption,
    color: THEME_COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: SPACING.LG,
  },

  minimalText: {
    ...TEXT_STYLES.body,
    color: THEME_COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.SM,
  },

  progressContainer: {
    width: '100%',
    maxWidth: 250,
    marginTop: SPACING.LG,
  },

  progressBar: {
    marginBottom: SPACING.SM,
  },

  progressText: {
    ...TEXT_STYLES.caption,
    color: THEME_COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },

  // Inline loading styles
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.MD,
  },

  inlineMessage: {
    ...TEXT_STYLES.body,
    marginLeft: SPACING.SM,
  },

  // Overlay styles
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },

  overlayContent: {
    backgroundColor: THEME_COLORS.WHITE,
    borderRadius: 16,
    padding: SPACING.XL,
    alignItems: 'center',
    minWidth: 200,
    maxWidth: screenWidth * 0.8,
  },

  overlayMessage: {
    ...TEXT_STYLES.body,
    color: THEME_COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginTop: SPACING.MD,
  },

  overlayProgressContainer: {
    width: '100%',
    marginTop: SPACING.LG,
  },

  overlayProgressBar: {
    marginBottom: SPACING.SM,
  },

  overlayProgressText: {
    ...TEXT_STYLES.caption,
    color: THEME_COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
});

export default LoadingScreen;