import React, { useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface CardActionBarProps {
  visible: boolean;
  onUndo?: () => void;
  onCommit?: () => void;
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
    if (enableHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onUndo?.();
  };

  const handleCommit = () => {
    if (enableHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
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
          <TouchableOpacity
            testID="undo-button"
            style={[styles.actionButton, styles.undoButton]}
            onPress={handleUndo}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Undo last action"
          >
            <Ionicons name="arrow-undo" size={20} color="#fff" />
          </TouchableOpacity>
        )}
        
        {onCommit && (
          <TouchableOpacity
            testID="commit-button"
            style={[styles.actionButton, styles.commitButton]}
            onPress={handleCommit}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Commit session changes"
          >
            <Ionicons name="checkmark" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  containerTop: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  containerBottom: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  actionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  undoButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  commitButton: {
    backgroundColor: 'rgba(52, 199, 89, 0.9)',
  },
});

export default CardActionBar;