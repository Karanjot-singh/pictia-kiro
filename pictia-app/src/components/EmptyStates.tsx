/**
 * Attractive empty state components with illustrations and helpful messaging
 * Provides engaging empty states that guide users toward appropriate actions
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ModernActionButton from './ModernActionButton';
import { THEME_COLORS, SPACING, BORDER_RADIUS, TEXT_STYLES, TYPOGRAPHY, SHADOWS } from '@/theme';

const { width: screenWidth } = Dimensions.get('window');

interface EmptyStateProps {
  variant: 'photos' | 'gallery' | 'search' | 'backup' | 'organize' | 'upload' | 'generic';
  title?: string;
  message?: string;
  actionText?: string;
  onActionPress?: () => void;
  secondaryActionText?: string;
  onSecondaryActionPress?: () => void;
  style?: ViewStyle;
  showAnimation?: boolean;
}

interface EmptyStateConfig {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  message: string;
  actionText?: string;
  secondaryActionText?: string;
  gradient?: string[];
}

const EMPTY_STATE_CONFIGS: Record<string, EmptyStateConfig> = {
  photos: {
    icon: 'images-outline',
    iconColor: THEME_COLORS.PRIMARY,
    title: 'No Photos Yet',
    message: 'Start organizing your photos by uploading them from your gallery or taking new ones.',
    actionText: 'Upload Photos',
    secondaryActionText: 'Take Photo',
    gradient: THEME_COLORS.PRIMARY_GRADIENT,
  },
  gallery: {
    icon: 'grid-outline',
    iconColor: THEME_COLORS.ACCENT,
    title: 'Gallery is Empty',
    message: 'Your photo gallery is empty. Add some photos to get started with organizing.',
    actionText: 'Add Photos',
    gradient: THEME_COLORS.ACCENT_GRADIENT,
  },
  search: {
    icon: 'search-outline',
    iconColor: THEME_COLORS.INFO,
    title: 'No Results Found',
    message: 'We couldn\'t find any photos matching your search. Try different keywords or check your filters.',
    actionText: 'Clear Search',
    secondaryActionText: 'Reset Filters',
  },
  backup: {
    icon: 'cloud-upload-outline',
    iconColor: THEME_COLORS.SUCCESS,
    title: 'No Backups Yet',
    message: 'Your photos are safe! Set up automatic backups to keep your memories secure.',
    actionText: 'Setup Backup',
    secondaryActionText: 'Learn More',
    gradient: THEME_COLORS.SUCCESS_GRADIENT,
  },
  organize: {
    icon: 'albums-outline',
    iconColor: THEME_COLORS.WARNING,
    title: 'Ready to Organize?',
    message: 'Swipe through your photos to keep the ones you love and remove the ones you don\'t need.',
    actionText: 'Start Organizing',
    secondaryActionText: 'View Gallery',
  },
  upload: {
    icon: 'add-circle-outline',
    iconColor: THEME_COLORS.PRIMARY,
    title: 'Upload Complete',
    message: 'All your photos have been uploaded successfully. Ready to start organizing?',
    actionText: 'Start Organizing',
    gradient: THEME_COLORS.PRIMARY_GRADIENT,
  },
  generic: {
    icon: 'document-outline',
    iconColor: THEME_COLORS.GRAY,
    title: 'Nothing Here',
    message: 'There\'s nothing to show right now. Check back later or try refreshing.',
    actionText: 'Refresh',
  },
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  variant,
  title,
  message,
  actionText,
  onActionPress,
  secondaryActionText,
  onSecondaryActionPress,
  style,
  showAnimation = true,
}) => {
  const config = EMPTY_STATE_CONFIGS[variant] || EMPTY_STATE_CONFIGS.generic;
  
  const fadeValue = new Animated.Value(0);
  const scaleValue = new Animated.Value(0.8);
  const slideValue = new Animated.Value(30);
  const iconBounceValue = new Animated.Value(0);

  useEffect(() => {
    if (showAnimation) {
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
          easing: Easing.out(Easing.back(1.1)),
          useNativeDriver: true,
        }),
        Animated.timing(slideValue, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);

      animations.start(() => {
        // Start icon bounce animation after main animation
        Animated.loop(
          Animated.sequence([
            Animated.timing(iconBounceValue, {
              toValue: 1,
              duration: 2000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(iconBounceValue, {
              toValue: 0,
              duration: 2000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        ).start();
      });
    } else {
      fadeValue.setValue(1);
      scaleValue.setValue(1);
      slideValue.setValue(0);
    }
  }, [showAnimation]);

  const iconTranslateY = iconBounceValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const iconScale = iconBounceValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.1, 1],
  });

  const displayTitle = title || config.title;
  const displayMessage = message || config.message;
  const displayActionText = actionText || config.actionText;
  const displaySecondaryActionText = secondaryActionText || config.secondaryActionText;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeValue,
          transform: [
            { scale: scaleValue },
            { translateY: slideValue },
          ],
        },
        style,
      ]}
    >
      {/* Background decoration */}
      {config.gradient && (
        <View style={styles.backgroundDecoration}>
          <LinearGradient
            colors={[...config.gradient.map(color => `${color}10`)]}
            style={styles.gradientBackground}
          />
        </View>
      )}

      {/* Icon container with animation */}
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [
              { translateY: iconTranslateY },
              { scale: iconScale },
            ],
          },
        ]}
      >
        <View style={[styles.iconBackground, { backgroundColor: `${config.iconColor}15` }]}>
          <Ionicons
            name={config.icon}
            size={64}
            color={config.iconColor}
          />
        </View>
      </Animated.View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>{displayTitle}</Text>
        <Text style={styles.message}>{displayMessage}</Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {displayActionText && onActionPress && (
          <ModernActionButton
            variant="primary"
            size="medium"
            shape="pill"
            text={displayActionText}
            onPress={onActionPress}
            style={styles.primaryAction}
          />
        )}
        
        {displaySecondaryActionText && onSecondaryActionPress && (
          <ModernActionButton
            variant="minimal"
            size="medium"
            shape="pill"
            text={displaySecondaryActionText}
            onPress={onSecondaryActionPress}
            style={styles.secondaryAction}
          />
        )}
      </View>
    </Animated.View>
  );
};

