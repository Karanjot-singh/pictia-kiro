import React, { memo } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CachedMediaItem } from '@/types';
import { THEME_COLORS } from '@/theme/colors';
import { SHADOWS } from '@/theme/shadows';
import { BORDER_RADIUS } from '@/theme/spacing';

interface PhotoThumbnailProps {
  mediaItem: CachedMediaItem;
  size: number;
  isSelected: boolean;
  isReviewed: boolean;
  isMultiSelectMode: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

const PhotoThumbnail: React.FC<PhotoThumbnailProps> = memo(({
  mediaItem,
  size,
  isSelected,
  isReviewed,
  isMultiSelectMode,
  onPress,
  onLongPress,
}) => {
  // Generate thumbnail URL with appropriate size
  // For local media, use the baseUrl directly; for Google Photos, append size parameters
  const thumbnailUrl = mediaItem.baseUrl.startsWith('file://') || mediaItem.baseUrl.startsWith('content://') 
    ? mediaItem.baseUrl 
    : `${mediaItem.baseUrl}=w${Math.round(size * 2)}-h${Math.round(size * 2)}-c`;

  // Determine if this is a video
  const isVideo = mediaItem.mimeType.startsWith('video/');

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { width: size, height: size },
        isSelected && styles.selectedContainer,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
    >
      {/* Main image */}
      <Image
        source={{ uri: thumbnailUrl }}
        style={[
          styles.image,
          { width: size, height: size },
          isSelected && styles.selectedImage,
        ]}
        resizeMode="cover"
        onError={(error) => {
          console.warn('Failed to load thumbnail for:', mediaItem.filename, error.nativeEvent.error);
        }}
      />

      {/* Video indicator */}
      {isVideo && (
        <View style={styles.videoIndicator}>
          <Ionicons name="play-circle" size={24} color="white" />
        </View>
      )}

      {/* Multi-select mode checkbox */}
      {isMultiSelectMode && (
        <View style={styles.checkboxContainer}>
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && (
              <Ionicons name="checkmark" size={16} color="white" />
            )}
          </View>
        </View>
      )}

      {/* Review status indicator (green checkmark) */}
      {!isMultiSelectMode && isReviewed && (
        <View style={styles.reviewIndicator}>
          <View style={styles.reviewBadge}>
            <Ionicons name="checkmark" size={12} color="white" />
          </View>
        </View>
      )}

      {/* Selection overlay */}
      {isSelected && <View style={styles.selectionOverlay} />}

      {/* Video duration (if available) */}
      {isVideo && mediaItem.mediaMetadata.video && (
        <View style={styles.durationContainer}>
          <Text style={styles.durationText}>
            {/* Duration would be calculated from video metadata */}
            {formatDuration(mediaItem.mediaMetadata.video)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

// Helper function to format video duration
const formatDuration = (videoMetadata: any): string => {
  // This would need to be implemented based on actual video metadata structure
  // For now, return a placeholder
  return '0:00';
};

const styles = StyleSheet.create({
  container: {
    borderRadius: BORDER_RADIUS.THUMBNAIL,
    overflow: 'hidden',
    backgroundColor: THEME_COLORS.LIGHT_GRAY,
    ...SHADOWS.THUMBNAIL, // Add subtle shadow for modern card-like appearance
  },
  selectedContainer: {
    borderWidth: 3,
    borderColor: THEME_COLORS.PRIMARY, // Use primary color for consistency
  },
  image: {
    borderRadius: BORDER_RADIUS.THUMBNAIL,
  },
  selectedImage: {
    opacity: 0.8,
  },
  videoIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -12 }, { translateY: -12 }],
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: THEME_COLORS.WHITE,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: THEME_COLORS.PRIMARY, // Use primary color for consistency
    borderColor: THEME_COLORS.PRIMARY,
  },
  reviewIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  reviewBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: THEME_COLORS.SUCCESS, // Use theme success color
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.THUMBNAIL, // Add subtle shadow to review badge
  },
  selectionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: `${THEME_COLORS.PRIMARY}30`, // Use primary color with transparency
    borderRadius: BORDER_RADIUS.THUMBNAIL,
  },
  durationContainer: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.SM,
  },
  durationText: {
    color: THEME_COLORS.WHITE,
    fontSize: 10,
    fontWeight: '600',
  },
});

PhotoThumbnail.displayName = 'PhotoThumbnail';

export default PhotoThumbnail;