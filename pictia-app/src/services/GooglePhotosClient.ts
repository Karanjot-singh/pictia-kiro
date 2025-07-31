import {
  MediaItemsResponse,
  BatchCreateResponse,
  MediaUpload,
  NewMediaItem,
  Album,
  SharedAlbumsResponse,
  GooglePhotosError,
  GooglePhotosErrorType,
  GooglePhotosClientConfig,
  PaginationOptions,
  UploadProgress,
  Filters
} from '../types/googlePhotos';
import { MediaItem } from '../types';

/**
 * Google Photos API Client with 2024 API updates
 * Handles authentication, rate limiting, and error recovery
 */
export class GooglePhotosClient {
  private config: GooglePhotosClientConfig;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly retryAttempts: number;
  private readonly retryDelay: number;

  constructor(config: GooglePhotosClientConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://photoslibrary.googleapis.com/v1';
    this.timeout = config.timeout || 30000; // 30 seconds
    this.retryAttempts = config.retryAttempts || 3;
    this.retryDelay = config.retryDelay || 1000; // 1 second
  }

  /**
   * Update the access token for API requests
   */
  updateAccessToken(accessToken: string): void {
    this.config.accessToken = accessToken;
  }

  /**
   * Get media items with pagination support
   */
  async getMediaItems(options: PaginationOptions = {}): Promise<MediaItemsResponse> {
    const params = new URLSearchParams();
    
    if (options.pageSize) {
      params.append('pageSize', Math.min(options.pageSize, 100).toString()); // Max 100 per API
    }
    
    if (options.pageToken) {
      params.append('pageToken', options.pageToken);
    }

    const url = `${this.baseUrl}/mediaItems?${params.toString()}`;
    
    return this.makeRequest<MediaItemsResponse>('GET', url);
  }

  /**
   * Search media items with filters
   */
  async searchMediaItems(filters?: Filters, options: PaginationOptions = {}): Promise<MediaItemsResponse> {
    const body: any = {};
    
    if (options.pageSize) {
      body.pageSize = Math.min(options.pageSize, 100);
    }
    
    if (options.pageToken) {
      body.pageToken = options.pageToken;
    }

    if (filters) {
      body.filters = filters;
    }

    const url = `${this.baseUrl}/mediaItems:search`;
    
    return this.makeRequest<MediaItemsResponse>('POST', url, body);
  }

  /**
   * Upload media item using the 2024 API flow
   * Step 1: Upload bytes to get upload token
   * Step 2: Create media item using upload token
   */
  async uploadMediaItem(mediaData: MediaUpload): Promise<MediaItem> {
    try {
      // For now, we assume the upload token is already provided
      // In a real implementation, you would first upload the bytes to get the token
      const result = await this.batchCreateMediaItems([mediaData.newMediaItem]);
      
      if (result.newMediaItemResults.length === 0) {
        throw this.createError(GooglePhotosErrorType.UPLOAD_FAILED, 'No media item created');
      }

      const mediaItemResult = result.newMediaItemResults[0];
      
      if (!mediaItemResult) {
        throw this.createError(GooglePhotosErrorType.UPLOAD_FAILED, 'No media item result returned');
      }
      
      if (mediaItemResult.status.code !== 0) {
        throw this.createError(
          GooglePhotosErrorType.UPLOAD_FAILED,
          `Upload failed: ${mediaItemResult.status.message}`,
          mediaItemResult.status.code
        );
      }

      if (!mediaItemResult.mediaItem) {
        throw this.createError(GooglePhotosErrorType.UPLOAD_FAILED, 'Media item not returned');
      }

      return mediaItemResult.mediaItem;
    } catch (error) {
      if (error instanceof Error && error.name === 'GooglePhotosError') {
        throw error;
      }
      throw this.createError(GooglePhotosErrorType.UPLOAD_FAILED, `Upload failed: ${error}`);
    }
  }

