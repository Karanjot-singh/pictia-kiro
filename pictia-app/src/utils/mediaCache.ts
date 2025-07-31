import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CachedMediaItem,
  MediaCacheEntry,
  CacheConfig,
  CacheStats,
  MediaCollection,
  MediaOrganizationCache
} from '../types/googlePhotos';

/**
 * Media cache management utilities for efficient storage and retrieval
 */

// Default cache configuration
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxItems: 1000,
  ttlMs: 30 * 60 * 1000, // 30 minutes
  maxMemoryMB: 50,
  enablePersistence: true,
};

// Cache keys
const CACHE_KEYS = {
  MEDIA_ITEMS: 'media_cache_items',
  CACHE_STATS: 'media_cache_stats',
  ORGANIZATION_CACHE: 'organization_cache',
  CACHE_CONFIG: 'media_cache_config',
} as const;

/**
 * In-memory cache for fast access
 */
class MediaCacheManager {
  private memoryCache = new Map<string, MediaCacheEntry>();
  private config: CacheConfig = DEFAULT_CACHE_CONFIG;
  private stats: CacheStats = {
    totalItems: 0,
    memoryUsageMB: 0,
    hitRate: 0,
    missRate: 0,
    evictionCount: 0,
    lastCleanup: Date.now(),
  };
  private hitCount = 0;
  private missCount = 0;

  constructor(config?: Partial<CacheConfig>) {
    if (config) {
      this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    }
    this.loadCacheFromStorage();
  }

  /**
   * Get item from cache
   */
  async get(itemId: string): Promise<CachedMediaItem | null> {
    const entry = this.memoryCache.get(itemId);
    
    if (!entry) {
      this.missCount++;
      this.updateHitRate();
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(itemId);
      this.missCount++;
      this.updateHitRate();
      return null;
    }

    // Update access info
    entry.accessCount++;
    entry.mediaItem.lastAccessed = Date.now();
    
    this.hitCount++;
    this.updateHitRate();
    
    return entry.mediaItem;
  }

  /**
   * Set item in cache
   */
  async set(mediaItem: CachedMediaItem, tags: string[] = []): Promise<void> {
    const now = Date.now();
    const entry: MediaCacheEntry = {
      mediaItem: {
        ...mediaItem,
        cachedAt: now,
        lastAccessed: now,
      },
      expiresAt: now + this.config.ttlMs,
      accessCount: 1,
      tags,
    };

    this.memoryCache.set(mediaItem.id, entry);
    
    // Check if we need to evict items
    await this.evictIfNeeded();
    
    // Update stats
    this.updateStats();
    
    // Persist to storage if enabled
    if (this.config.enablePersistence) {
      await this.persistToStorage();
    }
  }

  /**
   * Set multiple items in cache
   */
  async setMany(mediaItems: CachedMediaItem[], tags: string[] = []): Promise<void> {
    const now = Date.now();
    
    for (const mediaItem of mediaItems) {
      const entry: MediaCacheEntry = {
        mediaItem: {
          ...mediaItem,
          cachedAt: now,
          lastAccessed: now,
        },
        expiresAt: now + this.config.ttlMs,
        accessCount: 1,
        tags,
      };
      
      this.memoryCache.set(mediaItem.id, entry);
    }
    
    await this.evictIfNeeded();
    this.updateStats();
    
    if (this.config.enablePersistence) {
      await this.persistToStorage();
    }
  }

