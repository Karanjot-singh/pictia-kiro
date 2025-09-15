import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  selectNotificationPermissions,
  selectNotificationLoading,
} from '@/store/selectors/notificationSelectors';
import {
  requestNotificationPermissions,
  clearError,
} from '@/store/slices/notificationSlice';
import { THEME_COLORS, SPACING, TEXT_STYLES, SHADOWS, BORDER_RADIUS } from '@/theme';
import EnhancedButton from './EnhancedButton';

interface NotificationPermissionRequestProps {
  visible: boolean;
  onClose: () => void;
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
}

const { width } = Dimensions.get('window');

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

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      // Entrance animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animation values
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
      slideAnim.setValue(50);
    }
  }, [visible]);

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
      animationType="none"
      transparent={true}
      onRequestClose={onClose}
    >
      <Animated.View 
        style={[
          styles.overlay,
          { opacity: fadeAnim },
        ]}
      >
        <Animated.View
          style={[
            styles.container,
            {
              transform: [
                { scale: scaleAnim },
                { translateY: slideAnim },
              ],
            },
          ]}
        >
          {/* Header with gradient background */}
          <LinearGradient
            colors={THEME_COLORS.PRIMARY_GRADIENT}
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>🔔</Text>
            </View>
            <Text style={styles.title}>Enable Notifications</Text>
            <Text style={styles.headerDescription}>
              Stay on top of your photo organization
            </Text>
          </LinearGradient>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.description}>
              Get reminded before your scheduled backups so you never miss organizing your photos.
            </Text>
            
            <View style={styles.benefits}>
              <View style={styles.benefitItem}>
                <View style={styles.benefitIconContainer}>
                  <Text style={styles.benefitIcon}>⏰</Text>
                </View>
                <View style={styles.benefitTextContainer}>
                  <Text style={styles.benefitTitle}>Timely Reminders</Text>
                  <Text style={styles.benefitSubtext}>Never miss a backup schedule</Text>
                </View>
              </View>
              
              <View style={styles.benefitItem}>
                <View style={styles.benefitIconContainer}>
                  <Text style={styles.benefitIcon}>📱</Text>
                </View>
                <View style={styles.benefitTextContainer}>
                  <Text style={styles.benefitTitle}>Customizable</Text>
                  <Text style={styles.benefitSubtext}>Set your preferred timing</Text>
                </View>
              </View>
              
              <View style={styles.benefitItem}>
                <View style={styles.benefitIconContainer}>
                  <Text style={styles.benefitIcon}>🎯</Text>
                </View>
                <View style={styles.benefitTextContainer}>
                  <Text style={styles.benefitTitle}>Stay Organized</Text>
                  <Text style={styles.benefitSubtext}>Keep your photos tidy</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.buttons}>
              <EnhancedButton
                title={isLoading ? 'Requesting...' : 'Enable Notifications'}
                onPress={handleRequestPermission}
                variant="primary"
                size="large"
                disabled={isLoading}
                loading={isLoading}
                icon="notifications"
                fullWidth
                style={styles.primaryButton}
              />
              
              <EnhancedButton
                title="Maybe Later"
                onPress={handleSkip}
                variant="minimal"
                size="large"
                disabled={isLoading}
                fullWidth
                style={styles.secondaryButton}
              />
            </View>
            
            <Text style={styles.disclaimer}>
              You can change this setting anytime in the app settings.
            </Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.LG,
  },

  container: {
    backgroundColor: THEME_COLORS.WHITE,
    borderRadius: BORDER_RADIUS.XL,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    ...SHADOWS.MODAL,
  },

  header: {
    paddingTop: SPACING.XXL,
    paddingBottom: SPACING.LG,
    paddingHorizontal: SPACING.LG,
    alignItems: 'center',
  },

  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME_COLORS.WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.MD,
    ...SHADOWS.BUTTON,
  },

  icon: {
    fontSize: 36,
  },

  title: {
    ...TEXT_STYLES.heading2,
    color: THEME_COLORS.WHITE,
    marginBottom: SPACING.SM,
    textAlign: 'center',
  },

  headerDescription: {
    ...TEXT_STYLES.bodyMedium,
    color: THEME_COLORS.WHITE,
    opacity: 0.9,
    textAlign: 'center',
  },

  content: {
    padding: SPACING.LG,
  },

  description: {
    ...TEXT_STYLES.bodyLarge,
    color: THEME_COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.LG,
  },

  benefits: {
    marginBottom: SPACING.XXL,
  },

  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MD,
    paddingHorizontal: SPACING.SM,
  },

  benefitIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME_COLORS.LIGHT_GRAY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.MD,
  },

  benefitIcon: {
    fontSize: 20,
  },

  benefitTextContainer: {
    flex: 1,
  },

  benefitTitle: {
    ...TEXT_STYLES.bodyMedium,
    fontWeight: '600',
    color: THEME_COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },

  benefitSubtext: {
    ...TEXT_STYLES.bodySmall,
    color: THEME_COLORS.TEXT_SECONDARY,
  },

  buttons: {
    marginBottom: SPACING.MD,
  },

  primaryButton: {
    marginBottom: SPACING.MD,
  },

  secondaryButton: {
    // No additional styling needed - handled by EnhancedButton
  },

  disabledButton: {
    opacity: 0.6,
  },

  disclaimer: {
    ...TEXT_STYLES.caption,
    color: THEME_COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 16,
    opacity: 0.8,
  },
});

export default NotificationPermissionRequest;