  /**
   * Batch create media items using 2024 API
   */
  async batchCreateMediaItems(items: NewMediaItem[]): Promise<BatchCreateResponse> {
    if (items.length === 0) {
      throw this.createError(GooglePhotosErrorType.INVALID_MEDIA_ITEM, 'No items provided');
    }

    if (items.length > 50) {
      throw this.createError(GooglePhotosErrorType.INVALID_MEDIA_ITEM, 'Maximum 50 items per batch');
    }

    const body = {
      newMediaItems: items
    };

    const url = `${this.baseUrl}/mediaItems:batchCreate`;
    
    return this.makeRequest<BatchCreateResponse>('POST', url, body);
  }

  /**
   * Create a new album
   */
  async createAlbum(albumName: string): Promise<Album> {
    const body = {
      album: {
        title: albumName
      }
    };

    const url = `${this.baseUrl}/albums`;
    
    return this.makeRequest<Album>('POST', url, body);
  }

  /**
   * Add media items to an album
   */
  async addMediaToAlbum(albumId: string, mediaIds: string[]): Promise<void> {
    if (mediaIds.length === 0) {
      throw this.createError(GooglePhotosErrorType.INVALID_MEDIA_ITEM, 'No media IDs provided');
    }

    if (mediaIds.length > 50) {
      throw this.createError(GooglePhotosErrorType.INVALID_MEDIA_ITEM, 'Maximum 50 items per batch');
    }

    const body = {
      mediaItemIds: mediaIds
    };

    const url = `${this.baseUrl}/albums/${albumId}:batchAddMediaItems`;
    
    await this.makeRequest<void>('POST', url, body);
  }

  /**
   * Get shared albums
   */
  async getSharedAlbums(options: PaginationOptions = {}): Promise<SharedAlbumsResponse> {
    const params = new URLSearchParams();
    
    if (options.pageSize) {
      params.append('pageSize', Math.min(options.pageSize, 50).toString()); // Max 50 for albums
    }
    
    if (options.pageToken) {
      params.append('pageToken', options.pageToken);
    }

    const url = `${this.baseUrl}/sharedAlbums?${params.toString()}`;
    
    return this.makeRequest<SharedAlbumsResponse>('GET', url);
  }

  /**
   * Get a specific media item by ID
   */
  async getMediaItem(mediaItemId: string): Promise<MediaItem> {
    const url = `${this.baseUrl}/mediaItems/${mediaItemId}`;
    
    return this.makeRequest<MediaItem>('GET', url);
  }

  /**
   * Upload raw bytes and get upload token (Step 1 of upload process)
   * This would typically be used before calling uploadMediaItem
   */
  async uploadBytes(fileData: ArrayBuffer, fileName: string): Promise<string> {
    const url = `${this.baseUrl}/uploads`;
    
    const headers = {
      'Authorization': `Bearer ${this.config.accessToken}`,
      'Content-Type': 'application/octet-stream',
      'X-Goog-Upload-File-Name': fileName,
      'X-Goog-Upload-Protocol': 'raw'
    };

    try {
      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers,
        body: fileData
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      // The response body is the upload token
      return await response.text();
    } catch (error) {
      if (error instanceof Error && error.name === 'GooglePhotosError') {
        throw error;
      }
      throw this.createError(GooglePhotosErrorType.UPLOAD_FAILED, `Bytes upload failed: ${error}`);
    }
  }

  /**
   * Make HTTP request with retry logic and error handling
   */
  private async makeRequest<T>(
    method: string,
    url: string,
    body?: any,
    attempt: number = 1
  ): Promise<T> {
    try {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json'
      };

      const options: RequestInit = {
        method,
        headers
      };

      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(body);
      }

      const response = await this.fetchWithTimeout(url, options);

      if (!response.ok) {
        await this.handleErrorResponse(response, attempt);
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return {} as T;
      }

      const responseText = await response.text();
      if (!responseText.trim()) {
        return {} as T;
      }