  /**
   * Remove item from cache
   */
  async remove(itemId: string): Promise<void> {
    this.memoryCache.delete(itemId);
    this.updateStats();
    
    if (this.config.enablePersistence) {
      await this.persistToStorage();
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    this.resetStats();
    
    if (this.config.enablePersistence) {
      await AsyncStorage.removeItem(CACHE_KEYS.MEDIA_ITEMS);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get all cached items
   */
  getAllItems(): CachedMediaItem[] {
    return Array.from(this.memoryCache.values()).map(entry => entry.mediaItem);
  }

  /**
   * Get items by tags
   */
  getItemsByTags(tags: string[]): CachedMediaItem[] {
    const items: CachedMediaItem[] = [];
    
    for (const entry of this.memoryCache.values()) {
      if (tags.some(tag => entry.tags.includes(tag))) {
        items.push(entry.mediaItem);
      }
    }
    
    return items;
  }

  /**
   * Update cache configuration
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Save config to storage
    if (this.config.enablePersistence) {
      AsyncStorage.setItem(CACHE_KEYS.CACHE_CONFIG, JSON.stringify(this.config));
    }
  }

  /**
   * Cleanup expired items
   */
  async cleanup(): Promise<number> {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [itemId, entry] of this.memoryCache.entries()) {
      if (now > entry.expiresAt) {
        this.memoryCache.delete(itemId);
        removedCount++;
      }
    }
    
    this.stats.lastCleanup = now;
    this.updateStats();
    
    if (this.config.enablePersistence && removedCount > 0) {
      await this.persistToStorage();
    }
    
    return removedCount;
  }

  /**
   * Evict items if cache is full
   */
  private async evictIfNeeded(): Promise<void> {
    if (this.memoryCache.size <= this.config.maxItems) {
      return;
    }

    // Sort by access count and last accessed time (LRU)
    const entries = Array.from(this.memoryCache.entries()).sort(([, a], [, b]) => {
      if (a.accessCount !== b.accessCount) {
        return a.accessCount - b.accessCount;
      }
      return a.mediaItem.lastAccessed - b.mediaItem.lastAccessed;
    });

    // Remove oldest/least accessed items
    const itemsToRemove = entries.slice(0, Math.floor(this.config.maxItems * 0.1)); // Remove 10%
    
    for (const [itemId] of itemsToRemove) {
      this.memoryCache.delete(itemId);
      this.stats.evictionCount++;
    }
  }

  /**
   * Update hit rate statistics
   */
  private updateHitRate(): void {
    const total = this.hitCount + this.missCount;
    if (total > 0) {
      this.stats.hitRate = this.hitCount / total;
      this.stats.missRate = this.missCount / total;
    }
  }

  /**
   * Update cache statistics
   */
  private updateStats(): void {
    this.stats.totalItems = this.memoryCache.size;
    
    // Estimate memory usage (rough calculation)
    let memoryUsage = 0;
    for (const entry of this.memoryCache.values()) {
      memoryUsage += JSON.stringify(entry).length * 2; // Rough estimate in bytes
    }
    this.stats.memoryUsageMB = memoryUsage / (1024 * 1024);
  }

  /**
   * Reset statistics
   */
  private resetStats(): void {
    this.stats = {
      totalItems: 0,
      memoryUsageMB: 0,
      hitRate: 0,
      missRate: 0,
      evictionCount: 0,
      lastCleanup: Date.now(),
    };
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Load cache from persistent storage
   */
  private async loadCacheFromStorage(): Promise<void> {
    if (!this.config.enablePersistence) {
      return;
    }

    try {
      // Load config
      const configData = await AsyncStorage.getItem(CACHE_KEYS.CACHE_CONFIG);
      if (configData) {
        const savedConfig = JSON.parse(configData);
        this.config = { ...DEFAULT_CACHE_CONFIG, ...savedConfig };
      }

      // Load cache items
      const cacheData = await AsyncStorage.getItem(CACHE_KEYS.MEDIA_ITEMS);
      if (cacheData) {
        const entries: [string, MediaCacheEntry][] = JSON.parse(cacheData);
        const now = Date.now();
        
        // Filter out expired items
        for (const [itemId, entry] of entries) {
          if (now <= entry.expiresAt) {
            this.memoryCache.set(itemId, entry);
          }
        }
      }

      // Load stats
      const statsData = await AsyncStorage.getItem(CACHE_KEYS.CACHE_STATS);
      if (statsData) {
        this.stats = { ...this.stats, ...JSON.parse(statsData) };
      }

      this.updateStats();
    } catch (error) {
      console.warn('Failed to load cache from storage:', error);
    }
  }

  /**
   * Persist cache to storage
   */
  private async persistToStorage(): Promise<void> {
    if (!this.config.enablePersistence) {
      return;
    }

    try {
      const entries = Array.from(this.memoryCache.entries());
      await AsyncStorage.setItem(CACHE_KEYS.MEDIA_ITEMS, JSON.stringify(entries));
      await AsyncStorage.setItem(CACHE_KEYS.CACHE_STATS, JSON.stringify(this.stats));
    } catch (error) {
      console.warn('Failed to persist cache to storage:', error);
    }
  }
}

// Global cache instance
let globalCacheInstance: MediaCacheManager | null = null;

/**
 * Get the global cache instance
 */
export function getMediaCache(config?: Partial<CacheConfig>): MediaCacheManager {
  if (!globalCacheInstance) {
    globalCacheInstance = new MediaCacheManager(config);
  }
  return globalCacheInstance;
}

/**
 * Organization cache utilities
 */
export class OrganizationCacheManager {
  private static readonly CACHE_KEY = CACHE_KEYS.ORGANIZATION_CACHE;

  /**
   * Save organization session to cache
   */
  static async saveSession(cache: MediaOrganizationCache): Promise<void> {
    try {
      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.warn('Failed to save organization session:', error);
    }
  }

  /**
   * Load organization session from cache
   */
  static async loadSession(): Promise<MediaOrganizationCache | null> {
    try {
      const data = await AsyncStorage.getItem(this.CACHE_KEY);
      if (data) {
        const cache: MediaOrganizationCache = JSON.parse(data);
        
        // Check if cache is still valid (not older than 1 hour)
        const maxAge = 60 * 60 * 1000; // 1 hour
        if (Date.now() - cache.lastModified < maxAge) {
          return cache;
        }
      }
      return null;
    } catch (error) {
      console.warn('Failed to load organization session:', error);
      return null;
    }
  }

  /**
   * Clear organization session cache
   */
  static async clearSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.CACHE_KEY);
    } catch (error) {
      console.warn('Failed to clear organization session:', error);
    }
  }
}

