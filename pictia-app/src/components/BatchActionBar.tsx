import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CachedMediaItem } from '@/types';

interface BatchActionBarProps {
  selectedItems: CachedMediaItem[];
  isVisible: boolean;
  onDelete: (items: CachedMediaItem[]) => void;
  onCancel: () => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  totalItems: number;
}

const BatchActionBar: React.FC<BatchActionBarProps> = ({
  selectedItems,
  isVisible,
  onDelete,
  onCancel,
  onSelectAll,
  onDeselectAll,
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

  if (!isVisible) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Left section - Cancel and selection info */}
        <View style={styles.leftSection}>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Ionicons name="close" size={24} color="#007AFF" />
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
              style={styles.actionButton}
              onPress={handleSelectToggle}
            >
              <Ionicons
                name={allSelected ? "checkbox" : "checkbox-outline"}
                size={24}
                color="#007AFF"
              />
              <Text style={styles.actionText}>
                {allSelected ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Delete button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.deleteButton,
              selectedCount === 0 && styles.disabledButton,
            ]}
            onPress={handleDelete}
            disabled={selectedCount === 0}
          >
            <Ionicons
              name="trash"
              size={24}
              color={selectedCount === 0 ? '#999' : '#FF3B30'}
            />
            <Text
              style={[
                styles.actionText,
                styles.deleteText,
                selectedCount === 0 && styles.disabledText,
              ]}
            >
              Delete
            </Text>
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 60,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cancelButton: {
    padding: 8,
    marginRight: 12,
  },
  selectionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
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
  disabledButton: {
    backgroundColor: 'rgba(153, 153, 153, 0.1)',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  deleteText: {
    color: '#FF3B30',
  },
  disabledText: {
    color: '#999',
  },
});

export default BatchActionBar;