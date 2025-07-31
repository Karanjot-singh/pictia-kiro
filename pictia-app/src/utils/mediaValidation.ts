import { MediaItem, MediaMetadata, PhotoMetadata, VideoMetadata } from '../types/googlePhotos';

/**
 * Validation utilities for media items and related data
 */

// Supported image MIME types
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/tiff',
  'image/heic',
  'image/heif'
] as const;

// Supported video MIME types
export const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/avi',
  'video/mov',
  'video/wmv',
  'video/flv',
  'video/webm',
  'video/mkv',
  'video/3gp',
  'video/m4v'
] as const;

// Maximum file sizes (in bytes)
export const MAX_FILE_SIZES = {
  IMAGE: 100 * 1024 * 1024, // 100MB
  VIDEO: 10 * 1024 * 1024 * 1024, // 10GB
} as const;

// Validation error types
export enum MediaValidationError {
  INVALID_STRUCTURE = 'invalid_structure',
  MISSING_REQUIRED_FIELD = 'missing_required_field',
  INVALID_MIME_TYPE = 'invalid_mime_type',
  INVALID_DIMENSIONS = 'invalid_dimensions',
  INVALID_TIMESTAMP = 'invalid_timestamp',
  INVALID_METADATA = 'invalid_metadata',
  FILE_TOO_LARGE = 'file_too_large',
  UNSUPPORTED_FORMAT = 'unsupported_format'
}

export interface ValidationResult {
  isValid: boolean;
  errors: {
    type: MediaValidationError;
    message: string;
    field?: string;
  }[];
  warnings: {
    message: string;
    field?: string;
  }[];
}

/**
 * Validate a MediaItem object structure and content
 */
export function validateMediaItem(mediaItem: any): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // Check if mediaItem exists and is an object
  if (!mediaItem || typeof mediaItem !== 'object') {
    result.isValid = false;
    result.errors.push({
      type: MediaValidationError.INVALID_STRUCTURE,
      message: 'Media item must be a valid object'
    });
    return result;
  }

  // Validate required fields
  const requiredFields = ['id', 'filename', 'mimeType', 'baseUrl', 'mediaMetadata'];
  for (const field of requiredFields) {
    if (!(field in mediaItem) || mediaItem[field] === null || mediaItem[field] === undefined) {
      result.isValid = false;
      result.errors.push({
        type: MediaValidationError.MISSING_REQUIRED_FIELD,
        message: `Required field '${field}' is missing or null`,
        field
      });
    }
  }

  // If basic structure is invalid, return early
  if (!result.isValid) {
    return result;
  }

  // Validate ID format (should be a non-empty string)
  if (typeof mediaItem.id !== 'string' || mediaItem.id.trim().length === 0) {
    result.isValid = false;
    result.errors.push({
      type: MediaValidationError.INVALID_STRUCTURE,
      message: 'Media item ID must be a non-empty string',
      field: 'id'
    });
  }

  // Validate filename
  if (typeof mediaItem.filename !== 'string' || mediaItem.filename.trim().length === 0) {
    result.isValid = false;
    result.errors.push({
      type: MediaValidationError.INVALID_STRUCTURE,
      message: 'Filename must be a non-empty string',
      field: 'filename'
    });
  }

  // Validate MIME type
  if (typeof mediaItem.mimeType !== 'string') {
    result.isValid = false;
    result.errors.push({
      type: MediaValidationError.INVALID_MIME_TYPE,
      message: 'MIME type must be a string',
      field: 'mimeType'
    });
  } else {
    const isImage = SUPPORTED_IMAGE_TYPES.includes(mediaItem.mimeType as any);
    const isVideo = SUPPORTED_VIDEO_TYPES.includes(mediaItem.mimeType as any);
    
    if (!isImage && !isVideo) {
      result.warnings.push({
        message: `MIME type '${mediaItem.mimeType}' may not be supported`,
        field: 'mimeType'
      });
    }
  }

  // Validate base URL
  if (typeof mediaItem.baseUrl !== 'string') {
    result.isValid = false;
    result.errors.push({
      type: MediaValidationError.INVALID_STRUCTURE,
      message: 'Base URL must be a string',
      field: 'baseUrl'
    });
  } else {
    try {
      new URL(mediaItem.baseUrl);
    } catch {
      result.isValid = false;
      result.errors.push({
        type: MediaValidationError.INVALID_STRUCTURE,
        message: 'Base URL must be a valid URL',
        field: 'baseUrl'
      });
    }
  }

  // Validate media metadata
  const metadataValidation = validateMediaMetadata(mediaItem.mediaMetadata);
  if (!metadataValidation.isValid) {
    result.isValid = false;
    result.errors.push(...metadataValidation.errors);
  }
  result.warnings.push(...metadataValidation.warnings);

  return result;
}

/**
 * Validate MediaMetadata structure
 */
