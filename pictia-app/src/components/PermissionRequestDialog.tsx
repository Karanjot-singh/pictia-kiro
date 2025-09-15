/**
 * Modern permission request dialog component
 * Provides a consistent, attractive interface for requesting various permissions
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME_COLORS, SPACING, TEXT_STYLES, SHADOWS, BORDER_RADIUS } from '@/theme';

interface PermissionBenefit {
  icon: string;
  title: string;
  description: string;
}

interface PermissionRequestDialogProps {
  visible: boolean;
  onClose: () => void;
  onAllow: () => void;
  onDeny: () => void;
  title: string;
  description: string;
  icon: string;
  benefits: PermissionBenefit[];
  allowButtonText?: string;
  denyButtonText?: string;
  isLoading?: boolean;
  gradientColors?: readonly [string, string];
}

const { width } = Dimensions.get('window');

const PermissionRequestDialog: React.FC<PermissionRequestDialogProps> = ({
  visible,
  onClose,
  onAllow,
  onDeny,
  title,
  description,
  icon,
  benefits,
  allowButtonText = 'Allow',
  denyButtonText = 'Not Now',
  isLoading = false,
  gradientColors = THEME_COLORS.PRIMARY_GRADIENT,
}) => {
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

  const handleAllow = () => {
    if (!isLoading) {
      onAllow();
    }
  };

  const handleDeny = () => {
    if (!isLoading) {
      onDeny();
    }
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
            colors={gradientColors}
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>{icon}</Text>
            </View>
            <Text style={styles.title}>{title}</Text>
          </LinearGradient>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.description}>{description}</Text>
            
            {benefits.length > 0 && (
              <View style={styles.benefits}>
                {benefits.map((benefit, index) => (
                  <View key={index} style={styles.benefitItem}>
                    <View style={styles.benefitIconContainer}>
                      <Text style={styles.benefitIcon}>{benefit.icon}</Text>
                    </View>
                    <View style={styles.benefitTextContainer}>
                      <Text style={styles.benefitTitle}>{benefit.title}</Text>
                      <Text style={styles.benefitSubtext}>{benefit.description}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
            
            <View style={styles.buttons}>
              <TouchableOpacity
                style={[styles.primaryButton, isLoading && styles.disabledButton]}
                onPress={handleAllow}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={gradientColors}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={THEME_COLORS.WHITE} />
                      <Text style={styles.loadingText}>Processing...</Text>
                    </View>
                  ) : (
                    <Text style={styles.primaryButtonText}>{allowButtonText}</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleDeny}
                disabled={isLoading}
              >
                <Text style={styles.secondaryButtonText}>{denyButtonText}</Text>
              </TouchableOpacity>
            </View>
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
    marginBottom: SPACING.SM,
  },

  primaryButton: {
    height: 56,
    borderRadius: BORDER_RADIUS.LG,
    marginBottom: SPACING.MD,
    overflow: 'hidden',
    ...SHADOWS.BUTTON,
  },

  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.LG,
  },

  primaryButtonText: {
    ...TEXT_STYLES.buttonText,
    color: THEME_COLORS.WHITE,
    fontSize: 16,
  },

  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    ...TEXT_STYLES.buttonText,
    color: THEME_COLORS.WHITE,
    marginLeft: SPACING.SM,
  },

  secondaryButton: {
    paddingVertical: SPACING.MD,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.MD,
  },

  secondaryButtonText: {
    ...TEXT_STYLES.buttonText,
    color: THEME_COLORS.TEXT_SECONDARY,
    fontSize: 16,
  },

  disabledButton: {
    opacity: 0.6,
  },
});

export default PermissionRequestDialog;