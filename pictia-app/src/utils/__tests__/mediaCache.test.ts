import { getMediaCache, OrganizationCacheManager, CollectionCacheUtils } from '../mediaCache';
import { CachedMediaItem, MediaCollection, MediaOrganizationCache } from '../../types/googlePhotos';

// Mock AsyncStorage
const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock React for the pagination hook
jest.mock('react', () => ({
  useState: jest.fn(),
  useCallback: jest.fn(),
  useMemo: jest.fn(),
}));

describe('MediaCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the global cache instance
    (global as any).globalCacheInstance = null;
  });

  describe('MediaCacheManager', () => {
    const mockMediaItem: CachedMediaItem = {
      id: 'test-item-1',
      filename: 'test.jpg',
      mimeType: 'image/jpeg',
      baseUrl: 'https://example.com/test.jpg',
      mediaMetadata: {
        creationTime: '2024-01-01T00:00:00Z',
        width: '1920',
        height: '1080',
      },
      cachedAt: Date.now(),
      lastAccessed: Date.now(),
      organizationStatus: 'pending',
    };

    it('should store and retrieve items from cache', async () => {
      const cache = getMediaCache();
      
      await cache.set(mockMediaItem);
      const retrieved = await cache.get(mockMediaItem.id);
      
      expect(retrieved).toEqual(expect.objectContaining({
        id: mockMediaItem.id,
        filename: mockMediaItem.filename,
        organizationStatus: 'pending',
      }));
    });

    it('should return null for non-existent items', async () => {
      const cache = getMediaCache();
      const retrieved = await cache.get('non-existent-id');
      
      expect(retrieved).toBeNull();
    });

    it('should handle expired items', async () => {
      const cache = getMediaCache({ ttlMs: 100 }); // 100ms TTL
      
      await cache.set(mockMediaItem);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const retrieved = await cache.get(mockMediaItem.id);
      expect(retrieved).toBeNull();
    });

    it('should store multiple items', async () => {
      const cache = getMediaCache();
      const items = [
        { ...mockMediaItem, id: 'item-1' },
        { ...mockMediaItem, id: 'item-2' },
        { ...mockMediaItem, id: 'item-3' },
      ];
      
      await cache.setMany(items);
      
      for (const item of items) {
        const retrieved = await cache.get(item.id);
        expect(retrieved?.id).toBe(item.id);
      }
    });

    it('should update cache statistics', async () => {
      const cache = getMediaCache();
      
      await cache.set(mockMediaItem);
      await cache.get(mockMediaItem.id); // Hit
      await cache.get('non-existent'); // Miss
      
      const stats = cache.getStats();
      expect(stats.totalItems).toBe(1);
      expect(stats.hitRate).toBeGreaterThan(0);
      expect(stats.missRate).toBeGreaterThan(0);
    });

    it('should cleanup expired items', async () => {
      const cache = getMediaCache({ ttlMs: 100 });
      
      await cache.set(mockMediaItem);
      expect(cache.getStats().totalItems).toBe(1);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const removedCount = await cache.cleanup();
      expect(removedCount).toBe(1);
      expect(cache.getStats().totalItems).toBe(0);
    });

    it('should clear all cache', async () => {
      const cache = getMediaCache();
      
      await cache.set(mockMediaItem);
      expect(cache.getStats().totalItems).toBe(1);
      
      await cache.clear();
      expect(cache.getStats().totalItems).toBe(0);
    });

    it('should get items by tags', async () => {
      const cache = getMediaCache();
      
      await cache.set(mockMediaItem, ['photos', 'recent']);
      await cache.set({ ...mockMediaItem, id: 'item-2' }, ['videos']);
      
      const photoItems = cache.getItemsByTags(['photos']);
      expect(photoItems).toHaveLength(1);
      expect(photoItems[0]?.id).toBe(mockMediaItem.id);
    });
  });

  describe('OrganizationCacheManager', () => {
    const mockOrganizationCache: MediaOrganizationCache = {
      sessionId: 'test-session',
      mediaItems: [],
      decisions: {},
      undoStack: [],
      currentIndex: 0,
      lastModified: Date.now(),
    };

    it('should save and load organization session', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockOrganizationCache));
      
      await OrganizationCacheManager.saveSession(mockOrganizationCache);
      const loaded = await OrganizationCacheManager.loadSession();
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
      expect(loaded).toEqual(mockOrganizationCache);
    });

    it('should return null for expired session', async () => {
      const expiredCache = {
        ...mockOrganizationCache,
        lastModified: Date.now() - (2 * 60 * 60 * 1000), // 2 hours ago
      };
      
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(expiredCache));
      
      const loaded = await OrganizationCacheManager.loadSession();
      expect(loaded).toBeNull();
    });

    it('should clear organization session', async () => {
      await OrganizationCacheManager.clearSession();
      expect(mockAsyncStorage.removeItem).toHaveBeenCalled();
    });
  });

  describe('CollectionCacheUtils', () => {
    const mockMediaItem: CachedMediaItem = {
      id: 'test-item-1',
      filename: 'test.jpg',
      mimeType: 'image/jpeg',
      baseUrl: 'https://example.com/test.jpg',
      mediaMetadata: {
        creationTime: '2024-01-01T00:00:00Z',
        width: '1920',
        height: '1080',
      },
      cachedAt: Date.now(),
      lastAccessed: Date.now(),
      organizationStatus: 'pending',
    };

    const mockCollection1: MediaCollection = {
      items: [
        { ...mockMediaItem, id: 'item-1' } as CachedMediaItem,
        { ...mockMediaItem, id: 'item-2' } as CachedMediaItem,
      ],
      nextPageToken: 'token-1',
      lastUpdated: Date.now(),
      cacheKey: 'collection-1',
    };

    const mockCollection2: MediaCollection = {
      items: [
        { ...mockMediaItem, id: 'item-3' } as CachedMediaItem,
        { ...mockMediaItem, id: 'item-4' } as CachedMediaItem,
      ],
      nextPageToken: 'token-2',
      lastUpdated: Date.now(),
      cacheKey: 'collection-2',
    };

    it('should merge collections without duplicates', () => {
      const merged = CollectionCacheUtils.mergeCollections(mockCollection1, mockCollection2);
      
      expect(merged.items).toHaveLength(4);
      expect(merged.nextPageToken).toBe('token-2');
      expect(merged.items.map(item => item.id)).toEqual(['item-1', 'item-2', 'item-3', 'item-4']);
    });

    it('should filter collection by organization status', () => {
      const collection: MediaCollection = {
        items: [
          { ...mockMediaItem, id: 'item-1', organizationStatus: 'keep' } as CachedMediaItem,
          { ...mockMediaItem, id: 'item-2', organizationStatus: 'delete' } as CachedMediaItem,
          { ...mockMediaItem, id: 'item-3', organizationStatus: 'pending' } as CachedMediaItem,
        ],
        nextPageToken: undefined,
        lastUpdated: Date.now(),
        cacheKey: 'test-collection',
      };

      const keepItems = CollectionCacheUtils.filterByStatus(collection, 'keep');
      expect(keepItems.items).toHaveLength(1);
      expect(keepItems.items[0]?.id).toBe('item-1');
    });

    it('should sort collection by creation time', () => {
      const collection: MediaCollection = {
        items: [
          {
            ...mockMediaItem,
            id: 'item-1',
            mediaMetadata: { ...mockMediaItem.mediaMetadata, creationTime: '2024-01-03T00:00:00Z' }
          } as CachedMediaItem,
          {
            ...mockMediaItem,
            id: 'item-2',
            mediaMetadata: { ...mockMediaItem.mediaMetadata, creationTime: '2024-01-01T00:00:00Z' }
          } as CachedMediaItem,
          {
            ...mockMediaItem,
            id: 'item-3',
            mediaMetadata: { ...mockMediaItem.mediaMetadata, creationTime: '2024-01-02T00:00:00Z' }
          } as CachedMediaItem,
        ],
        nextPageToken: undefined,
        lastUpdated: Date.now(),
        cacheKey: 'test-collection',
      };

      const sorted = CollectionCacheUtils.sortCollection(collection, 'creationTime', 'asc');
      expect(sorted.items.map(item => item.id)).toEqual(['item-2', 'item-3', 'item-1']);
    });

    it('should get collection statistics', () => {
      const collection: MediaCollection = {
        items: [
          { ...mockMediaItem, id: 'item-1', organizationStatus: 'keep' } as CachedMediaItem,
          { ...mockMediaItem, id: 'item-2', organizationStatus: 'delete' } as CachedMediaItem,
          { ...mockMediaItem, id: 'item-3', organizationStatus: 'pending' } as CachedMediaItem,
        ],
        nextPageToken: undefined,
        lastUpdated: Date.now(),
        cacheKey: 'test-collection',
      };

      const stats = CollectionCacheUtils.getCollectionStats(collection);
      expect(stats.totalItems).toBe(3);
      expect(stats.statusCounts).toEqual({
        keep: 1,
        delete: 1,
        pending: 1,
      });
    });
  });
});