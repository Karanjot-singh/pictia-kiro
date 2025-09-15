import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CachedMediaItem } from '@/types';
import { THEME_COLORS } from '@/theme/colors';
import { SHADOWS } from '@/theme/shadows';
import { SPACING, BORDER_RADIUS } from '@/theme/spacing';

interface BatchActionBarProps {
  selectedItems: CachedMediaItem[];
  isVisible: boolean;
  onDelete: (items: CachedMediaItem[]) => void;
  onCancel: () => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onMarkAsUnreviewed?: (items: CachedMediaItem[]) => void;
  totalItems: number;
}

const BatchActionBar: React.FC<BatchActionBarProps> = ({
  selectedItems,
  isVisible,
  onDelete,
  onCancel,
  onSelectAll,
  onDeselectAll,
  onMarkAsUnreviewed,
  totalItems,
}) => {
  const selectedCount = selectedItems.length;
  const allSelected = selectedCount === totalItems;

  const handleDelete = () => {
    if (selectedCount === 0) return;

    Alert.alert(
      'Delete Photos',
      `Are you sure you want to delete ${selectedCount} photo${selectedCount > 1 ? 's' : ''}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(selectedItems),
        },
      ]
    );
  };

  const handleSelectToggle = () => {
    if (allSelected) {
      onDeselectAll?.();
    } else {
      onSelectAll?.();
    }
  };

  const handleMarkAsUnreviewed = () => {
    if (selectedCount === 0) return;

    Alert.alert(
      'Mark as Unreviewed',
      `Mark ${selectedCount} photo${selectedCount > 1 ? 's' : ''} as unreviewed? They will appear in organize mode again.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Mark as Unreviewed',
          onPress: () => onMarkAsUnreviewed?.(selectedItems),
        },
      ]
    );
  };

  // Modern button component for batch actions
  const ModernBatchButton: React.FC<{
    onPress: () => void;
    disabled?: boolean;
    variant: 'primary' | 'danger' | 'warning';
    icon: string;
    text: string;
  }> = ({ onPress, disabled = false, variant, icon, text }) => {
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const getVariantStyles = () => {
      switch (variant) {
        case 'danger':
          return {
            gradient: THEME_COLORS.DANGER_GRADIENT,
            backgroundColor: THEME_COLORS.DANGER,
            iconColor: THEME_COLORS.WHITE,
            textColor: THEME_COLORS.WHITE,
          };
        case 'warning':
          return {
            gradient: ['#FFA200', '#FF8C00'] as const,
            backgroundColor: THEME_COLORS.WARNING,
            iconColor: THEME_COLORS.WHITE,
            textColor: THEME_COLORS.WHITE,
          };
        default:
          return {
            gradient: THEME_COLORS.PRIMARY_GRADIENT,
            backgroundColor: THEME_COLORS.PRIMARY,
            iconColor: THEME_COLORS.WHITE,
            textColor: THEME_COLORS.WHITE,
          };
      }
    };

    const variantStyles = getVariantStyles();

    const handlePressIn = () => {
      if (disabled) return;
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

    return (
      <Animated.View
        style={[
          { transform: [{ scale: scaleAnim }] },
          disabled && { opacity: 0.5 },
        ]}
      >
        <TouchableOpacity
          style={[styles.modernButton, disabled && styles.disabledButton]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={disabled ? ['#999', '#777'] : variantStyles.gradient}
            style={styles.modernButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons
              name={icon as any}
              size={18}
              color={disabled ? '#ccc' : variantStyles.iconColor}
            />
            <Text
              style={[
                styles.modernButtonText,
                { color: disabled ? '#ccc' : variantStyles.textColor },
              ]}
            >
              {text}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (!isVisible) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Left section - Cancel and selection info */}
        <View style={styles.leftSection}>
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={20} color={THEME_COLORS.PRIMARY} />
          </TouchableOpacity>
          
          <Text style={styles.selectionText}>
            {selectedCount} of {totalItems} selected
          </Text>
        </View>

        {/* Right section - Actions */}
        <View style={styles.rightSection}>
          {/* Select/Deselect All */}
          {(onSelectAll || onDeselectAll) && (
            <ModernBatchButton
              onPress={handleSelectToggle}
              variant="primary"
              icon={allSelected ? "checkbox" : "checkbox-outline"}
              text={allSelected ? 'Deselect All' : 'Select All'}
            />
          )}

          {/* Mark as Unreviewed button */}
          {onMarkAsUnreviewed && (
            <ModernBatchButton
              onPress={handleMarkAsUnreviewed}
              disabled={selectedCount === 0}
              variant="warning"
              icon="refresh"
              text="Unreviewed"
            />
          )}

          {/* Delete button */}
          <ModernBatchButton
            onPress={handleDelete}
            disabled={selectedCount === 0}
            variant="danger"
            icon="trash"
            text="Delete"
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: THEME_COLORS.WHITE,
    borderTopWidth: 0,
    zIndex: 1000,
    ...SHADOWS.TAB_BAR,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    minHeight: 60,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cancelButton: {
    padding: SPACING.SM,
    marginRight: SPACING.SM,
    borderRadius: BORDER_RADIUS.SM,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  selectionText: {
    fontSize: 16,
    color: THEME_COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
  },
  modernButton: {
    borderRadius: BORDER_RADIUS.MD,
    overflow: 'hidden',
    ...SHADOWS.BUTTON,
  },
  modernButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.SM,
    gap: 6,
  },
  modernButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  // Legacy styles (keeping for compatibility)
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    gap: 6,
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  unreviewedButton: {
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  deleteText: {
    color: '#FF3B30',
  },
  unreviewedText: {
    color: '#FF9500',
  },
  disabledText: {
    color: '#999',
  },
});

export default BatchActionBar;