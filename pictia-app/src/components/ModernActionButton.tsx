import React, { useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Animated,
  ViewStyle,
  Platform,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { THEME_COLORS } from '@/theme/colors';
import { SHADOWS } from '@/theme/shadows';
import { BORDER_RADIUS } from '@/theme/spacing';

export type ActionButtonVariant = 'keep' | 'delete' | 'undo' | 'commit';
export type ActionButtonSize = 'small' | 'medium' | 'large';

interface ModernActionButtonProps {
  variant: ActionButtonVariant;
  size?: ActionButtonSize;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  enableHaptics?: boolean;
}

const ModernActionButton: React.FC<ModernActionButtonProps> = ({
  variant,
  size = 'medium',
  onPress,
  disabled = false,
  style,
  enableHaptics = true,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Button configurations with iOS-style icons
  const buttonConfigs = {
    keep: {
      gradient: THEME_COLORS.SUCCESS_GRADIENT,
      icon: 'checkmark' as const, // iOS-style checkmark for keep
      backgroundColor: THEME_COLORS.SUCCESS,
    },
    delete: {
      gradient: THEME_COLORS.DANGER_GRADIENT,
      icon: 'close' as const, // iOS-style close icon
      backgroundColor: THEME_COLORS.DANGER,
    },
    undo: {
      gradient: ['rgba(0, 0, 0, 0.8)', 'rgba(0, 0, 0, 0.9)'] as const,
      icon: 'refresh' as const, // Refresh icon for undo
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    commit: {
      gradient: THEME_COLORS.SUCCESS_GRADIENT,
      icon: 'checkmark' as const, // Simple checkmark for commit
      backgroundColor: THEME_COLORS.SUCCESS,
    },
  };

  const sizeConfigs = {
    small: { width: 40, height: 40, iconSize: 16 },
    medium: { width: 60, height: 60, iconSize: 24 },
    large: { width: 80, height: 80, iconSize: 32 },
  };

  const config = buttonConfigs[variant];
  const sizeConfig = sizeConfigs[size];

  useEffect(() => {
    if (disabled) {
      Animated.timing(opacityAnim, {
        toValue: 0.5,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [disabled]);

  const handlePressIn = () => {
    if (disabled) return;

    if (enableHaptics && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;

    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePress = () => {
    if (disabled) return;

    if (enableHaptics && Platform.OS !== 'web') {
      const intensity = variant === 'delete' 
        ? Haptics.ImpactFeedbackStyle.Heavy
        : Haptics.ImpactFeedbackStyle.Medium;
      Haptics.impactAsync(intensity);
    }

    onPress();
  };

  const buttonStyle = [
    styles.button,
    {
      width: sizeConfig.width,
      height: sizeConfig.height,
      borderRadius: sizeConfig.width / 2, // Perfect circle
    },
    SHADOWS.BUTTON,
    style,
  ];

  const animatedStyle = {
    transform: [{ scale: scaleAnim }],
    opacity: opacityAnim,
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={buttonStyle}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={`${variant} button`}
      >
        <LinearGradient
          colors={config.gradient}
          style={[
            styles.gradient,
            {
              width: sizeConfig.width,
              height: sizeConfig.height,
              borderRadius: sizeConfig.width / 2,
            },
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {variant === 'undo' ? (
            <Text style={{ color: THEME_COLORS.WHITE, fontSize: sizeConfig.iconSize * 0.8, fontWeight: 'bold' }}>⟲</Text>
          ) : variant === 'commit' ? (
            <Text style={{ color: THEME_COLORS.WHITE, fontSize: sizeConfig.iconSize * 0.8, fontWeight: 'bold' }}>✓</Text>
          ) : variant === 'keep' ? (
            <Text style={{ color: THEME_COLORS.WHITE, fontSize: sizeConfig.iconSize * 0.8, fontWeight: 'bold' }}>✓</Text>
          ) : variant === 'delete' ? (
            <Text style={{ color: THEME_COLORS.WHITE, fontSize: sizeConfig.iconSize * 0.8, fontWeight: 'bold' }}>✕</Text>
          ) : (
            <Text style={{ color: THEME_COLORS.WHITE, fontSize: sizeConfig.iconSize * 0.8, fontWeight: 'bold' }}>?</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    overflow: 'hidden',
  },
  gradient: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ModernActionButton;