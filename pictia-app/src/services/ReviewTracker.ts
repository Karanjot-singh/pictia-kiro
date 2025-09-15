import AsyncStorage from '@react-native-async-storage/async-storage';
import { CachedMediaItem } from '@/types';

interface ReviewStatus {
  mediaItemId: string;
  isReviewed: boolean;
  lastReviewedAt: number;
  reviewAction?: 'keep' | 'delete';
  sessionId?: string;
}

interface ReviewStats {
  total: number;
  reviewed: number;
  kept: number;
  deleted: number;
  lastUpdated: number;
}

class ReviewTracker {
  private static instance: ReviewTracker;
  private reviewCache: Map<string, ReviewStatus> = new Map();
  private unreviewedQueue: CachedMediaItem[] = [];
  private isInitialized = false;
  private readonly STORAGE_KEY = 'photo_review_status';
  private readonly STATS_KEY = 'photo_review_stats';
  private readonly QUEUE_KEY = 'unreviewed_photo_queue';

  private constructor() {}

  static getInstance(): ReviewTracker {
    if (!ReviewTracker.instance) {
      ReviewTracker.instance = new ReviewTracker();
    }
    return ReviewTracker.instance;
  }

  /**
   * Initialize the review tracker by loading data from storage
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const storedData = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (storedData) {
        try {
          const reviewData: ReviewStatus[] = JSON.parse(storedData);
          this.reviewCache.clear();
          reviewData.forEach(status => {
            if (status && status.mediaItemId) {
              this.reviewCache.set(status.mediaItemId, status);
            }
          });
        } catch (parseError) {
          console.error('Failed to parse review data, clearing storage:', parseError);
          await AsyncStorage.removeItem(this.STORAGE_KEY);
        }
      }

      // Load unreviewed queue
      const queueData = await AsyncStorage.getItem(this.QUEUE_KEY);
      if (queueData) {
        try {
          const parsedQueue = JSON.parse(queueData);
          if (Array.isArray(parsedQueue)) {
            this.unreviewedQueue = parsedQueue.filter(item => item && item.id);
          }
        } catch (parseError) {
          console.error('Failed to parse queue data, clearing storage:', parseError);
          await AsyncStorage.removeItem(this.QUEUE_KEY);
          this.unreviewedQueue = [];
        }
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize ReviewTracker:', error);
      this.isInitialized = true; // Continue with empty cache
    }
  }

  /**
   * Mark a photo as reviewed with optional action
   */
  async markAsReviewed(
    mediaItemId: string,
    action?: 'keep' | 'delete',
    sessionId?: string
  ): Promise<void> {
    await this.initialize();

    const reviewStatus: ReviewStatus = {
      mediaItemId,
      isReviewed: true,
      lastReviewedAt: Date.now(),
      ...(action && { reviewAction: action }),
      ...(sessionId && { sessionId }),
    };

    this.reviewCache.set(mediaItemId, reviewStatus);
    
    // Remove from unreviewed queue if present
    this.unreviewedQueue = this.unreviewedQueue.filter(item => item.id !== mediaItemId);
    
    await this.persistToStorage();
  }

  /**
   * Check if a photo has been reviewed
   */
  async isReviewed(mediaItemId: string): Promise<boolean> {
    try {
      await this.initialize();
      const status = this.reviewCache.get(mediaItemId);
      return status?.isReviewed ?? false;
    } catch (error) {
      console.error('Error checking review status:', error);
      return false;
    }
  }

  /**
   * Get review status for a specific photo
   */
  async getReviewStatus(mediaItemId: string): Promise<ReviewStatus | null> {
    await this.initialize();
    return this.reviewCache.get(mediaItemId) || null;
  }

  /**
   * Get all unreviewed photos from a list
   */
  async getUnreviewedPhotos(allPhotos: CachedMediaItem[]): Promise<CachedMediaItem[]> {
    await this.initialize();
    
    const unreviewed = allPhotos.filter(photo => {
      const status = this.reviewCache.get(photo.id);
      // Default to unreviewed if no status exists
      return !status || !status.isReviewed;
    });

    // Update the unreviewed queue with fresh data
    this.unreviewedQueue = unreviewed.sort((a, b) => {
      // Sort by creation time (newest first) for natural progression
      try {
        const timeA = new Date(a.mediaMetadata?.creationTime || 0).getTime();
        const timeB = new Date(b.mediaMetadata?.creationTime || 0).getTime();
        return timeB - timeA; // Changed to newest first
      } catch (error) {
        console.warn('Error sorting photos by creation time:', error);
        return 0;
      }
    });

    await this.persistQueueToStorage();
    return this.unreviewedQueue;
  }

