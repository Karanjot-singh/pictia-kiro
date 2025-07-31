import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import {
  MediaItemsResponse,
  BatchCreateResponse,
  NewMediaItem,
  Album,
  SharedAlbumsResponse,
  PaginationOptions,
  Filters,
  MediaItem,
  GooglePhotosErrorType,
  CachedMediaItem,
  MediaCollection,
  MediaQueryParams,
  BatchOperationResult,
  MediaItemValidationResult
} from '../../types/googlePhotos';
import { RootState } from '../index';
import { validateMediaItem, validateMediaItemBatch } from '../../utils/mediaValidation';

// Base query with authentication
const baseQuery = fetchBaseQuery({
  baseUrl: 'https://photoslibrary.googleapis.com/v1',
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;
    const token = state.auth.accessToken;
    
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    
    headers.set('content-type', 'application/json');
    return headers;
  },
});

// Enhanced base query with error handling and retry logic
const baseQueryWithRetry = async (args: any, api: any, extraOptions: any) => {
  let result = await baseQuery(args, api, extraOptions);
  
  // Handle rate limiting with retry
  if (result.error && result.error.status === 429) {
    const retryAfter = result.meta?.response?.headers?.get('Retry-After');
    const delay = retryAfter ? parseInt(retryAfter) * 1000 : 1000;
    
    // Wait and retry once
    await new Promise(resolve => setTimeout(resolve, delay));
    result = await baseQuery(args, api, extraOptions);
  }
  
  // Handle token refresh for 401 errors
  if (result.error && result.error.status === 401) {
    // Dispatch token refresh action (would be implemented in auth slice)
    // For now, just return the error
  }
  
  return result;
};

// Transform error responses to our custom error format
const transformErrorResponse = (response: any) => {
  let errorType = GooglePhotosErrorType.UNKNOWN_ERROR;
  let message = 'An unknown error occurred';
  
  if (response.status === 401) {
    errorType = GooglePhotosErrorType.INVALID_TOKEN;
    message = 'Authentication token is invalid or expired';
  } else if (response.status === 403) {
    errorType = GooglePhotosErrorType.INSUFFICIENT_PERMISSIONS;
    message = 'Insufficient permissions or quota exceeded';
    if (response.data?.error?.message?.toLowerCase().includes('quota')) {
      errorType = GooglePhotosErrorType.QUOTA_EXCEEDED;
      message = 'API quota exceeded';
    }
  } else if (response.status === 429) {
    errorType = GooglePhotosErrorType.RATE_LIMIT_EXCEEDED;
    message = 'Rate limit exceeded';
  } else if (response.status === 400) {
    errorType = GooglePhotosErrorType.INVALID_MEDIA_ITEM;
    message = response.data?.error?.message || 'Invalid request';
  } else if (response.status >= 500) {
    errorType = GooglePhotosErrorType.NETWORK_ERROR;
    message = 'Server error occurred';
  }
  
  return {
    type: errorType,
    message,
    statusCode: response.status,
    details: response.data
  };
};

// Transform MediaItem to CachedMediaItem with caching metadata
const transformToCachedMediaItem = (mediaItem: MediaItem): CachedMediaItem => {
  const now = Date.now();
  return {
    ...mediaItem,
    cachedAt: now,
    lastAccessed: now,
    organizationStatus: 'pending'
  };
};

// Transform MediaItemsResponse to include cached items
const transformMediaItemsResponse = (response: MediaItemsResponse): MediaCollection => {
  const now = Date.now();
  return {
    items: response.mediaItems.map(transformToCachedMediaItem),
    nextPageToken: response.nextPageToken,
    lastUpdated: now,
    cacheKey: `media_items_${now}`
  };
};

