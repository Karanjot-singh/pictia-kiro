import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
} from 'react-native';
import ModernActionButton from './ModernActionButton';
import { SPACING } from '@/theme/spacing';

interface CardActionBarProps {
  visible: boolean;
  onUndo?: (() => void) | undefined;
  onCommit?: (() => void) | undefined;
  style?: any;
  position?: 'top' | 'bottom';
  enableHaptics?: boolean;
}

const CardActionBar: React.FC<CardActionBarProps> = ({
  visible,
  onUndo,
  onCommit,
  style,
  position = 'top',
  enableHaptics = true,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 0.8,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleUndo = () => {
    onUndo?.();
  };

  const handleCommit = () => {
    onCommit?.();
  };

  if (!visible) {
    return null;
  }

  const containerStyle = position === 'top' ? styles.containerTop : styles.containerBottom;

  return (
    <Animated.View
      testID="card-action-bar-container"
      style={[
        containerStyle,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
        style,
      ]}
    >
      <View style={styles.actionBar} testID="card-action-bar">
        {onUndo && (
          <ModernActionButton
            variant="undo"
            size="medium"
            onPress={handleUndo}
            enableHaptics={enableHaptics}
          />
        )}
        
        {/* Spacer to push commit button to the right */}
        {!onUndo && <View style={styles.spacer} />}
        
        {onCommit && (
          <ModernActionButton
            variant="commit"
            size="medium"
            onPress={handleCommit}
            enableHaptics={enableHaptics}
          />
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  containerTop: {
    position: 'absolute',
    top: 60, // Move down to avoid status bar
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  containerBottom: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.MD,
    alignItems: 'center',
  },
  spacer: {
    flex: 1,
  },
});

export default CardActionBar;