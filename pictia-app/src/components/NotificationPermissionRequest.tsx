import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  selectNotificationPermissions,
  selectNotificationLoading,
} from '@/store/selectors/notificationSelectors';
import {
  requestNotificationPermissions,
  clearError,
} from '@/store/slices/notificationSlice';

interface NotificationPermissionRequestProps {
  visible: boolean;
  onClose: () => void;
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
}

const NotificationPermissionRequest: React.FC<NotificationPermissionRequestProps> = ({
  visible,
  onClose,
  onPermissionGranted,
  onPermissionDenied,
}) => {
  const dispatch = useAppDispatch();
  const permissions = useAppSelector(selectNotificationPermissions);
  const isLoading = useAppSelector(selectNotificationLoading);
  const [hasRequested, setHasRequested] = useState(false);

  useEffect(() => {
    if (permissions && hasRequested) {
      if (permissions.granted) {
        onPermissionGranted?.();
      } else {
        onPermissionDenied?.();
      }
      setHasRequested(false);
    }
  }, [permissions, hasRequested, onPermissionGranted, onPermissionDenied]);

  const handleRequestPermission = async () => {
    try {
      setHasRequested(true);
      await dispatch(requestNotificationPermissions()).unwrap();
    } catch (error) {
      setHasRequested(false);
      Alert.alert(
        'Permission Error',
        'Failed to request notification permissions. Please try again.',
        [{ text: 'OK', onPress: () => dispatch(clearError()) }]
      );
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🔔</Text>
          </View>
          
          <Text style={styles.title}>Enable Notifications</Text>
          
          <Text style={styles.description}>
            Get reminded before your scheduled backups so you never miss organizing your photos.
          </Text>
          
          <View style={styles.benefits}>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>⏰</Text>
              <Text style={styles.benefitText}>Timely backup reminders</Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>📱</Text>
              <Text style={styles.benefitText}>Customizable notification timing</Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>🎯</Text>
              <Text style={styles.benefitText}>Never miss a backup schedule</Text>
            </View>
          </View>
          
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.disabledButton]}
              onPress={handleRequestPermission}
              disabled={isLoading}
            >
              <Text style={styles.primaryButtonText}>
                {isLoading ? 'Requesting...' : 'Enable Notifications'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleSkip}
              disabled={isLoading}
            >
              <Text style={styles.secondaryButtonText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.disclaimer}>
            You can change this setting anytime in the app settings.
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  benefits: {
    width: '100%',
    marginBottom: 32,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  benefitText: {
    fontSize: 16,
    color: '#495057',
    flex: 1,
  },
  buttons: {
    width: '100%',
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#007bff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledButton: {
    backgroundColor: '#e9ecef',
  },
  disclaimer: {
    fontSize: 12,
    color: '#adb5bd',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default NotificationPermissionRequest;