export function validateMediaMetadata(metadata: any): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (!metadata || typeof metadata !== 'object') {
    result.isValid = false;
    result.errors.push({
      type: MediaValidationError.INVALID_METADATA,
      message: 'Media metadata must be a valid object',
      field: 'mediaMetadata'
    });
    return result;
  }

  // Validate creation time
  if (!metadata.creationTime) {
    result.warnings.push({
      message: 'Creation time is missing',
      field: 'mediaMetadata.creationTime'
    });
  } else if (typeof metadata.creationTime !== 'string') {
    result.isValid = false;
    result.errors.push({
      type: MediaValidationError.INVALID_TIMESTAMP,
      message: 'Creation time must be a string',
      field: 'mediaMetadata.creationTime'
    });
  } else {
    // Validate ISO 8601 format
    const date = new Date(metadata.creationTime);
    if (isNaN(date.getTime())) {
      result.isValid = false;
      result.errors.push({
        type: MediaValidationError.INVALID_TIMESTAMP,
        message: 'Creation time must be a valid ISO 8601 timestamp',
        field: 'mediaMetadata.creationTime'
      });
    }
  }

  // Validate dimensions
  if (metadata.width !== undefined) {
    const width = parseInt(metadata.width, 10);
    if (isNaN(width) || width <= 0) {
      result.isValid = false;
      result.errors.push({
        type: MediaValidationError.INVALID_DIMENSIONS,
        message: 'Width must be a positive number',
        field: 'mediaMetadata.width'
      });
    }
  }

  if (metadata.height !== undefined) {
    const height = parseInt(metadata.height, 10);
    if (isNaN(height) || height <= 0) {
      result.isValid = false;
      result.errors.push({
        type: MediaValidationError.INVALID_DIMENSIONS,
        message: 'Height must be a positive number',
        field: 'mediaMetadata.height'
      });
    }
  }

  // Validate photo metadata if present
  if (metadata.photo) {
    const photoValidation = validatePhotoMetadata(metadata.photo);
    if (!photoValidation.isValid) {
      result.isValid = false;
      result.errors.push(...photoValidation.errors);
    }
    result.warnings.push(...photoValidation.warnings);
  }

  // Validate video metadata if present
  if (metadata.video) {
    const videoValidation = validateVideoMetadata(metadata.video);
    if (!videoValidation.isValid) {
      result.isValid = false;
      result.errors.push(...videoValidation.errors);
    }
    result.warnings.push(...videoValidation.warnings);
  }

  return result;
}

/**
 * Validate PhotoMetadata structure
 */
export function validatePhotoMetadata(photo: any): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (!photo || typeof photo !== 'object') {
    result.isValid = false;
    result.errors.push({
      type: MediaValidationError.INVALID_METADATA,
      message: 'Photo metadata must be a valid object',
      field: 'mediaMetadata.photo'
    });
    return result;
  }

  // Validate optional numeric fields
  const numericFields = ['focalLength', 'apertureFNumber', 'isoEquivalent'];
  for (const field of numericFields) {
    if (photo[field] !== undefined) {
      const value = parseFloat(photo[field]);
      if (isNaN(value) || value < 0) {
        result.warnings.push({
          message: `${field} should be a positive number`,
          field: `mediaMetadata.photo.${field}`
        });
      }
    }
  }

  return result;
}

/**
 * Validate VideoMetadata structure
 */
export function validateVideoMetadata(video: any): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (!video || typeof video !== 'object') {
    result.isValid = false;
    result.errors.push({
      type: MediaValidationError.INVALID_METADATA,
      message: 'Video metadata must be a valid object',
      field: 'mediaMetadata.video'
    });
    return result;
  }

  // Validate FPS
  if (video.fps !== undefined) {
    const fps = parseFloat(video.fps);
    if (isNaN(fps) || fps <= 0) {
      result.warnings.push({
        message: 'FPS should be a positive number',
        field: 'mediaMetadata.video.fps'
      });
    }
  }

  // Validate status
  if (video.status !== undefined && typeof video.status !== 'string') {
    result.warnings.push({
      message: 'Video status should be a string',
      field: 'mediaMetadata.video.status'
    });
  }

  return result;
}

/**
 * Check if a MIME type is supported for upload
 */
export function isSupportedMimeType(mimeType: string): boolean {
  return SUPPORTED_IMAGE_TYPES.includes(mimeType as any) || 
         SUPPORTED_VIDEO_TYPES.includes(mimeType as any);
}

/**
 * Check if a file size is within limits
 */
export function isFileSizeValid(fileSize: number, mimeType: string): boolean {
  if (SUPPORTED_IMAGE_TYPES.includes(mimeType as any)) {
    return fileSize <= MAX_FILE_SIZES.IMAGE;
  }
  
  if (SUPPORTED_VIDEO_TYPES.includes(mimeType as any)) {
    return fileSize <= MAX_FILE_SIZES.VIDEO;
  }
  
  return false;
}

// Note: formatFileSize is available from utils/index.ts

/**
 * Extract file extension from filename
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.substring(lastDot + 1).toLowerCase() : '';
}

/**
 * Validate batch of media items
 */
export function validateMediaItemBatch(mediaItems: any[]): {
  validItems: MediaItem[];
  invalidItems: { item: any; validation: ValidationResult }[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    warnings: number;
  };
} {
  const validItems: MediaItem[] = [];
  const invalidItems: { item: any; validation: ValidationResult }[] = [];
  let totalWarnings = 0;

  for (const item of mediaItems) {
    const validation = validateMediaItem(item);
    
    if (validation.isValid) {
      validItems.push(item as MediaItem);
    } else {
      invalidItems.push({ item, validation });
    }
    
    totalWarnings += validation.warnings.length;
  }

  return {
    validItems,
    invalidItems,
    summary: {
      total: mediaItems.length,
      valid: validItems.length,
      invalid: invalidItems.length,
      warnings: totalWarnings
    }
  };
}