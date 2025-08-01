import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import SwipeCardStack from './SwipeCardStack';
import UndoButton from './UndoButton';
import { CachedMediaItem } from '../types';

interface SwipeCardStackWithUndoProps {
  mediaItems: CachedMediaItem[];
  currentIndex: number;
  onSwipeLeft: (item: CachedMediaItem) => void;
  onSwipeRight: (item: CachedMediaItem) => void;
  onUndo: () => void;
  canUndo: boolean;
  swipeThreshold?: number;
  enableHaptics?: boolean;
  maxVisibleCards?: number;
  cardSpacing?: number;
  undoTimeoutMs?: number;
  showUndoCountdown?: boolean;
  undoPosition?: 'top' | 'bottom';
}

const SwipeCardStackWithUndo: React.FC<SwipeCardStackWithUndoProps> = ({
  mediaItems,
  currentIndex,
  onSwipeLeft,
  onSwipeRight,
  onUndo,
  canUndo,
  swipeThreshold,
  enableHaptics = true,
  maxVisibleCards = 3,
  cardSpacing = 8,
  undoTimeoutMs = 5000,
  showUndoCountdown = true,
  undoPosition = 'bottom',
}) => {
  const [showUndo, setShowUndo] = useState(false);
  const [undoTimer, setUndoTimer] = useState<NodeJS.Timeout | null>(null);

  // Handle undo visibility based on canUndo prop
  useEffect(() => {
    if (canUndo) {
      setShowUndo(true);
      
      // Clear existing timer
      if (undoTimer) {
        clearTimeout(undoTimer);
      }

      // Set new timer to hide undo button
      const timer = setTimeout(() => {
        setShowUndo(false);
        setUndoTimer(null);
      }, undoTimeoutMs);

      setUndoTimer(timer);
    } else {
      setShowUndo(false);
      if (undoTimer) {
        clearTimeout(undoTimer);
        setUndoTimer(null);
      }
    }

    return () => {
      if (undoTimer) {
        clearTimeout(undoTimer);
      }
    };
  }, [canUndo, undoTimeoutMs]);

  const handleUndo = () => {
    setShowUndo(false);
    if (undoTimer) {
      clearTimeout(undoTimer);
      setUndoTimer(null);
    }
    onUndo();
  };

  const handleSwipeLeft = (item: CachedMediaItem) => {
    onSwipeLeft(item);
  };

  const handleSwipeRight = (item: CachedMediaItem) => {
    onSwipeRight(item);
  };

  return (
    <View style={styles.container}>
      <SwipeCardStack
        mediaItems={mediaItems}
        currentIndex={currentIndex}
        onSwipeLeft={handleSwipeLeft}
        onSwipeRight={handleSwipeRight}
        {...(swipeThreshold !== undefined && { swipeThreshold })}
        enableHaptics={enableHaptics}
        maxVisibleCards={maxVisibleCards}
        cardSpacing={cardSpacing}
        undoTimeoutMs={undoTimeoutMs}
      />
      
      <UndoButton
        visible={showUndo}
        onUndo={handleUndo}
        timeoutMs={undoTimeoutMs}
        showCountdown={showUndoCountdown}
        position={undoPosition}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
});

export default SwipeCardStackWithUndo;