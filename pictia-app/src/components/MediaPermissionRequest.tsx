/**
 * Media library permission request component
 * Specifically designed for requesting photo/media library access
 */

import React, { useState } from 'react';
import { Alert } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import PermissionRequestDialog from './PermissionRequestDialog';
import { THEME_COLORS } from '@/theme';

interface MediaPermissionRequestProps {
  visible: boolean;
  onClose: () => void;
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
}

const MediaPermissionRequest: React.FC<MediaPermissionRequestProps> = ({
  visible,
  onClose,
  onPermissionGranted,
  onPermissionDenied,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestPermission = async () => {
    setIsLoading(true);
    
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      
      if (status === 'granted') {
        onPermissionGranted?.();
        onClose();
      } else {
        onPermissionDenied?.();
        
        // Show explanation if permission was denied
        Alert.alert(
          'Permission Required',
          'Pictia needs access to your photo library to help you organize your photos. You can enable this in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: () => {
                // Note: Opening settings programmatically is limited on mobile
                // Users will need to manually navigate to settings
              }
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting media permissions:', error);
      Alert.alert(
        'Permission Error',
        'Failed to request photo library permissions. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeny = () => {
    onPermissionDenied?.();
    onClose();
  };

  const benefits = [
    {
      icon: '📸',
      title: 'Access Your Photos',
      description: 'Browse and organize your entire photo library',
    },
    {
      icon: '🗂️',
      title: 'Smart Organization',
      description: 'Quickly sort photos with swipe gestures',
    },
    {
      icon: '🔒',
      title: 'Privacy First',
      description: 'Your photos stay on your device, we never upload them',
    },
  ];

  return (
    <PermissionRequestDialog
      visible={visible}
      onClose={onClose}
      onAllow={handleRequestPermission}
      onDeny={handleDeny}
      title="Access Photo Library"
      description="Pictia needs access to your photo library to help you organize and manage your photos efficiently."
      icon="📱"
      benefits={benefits}
      allowButtonText="Allow Access"
      denyButtonText="Not Now"
      isLoading={isLoading}
      gradientColors={THEME_COLORS.ACCENT_GRADIENT}
    />
  );
};

export default MediaPermissionRequest;