      return JSON.parse(responseText) as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'GooglePhotosError') {
        // If it's already a GooglePhotosError, check if we should retry
        const googleError = error as any as GooglePhotosError;
        if (this.shouldRetry(googleError.type) && attempt < this.retryAttempts) {
          await this.delay(this.retryDelay * attempt);
          return this.makeRequest<T>(method, url, body, attempt + 1);
        }
        throw error;
      }

      // Handle network errors
      if (attempt < this.retryAttempts) {
        await this.delay(this.retryDelay * attempt);
        return this.makeRequest<T>(method, url, body, attempt + 1);
      }

      throw this.createError(GooglePhotosErrorType.NETWORK_ERROR, `Request failed: ${error}`);
    }
  }

  /**
   * Handle HTTP error responses
   */
  private async handleErrorResponse(response: Response, attempt: number = 1): Promise<never> {
    const statusCode = response.status;
    let errorMessage = `HTTP ${statusCode}: ${response.statusText}`;
    let errorType = GooglePhotosErrorType.UNKNOWN_ERROR;
    let retryAfter: number | undefined;

    try {
      const errorBody = await response.json();
      if (errorBody.error) {
        errorMessage = errorBody.error.message || errorMessage;
      }
    } catch {
      // Ignore JSON parsing errors
    }

    // Map HTTP status codes to error types
    switch (statusCode) {
      case 401:
        errorType = GooglePhotosErrorType.INVALID_TOKEN;
        break;
      case 403:
        if (errorMessage.toLowerCase().includes('quota')) {
          errorType = GooglePhotosErrorType.QUOTA_EXCEEDED;
        } else {
          errorType = GooglePhotosErrorType.INSUFFICIENT_PERMISSIONS;
        }
        break;
      case 429:
        errorType = GooglePhotosErrorType.RATE_LIMIT_EXCEEDED;
        const retryAfterHeader = response.headers.get('Retry-After');
        if (retryAfterHeader) {
          retryAfter = parseInt(retryAfterHeader, 10);
        }
        break;
      case 400:
        errorType = GooglePhotosErrorType.INVALID_MEDIA_ITEM;
        break;
      default:
        if (statusCode >= 500) {
          errorType = GooglePhotosErrorType.NETWORK_ERROR;
        }
    }

    const error = this.createError(errorType, errorMessage, statusCode);
    if (retryAfter) {
      (error as any).retryAfter = retryAfter;
    }

    // Handle rate limiting with exponential backoff
    if (errorType === GooglePhotosErrorType.RATE_LIMIT_EXCEEDED && attempt < this.retryAttempts) {
      const delay = retryAfter ? retryAfter * 1000 : this.retryDelay * Math.pow(2, attempt);
      await this.delay(delay);
      // This will be handled by the retry logic in makeRequest
    }

    throw error;
  }

  /**
   * Create a standardized error object
   */
  private createError(
    type: GooglePhotosErrorType,
    message: string,
    statusCode?: number,
    details?: any
  ): GooglePhotosError {
    const error = new Error(message) as any;
    error.name = 'GooglePhotosError';
    error.type = type;
    error.statusCode = statusCode;
    error.details = details;
    return error as GooglePhotosError;
  }

  /**
   * Check if an error type should trigger a retry
   */
  private shouldRetry(errorType: GooglePhotosErrorType): boolean {
    return [
      GooglePhotosErrorType.RATE_LIMIT_EXCEEDED,
      GooglePhotosErrorType.NETWORK_ERROR
    ].includes(errorType);
  }

  /**
   * Fetch with timeout support
   */
  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate media item data
   */
  validateMediaItem(mediaItem: any): boolean {
    if (!mediaItem || typeof mediaItem !== 'object') {
      return false;
    }

    const required = ['id', 'filename', 'mimeType', 'baseUrl', 'mediaMetadata'];
    return required.every(field => field in mediaItem);
  }

  /**
   * Get API quota usage information (if available)
   */
  async getQuotaInfo(): Promise<{ used: number; limit: number } | null> {
    // This would require additional API calls or headers
    // Implementation depends on Google's quota reporting
    return null;
  }
}

// Factory function to create a configured client
export function createGooglePhotosClient(accessToken: string): GooglePhotosClient {
  return new GooglePhotosClient({
    accessToken,
    retryAttempts: 3,
    retryDelay: 1000,
    timeout: 30000
  });
}