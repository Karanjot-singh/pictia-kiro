import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import SwipeCard from './SwipeCard';
import { CachedMediaItem, SwipeAction } from '../types';
import { SPACING } from '../theme';

const { width: screenWidth } = Dimensions.get('window');

interface SwipeCardStackProps {
  mediaItems: CachedMediaItem[];
  currentIndex: number;
  onSwipeLeft: (item: CachedMediaItem) => void;
  onSwipeRight: (item: CachedMediaItem) => void;
  onUndo?: () => void;
  onCommit?: () => void;
  swipeThreshold?: number;
  enableHaptics?: boolean;
  maxVisibleCards?: number;
  cardSpacing?: number;
  undoTimeoutMs?: number;
  showCardActionBar?: boolean;
}

const SwipeCardStack: React.FC<SwipeCardStackProps> = ({
  mediaItems,
  currentIndex,
  onSwipeLeft,
  onSwipeRight,
  onUndo,
  onCommit,
  swipeThreshold = screenWidth * 0.3,
  enableHaptics = true,
  maxVisibleCards = 3,
  cardSpacing = 8,
  undoTimeoutMs = 5000,
  showCardActionBar = false,
}) => {
  const cardAnimations = useRef<Animated.Value[]>([]).current;

  // Initialize animations for visible cards
  useEffect(() => {
    const visibleCards = Math.min(maxVisibleCards, mediaItems.length - currentIndex);
    
    // Ensure we have enough animated values
    while (cardAnimations.length < visibleCards) {
      cardAnimations.push(new Animated.Value(0));
    }

    // Animate cards into position
    cardAnimations.forEach((animation, index) => {
      if (index < visibleCards) {
        Animated.spring(animation, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      }
    });
  }, [currentIndex, mediaItems.length, maxVisibleCards]);

  const handleSwipeLeft = (item: CachedMediaItem) => {
    animateCardRemoval(() => onSwipeLeft(item));
  };

  const handleSwipeRight = (item: CachedMediaItem) => {
    animateCardRemoval(() => onSwipeRight(item));
  };

  const animateCardRemoval = (callback: () => void) => {
    // Animate remaining cards moving up
    const animations = cardAnimations.slice(1, maxVisibleCards).map((animation, index) => {
      return Animated.spring(animation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      });
    });

    Animated.parallel(animations).start(() => {
      callback();
      
      // Reset the first animation for the next card
      if (cardAnimations[0]) {
        cardAnimations[0].setValue(0);
      }
    });
  };

  const getCardStyle = (index: number) => {
    const animationIndex = index - currentIndex;
    
    if (animationIndex >= maxVisibleCards || animationIndex < 0) {
      return { opacity: 0, transform: [{ scale: 0 }] };
    }

    const animation = cardAnimations[animationIndex];
    
    if (!animation) {
      return { opacity: 0, transform: [{ scale: 0 }] };
    }

    const scale = animation.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8 - (animationIndex * 0.05), 1 - (animationIndex * 0.05)],
      extrapolate: 'clamp',
    });

    const translateY = animation.interpolate({
      inputRange: [0, 1],
      outputRange: [50, animationIndex * cardSpacing],
      extrapolate: 'clamp',
    });

    const opacity = animation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1 - (animationIndex * 0.2)],
      extrapolate: 'clamp',
    });

    return {
      opacity,
      transform: [
        { scale },
        { translateY },
      ],
    };
  };

  const getZIndex = (index: number) => {
    const animationIndex = index - currentIndex;
    return maxVisibleCards - animationIndex;
  };

  const renderCard = (item: CachedMediaItem, index: number) => {
    const animationIndex = index - currentIndex;
    
    // Only render visible cards
    if (animationIndex >= maxVisibleCards || animationIndex < 0) {
      return null;
    }

    const isTopCard = animationIndex === 0;
    
    return (
      <Animated.View
        key={`${item.id}-${index}`}
        style={[
          styles.cardContainer,
          getCardStyle(index),
          { zIndex: getZIndex(index) },
        ]}
        pointerEvents={isTopCard ? 'auto' : 'none'}
      >
        <SwipeCard
          mediaItem={item}
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
          onUndo={isTopCard ? onUndo : undefined}
          onCommit={isTopCard ? onCommit : undefined}
          showActionBar={isTopCard && showCardActionBar}
          config={{
            swipeThreshold,
            enableHaptics,
          }}
          undoTimeoutMs={undoTimeoutMs}
        />
      </Animated.View>
    );
  };

  if (mediaItems.length === 0 || currentIndex >= mediaItems.length) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      {mediaItems.map((item, index) => renderCard(item, index))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    paddingHorizontal: SPACING.MD, // Add consistent padding
  },
  cardContainer: {
    position: 'absolute',
  },
});

export default SwipeCardStack;