/**
 * Cache utilities for collections
 */
export const CollectionCacheUtils = {
  /**
   * Merge media collections for pagination
   */
  mergeCollections(existing: MediaCollection, newData: MediaCollection): MediaCollection {
    const existingIds = new Set(existing.items.map(item => item.id));
    const newItems = newData.items.filter(item => !existingIds.has(item.id));
    
    return {
      items: [...existing.items, ...newItems],
      nextPageToken: newData.nextPageToken,
      totalCount: newData.totalCount || existing.totalCount,
      lastUpdated: newData.lastUpdated,
      cacheKey: newData.cacheKey,
    } as MediaCollection;
  },

  /**
   * Filter collection by organization status
   */
  filterByStatus(
    collection: MediaCollection,
    status: CachedMediaItem['organizationStatus']
  ): MediaCollection {
    return {
      ...collection,
      items: collection.items.filter(item => item.organizationStatus === status),
    };
  },

  /**
   * Sort collection items
   */
  sortCollection(
    collection: MediaCollection,
    sortBy: 'creationTime' | 'filename' | 'lastAccessed',
    order: 'asc' | 'desc' = 'desc'
  ): MediaCollection {
    const sortedItems = [...collection.items].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'creationTime':
          aValue = new Date(a.mediaMetadata.creationTime).getTime();
          bValue = new Date(b.mediaMetadata.creationTime).getTime();
          break;
        case 'filename':
          aValue = a.filename.toLowerCase();
          bValue = b.filename.toLowerCase();
          break;
        case 'lastAccessed':
          aValue = a.lastAccessed;
          bValue = b.lastAccessed;
          break;
        default:
          return 0;
      }
      
      const result = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return order === 'desc' ? -result : result;
    });

    return {
      ...collection,
      items: sortedItems,
    };
  },

  /**
   * Get collection statistics
   */
  getCollectionStats(collection: MediaCollection) {
    const now = Date.now();
    const statusCounts = collection.items.reduce((acc, item) => {
      const status = item.organizationStatus || 'pending';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalItems: collection.items.length,
      statusCounts,
      averageAge: collection.items.length > 0 
        ? collection.items.reduce((sum, item) => sum + (now - item.cachedAt), 0) / collection.items.length
        : 0,
      oldestItem: Math.min(...collection.items.map(item => item.cachedAt)),
      newestItem: Math.max(...collection.items.map(item => item.cachedAt)),
    };
  },
};

/**
 * Cache cleanup utilities
 */
export const CacheCleanupUtils = {
  /**
   * Cleanup expired cache entries
   */
  async cleanupExpiredEntries(): Promise<void> {
    const cache = getMediaCache();
    await cache.cleanup();
  },

  /**
   * Cleanup old organization sessions
   */
  async cleanupOldSessions(): Promise<void> {
    await OrganizationCacheManager.clearSession();
  },

  /**
   * Full cache cleanup
   */
  async fullCleanup(): Promise<void> {
    await Promise.all([
      this.cleanupExpiredEntries(),
      this.cleanupOldSessions(),
    ]);
  },

  /**
   * Get cache size information
   */
  async getCacheSizeInfo(): Promise<{
    mediaCache: number;
    organizationCache: number;
    totalSizeMB: number;
  }> {
    const cache = getMediaCache();
    const stats = cache.getStats();
    
    // Estimate organization cache size
    let orgCacheSize = 0;
    try {
      const orgData = await AsyncStorage.getItem(CACHE_KEYS.ORGANIZATION_CACHE);
      if (orgData) {
        orgCacheSize = orgData.length * 2; // Rough estimate in bytes
      }
    } catch (error) {
      // Ignore errors
    }

    return {
      mediaCache: stats.totalItems,
      organizationCache: orgCacheSize,
      totalSizeMB: stats.memoryUsageMB + (orgCacheSize / (1024 * 1024)),
    };
  },
};