// Validate and transform batch of media items
const validateAndTransformBatch = (mediaItems: any[]): BatchOperationResult<CachedMediaItem> => {
  const startTime = Date.now();
  const batchValidation = validateMediaItemBatch(mediaItems);
  const processingTime = Date.now() - startTime;

  return {
    successful: batchValidation.validItems.map(transformToCachedMediaItem),
    failed: batchValidation.invalidItems.map(({ item, validation }) => ({
      item,
      error: validation.errors.map(e => e.message).join('; '),
      code: validation.errors[0]?.type as string | undefined
    })),
    summary: {
      total: mediaItems.length,
      successful: batchValidation.validItems.length,
      failed: batchValidation.invalidItems.length,
      processingTime
    }
  };
};

// Google Photos API slice with enhanced caching
export const googlePhotosApi = createApi({
  reducerPath: 'googlePhotosApi',
  baseQuery: baseQueryWithRetry,
  tagTypes: ['MediaItem', 'Album', 'SharedAlbum', 'MediaCollection', 'SearchResults'],
  endpoints: (builder) => ({
    // Get media items with enhanced pagination and caching
    getMediaItems: builder.query<MediaCollection, PaginationOptions>({
      query: ({ pageSize = 50, pageToken } = {}) => {
        const params = new URLSearchParams();
        params.append('pageSize', Math.min(pageSize, 100).toString());
        if (pageToken) {
          params.append('pageToken', pageToken);
        }
        return `/mediaItems?${params.toString()}`;
      },
      transformResponse: (response: MediaItemsResponse) => transformMediaItemsResponse(response),
      providesTags: (result) => {
        const tags: Array<{ type: 'MediaCollection' | 'MediaItem'; id: string }> = [{ type: 'MediaCollection', id: 'LIST' }];
        if (result?.items) {
          tags.push(...result.items.map(({ id }) => ({ type: 'MediaItem' as const, id })));
        }
        return tags;
      },
      transformErrorResponse,
      // Keep cached data for 10 minutes for better UX
      keepUnusedDataFor: 600,
      // Merge pages for infinite scroll
      serializeQueryArgs: ({ queryArgs }) => {
        const { pageToken, ...rest } = queryArgs;
        return rest;
      },
      merge: (currentCache, newItems, { arg }) => {
        if (arg.pageToken) {
          // Append new items for pagination
          return {
            ...currentCache,
            items: [...currentCache.items, ...newItems.items],
            nextPageToken: newItems.nextPageToken,
            lastUpdated: newItems.lastUpdated
          } as MediaCollection;
        }
        // Replace cache for fresh requests
        return newItems;
      },
      forceRefetch: ({ currentArg, previousArg }) => {
        // Force refetch if starting fresh (no pageToken)
        return !currentArg?.pageToken && !!previousArg?.pageToken;
      },
    }),

    // Search media items with enhanced filtering and caching
    searchMediaItems: builder.query<MediaCollection, MediaQueryParams>({
      query: ({ filters, pagination = {}, sortBy, sortOrder, includeArchived }) => ({
        url: '/mediaItems:search',
        method: 'POST',
        body: {
          ...pagination,
          pageSize: Math.min(pagination.pageSize || 50, 100),
          ...(filters && { filters }),
          ...(includeArchived !== undefined && { includeArchivedMedia: includeArchived }),
          // Note: Google Photos API doesn't support custom sorting, but we include it for future use
        },
      }),
      transformResponse: (response: MediaItemsResponse, meta, arg) => {
        let collection = transformMediaItemsResponse(response);
        
        // Apply client-side sorting if specified (since API doesn't support it)
        if (arg.sortBy && collection.items.length > 0) {
          collection.items.sort((a, b) => {
            let aValue: any, bValue: any;
            
            switch (arg.sortBy) {
              case 'creationTime':
                aValue = new Date(a.mediaMetadata.creationTime).getTime();
                bValue = new Date(b.mediaMetadata.creationTime).getTime();
                break;
              case 'filename':
                aValue = a.filename.toLowerCase();
                bValue = b.filename.toLowerCase();
                break;
              default:
                return 0;
            }
            
            const result = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            return arg.sortOrder === 'desc' ? -result : result;
          });
        }
        
        return collection;
      },
      providesTags: (result, error, arg) => {
        const cacheKey = JSON.stringify(arg);
        const tags: Array<{ type: 'SearchResults' | 'MediaItem'; id: string }> = [{ type: 'SearchResults', id: cacheKey }];
        if (result?.items) {
          tags.push(...result.items.map(({ id }) => ({ type: 'MediaItem' as const, id })));
        }
        return tags;
      },
      transformErrorResponse,
      keepUnusedDataFor: 300,
      // Cache based on search parameters
      serializeQueryArgs: ({ queryArgs }) => {
        const { pagination, ...searchParams } = queryArgs;
        const { pageToken, ...paginationParams } = pagination || {};
        return { ...searchParams, ...paginationParams };
      },
      merge: (currentCache, newItems, { arg }) => {
        if (arg.pagination?.pageToken) {
          return {
            ...currentCache,
            items: [...currentCache.items, ...newItems.items],
            nextPageToken: newItems.nextPageToken,
            lastUpdated: newItems.lastUpdated
          } as MediaCollection;
        }
        return newItems;
      },
    }),

    // Get a specific media item with validation
    getMediaItem: builder.query<CachedMediaItem, string>({
      query: (mediaItemId) => `/mediaItems/${mediaItemId}`,
      transformResponse: (response: MediaItem) => {
        const cachedItem = transformToCachedMediaItem(response);
        // Update last accessed time
        cachedItem.lastAccessed = Date.now();
        return cachedItem;
      },
      providesTags: (result, error, id) => [{ type: 'MediaItem', id }],
      transformErrorResponse,
      keepUnusedDataFor: 1200, // Keep individual items cached longer (20 minutes)
    }),

    // Validate media item
    validateMediaItem: builder.query<MediaItemValidationResult, any>({
      queryFn: async (mediaItemData) => {
        const startTime = Date.now();
        const validation = validateMediaItem(mediaItemData);
        const processingTime = Date.now() - startTime;

        const result: MediaItemValidationResult = {
          isValid: validation.isValid,
          mediaItem: validation.isValid ? transformToCachedMediaItem(mediaItemData) : undefined,
          errors: validation.errors.map(error => ({
            code: error.type,
            message: error.message,
            field: error.field as string | undefined,
            severity: 'error' as const,
            suggestion: `Please check the ${error.field || 'media item'} format` as string | undefined
          })),
          warnings: validation.warnings.map(warning => ({
            code: 'validation_warning',
            message: warning.message,
            field: warning.field as string | undefined,
            suggestion: 'This may cause issues but is not critical' as string | undefined
          })),
          metadata: {
            validatedAt: Date.now(),
            validationVersion: '1.0.0',
            processingTime
          }
        };

        return { data: result };
      },
      // Don't cache validation results as they're quick to compute
      keepUnusedDataFor: 0,
    }),

    // Batch validate media items
    batchValidateMediaItems: builder.query<BatchOperationResult<CachedMediaItem>, any[]>({
      queryFn: async (mediaItems) => {
        const result = validateAndTransformBatch(mediaItems);
        return { data: result };
      },
      keepUnusedDataFor: 0,
    }),

    // Batch create media items
    batchCreateMediaItems: builder.mutation<BatchCreateResponse, NewMediaItem[]>({
      query: (newMediaItems) => ({
        url: '/mediaItems:batchCreate',
        method: 'POST',
        body: { newMediaItems },
      }),
      invalidatesTags: [{ type: 'MediaItem', id: 'LIST' }],
      transformErrorResponse,
    }),

    // Upload bytes to get upload token
    uploadBytes: builder.mutation<string, { fileData: ArrayBuffer; fileName: string }>({
      query: ({ fileData, fileName }) => ({
        url: '/uploads',
        method: 'POST',
        body: fileData,
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Goog-Upload-File-Name': fileName,
          'X-Goog-Upload-Protocol': 'raw',
        },
      }),
      transformResponse: (response: any) => {
        // The response is the upload token as plain text
        return typeof response === 'string' ? response : response.toString();
      },
      transformErrorResponse,
    }),

    // Create album
    createAlbum: builder.mutation<Album, string>({
      query: (title) => ({
        url: '/albums',
        method: 'POST',
        body: { album: { title } },
      }),
      invalidatesTags: [{ type: 'Album', id: 'LIST' }],
      transformErrorResponse,
    }),

    // Get albums
    getAlbums: builder.query<{ albums: Album[]; nextPageToken?: string }, PaginationOptions>({
      query: ({ pageSize = 50, pageToken } = {}) => {
        const params = new URLSearchParams();
        params.append('pageSize', Math.min(pageSize, 50).toString());
        if (pageToken) {
          params.append('pageToken', pageToken);
        }
        return `/albums?${params.toString()}`;
      },
      providesTags: (result) =>
        result?.albums
          ? [
              ...result.albums.map(({ id }) => ({ type: 'Album' as const, id })),
              { type: 'Album', id: 'LIST' },
            ]
          : [{ type: 'Album', id: 'LIST' }],
      transformErrorResponse,
      keepUnusedDataFor: 600,
    }),

    // Add media to album
    addMediaToAlbum: builder.mutation<void, { albumId: string; mediaItemIds: string[] }>({
      query: ({ albumId, mediaItemIds }) => ({
        url: `/albums/${albumId}:batchAddMediaItems`,
        method: 'POST',
        body: { mediaItemIds },
      }),
      invalidatesTags: (result, error, { albumId }) => [
        { type: 'Album', id: albumId },
        { type: 'Album', id: 'LIST' },
      ],
      transformErrorResponse,
    }),

    // Get shared albums
    getSharedAlbums: builder.query<SharedAlbumsResponse, PaginationOptions>({
      query: ({ pageSize = 50, pageToken } = {}) => {
        const params = new URLSearchParams();
        params.append('pageSize', Math.min(pageSize, 50).toString());
        if (pageToken) {
          params.append('pageToken', pageToken);
        }
        return `/sharedAlbums?${params.toString()}`;
      },
      providesTags: (result) =>
        result?.sharedAlbums
          ? [
              ...result.sharedAlbums.map(({ id }) => ({ type: 'SharedAlbum' as const, id })),
              { type: 'SharedAlbum', id: 'LIST' },
            ]
          : [{ type: 'SharedAlbum', id: 'LIST' }],
      transformErrorResponse,
      keepUnusedDataFor: 600,
    }),
  }),
});

