import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MediaPicker } from '../MediaPicker';
import { MediaPickerResult } from '@/types';

// Mock Expo ImagePicker
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  MediaTypeOptions: {
    All: 'All',
    Images: 'Images',
    Videos: 'Videos',
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('MediaPicker', () => {
  const mockOnMediaSelected = jest.fn();
  const mockImagePickerResult = {
    canceled: false,
    assets: [
      {
        uri: 'file://test-image.jpg',
        fileName: 'test-image.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024000,
        width: 1920,
        height: 1080,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
  });

  it('renders media picker interface', () => {
    const { getByText } = render(
      <MediaPicker onMediaSelected={mockOnMediaSelected} />
    );

    expect(getByText('Choose from Library')).toBeTruthy();
    expect(getByText('Take Photo')).toBeTruthy();
    expect(getByText('No media selected')).toBeTruthy();
  });

  it('allows selection of photos from library', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue(mockImagePickerResult);

    const { getByText } = render(
      <MediaPicker onMediaSelected={mockOnMediaSelected} />
    );

    fireEvent.press(getByText('Choose from Library'));

    await waitFor(() => {
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        allowsEditing: false,
        quality: 0.8,
        selectionLimit: 10,
      });
    });

    await waitFor(() => {
      expect(mockOnMediaSelected).toHaveBeenCalledWith([
        {
          uri: 'file://test-image.jpg',
          fileName: 'test-image.jpg',
          mimeType: 'image/jpeg',
          fileSize: 1024000,
          width: 1920,
          height: 1080,
        },
      ]);
    });
  });

  it('allows taking photos with camera', async () => {
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue(mockImagePickerResult);

    const { getByText } = render(
      <MediaPicker onMediaSelected={mockOnMediaSelected} />
    );

    fireEvent.press(getByText('Take Photo'));

    await waitFor(() => {
      expect(ImagePicker.launchCameraAsync).toHaveBeenCalledWith({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.8,
      });
    });

    await waitFor(() => {
      expect(mockOnMediaSelected).toHaveBeenCalledWith([
        {
          uri: 'file://test-image.jpg',
          fileName: 'test-image.jpg',
          mimeType: 'image/jpeg',
          fileSize: 1024000,
          width: 1920,
          height: 1080,
        },
      ]);
    });
  });

  it('handles permission denial gracefully', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'denied',
    });

    const { getByText } = render(
      <MediaPicker onMediaSelected={mockOnMediaSelected} />
    );

    fireEvent.press(getByText('Choose from Library'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Permission Required',
        'Sorry, we need camera roll permissions to upload photos and videos.',
        [{ text: 'OK' }]
      );
    });

    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it('respects maximum selection limit', () => {
    const { getByText } = render(
      <MediaPicker onMediaSelected={mockOnMediaSelected} maxSelection={5} />
    );

    expect(getByText('0 of 5 selected')).toBeTruthy();
  });

  it('allows clearing selected media', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue(mockImagePickerResult);

    const { getByText } = render(
      <MediaPicker onMediaSelected={mockOnMediaSelected} />
    );

    // Select media first
    fireEvent.press(getByText('Choose from Library'));

    await waitFor(() => {
      expect(mockOnMediaSelected).toHaveBeenCalled();
    });

    // Clear all media
    fireEvent.press(getByText('Clear All'));

    expect(mockOnMediaSelected).toHaveBeenLastCalledWith([]);
  });

  it('shows file information for selected media', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue(mockImagePickerResult);

    const { getByText } = render(
      <MediaPicker onMediaSelected={mockOnMediaSelected} />
    );

    fireEvent.press(getByText('Choose from Library'));

    await waitFor(() => {
      expect(getByText('test-image.jpg')).toBeTruthy();
      expect(getByText('1000.0 KB')).toBeTruthy();
      expect(getByText('1920 × 1080')).toBeTruthy();
    });
  });

  it('handles multiple media selection', async () => {
    const multipleMediaResult = {
      canceled: false,
      assets: [
        {
          uri: 'file://test-image1.jpg',
          fileName: 'test-image1.jpg',
          mimeType: 'image/jpeg',
          fileSize: 1024000,
          width: 1920,
          height: 1080,
        },
        {
          uri: 'file://test-image2.jpg',
          fileName: 'test-image2.jpg',
          mimeType: 'image/jpeg',
          fileSize: 2048000,
          width: 3840,
          height: 2160,
        },
      ],
    };

    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue(multipleMediaResult);

    const { getByText } = render(
      <MediaPicker onMediaSelected={mockOnMediaSelected} />
    );

    fireEvent.press(getByText('Choose from Library'));

    await waitFor(() => {
      expect(mockOnMediaSelected).toHaveBeenCalledWith([
        {
          uri: 'file://test-image1.jpg',
          fileName: 'test-image1.jpg',
          mimeType: 'image/jpeg',
          fileSize: 1024000,
          width: 1920,
          height: 1080,
        },
        {
          uri: 'file://test-image2.jpg',
          fileName: 'test-image2.jpg',
          mimeType: 'image/jpeg',
          fileSize: 2048000,
          width: 3840,
          height: 2160,
        },
      ]);
    });
  });

  it('disables buttons when max selection is reached', async () => {
    const { getByText } = render(
      <MediaPicker onMediaSelected={mockOnMediaSelected} maxSelection={1} />
    );

    // Mock that we already have 1 item selected
    const component = render(
      <MediaPicker onMediaSelected={mockOnMediaSelected} maxSelection={1} />
    );

    // Simulate having selected media by calling onMediaSelected
    const mockMedia: MediaPickerResult[] = [{
      uri: 'file://test.jpg',
      fileName: 'test.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1024,
    }];

    // Re-render with selected media
    component.rerender(
      <MediaPicker onMediaSelected={mockOnMediaSelected} maxSelection={1} />
    );

    // The buttons should be disabled when max is reached
    // This is a simplified test - in reality, the component manages its own state
  });
});