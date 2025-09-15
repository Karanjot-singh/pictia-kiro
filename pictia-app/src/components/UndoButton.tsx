import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME_COLORS } from '@/theme/colors';
import { SHADOWS } from '@/theme/shadows';
import { SPACING, BORDER_RADIUS } from '@/theme/spacing';

const { width: screenWidth } = Dimensions.get('window');

interface UndoButtonProps {
  visible: boolean;
  onUndo: () => void;
  timeoutMs?: number;
  style?: any;
  showCountdown?: boolean;
  position?: 'bottom' | 'top';
}

const UndoButton: React.FC<UndoButtonProps> = ({
  visible,
  onUndo,
  timeoutMs = 5000,
  style,
  showCountdown = true,
  position = 'bottom',
}) => {
  const [timeLeft, setTimeLeft] = useState(timeoutMs);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
      // Reset animations and timer
      setTimeLeft(timeoutMs);
      progressAnim.setValue(1);
      
      // Animate in
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

      // Start countdown
      if (showCountdown) {
        intervalRef.current = setInterval(() => {
          setTimeLeft(prev => {
            const newTime = prev - 100;
            if (newTime <= 0) {
              return 0;
            }
            return newTime;
          });
        }, 100);
      }

      // Start progress animation
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: timeoutMs,
        useNativeDriver: false,
      }).start();

    } else {
      // Animate out
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

      // Clear interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [visible, timeoutMs, showCountdown]);

  const handleUndo = () => {
    // Clear interval immediately
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    onUndo();
  };

  const getSecondsLeft = () => {
    return Math.ceil(timeLeft / 1000);
  };

  const getProgressWidth = () => {
    return progressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
      extrapolate: 'clamp',
    });
  };

  if (!visible) {
    return null;
  }

  const containerStyle = position === 'top' ? styles.containerTop : styles.containerBottom;

  return (
    <Animated.View
      style={[
        containerStyle,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
        style,
      ]}
    >
      <TouchableOpacity
        style={styles.button}
        onPress={handleUndo}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['rgba(0, 0, 0, 0.8)', 'rgba(0, 0, 0, 0.9)'] as const}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.content}>
            <Ionicons name="arrow-undo-outline" size={18} color={THEME_COLORS.WHITE} />
            <Text style={styles.buttonText}>Undo</Text>
            {showCountdown && (
              <Text style={styles.countdownText}>
                {getSecondsLeft()}s
              </Text>
            )}
          </View>
          
          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <Animated.View
              style={[
                styles.progressBar,
                { width: getProgressWidth() },
              ]}
            />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  containerBottom: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  containerTop: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  button: {
    borderRadius: BORDER_RADIUS.XL,
    minWidth: 120,
    ...SHADOWS.BUTTON,
    overflow: 'hidden',
  },
  gradient: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.XL,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: THEME_COLORS.WHITE,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: SPACING.SM,
    marginRight: SPACING.SM,
  },
  countdownText: {
    color: THEME_COLORS.GRAY,
    fontSize: 14,
    fontWeight: '500',
    minWidth: 25,
    textAlign: 'center',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: THEME_COLORS.PRIMARY,
  },
});

export default UndoButton;