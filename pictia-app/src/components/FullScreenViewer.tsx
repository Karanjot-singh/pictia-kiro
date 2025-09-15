import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Image,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  Text,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { CachedMediaItem } from '@/types';

interface FullScreenViewerProps {
  mediaItem: CachedMediaItem;
  isVisible: boolean;
  onClose: () => void;
  onStartSwipeMode: () => void;
  onNavigatePrevious?: (() => void) | undefined;
  onNavigateNext?: (() => void) | undefined;
  showNavigation?: boolean;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const MIN_SCALE = 1;
const MAX_SCALE = 3;

const FullScreenViewer: React.FC<FullScreenViewerProps> = ({
  mediaItem,
  isVisible,
  onClose,
  onStartSwipeMode,
  onNavigatePrevious,
  onNavigateNext,
  showNavigation = true,
}) => {
  const [showControls, setShowControls] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // Animated values
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  // Calculate image display dimensions
  const getImageDisplaySize = useCallback(() => {
    if (!imageLoaded || !imageDimensions.width || !imageDimensions.height) {
      return { width: screenWidth, height: screenHeight };
    }

    const imageAspectRatio = imageDimensions.width / imageDimensions.height;
    const screenAspectRatio = screenWidth / screenHeight;

    let displayWidth, displayHeight;

    if (imageAspectRatio > screenAspectRatio) {
      // Image is wider than screen
      displayWidth = screenWidth;
      displayHeight = screenWidth / imageAspectRatio;
    } else {
      // Image is taller than screen
      displayHeight = screenHeight;
      displayWidth = screenHeight * imageAspectRatio;
    }

    return { width: displayWidth, height: displayHeight };
  }, [imageLoaded, imageDimensions]);

  // Worklet version of getImageDisplaySize for use in gestures
  const getImageDisplaySizeWorklet = () => {
    'worklet';
    if (!imageLoaded || !imageDimensions.width || !imageDimensions.height) {
      return { width: screenWidth, height: screenHeight };
    }

    const imageAspectRatio = imageDimensions.width / imageDimensions.height;
    const screenAspectRatio = screenWidth / screenHeight;

    let displayWidth, displayHeight;

    if (imageAspectRatio > screenAspectRatio) {
      // Image is wider than screen
      displayWidth = screenWidth;
      displayHeight = screenWidth / imageAspectRatio;
    } else {
      // Image is taller than screen
      displayHeight = screenHeight;
      displayWidth = screenHeight * imageAspectRatio;
    }

    return { width: displayWidth, height: displayHeight };
  };

  // Reset zoom and pan
  const resetTransform = useCallback(() => {
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
  }, [scale, translateX, translateY]);

  // Toggle controls visibility
  const toggleControls = useCallback(() => {
    setShowControls(prev => !prev);
  }, []);

  // Pinch gesture
  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      'worklet';
      const newScale = event.scale;
      scale.value = Math.min(Math.max(newScale, MIN_SCALE), MAX_SCALE);
      
      focalX.value = event.focalX;
      focalY.value = event.focalY;
    })
    .onEnd(() => {
      'worklet';
      if (scale.value < MIN_SCALE) {
        scale.value = withSpring(MIN_SCALE);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  // Pan gesture
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      'worklet';
      if (scale.value > 1) {
        translateX.value = event.translationX;
        translateY.value = event.translationY;
      }
    })
    .onEnd(() => {
      'worklet';
      // Constrain pan to image boundaries
      const displaySize = getImageDisplaySizeWorklet();
      const maxTranslateX = (displaySize.width * scale.value - screenWidth) / 2;
      const maxTranslateY = (displaySize.height * scale.value - screenHeight) / 2;

      if (Math.abs(translateX.value) > maxTranslateX) {
        translateX.value = withSpring(Math.sign(translateX.value) * maxTranslateX);
      }
      if (Math.abs(translateY.value) > maxTranslateY) {
        translateY.value = withSpring(Math.sign(translateY.value) * maxTranslateY);
      }
    });

  // Single tap gesture
  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      'worklet';
      runOnJS(toggleControls)();
    });

  // Double tap gesture
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((event) => {
      'worklet';
      if (scale.value > 1) {
        // Zoom out
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      } else {
        // Zoom in to 2x at tap location
        const newScale = 2;
        scale.value = withSpring(newScale);
        
        // Calculate translation to center on tap point
        const tapX = event.x - screenWidth / 2;
        const tapY = event.y - screenHeight / 2;
        
        translateX.value = withSpring(-tapX * (newScale - 1));
        translateY.value = withSpring(-tapY * (newScale - 1));
      }
    });

  // Compose gestures
  const composedGestures = Gesture.Simultaneous(
    Gesture.Exclusive(doubleTapGesture, singleTapGesture),
    Gesture.Simultaneous(pinchGesture, panGesture)
  );

  // Animated style for the image
  const animatedImageStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  // Handle image load
  const handleImageLoad = useCallback((event: any) => {
    const { width, height } = event.nativeEvent.source;
    setImageDimensions({ width, height });
    setImageLoaded(true);
  }, []);

  // Handle start swipe mode
  const handleStartSwipeMode = useCallback(() => {
    Alert.alert(
      'Start Organization',
      'Start organizing photos from this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start', 
          onPress: () => {
            onClose();
            onStartSwipeMode();
          }
        },
      ]
    );
  }, [onClose, onStartSwipeMode]);

  if (!isVisible) {
    return null;
  }

  const displaySize = getImageDisplaySize();
  const highResUrl = `${mediaItem.baseUrl}=w${Math.round(screenWidth * 2)}-h${Math.round(screenHeight * 2)}`;

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      {/* Image container */}
      <View style={styles.imageContainer}>
        <GestureDetector gesture={composedGestures}>
          <Animated.View style={styles.gestureContainer}>
            <Animated.View style={[styles.imageWrapper, animatedImageStyle]}>
              <Image
                source={{ uri: highResUrl }}
                style={[
                  styles.image,
                  {
                    width: displaySize.width,
                    height: displaySize.height,
                  },
                ]}
                resizeMode="contain"
                onLoad={handleImageLoad}
              />
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </View>

      {/* Controls overlay */}
      {showControls && (
        <SafeAreaView style={styles.controlsContainer}>
          {/* Top controls */}
          <View style={styles.topControls}>
            <TouchableOpacity style={styles.controlButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            
            <View style={styles.topRightControls}>
              <TouchableOpacity style={styles.controlButton} onPress={handleStartSwipeMode}>
                <Text style={styles.swipeModeText}>Start Swipe Mode</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Navigation controls */}
          {showNavigation && (
            <View style={styles.navigationControls}>
              {onNavigatePrevious && (
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={onNavigatePrevious}
                >
                  <Ionicons name="chevron-back" size={32} color="white" />
                </TouchableOpacity>
              )}
              
              {onNavigateNext && (
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={onNavigateNext}
                >
                  <Ionicons name="chevron-forward" size={32} color="white" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Bottom controls */}
          <View style={styles.bottomControls}>
            <Text style={styles.imageInfo}>
              {mediaItem.filename}
            </Text>
            <TouchableOpacity style={styles.resetButton} onPress={resetTransform}>
              <Ionicons name="refresh" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gestureContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    backgroundColor: 'transparent',
  },
  controlsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    backgroundColor: '#7444C0',
    borderRadius: 20,
    padding: 8,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeModeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 8,
  },
  navigationControls: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    transform: [{ translateY: -16 }],
  },
  navButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  imageInfo: {
    color: 'white',
    fontSize: 14,
    flex: 1,
    marginRight: 16,
  },
  resetButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default FullScreenViewer;