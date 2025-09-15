/**
 * Enhanced error display components with modern styling and animations
 * Provides attractive error states with card-based layouts and visual hierarchy
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  ViewStyle,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ModernActionButton } from './ModernActionButton';
import { THEME_COLORS, SPACING, BORDER_RADIUS, SHADOWS, TEXT_STYLES, TYPOGRAPHY } from '@/theme';

const { width: screenWidth } = Dimensions.get('window');

interface ErrorDisplayProps {
  error: string | { message: string } | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  style?: ViewStyle;
  variant?: 'inline' | 'card' | 'fullscreen' | 'toast';
  severity?: 'error' | 'warning' | 'info';
  title?: string;
  showAnimation?: boolean;
}

interface ErrorStateConfig {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  backgroundColor: string;
  borderColor: string;
  gradient?: string[];
}

const ERROR_CONFIGS: Record<string, ErrorStateConfig> = {
  error: {
    icon: 'alert-circle-outline',
    color: THEME_COLORS.DANGER,
    backgroundColor: `${THEME_COLORS.DANGER}10`,
    borderColor: `${THEME_COLORS.DANGER}30`,
    gradient: [`${THEME_COLORS.DANGER}15`, `${THEME_COLORS.DANGER}05`],
  },
  warning: {
    icon: 'warning-outline',
    color: THEME_COLORS.WARNING,
    backgroundColor: `${THEME_COLORS.WARNING}10`,
    borderColor: `${THEME_COLORS.WARNING}30`,
    gradient: [`${THEME_COLORS.WARNING}15`, `${THEME_COLORS.WARNING}05`],
  },
  info: {
    icon: 'information-circle-outline',
    color: THEME_COLORS.INFO,
    backgroundColor: `${THEME_COLORS.INFO}10`,
    borderColor: `${THEME_COLORS.INFO}30`,
    gradient: [`${THEME_COLORS.INFO}15`, `${THEME_COLORS.INFO}05`],
  },
};

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  style,
  variant = 'card',
  severity = 'error',
  title,
  showAnimation = true,
}) => {
  const fadeValue = new Animated.Value(0);
  const slideValue = new Animated.Value(20);
  const scaleValue = new Animated.Value(0.95);

  useEffect(() => {
    if (error && showAnimation) {
      const animations = Animated.parallel([
        Animated.timing(fadeValue, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slideValue, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.back(1.1)),
          useNativeDriver: true,
        }),
      ]);

      animations.start();
    } else if (error) {
      fadeValue.setValue(1);
      slideValue.setValue(0);
      scaleValue.setValue(1);
    }
  }, [error, showAnimation]);

  if (!error) return null;

  const errorMessage = typeof error === 'string' ? error : error.message;
  const config = ERROR_CONFIGS[severity];

  const renderContent = () => (
    <View style={styles.content}>
      <View style={styles.iconContainer}>
        <Ionicons
          name={config.icon}
          size={24}
          color={config.color}
        />
      </View>
      
      <View style={styles.textContainer}>
        {title && (
          <Text style={[styles.title, { color: config.color }]}>
            {title}
          </Text>
        )}
        <Text style={styles.errorText}>{errorMessage}</Text>
      </View>
    </View>
  );

  const renderActions = () => {
    if (!onRetry && !onDismiss) return null;

    return (
      <View style={styles.actions}>
        {onRetry && (
          <ModernActionButton
            variant="primary"
            size="small"
            shape="pill"
            text="Retry"
            onPress={onRetry}
            style={styles.retryButton}
          />
        )}
        
        {onDismiss && (
          <ModernActionButton
            variant="minimal"
            size="small"
            shape="pill"
            text="Dismiss"
            onPress={onDismiss}
            style={styles.dismissButton}
          />
        )}
      </View>
    );
  };

  if (variant === 'fullscreen') {
    return (
      <Animated.View
        style={[
          styles.fullscreenContainer,
          {
            opacity: fadeValue,
            transform: [
              { translateY: slideValue },
              { scale: scaleValue },
            ],
          },
          style,
        ]}
      >
        <View style={styles.fullscreenContent}>
          <View style={[styles.fullscreenIconContainer, { backgroundColor: config.backgroundColor }]}>
            <Ionicons
              name={config.icon}
              size={64}
              color={config.color}
            />
          </View>
          
          <Text style={styles.fullscreenTitle}>
            {title || 'Something went wrong'}
          </Text>
          
          <Text style={styles.fullscreenMessage}>
            {errorMessage}
          </Text>
          
          {renderActions()}
        </View>
      </Animated.View>
    );
  }

  if (variant === 'toast') {
    return (
      <Animated.View
        style={[
          styles.toastContainer,
          {
            backgroundColor: config.backgroundColor,
            borderColor: config.borderColor,
            opacity: fadeValue,
            transform: [{ translateY: slideValue }],
          },
          style,
        ]}
      >
        <LinearGradient
          colors={config.gradient || [config.backgroundColor, config.backgroundColor]}
          style={styles.toastGradient}
        >
          {renderContent()}
          {onDismiss && (
            <ModernActionButton
              variant="minimal"
              size="small"
              shape="circle"
              icon="close"
              onPress={onDismiss}
              style={styles.toastDismiss}
            />
          )}
        </LinearGradient>
      </Animated.View>
    );
  }

  if (variant === 'inline') {
    return (
      <Animated.View
        style={[
          styles.inlineContainer,
          {
            backgroundColor: config.backgroundColor,
            borderColor: config.borderColor,
            opacity: fadeValue,
            transform: [{ translateY: slideValue }],
          },
          style,
        ]}
      >
        {renderContent()}
        {renderActions()}
      </Animated.View>
    );
  }

  // Default card variant
  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          opacity: fadeValue,
          transform: [
            { translateY: slideValue },
            { scale: scaleValue },
          ],
        },
        style,
      ]}
    >
      <LinearGradient
        colors={config.gradient || [THEME_COLORS.WHITE, THEME_COLORS.WHITE]}
        style={styles.cardGradient}
      >
        {renderContent()}
        {renderActions()}
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  // Common content styles
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  iconContainer: {
    marginRight: SPACING.MD,
    marginTop: 2,
  },

  textContainer: {
    flex: 1,
  },

  title: {
    ...TEXT_STYLES.body,
    fontSize: TYPOGRAPHY.BODY_LARGE,
    fontWeight: TYPOGRAPHY.WEIGHT_SEMIBOLD,
    marginBottom: SPACING.XS,
  },

  errorText: {
    ...TEXT_STYLES.body,
    color: THEME_COLORS.TEXT_PRIMARY,
    lineHeight: TYPOGRAPHY.LINE_HEIGHT_RELAXED * TYPOGRAPHY.BODY_MEDIUM,
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SPACING.MD,
    gap: SPACING.SM,
  },

  retryButton: {
    minWidth: 80,
  },

  dismissButton: {
    minWidth: 80,
  },

  // Card variant styles
  cardContainer: {
    margin: SPACING.MD,
    borderRadius: BORDER_RADIUS.CARD,
    ...SHADOWS.CARD,
    overflow: 'hidden',
  },

  cardGradient: {
    padding: SPACING.CARD_PADDING,
  },

  // Inline variant styles
  inlineContainer: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    margin: SPACING.SM,
  },

  // Toast variant styles
  toastContainer: {
    position: 'absolute',
    top: 50,
    left: SPACING.MD,
    right: SPACING.MD,
    borderRadius: BORDER_RADIUS.LG,
    borderWidth: 1,
    ...SHADOWS.FLOATING,
    overflow: 'hidden',
    zIndex: 1000,
  },

  toastGradient: {
    padding: SPACING.MD,
    flexDirection: 'row',
    alignItems: 'center',
  },

  toastDismiss: {
    marginLeft: SPACING.SM,
  },

  // Fullscreen variant styles
  fullscreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME_COLORS.BACKGROUND_PRIMARY,
    paddingHorizontal: SPACING.XL,
  },

  fullscreenContent: {
    alignItems: 'center',
    maxWidth: 300,
  },

  fullscreenIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.XL,
    ...SHADOWS.CARD,
  },

  fullscreenTitle: {
    ...TEXT_STYLES.heading,
    fontSize: TYPOGRAPHY.HEADING_MEDIUM,
    fontWeight: TYPOGRAPHY.WEIGHT_BOLD,
    color: THEME_COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: SPACING.MD,
  },

  fullscreenMessage: {
    ...TEXT_STYLES.body,
    color: THEME_COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.LINE_HEIGHT_RELAXED * TYPOGRAPHY.BODY_LARGE,
    marginBottom: SPACING.XL,
  },
});

export default ErrorDisplay;