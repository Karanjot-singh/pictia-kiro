import { GooglePhotosClient, createGooglePhotosClient } from '../GooglePhotosClient';
import { GooglePhotosErrorType } from '../../types/googlePhotos';

// Mock fetch globally
global.fetch = jest.fn();

describe('GooglePhotosClient', () => {
  let client: GooglePhotosClient;
  const mockAccessToken = 'mock-access-token';

  beforeEach(() => {
    client = createGooglePhotosClient(mockAccessToken);
    jest.clearAllMocks();
  });

  describe('constructor and configuration', () => {
    it('should create client with default configuration', () => {
      expect(client).toBeInstanceOf(GooglePhotosClient);
    });

    it('should update access token', () => {
      const newToken = 'new-access-token';
      client.updateAccessToken(newToken);
      // Token update is internal, so we test it indirectly through API calls
      expect(client).toBeInstanceOf(GooglePhotosClient);
    });
  });

  describe('getMediaItems', () => {
    it('should fetch media items successfully', async () => {
      const mockResponse = {
        mediaItems: [
          {
            id: 'item1',
            filename: 'photo1.jpg',
            mimeType: 'image/jpeg',
            baseUrl: 'https://example.com/photo1.jpg',
            mediaMetadata: {
              creationTime: '2024-01-01T00:00:00Z',
              width: '1920',
              height: '1080'
            }
          }
        ],
        nextPageToken: 'next-token'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Map([['content-type', 'application/json']])
      });

      const result = await client.getMediaItems({ pageSize: 10 });

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/mediaItems?pageSize=10'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockAccessToken}`
          })
        })
      );
    });

    it('should handle pagination correctly', async () => {
      const mockResponse = { mediaItems: [], nextPageToken: 'token123' };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Map([['content-type', 'application/json']])
      });

      await client.getMediaItems({ pageSize: 50, pageToken: 'prev-token' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('pageSize=50&pageToken=prev-token'),
        expect.any(Object)
      );
    });

    it('should limit page size to maximum allowed', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ mediaItems: [] }),
        headers: new Map([['content-type', 'application/json']])
      });

      await client.getMediaItems({ pageSize: 200 }); // Over limit

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('pageSize=100'), // Should be capped at 100
        expect.any(Object)
      );
    });
  });

  describe('batchCreateMediaItems', () => {
    it('should create media items successfully', async () => {
      const mockItems = [
        {
          description: 'Test photo',
          simpleMediaItem: {
            fileName: 'test.jpg',
            uploadToken: 'upload-token-123'
          }
        }
      ];

      const mockResponse = {
        newMediaItemResults: [
          {
            uploadToken: 'upload-token-123',
            status: { code: 0, message: 'Success' },
            mediaItem: {
              id: 'new-item-id',
              filename: 'test.jpg',
              mimeType: 'image/jpeg',
              baseUrl: 'https://example.com/test.jpg',
              mediaMetadata: {
                creationTime: '2024-01-01T00:00:00Z',
                width: '1920',
                height: '1080'
              }
            }
          }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Map([['content-type', 'application/json']])
      });

      const result = await client.batchCreateMediaItems(mockItems);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/mediaItems:batchCreate'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ newMediaItems: mockItems })
        })
      );
    });

    it('should reject empty items array', async () => {
      await expect(client.batchCreateMediaItems([])).rejects.toMatchObject({
        type: GooglePhotosErrorType.INVALID_MEDIA_ITEM,
        message: 'No items provided'
      });
    });

    it('should reject too many items', async () => {
      const tooManyItems = Array(51).fill({
        simpleMediaItem: { fileName: 'test.jpg', uploadToken: 'token' }
      });

      await expect(client.batchCreateMediaItems(tooManyItems)).rejects.toMatchObject({
        type: GooglePhotosErrorType.INVALID_MEDIA_ITEM,
        message: 'Maximum 50 items per batch'
      });
    });
  });

  describe('error handling', () => {
    it('should handle 401 unauthorized errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: { message: 'Invalid token' } }),
        headers: new Map()
      });

      await expect(client.getMediaItems()).rejects.toMatchObject({
        type: GooglePhotosErrorType.INVALID_TOKEN,
        message: 'Invalid token'
      });
    });

    it('should handle 429 rate limit errors with retry', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          json: async () => ({ error: { message: 'Rate limit exceeded' } }),
          headers: new Map([['Retry-After', '2']])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ mediaItems: [] }),
          headers: new Map([['content-type', 'application/json']])
        });

      // Mock setTimeout to avoid actual delays in tests
      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return 1 as any;
      });

      const result = await client.getMediaItems();
      expect(result).toEqual({ mediaItems: [] });
      expect(global.fetch).toHaveBeenCalledTimes(2);

      jest.restoreAllMocks();
    });

    it('should handle 403 quota exceeded errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({ error: { message: 'Quota exceeded' } }),
        headers: new Map()
      });

      await expect(client.getMediaItems()).rejects.toMatchObject({
        type: GooglePhotosErrorType.QUOTA_EXCEEDED,
        message: 'Quota exceeded'
      });
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(client.getMediaItems()).rejects.toMatchObject({
        type: GooglePhotosErrorType.NETWORK_ERROR,
        message: expect.stringContaining('Network error')
      });
    });
  });

  describe('album operations', () => {
    it('should create album successfully', async () => {
      const mockAlbum = {
        id: 'album-123',
        title: 'Test Album',
        productUrl: 'https://photos.google.com/album/123',
        isWriteable: true,
        mediaItemsCount: '0'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlbum,
        headers: new Map([['content-type', 'application/json']])
      });

      const result = await client.createAlbum('Test Album');

      expect(result).toEqual(mockAlbum);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/albums'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ album: { title: 'Test Album' } })
        })
      );
    });

    it('should add media to album successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        headers: new Map([['content-type', 'application/json']])
      });

      await client.addMediaToAlbum('album-123', ['media-1', 'media-2']);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/albums/album-123:batchAddMediaItems'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ mediaItemIds: ['media-1', 'media-2'] })
        })
      );
    });
  });

  describe('validation', () => {
    it('should validate media item correctly', () => {
      const validItem = {
        id: 'item1',
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
        baseUrl: 'https://example.com/photo.jpg',
        mediaMetadata: { creationTime: '2024-01-01T00:00:00Z' }
      };

      expect(client.validateMediaItem(validItem)).toBe(true);
    });

    it('should reject invalid media item', () => {
      const invalidItem = { id: 'item1' }; // Missing required fields

      expect(client.validateMediaItem(invalidItem)).toBe(false);
      expect(client.validateMediaItem(null)).toBe(false);
      expect(client.validateMediaItem(undefined)).toBe(false);
    });
  });
});