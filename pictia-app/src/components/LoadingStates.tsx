/**
 * Modern loading animations and states
 * Provides engaging loading experiences with spinners, skeletons, and shimmer effects
 */

import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME_COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '@/theme';

const { width: screenWidth } = Dimensions.get('window');

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  style?: ViewStyle;
}

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

interface ShimmerProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

interface PhotoGridSkeletonProps {
  columns?: number;
  rows?: number;
}

interface CardSkeletonProps {
  showActions?: boolean;
}

// Modern loading spinner with smooth rotation
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = THEME_COLORS.PRIMARY,
  style,
}) => {
  const spinValue = new Animated.Value(0);

  useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    
    spinAnimation.start();
    
    return () => spinAnimation.stop();
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const sizes = {
    small: 20,
    medium: 40,
    large: 60,
  };

  const spinnerSize = sizes[size];

  return (
    <View style={[styles.spinnerContainer, style]}>
      <Animated.View
        style={[
          styles.spinner,
          {
            width: spinnerSize,
            height: spinnerSize,
            borderColor: `${color}20`,
            borderTopColor: color,
            transform: [{ rotate: spin }],
          },
        ]}
      />
    </View>
  );
};

// Skeleton loading placeholder
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = BORDER_RADIUS.SM,
  style,
}) => {
  const pulseValue = new Animated.Value(0);

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();
    
    return () => pulseAnimation.stop();
  }, []);

  const opacity = pulseValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

// Shimmer effect wrapper
export const Shimmer: React.FC<ShimmerProps> = ({ children, style }) => {
  const shimmerValue = new Animated.Value(0);

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.timing(shimmerValue, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    shimmerAnimation.start();
    
    return () => shimmerAnimation.stop();
  }, []);

  const translateX = shimmerValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-screenWidth, screenWidth],
  });

  return (
    <View style={[styles.shimmerContainer, style]}>
      {children}
      <Animated.View
        style={[
          styles.shimmerOverlay,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.shimmerGradient}
        />
      </Animated.View>
    </View>
  );
};

// Photo grid skeleton for gallery loading
export const PhotoGridSkeleton: React.FC<PhotoGridSkeletonProps> = ({
  columns = 3,
  rows = 4,
}) => {
  const itemSize = (screenWidth - SPACING.SCREEN_PADDING * 2 - SPACING.GRID_SPACING * (columns - 1)) / columns;

  const renderSkeletonGrid = () => {
    const items = [];
    for (let i = 0; i < rows * columns; i++) {
      items.push(
        <Shimmer key={i} style={styles.gridItemShimmer}>
          <Skeleton
            width={itemSize}
            height={itemSize}
            borderRadius={BORDER_RADIUS.THUMBNAIL}
          />
        </Shimmer>
      );
    }
    return items;
  };

  return (
    <View style={styles.gridSkeleton}>
      {renderSkeletonGrid()}
    </View>
  );
};

// Card skeleton for swipe interface loading
export const CardSkeleton: React.FC<CardSkeletonProps> = ({ showActions = true }) => {
  return (
    <View style={styles.cardSkeletonContainer}>
      <Shimmer style={styles.cardShimmer}>
        <View style={styles.cardSkeleton}>
          <Skeleton
            width="100%"
            height={400}
            borderRadius={BORDER_RADIUS.CARD}
            style={styles.cardImageSkeleton}
          />
          <View style={styles.cardContentSkeleton}>
            <Skeleton width="60%" height={16} style={styles.cardTitleSkeleton} />
            <Skeleton width="40%" height={12} style={styles.cardSubtitleSkeleton} />
          </View>
        </View>
      </Shimmer>
      
      {showActions && (
        <View style={styles.cardActionsSkeleton}>
          <Skeleton
            width={60}
            height={60}
            borderRadius={BORDER_RADIUS.CIRCLE}
            style={styles.actionButtonSkeleton}
          />
          <Skeleton
            width={60}
            height={60}
            borderRadius={BORDER_RADIUS.CIRCLE}
            style={styles.actionButtonSkeleton}
          />
        </View>
      )}
    </View>
  );
};

// Progress indicator with modern styling
interface ProgressIndicatorProps {
  progress: number; // 0 to 1
  size?: 'small' | 'medium' | 'large';
  color?: string;
  backgroundColor?: string;
  style?: ViewStyle;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  size = 'medium',
  color = THEME_COLORS.PRIMARY,
  backgroundColor = THEME_COLORS.LIGHT_GRAY,
  style,
}) => {
  const progressValue = new Animated.Value(0);

  useEffect(() => {
    Animated.timing(progressValue, {
      toValue: progress,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const sizes = {
    small: 4,
    medium: 6,
    large: 8,
  };

  const height = sizes[size];

  const progressWidth = progressValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.progressContainer, { height }, style]}>
      <View style={[styles.progressBackground, { backgroundColor, height }]} />
      <Animated.View
        style={[
          styles.progressFill,
          {
            backgroundColor: color,
            height,
            width: progressWidth,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // Spinner styles
  spinnerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.MD,
  },
  spinner: {
    borderWidth: 3,
    borderRadius: BORDER_RADIUS.CIRCLE,
  },

  // Skeleton styles
  skeleton: {
    backgroundColor: THEME_COLORS.LIGHT_GRAY,
  },

  // Shimmer styles
  shimmerContainer: {
    overflow: 'hidden',
    position: 'relative',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: screenWidth,
  },
  shimmerGradient: {
    flex: 1,
    width: '100%',
  },

  // Grid skeleton styles
  gridSkeleton: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: SPACING.SCREEN_PADDING,
  },
  gridItemShimmer: {
    marginBottom: SPACING.GRID_SPACING,
  },

  // Card skeleton styles
  cardSkeletonContainer: {
    alignItems: 'center',
    padding: SPACING.SCREEN_PADDING,
  },
  cardShimmer: {
    width: '100%',
    maxWidth: 350,
  },
  cardSkeleton: {
    backgroundColor: THEME_COLORS.WHITE,
    borderRadius: BORDER_RADIUS.CARD,
    ...SHADOWS.CARD,
    overflow: 'hidden',
  },
  cardImageSkeleton: {
    marginBottom: 0,
  },
  cardContentSkeleton: {
    padding: SPACING.CARD_PADDING,
  },
  cardTitleSkeleton: {
    marginBottom: SPACING.SM,
  },
  cardSubtitleSkeleton: {
    marginBottom: 0,
  },
  cardActionsSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '60%',
    marginTop: SPACING.LG,
  },
  actionButtonSkeleton: {
    marginHorizontal: SPACING.SM,
  },

  // Progress indicator styles
  progressContainer: {
    position: 'relative',
    borderRadius: BORDER_RADIUS.SM,
    overflow: 'hidden',
  },
  progressBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderRadius: BORDER_RADIUS.SM,
  },
  progressFill: {
    borderRadius: BORDER_RADIUS.SM,
  },
});