// Export hooks for use in components
export const {
  useGetMediaItemsQuery,
  useSearchMediaItemsQuery,
  useGetMediaItemQuery,
  useValidateMediaItemQuery,
  useBatchValidateMediaItemsQuery,
  useBatchCreateMediaItemsMutation,
  useUploadBytesMutation,
  useCreateAlbumMutation,
  useGetAlbumsQuery,
  useAddMediaToAlbumMutation,
  useGetSharedAlbumsQuery,
  // Lazy query hooks for manual triggering
  useLazyGetMediaItemsQuery,
  useLazySearchMediaItemsQuery,
  useLazyGetMediaItemQuery,
  useLazyValidateMediaItemQuery,
  useLazyBatchValidateMediaItemsQuery,
} = googlePhotosApi;

// Selectors for accessing cached data
export const selectMediaItemsResult = googlePhotosApi.endpoints.getMediaItems.select;
export const selectMediaItemResult = googlePhotosApi.endpoints.getMediaItem.select;
export const selectSearchResults = googlePhotosApi.endpoints.searchMediaItems.select;
export const selectAlbumsResult = googlePhotosApi.endpoints.getAlbums.select;

// Cache management utilities
export const invalidateMediaItems = () => 
  googlePhotosApi.util.invalidateTags([{ type: 'MediaItem', id: 'LIST' }]);

export const invalidateSearchResults = () =>
  googlePhotosApi.util.invalidateTags([{ type: 'SearchResults' }]);

export const prefetchMediaItems = (pagination: PaginationOptions) =>
  googlePhotosApi.util.prefetch('getMediaItems', pagination, { force: false });

export const prefetchMediaItem = (mediaItemId: string) =>
  googlePhotosApi.util.prefetch('getMediaItem', mediaItemId, { force: false });