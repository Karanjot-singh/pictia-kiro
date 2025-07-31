import {
  validateMediaItem,
  validateMediaMetadata,
  validatePhotoMetadata,
  validateVideoMetadata,
  isSupportedMimeType,
  isFileSizeValid,
  getFileExtension,
  validateMediaItemBatch,
  MediaValidationError,
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_VIDEO_TYPES,
  MAX_FILE_SIZES
} from '../mediaValidation';

describe('mediaValidation', () => {
  describe('validateMediaItem', () => {
    const validMediaItem = {
      id: 'test-id-123',
      filename: 'test-photo.jpg',
      mimeType: 'image/jpeg',
      baseUrl: 'https://example.com/photo.jpg',
      mediaMetadata: {
        creationTime: '2024-01-01T00:00:00Z',
        width: '1920',
        height: '1080'
      }
    };

    it('should validate a correct media item', () => {
      const result = validateMediaItem(validMediaItem);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null or undefined input', () => {
      expect(validateMediaItem(null).isValid).toBe(false);
      expect(validateMediaItem(undefined).isValid).toBe(false);
      expect(validateMediaItem('not an object').isValid).toBe(false);
    });

    it('should reject media item missing required fields', () => {
      const incompleteItem = { id: 'test-id' };
      const result = validateMediaItem(incompleteItem);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(4); // Missing filename, mimeType, baseUrl, mediaMetadata
      expect(result.errors[0]?.type).toBe(MediaValidationError.MISSING_REQUIRED_FIELD);
    });

    it('should reject invalid ID', () => {
      const invalidItem = { ...validMediaItem, id: '' };
      const result = validateMediaItem(invalidItem);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'id')).toBe(true);
    });

    it('should reject invalid filename', () => {
      const invalidItem = { ...validMediaItem, filename: '' };
      const result = validateMediaItem(invalidItem);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'filename')).toBe(true);
    });

    it('should reject invalid MIME type', () => {
      const invalidItem = { ...validMediaItem, mimeType: 123 };
      const result = validateMediaItem(invalidItem);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'mimeType')).toBe(true);
    });

    it('should warn about unsupported MIME types', () => {
      const unsupportedItem = { ...validMediaItem, mimeType: 'application/pdf' };
      const result = validateMediaItem(unsupportedItem);
      
      expect(result.warnings.some(w => w.field === 'mimeType')).toBe(true);
    });

    it('should reject invalid base URL', () => {
      const invalidItem = { ...validMediaItem, baseUrl: 'not-a-url' };
      const result = validateMediaItem(invalidItem);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'baseUrl')).toBe(true);
    });
  });

  describe('validateMediaMetadata', () => {
    const validMetadata = {
      creationTime: '2024-01-01T00:00:00Z',
      width: '1920',
      height: '1080'
    };

    it('should validate correct metadata', () => {
      const result = validateMediaMetadata(validMetadata);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null metadata', () => {
      const result = validateMediaMetadata(null);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0]?.type).toBe(MediaValidationError.INVALID_METADATA);
    });

    it('should warn about missing creation time', () => {
      const metadataWithoutTime = { width: '1920', height: '1080' };
      const result = validateMediaMetadata(metadataWithoutTime);
      
      expect(result.warnings.some(w => w.field === 'mediaMetadata.creationTime')).toBe(true);
    });

    it('should reject invalid creation time format', () => {
      const invalidMetadata = { ...validMetadata, creationTime: 'invalid-date' };
      const result = validateMediaMetadata(invalidMetadata);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === MediaValidationError.INVALID_TIMESTAMP)).toBe(true);
    });

    it('should reject invalid dimensions', () => {
      const invalidMetadata = { ...validMetadata, width: '-100', height: 'not-a-number' };
      const result = validateMediaMetadata(invalidMetadata);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === MediaValidationError.INVALID_DIMENSIONS)).toBe(true);
    });
  });

  describe('validatePhotoMetadata', () => {
    it('should validate correct photo metadata', () => {
      const photoMetadata = {
        cameraMake: 'Canon',
        cameraModel: 'EOS R5',
        focalLength: 85,
        apertureFNumber: 2.8,
        isoEquivalent: 400
      };
      
      const result = validatePhotoMetadata(photoMetadata);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should warn about invalid numeric values', () => {
      const invalidPhotoMetadata = {
        focalLength: -50,
        apertureFNumber: 'invalid',
        isoEquivalent: -100
      };
      
      const result = validatePhotoMetadata(invalidPhotoMetadata);
      
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('validateVideoMetadata', () => {
    it('should validate correct video metadata', () => {
      const videoMetadata = {
        fps: 30,
        status: 'READY'
      };
      
      const result = validateVideoMetadata(videoMetadata);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should warn about invalid FPS', () => {
      const invalidVideoMetadata = { fps: -30 };
      
      const result = validateVideoMetadata(invalidVideoMetadata);
      
      expect(result.warnings.some(w => w.field === 'mediaMetadata.video.fps')).toBe(true);
    });
  });

  describe('isSupportedMimeType', () => {
    it('should return true for supported image types', () => {
      expect(isSupportedMimeType('image/jpeg')).toBe(true);
      expect(isSupportedMimeType('image/png')).toBe(true);
      expect(isSupportedMimeType('image/gif')).toBe(true);
    });

    it('should return true for supported video types', () => {
      expect(isSupportedMimeType('video/mp4')).toBe(true);
      expect(isSupportedMimeType('video/avi')).toBe(true);
      expect(isSupportedMimeType('video/mov')).toBe(true);
    });

    it('should return false for unsupported types', () => {
      expect(isSupportedMimeType('application/pdf')).toBe(false);
      expect(isSupportedMimeType('text/plain')).toBe(false);
      expect(isSupportedMimeType('audio/mp3')).toBe(false);
    });
  });

  describe('isFileSizeValid', () => {
    it('should validate image file sizes', () => {
      const smallImage = 1024 * 1024; // 1MB
      const largeImage = MAX_FILE_SIZES.IMAGE + 1;
      
      expect(isFileSizeValid(smallImage, 'image/jpeg')).toBe(true);
      expect(isFileSizeValid(largeImage, 'image/jpeg')).toBe(false);
    });

    it('should validate video file sizes', () => {
      const smallVideo = 100 * 1024 * 1024; // 100MB
      const largeVideo = MAX_FILE_SIZES.VIDEO + 1;
      
      expect(isFileSizeValid(smallVideo, 'video/mp4')).toBe(true);
      expect(isFileSizeValid(largeVideo, 'video/mp4')).toBe(false);
    });

    it('should return false for unsupported types', () => {
      expect(isFileSizeValid(1024, 'application/pdf')).toBe(false);
    });
  });

  describe('getFileExtension', () => {
    it('should extract file extensions correctly', () => {
      expect(getFileExtension('photo.jpg')).toBe('jpg');
      expect(getFileExtension('video.mp4')).toBe('mp4');
      expect(getFileExtension('document.pdf')).toBe('pdf');
      expect(getFileExtension('file.with.multiple.dots.png')).toBe('png');
    });

    it('should return empty string for files without extension', () => {
      expect(getFileExtension('filename')).toBe('');
      expect(getFileExtension('.hidden')).toBe('');
    });

    it('should handle edge cases', () => {
      expect(getFileExtension('')).toBe('');
      expect(getFileExtension('.')).toBe('');
      expect(getFileExtension('..')).toBe('');
    });
  });

  describe('validateMediaItemBatch', () => {
    const validItem1 = {
      id: 'item1',
      filename: 'photo1.jpg',
      mimeType: 'image/jpeg',
      baseUrl: 'https://example.com/photo1.jpg',
      mediaMetadata: {
        creationTime: '2024-01-01T00:00:00Z',
        width: '1920',
        height: '1080'
      }
    };

    const validItem2 = {
      id: 'item2',
      filename: 'photo2.png',
      mimeType: 'image/png',
      baseUrl: 'https://example.com/photo2.png',
      mediaMetadata: {
        creationTime: '2024-01-02T00:00:00Z',
        width: '1280',
        height: '720'
      }
    };

    const invalidItem = {
      id: 'item3',
      // Missing required fields
    };

    it('should validate a batch of media items', () => {
      const batch = [validItem1, validItem2, invalidItem];
      const result = validateMediaItemBatch(batch);
      
      expect(result.validItems).toHaveLength(2);
      expect(result.invalidItems).toHaveLength(1);
      expect(result.summary.total).toBe(3);
      expect(result.summary.valid).toBe(2);
      expect(result.summary.invalid).toBe(1);
    });

    it('should handle empty batch', () => {
      const result = validateMediaItemBatch([]);
      
      expect(result.validItems).toHaveLength(0);
      expect(result.invalidItems).toHaveLength(0);
      expect(result.summary.total).toBe(0);
    });

    it('should handle all valid items', () => {
      const batch = [validItem1, validItem2];
      const result = validateMediaItemBatch(batch);
      
      expect(result.validItems).toHaveLength(2);
      expect(result.invalidItems).toHaveLength(0);
      expect(result.summary.valid).toBe(2);
      expect(result.summary.invalid).toBe(0);
    });
  });
});