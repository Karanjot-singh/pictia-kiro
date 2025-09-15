import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { THEME_COLORS } from '@/theme/colors';
import { SHADOWS } from '@/theme/shadows';
import { SPACING, BORDER_RADIUS } from '@/theme/spacing';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'minimal';
export type ButtonSize = 'small' | 'medium' | 'large';

interface EnhancedButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
  enableHaptics?: boolean;
  fullWidth?: boolean;
}

const EnhancedButton: React.FC<EnhancedButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  enableHaptics = true,
  fullWidth = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Button configurations
  const buttonConfigs = {
    primary: {
      gradient: THEME_COLORS.PRIMARY_GRADIENT,
      backgroundColor: THEME_COLORS.PRIMARY,
      textColor: THEME_COLORS.WHITE,
      iconColor: THEME_COLORS.WHITE,
    },
    secondary: {
      gradient: ['#F8F9FA', '#E9ECEF'] as const,
      backgroundColor: THEME_COLORS.LIGHT_GRAY,
      textColor: THEME_COLORS.TEXT_PRIMARY,
      iconColor: THEME_COLORS.TEXT_PRIMARY,
    },
    success: {
      gradient: THEME_COLORS.SUCCESS_GRADIENT,
      backgroundColor: THEME_COLORS.SUCCESS,
      textColor: THEME_COLORS.WHITE,
      iconColor: THEME_COLORS.WHITE,
    },
    danger: {
      gradient: THEME_COLORS.DANGER_GRADIENT,
      backgroundColor: THEME_COLORS.DANGER,
      textColor: THEME_COLORS.WHITE,
      iconColor: THEME_COLORS.WHITE,
    },
    warning: {
      gradient: ['#FFA200', '#FF8C00'] as const,
      backgroundColor: THEME_COLORS.WARNING,
      textColor: THEME_COLORS.WHITE,
      iconColor: THEME_COLORS.WHITE,
    },
    info: {
      gradient: ['#5028D7', '#3B1F9F'] as const,
      backgroundColor: THEME_COLORS.INFO,
      textColor: THEME_COLORS.WHITE,
      iconColor: THEME_COLORS.WHITE,
    },
    minimal: {
      gradient: ['transparent', 'transparent'] as const,
      backgroundColor: 'transparent',
      textColor: THEME_COLORS.PRIMARY,
      iconColor: THEME_COLORS.PRIMARY,
    },
  };

  const sizeConfigs = {
    small: {
      paddingHorizontal: SPACING.SM,
      paddingVertical: SPACING.XS,
      fontSize: 14,
      iconSize: 16,
      borderRadius: BORDER_RADIUS.SM,
    },
    medium: {
      paddingHorizontal: SPACING.MD,
      paddingVertical: SPACING.SM,
      fontSize: 16,
      iconSize: 20,
      borderRadius: BORDER_RADIUS.MD,
    },
    large: {
      paddingHorizontal: SPACING.LG,
      paddingVertical: SPACING.MD,
      fontSize: 18,
      iconSize: 24,
      borderRadius: BORDER_RADIUS.LG,
    },
  };

  const config = buttonConfigs[variant];
  const sizeConfig = sizeConfigs[size];

  React.useEffect(() => {
    if (disabled || loading) {
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
  }, [disabled, loading]);

  const handlePressIn = () => {
    if (disabled || loading) return;

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
    if (disabled || loading) return;

    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePress = () => {
    if (disabled || loading) return;

    if (enableHaptics && Platform.OS !== 'web') {
      const intensity = variant === 'danger' 
        ? Haptics.ImpactFeedbackStyle.Heavy
        : Haptics.ImpactFeedbackStyle.Medium;
      Haptics.impactAsync(intensity);
    }

    onPress();
  };

  const buttonStyle = [
    styles.button,
    {
      paddingHorizontal: sizeConfig.paddingHorizontal,
      paddingVertical: sizeConfig.paddingVertical,
      borderRadius: sizeConfig.borderRadius,
    },
    variant !== 'minimal' && SHADOWS.BUTTON,
    fullWidth && styles.fullWidth,
    style,
  ];

  const animatedStyle = {
    transform: [{ scale: scaleAnim }],
    opacity: opacityAnim,
  };

  const renderContent = () => {
    const iconElement = icon && (
      <Ionicons
        name={icon as any}
        size={sizeConfig.iconSize}
        color={disabled || loading ? '#ccc' : config.iconColor}
        style={iconPosition === 'right' ? styles.iconRight : styles.iconLeft}
      />
    );

    const textElement = (
      <Text
        style={[
          styles.text,
          {
            fontSize: sizeConfig.fontSize,
            color: disabled || loading ? '#ccc' : config.textColor,
          },
          textStyle,
        ]}
      >
        {loading ? 'Loading...' : title}
      </Text>
    );

    return (
      <>
        {iconPosition === 'left' && iconElement}
        {textElement}
        {iconPosition === 'right' && iconElement}
      </>
    );
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={buttonStyle}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: disabled || loading }}
      >
        {variant === 'minimal' ? (
          <>{renderContent()}</>
        ) : (
          <LinearGradient
            colors={disabled || loading ? ['#999', '#777'] : config.gradient}
            style={[
              styles.gradient,
              {
                paddingHorizontal: sizeConfig.paddingHorizontal,
                paddingVertical: sizeConfig.paddingVertical,
                borderRadius: sizeConfig.borderRadius,
              },
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {renderContent()}
          </LinearGradient>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  iconLeft: {
    marginRight: SPACING.XS,
  },
  iconRight: {
    marginLeft: SPACING.XS,
  },
});

export default EnhancedButton;