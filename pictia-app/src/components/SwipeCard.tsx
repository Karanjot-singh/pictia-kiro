import React, { useRef, useState } from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { CachedMediaItem, SwipeAction } from '../types';
import { GestureConfigOptions } from './GestureConfig';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface SwipeCardProps {
  mediaItem: CachedMediaItem;
  onSwipeLeft: (item: CachedMediaItem) => void;
  onSwipeRight: (item: CachedMediaItem) => void;
  onUndo?: (() => void) | undefined;
  onCommit?: (() => void) | undefined;
  showActionBar?: boolean;
  config?: Partial<GestureConfigOptions>;
  style?: any;
  undoTimeoutMs?: number;
}

const SwipeCard: React.FC<SwipeCardProps> = ({
  mediaItem,
  onSwipeLeft,
  onSwipeRight,
  onUndo,
  onCommit,
  showActionBar = false,
  config = {},
  style,
  undoTimeoutMs = 5000,
}) => {
  // SwipeCard component for photo organization
  // Default configuration
  const defaultConfig: GestureConfigOptions = {
    swipeThreshold: screenWidth * 0.3,
    enableHaptics: true,
    enableVisualFeedback: true,
    cardRotationEnabled: true,
    maxRotationDegrees: 30,
    animationDuration: 300,
  };

  const finalConfig = { ...defaultConfig, ...config };
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;


  const hasTriggeredHaptic = useRef(false);
  const hasTriggeredThresholdHaptic = useRef(false);

  const triggerHapticFeedback = (action: SwipeAction, intensity: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (finalConfig.enableHaptics && Platform.OS !== 'web' && !hasTriggeredHaptic.current) {
      hasTriggeredHaptic.current = true;
      const hapticStyle = intensity === 'light' 
        ? Haptics.ImpactFeedbackStyle.Light
        : intensity === 'heavy'
        ? Haptics.ImpactFeedbackStyle.Heavy
        : Haptics.ImpactFeedbackStyle.Medium;
      
      Haptics.impactAsync(hapticStyle);
    }
  };

  const triggerThresholdHaptic = () => {
    if (finalConfig.enableHaptics && Platform.OS !== 'web' && !hasTriggeredThresholdHaptic.current) {
      hasTriggeredThresholdHaptic.current = true;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const resetHapticFlags = () => {
    hasTriggeredHaptic.current = false;
    hasTriggeredThresholdHaptic.current = false;
  };

  const animateCard = (x: number, y: number) => {
    const rotation = finalConfig.cardRotationEnabled 
      ? (x / screenWidth) * finalConfig.maxRotationDegrees 
      : 0;
    const cardScale = Math.max(0.95, 1 - Math.abs(x) / screenWidth * 0.05);
    
    translateX.setValue(x);
    translateY.setValue(y);
    rotate.setValue(rotation);
    scale.setValue(cardScale);

    // Visual feedback is handled by overlays

    // Trigger threshold haptic feedback when crossing threshold
    if (Math.abs(x) > finalConfig.swipeThreshold) {
      triggerThresholdHaptic();
    } else {
      hasTriggeredThresholdHaptic.current = false;
    }
  };

  const resetCard = () => {
    resetHapticFlags();
    
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(rotate, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
    ]).start();
  };

  const swipeCard = (direction: 'left' | 'right') => {
    const toValue = direction === 'right' ? screenWidth * 1.5 : -screenWidth * 1.5;
    const action: SwipeAction = direction === 'right' ? 'keep' : 'delete';

    // Final haptic feedback with enhanced intensity
    triggerHapticFeedback(action, action === 'delete' ? 'heavy' : 'medium');

    Animated.parallel([
      Animated.timing(translateX, {
        toValue,
        duration: finalConfig.animationDuration,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: finalConfig.animationDuration,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Call the appropriate callback after animation
      if (direction === 'left') {
        onSwipeLeft(mediaItem);
      } else {
        onSwipeRight(mediaItem);
      }
    });
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      'worklet';
      runOnJS(animateCard)(event.translationX, event.translationY * 0.1); // Reduce vertical movement
    })
    .onEnd((event) => {
      'worklet';
      const { translationX, velocityX } = event;
      
      // Determine if swipe should complete based on distance or velocity
      const shouldSwipe = Math.abs(translationX) > finalConfig.swipeThreshold || Math.abs(velocityX) > 1000;
      
      if (shouldSwipe) {
        const direction = translationX > 0 ? 'right' : 'left';
        runOnJS(swipeCard)(direction);
      } else {
        runOnJS(resetCard)();
      }
    });

  const getOverlayOpacity = (direction: 'left' | 'right') => {
    if (!finalConfig.enableVisualFeedback) {
      return new Animated.Value(0);
    }
    
    return translateX.interpolate({
      inputRange: direction === 'left' 
        ? [-screenWidth, -50, 0] 
        : [0, 50, screenWidth],
      outputRange: direction === 'left' ? [0.9, 0.3, 0] : [0, 0.3, 0.9],
      extrapolate: 'clamp',
    });
  };

  const cardTransform = {
    transform: [
      { translateX },
      { translateY },
      { rotate: rotate.interpolate({
          inputRange: [-screenWidth, 0, screenWidth],
          outputRange: ['-30deg', '0deg', '30deg'],
        })
      },
      { scale },
    ],
  };

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, cardTransform, { opacity }, style]}>
        <Image
          source={{ uri: mediaItem.baseUrl }}
          style={styles.image}
          resizeMode="cover"
          onError={(error) => {
            console.warn('Failed to load image:', mediaItem.filename, error.nativeEvent.error);
          }}
          onLoad={() => {
            console.log('Successfully loaded image:', mediaItem.filename);
          }}
        />
        
        {/* Delete Overlay - Only show when swiping left */}
        <Animated.View
          style={[
            styles.overlay,
            styles.deleteOverlay,
            { opacity: getOverlayOpacity('left') },
          ]}
          pointerEvents="none"
        >
          <View style={styles.overlayContent}>
            <View style={styles.overlayIcon}>
              <Text style={styles.overlayIconText}>✕</Text>
            </View>
            <Text style={styles.overlayText}>DELETE</Text>
          </View>
        </Animated.View>

        {/* Keep Overlay - Only show when swiping right */}
        <Animated.View
          style={[
            styles.overlay,
            styles.keepOverlay,
            { opacity: getOverlayOpacity('right') },
          ]}
          pointerEvents="none"
        >
          <View style={styles.overlayContent}>
            <View style={styles.overlayIcon}>
              <Text style={styles.overlayIconText}>✓</Text>
            </View>
            <Text style={styles.overlayText}>KEEP</Text>
          </View>
        </Animated.View>

        {/* Media Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.filename} numberOfLines={1}>
            {mediaItem.filename}
          </Text>
          <Text style={styles.metadata}>
            {mediaItem.mediaMetadata.width} × {mediaItem.mediaMetadata.height}
          </Text>
        </View>


      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  card: {
    width: screenWidth * 0.9,
    height: screenHeight * 0.6,
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  deleteOverlay: {
    backgroundColor: 'rgba(255, 59, 48, 0.85)',
  },
  keepOverlay: {
    backgroundColor: 'rgba(52, 199, 89, 0.85)',
  },
  overlayContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  overlayIconText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  overlayText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 2,
  },
  infoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 16,
  },
  filename: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  metadata: {
    color: '#ccc',
    fontSize: 14,
  },
});

export default SwipeCard;