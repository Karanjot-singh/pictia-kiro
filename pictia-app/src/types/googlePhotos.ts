// Google Photos API types based on 2024 API updates

// Media types (moved here to avoid circular imports)
export interface MediaItem {
  id: string;
  filename: string;
  mimeType: string;
  baseUrl: string;
  mediaMetadata: MediaMetadata;
}

export interface MediaMetadata {
  creationTime: string;
  width: string;
  height: string;
  photo?: PhotoMetadata;
  video?: VideoMetadata;
}

export interface PhotoMetadata {
  cameraMake?: string;
  cameraModel?: string;
  focalLength?: number;
  apertureFNumber?: number;
  isoEquivalent?: number;
}

export interface VideoMetadata {
  fps?: number;
  status?: string;
}

// Core API response types
export interface MediaItemsResponse {
  mediaItems: MediaItem[];
  nextPageToken?: string;
}

export interface BatchCreateResponse {
  newMediaItemResults: NewMediaItemResult[];
}

export interface NewMediaItemResult {
  uploadToken: string;
  status: Status;
  mediaItem?: MediaItem;
}

export interface Status {
  code: number;
  message: string;
  details?: any[];
}

// Media upload types for 2024 API
export interface MediaUpload {
  uploadToken: string;
  fileName: string;
  description?: string;
  newMediaItem: NewMediaItem;
}

export interface NewMediaItem {
  description?: string;
  simpleMediaItem: {
    fileName: string;
    uploadToken: string;
  };
}

// Album types
export interface Album {
  id: string;
  title: string;
  productUrl: string;
  isWriteable: boolean;
  shareInfo?: ShareInfo;
  mediaItemsCount: string;
  coverPhotoBaseUrl?: string;
  coverPhotoMediaItemId?: string;
}

export interface ShareInfo {
  sharedAlbumOptions: SharedAlbumOptions;
  shareableUrl: string;
  shareToken: string;
  isJoined: boolean;
  isOwned: boolean;
  isJoinable: boolean;
}

export interface SharedAlbumOptions {
  isCollaborative: boolean;
  isCommentable: boolean;
}

export interface SharedAlbumsResponse {
  sharedAlbums: Album[];
  nextPageToken?: string;
}

// API Error types
export enum GooglePhotosErrorType {
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  QUOTA_EXCEEDED = 'quota_exceeded',
  INVALID_TOKEN = 'invalid_token',
  INSUFFICIENT_PERMISSIONS = 'insufficient_permissions',
  INVALID_MEDIA_ITEM = 'invalid_media_item',
  UPLOAD_FAILED = 'upload_failed',
  NETWORK_ERROR = 'network_error',
  UNKNOWN_ERROR = 'unknown_error'
}

export interface GooglePhotosError {
  type: GooglePhotosErrorType;
  message: string;
  statusCode?: number;
  retryAfter?: number; // seconds to wait before retry
  details?: any;
}

// API client configuration
export interface GooglePhotosClientConfig {
  accessToken: string;
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

// Pagination options
export interface PaginationOptions {
  pageSize?: number | undefined;
  pageToken?: string | undefined;
}

// Media filters (for future use)
export interface MediaTypeFilter {
  mediaTypes: ('PHOTO' | 'VIDEO')[];
}

export interface DateFilter {
  ranges: DateRange[];
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface ContentFilter {
  includedContentCategories?: string[];
  excludedContentCategories?: string[];
}

// Search filters
export interface Filters {
  dateFilter?: DateFilter;
  contentFilter?: ContentFilter;
  mediaTypeFilter?: MediaTypeFilter;
  featureFilter?: FeatureFilter;
  includeArchivedMedia?: boolean;
}

export interface FeatureFilter {
  includedFeatures: ('NONE' | 'FAVORITES')[];
}

// Upload progress tracking
export interface UploadProgress {
  uploadToken: string;
  fileName: string;
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
}

// Enhanced media item with caching metadata
export interface CachedMediaItem extends MediaItem {
  cachedAt: number; // timestamp when item was cached
  lastAccessed: number; // timestamp when item was last accessed
  thumbnailUrl?: string; // cached thumbnail URL
  isLocal?: boolean; // whether item is stored locally
  organizationStatus?: 'pending' | 'keep' | 'delete' | 'processed';
}

// Media collection for pagination and caching
export interface MediaCollection {
  items: CachedMediaItem[];
  nextPageToken?: string | undefined;
  totalCount?: number | undefined;
  lastUpdated: number;
  cacheKey: string;
}

// Media item cache entry
export interface MediaCacheEntry {
  mediaItem: CachedMediaItem;
  expiresAt: number;
  accessCount: number;
  tags: string[];
}

// Cache configuration
export interface CacheConfig {
  maxItems: number;
  ttlMs: number; // time to live in milliseconds
  maxMemoryMB: number;
  enablePersistence: boolean;
}

// Media query parameters for caching
export interface MediaQueryParams {
  filters?: Filters;
  pagination?: PaginationOptions;
  sortBy?: 'creationTime' | 'filename' | 'size';
  sortOrder?: 'asc' | 'desc';
  includeArchived?: boolean;
}

// Cache statistics
export interface CacheStats {
  totalItems: number;
  memoryUsageMB: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  lastCleanup: number;
}

// Media item validation result with enhanced error info
export interface MediaItemValidationResult {
  isValid: boolean;
  mediaItem?: CachedMediaItem | undefined;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata: {
    validatedAt: number;
    validationVersion: string;
    processingTime: number;
  };
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string | undefined;
  severity: 'error' | 'warning';
  suggestion?: string | undefined;
}

export interface ValidationWarning {
  code: string;
  message: string;
  field?: string | undefined;
  suggestion?: string | undefined;
}

// Batch operation results
export interface BatchOperationResult<T> {
  successful: T[];
  failed: {
    item: any;
    error: string;
    code?: string | undefined;
  }[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    processingTime: number;
  };
}

// Media organization state for caching
export interface MediaOrganizationCache {
  sessionId: string;
  mediaItems: CachedMediaItem[];
  decisions: Record<string, 'keep' | 'delete'>;
  undoStack: Array<{
    mediaItemId: string;
    previousDecision?: 'keep' | 'delete';
    timestamp: number;
  }>;
  currentIndex: number;
  lastModified: number;
}

// Search and filter cache
export interface SearchCache {
  query: string;
  filters: Filters;
  results: MediaCollection;
  createdAt: number;
  expiresAt: number;
}