  /**
   * Get all reviewed photos from a list
   */
  async getReviewedPhotos(allPhotos: CachedMediaItem[]): Promise<CachedMediaItem[]> {
    await this.initialize();
    
    return allPhotos.filter(photo => {
      const status = this.reviewCache.get(photo.id);
      return status?.isReviewed;
    });
  }

  /**
   * Get photos by review action
   */
  async getPhotosByAction(
    allPhotos: CachedMediaItem[],
    action: 'keep' | 'delete'
  ): Promise<CachedMediaItem[]> {
    await this.initialize();
    
    return allPhotos.filter(photo => {
      const status = this.reviewCache.get(photo.id);
      return status?.reviewAction === action;
    });
  }

  /**
   * Mark multiple photos as reviewed
   */
  async markMultipleAsReviewed(
    mediaItemIds: string[],
    action?: 'keep' | 'delete',
    sessionId?: string
  ): Promise<void> {
    await this.initialize();

    const timestamp = Date.now();
    mediaItemIds.forEach(mediaItemId => {
      const reviewStatus: ReviewStatus = {
        mediaItemId,
        isReviewed: true,
        lastReviewedAt: timestamp,
        ...(action && { reviewAction: action }),
        ...(sessionId && { sessionId }),
      };
      this.reviewCache.set(mediaItemId, reviewStatus);
    });

    await this.persistToStorage();
  }

  /**
   * Remove review status for a photo (mark as unreviewed)
   */
  async removeReviewStatus(mediaItemId: string): Promise<void> {
    await this.initialize();
    this.reviewCache.delete(mediaItemId);
    
    // Note: We don't add back to unreviewed queue here as it will be rebuilt
    // when the queue is refreshed from the main photo list
    
    await this.persistToStorage();
  }

  /**
   * Clear all review history
   */
  async clearReviewHistory(): Promise<void> {
    this.reviewCache.clear();
    this.unreviewedQueue = [];
    await AsyncStorage.removeItem(this.STORAGE_KEY);
    await AsyncStorage.removeItem(this.STATS_KEY);
    await AsyncStorage.removeItem(this.QUEUE_KEY);
  }

  /**
   * Clear review history for a specific session
   */
  async clearSessionHistory(sessionId: string): Promise<void> {
    await this.initialize();
    
    const toRemove: string[] = [];
    this.reviewCache.forEach((status, mediaItemId) => {
      if (status.sessionId === sessionId) {
        toRemove.push(mediaItemId);
      }
    });

    toRemove.forEach(mediaItemId => {
      this.reviewCache.delete(mediaItemId);
    });

    await this.persistToStorage();
  }

