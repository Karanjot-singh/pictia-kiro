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
            <TouchableOpacity
              style={styles.simpleBatchButton}
              onPress={handleSelectToggle}
              activeOpacity={0.7}
            >
              <View style={styles.batchButtonContent}>
                <Ionicons
                  name={allSelected ? "checkbox" : "checkbox-outline"}
                  size={18}
                  color="#7444C0"
                />
                <Text style={styles.simpleBatchButtonText}>
                  {allSelected ? 'None' : 'All'}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Mark as Unreviewed button */}
          {onMarkAsUnreviewed && (
            <TouchableOpacity
              style={[styles.simpleBatchButton, selectedCount === 0 && styles.disabledBatchButton]}
              onPress={handleMarkAsUnreviewed}
              disabled={selectedCount === 0}
              activeOpacity={0.7}
            >
              <View style={styles.batchButtonContent}>
                <Ionicons
                  name="refresh"
                  size={18}
                  color={selectedCount === 0 ? '#999' : '#FFA200'}
                />
                <Text style={[styles.simpleBatchButtonText, { color: selectedCount === 0 ? '#999' : '#FFA200' }]}>
                  Undo
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Delete button */}
          <TouchableOpacity
            style={[styles.simpleBatchButton, selectedCount === 0 && styles.disabledBatchButton]}
            onPress={handleDelete}
            disabled={selectedCount === 0}
            activeOpacity={0.7}
          >
            <View style={styles.batchButtonContent}>
              <Ionicons
                name="trash"
                size={18}
                color={selectedCount === 0 ? '#999' : '#D04949'}
              />
              <Text style={[styles.simpleBatchButtonText, { color: selectedCount === 0 ? '#999' : '#D04949' }]}>
                Delete
              </Text>
            </View>
          </TouchableOpacity>
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
    marginRight: SPACING.SM,
  },
  cancelButton: {
    padding: SPACING.SM,
    marginRight: SPACING.SM,
    borderRadius: BORDER_RADIUS.SM,
    backgroundColor: 'rgba(116, 68, 192, 0.1)',
  },
  selectionText: {
    fontSize: 14,
    color: THEME_COLORS.TEXT_PRIMARY,
    fontWeight: '500',
    flex: 1,
    marginRight: SPACING.XS,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.XS,
    flexShrink: 0,
  },
  simpleBatchButton: {
    backgroundColor: 'rgba(116, 68, 192, 0.1)',
    paddingHorizontal: SPACING.XS,
    paddingVertical: SPACING.XS,
    borderRadius: BORDER_RADIUS.SM,
    minWidth: 70,
    alignItems: 'center',
  },
  disabledBatchButton: {
    backgroundColor: 'rgba(153, 153, 153, 0.1)',
  },
  batchButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  simpleBatchButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7444C0',
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
    color: '#7444C0',
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