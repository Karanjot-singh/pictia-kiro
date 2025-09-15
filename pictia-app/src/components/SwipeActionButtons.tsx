import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import ModernActionButton from './ModernActionButton';
import { SPACING } from '@/theme/spacing';

interface SwipeActionButtonsProps {
  onKeep: () => void;
  onDelete: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  size?: 'small' | 'medium' | 'large';
  enableHaptics?: boolean;
}

const SwipeActionButtons: React.FC<SwipeActionButtonsProps> = ({
  onKeep,
  onDelete,
  disabled = false,
  style,
  size = 'medium',
  enableHaptics = true,
}) => {
  return (
    <View style={[styles.container, style]}>
      <ModernActionButton
        variant="delete"
        size={size}
        onPress={onDelete}
        disabled={disabled}
        enableHaptics={enableHaptics}
      />
      
      <ModernActionButton
        variant="keep"
        size={size}
        onPress={onKeep}
        disabled={disabled}
        enableHaptics={enableHaptics}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.XL,
    gap: SPACING.XL,
  },
});

export default SwipeActionButtons;