// Specialized empty states for common scenarios
export const PhotosEmptyState: React.FC<{
  onUploadPress?: () => void;
  onTakePhotoPress?: () => void;
  style?: ViewStyle;
}> = ({ onUploadPress, onTakePhotoPress, style }) => (
  <EmptyState
    variant="photos"
    onActionPress={onUploadPress}
    onSecondaryActionPress={onTakePhotoPress}
    style={style}
  />
);

export const GalleryEmptyState: React.FC<{
  onAddPhotosPress?: () => void;
  style?: ViewStyle;
}> = ({ onAddPhotosPress, style }) => (
  <EmptyState
    variant="gallery"
    onActionPress={onAddPhotosPress}
    style={style}
  />
);

export const SearchEmptyState: React.FC<{
  onClearSearchPress?: () => void;
  onResetFiltersPress?: () => void;
  searchQuery?: string;
  style?: ViewStyle;
}> = ({ onClearSearchPress, onResetFiltersPress, searchQuery, style }) => (
  <EmptyState
    variant="search"
    message={searchQuery ? `No results found for "${searchQuery}"` : undefined}
    onActionPress={onClearSearchPress}
    onSecondaryActionPress={onResetFiltersPress}
    style={style}
  />
);

export const BackupEmptyState: React.FC<{
  onSetupBackupPress?: () => void;
  onLearnMorePress?: () => void;
  style?: ViewStyle;
}> = ({ onSetupBackupPress, onLearnMorePress, style }) => (
  <EmptyState
    variant="backup"
    onActionPress={onSetupBackupPress}
    onSecondaryActionPress={onLearnMorePress}
    style={style}
  />
);

export const OrganizeEmptyState: React.FC<{
  onStartOrganizingPress?: () => void;
  onViewGalleryPress?: () => void;
  style?: ViewStyle;
}> = ({ onStartOrganizingPress, onViewGalleryPress, style }) => (
  <EmptyState
    variant="organize"
    onActionPress={onStartOrganizingPress}
    onSecondaryActionPress={onViewGalleryPress}
    style={style}
  />
);

// Compact empty state for smaller spaces
interface CompactEmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  message: string;
  actionText?: string;
  onActionPress?: () => void;
  style?: ViewStyle;
}

export const CompactEmptyState: React.FC<CompactEmptyStateProps> = ({
  icon,
  message,
  actionText,
  onActionPress,
  style,
}) => {
  return (
    <View style={[styles.compactContainer, style]}>
      <Ionicons
        name={icon}
        size={32}
        color={THEME_COLORS.GRAY}
        style={styles.compactIcon}
      />
      <Text style={styles.compactMessage}>{message}</Text>
      {actionText && onActionPress && (
        <ModernActionButton
          variant="minimal"
          size="small"
          shape="pill"
          text={actionText}
          onPress={onActionPress}
          style={styles.compactAction}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.XL,
    paddingVertical: SPACING.XXL,
    position: 'relative',
  },

  backgroundDecoration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },

  gradientBackground: {
    width: screenWidth * 0.8,
    height: screenWidth * 0.8,
    borderRadius: screenWidth * 0.4,
    opacity: 0.3,
  },

  iconContainer: {
    marginBottom: SPACING.XL,
  },

  iconBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.CARD,
  },

  content: {
    alignItems: 'center',
    marginBottom: SPACING.XL,
  },

  title: {
    ...TEXT_STYLES.heading,
    fontSize: TYPOGRAPHY.HEADING_MEDIUM,
    fontWeight: TYPOGRAPHY.WEIGHT_BOLD,
    color: THEME_COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: SPACING.MD,
  },

  message: {
    ...TEXT_STYLES.body,
    color: THEME_COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.LINE_HEIGHT_RELAXED * TYPOGRAPHY.BODY_LARGE,
    maxWidth: 280,
  },

  actions: {
    alignItems: 'center',
    width: '100%',
  },

  primaryAction: {
    marginBottom: SPACING.MD,
    minWidth: 160,
  },

  secondaryAction: {
    minWidth: 140,
  },

  // Compact empty state styles
  compactContainer: {
    alignItems: 'center',
    padding: SPACING.LG,
  },

  compactIcon: {
    marginBottom: SPACING.SM,
  },

  compactMessage: {
    ...TEXT_STYLES.body,
    fontSize: TYPOGRAPHY.BODY_SMALL,
    color: THEME_COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: SPACING.MD,
  },

  compactAction: {
    minWidth: 100,
  },
});

export default EmptyState;