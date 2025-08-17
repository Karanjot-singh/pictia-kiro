import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import SwipeCardStack from './SwipeCardStack';
import CardActionBar from './CardActionBar';
import { CachedMediaItem } from '../types';

interface SwipeCardStackWithUndoProps {
  mediaItems: CachedMediaItem[];
  currentIndex: number;
  onSwipeLeft: (item: CachedMediaItem) => void;
  onSwipeRight: (item: CachedMediaItem) => void;
  onUndo: () => void;
  onCommit?: () => void;
  canUndo: boolean;
  canCommit?: boolean;
  swipeThreshold?: number;
  enableHaptics?: boolean;
  maxVisibleCards?: number;
  cardSpacing?: number;
  undoTimeoutMs?: number;
  showActionBar?: boolean;
  actionBarPosition?: 'top' | 'bottom';
}

const SwipeCardStackWithUndo: React.FC<SwipeCardStackWithUndoProps> = ({
  mediaItems,
  currentIndex,
  onSwipeLeft,
  onSwipeRight,
  onUndo,
  onCommit,
  canUndo,
  canCommit = false,
  swipeThreshold,
  enableHaptics = true,
  maxVisibleCards = 3,
  cardSpacing = 8,
  undoTimeoutMs = 5000,
  showActionBar: showActionBarProp = true,
  actionBarPosition = 'bottom',
}) => {
  const [showActionBar, setShowActionBar] = useState(false);
  const [actionBarTimer, setActionBarTimer] = useState<NodeJS.Timeout | null>(null);

  // Handle action bar visibility based on canUndo or canCommit props
  useEffect(() => {
    const shouldShow = canUndo || canCommit;
    
    if (shouldShow) {
      setShowActionBar(true);
      
      // Clear existing timer
      if (actionBarTimer) {
        clearTimeout(actionBarTimer);
      }

      // Set new timer to hide action bar (only if just undo, not if commit is available)
      if (canUndo && !canCommit) {
        const timer = setTimeout(() => {
          setShowActionBar(false);
          setActionBarTimer(null);
        }, undoTimeoutMs);

        setActionBarTimer(timer);
      }
    } else {
      setShowActionBar(false);
      if (actionBarTimer) {
        clearTimeout(actionBarTimer);
        setActionBarTimer(null);
      }
    }

    return () => {
      if (actionBarTimer) {
        clearTimeout(actionBarTimer);
      }
    };
  }, [canUndo, canCommit, undoTimeoutMs]);

  const handleUndo = () => {
    if (actionBarTimer) {
      clearTimeout(actionBarTimer);
      setActionBarTimer(null);
    }
    onUndo();
  };

  const handleCommit = () => {
    setShowActionBar(false);
    if (actionBarTimer) {
      clearTimeout(actionBarTimer);
      setActionBarTimer(null);
    }
    onCommit?.();
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
        onUndo={handleUndo}
        onCommit={handleCommit}
        {...(swipeThreshold !== undefined && { swipeThreshold })}
        enableHaptics={enableHaptics}
        maxVisibleCards={maxVisibleCards}
        cardSpacing={cardSpacing}
        undoTimeoutMs={undoTimeoutMs}
        showCardActionBar={showActionBarProp}
      />
      
      <CardActionBar
        visible={showActionBarProp && showActionBar}
        onUndo={canUndo ? handleUndo : undefined}
        onCommit={canCommit ? handleCommit : undefined}
        position={actionBarPosition}
        enableHaptics={enableHaptics}
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