  /**
   * Get review statistics
   */
  async getReviewStats(): Promise<ReviewStats> {
    await this.initialize();

    let reviewed = 0;
    let kept = 0;
    let deleted = 0;

    this.reviewCache.forEach(status => {
      if (status.isReviewed) {
        reviewed++;
        if (status.reviewAction === 'keep') kept++;
        if (status.reviewAction === 'delete') deleted++;
      }
    });

    return {
      total: this.reviewCache.size,
      reviewed,
      kept,
      deleted,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Get photos reviewed in a date range
   */
  async getPhotosReviewedInRange(
    allPhotos: CachedMediaItem[],
    startDate: Date,
    endDate: Date
  ): Promise<CachedMediaItem[]> {
    await this.initialize();
    
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();

    return allPhotos.filter(photo => {
      const status = this.reviewCache.get(photo.id);
      return status?.isReviewed && 
             status.lastReviewedAt >= startTime && 
             status.lastReviewedAt <= endTime;
    });
  }

  /**
   * Export review data for backup or transfer
   */
  async exportReviewData(): Promise<ReviewStatus[]> {
    await this.initialize();
    return Array.from(this.reviewCache.values());
  }

  /**
   * Import review data from backup
   */
  async importReviewData(reviewData: ReviewStatus[]): Promise<void> {
    this.reviewCache.clear();
    reviewData.forEach(status => {
      this.reviewCache.set(status.mediaItemId, status);
    });
    await this.persistToStorage();
  }

  /**
   * Get review status for multiple photos efficiently
   */
  async getMultipleReviewStatus(mediaItemIds: string[]): Promise<Map<string, boolean>> {
    await this.initialize();
    
    const statusMap = new Map<string, boolean>();
    mediaItemIds.forEach(id => {
      const status = this.reviewCache.get(id);
      statusMap.set(id, status?.isReviewed ?? false);
    });
    
    return statusMap;
  }

  /**
   * Persist review data to AsyncStorage
   */
  private async persistToStorage(): Promise<void> {
    try {
      const reviewData = Array.from(this.reviewCache.values());
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(reviewData));
      
      // Also update stats
      const stats = await this.getReviewStats();
      await AsyncStorage.setItem(this.STATS_KEY, JSON.stringify(stats));
      
      // Persist queue
      await this.persistQueueToStorage();
    } catch (error) {
      console.error('Failed to persist review data:', error);
    }
  }

  /**
   * Persist unreviewed queue to AsyncStorage
   */
  private async persistQueueToStorage(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(this.unreviewedQueue));
    } catch (error) {
      console.error('Failed to persist unreviewed queue:', error);
    }
  }

  /**
   * Get the next unreviewed photo from the queue
   */
  async getNextUnreviewedPhoto(): Promise<CachedMediaItem | null> {
    await this.initialize();
    
    // Filter out any photos that have been reviewed since queue was last updated
    this.unreviewedQueue = this.unreviewedQueue.filter(photo => {
      const status = this.reviewCache.get(photo.id);
      return !status?.isReviewed;
    });

    return this.unreviewedQueue.length > 0 ? (this.unreviewedQueue[0] || null) : null;
  }

  /**
   * Get the current unreviewed queue
   */
  async getUnreviewedQueue(): Promise<CachedMediaItem[]> {
    try {
      await this.initialize();
      
      // Filter out any photos that have been reviewed since queue was last updated
      this.unreviewedQueue = this.unreviewedQueue.filter(photo => {
        const status = this.reviewCache.get(photo.id);
        // Default to unreviewed if no status exists
        return !status || !status.isReviewed;
      });

      return [...this.unreviewedQueue];
    } catch (error) {
      console.error('Error getting unreviewed queue:', error);
      return [];
    }
  }

  /**
   * Refresh the unreviewed queue with new photo data
   */
  async refreshUnreviewedQueue(allPhotos: CachedMediaItem[]): Promise<void> {
    try {
      await this.initialize();
      
      const unreviewed = allPhotos.filter(photo => {
        const status = this.reviewCache.get(photo.id);
        // Default to unreviewed if no status exists
        return !status || !status.isReviewed;
      });

      // Sort by creation time (newest first) for natural progression
      this.unreviewedQueue = unreviewed.sort((a, b) => {
        try {
          const timeA = new Date(a.mediaMetadata?.creationTime || 0).getTime();
          const timeB = new Date(b.mediaMetadata?.creationTime || 0).getTime();
          return timeB - timeA; // Changed to newest first
        } catch (error) {
          console.warn('Error sorting photos by creation time:', error);
          return 0;
        }
      });

      await this.persistQueueToStorage();
    } catch (error) {
      console.error('Error refreshing unreviewed queue:', error);
    }
  }

  /**
   * Reset all review data (for debugging or fresh start)
   */
  async resetAllReviewData(): Promise<void> {
    try {
      this.reviewCache.clear();
      this.unreviewedQueue = [];
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      await AsyncStorage.removeItem(this.STATS_KEY);
      await AsyncStorage.removeItem(this.QUEUE_KEY);
      console.log('All review data has been reset');
    } catch (error) {
      console.error('Failed to reset review data:', error);
    }
  }

  /**
   * Clean up old review data (older than specified days)
   */
  async cleanupOldReviews(daysToKeep: number = 30): Promise<number> {
    try {
      await this.initialize();
      
      const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
      let removedCount = 0;

      const toRemove: string[] = [];
      this.reviewCache.forEach((status, mediaItemId) => {
        if (status && status.lastReviewedAt && status.lastReviewedAt < cutoffTime) {
          toRemove.push(mediaItemId);
        }
      });

      toRemove.forEach(mediaItemId => {
        this.reviewCache.delete(mediaItemId);
        removedCount++;
      });

      if (removedCount > 0) {
        await this.persistToStorage();
      }

      return removedCount;
    } catch (error) {
      console.error('Error cleaning up old reviews:', error);
      return 0;
    }
  }
}

export default ReviewTracker;