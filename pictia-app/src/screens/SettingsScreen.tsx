import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Modal,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectUserProfile, selectIsLocalMode } from '@/store/selectors/authSelectors';
import { 
  selectPreferences,
  selectSettingsLoading,
  selectSettingsError,
  selectHasUnsavedChanges,
  selectFormattedStorageInfo,
  selectIsPreferencesLoaded
} from '@/store/selectors/settingsSelectors';
import { logoutUser } from '@/store/thunks/authThunks';
import {
  loadPreferences,
  savePreferences,
  updateSinglePreference,
  resetPreferencesToDefaults,
  loadStorageInfo
} from '@/store/thunks/settingsThunks';
import { clearError } from '@/store/slices/settingsSlice';
import { NotificationSettings, ScheduleSettings } from '@/components';
import { AppPreferences, BackupConfig } from '@/types';
import { formatFileSize } from '@/utils';
import { 
  loadBackupConfig,
  configureBackup 
} from '@/store/thunks/backupThunks';
import { selectBackupConfig, selectBackupLoading } from '@/store/selectors/backupSelectors';

interface SettingsScreenProps {
  navigation: any;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const userProfile = useAppSelector(selectUserProfile);
  const isLocalMode = useAppSelector(selectIsLocalMode);
  const preferences = useAppSelector(selectPreferences);
  const isLoading = useAppSelector(selectSettingsLoading);
  const error = useAppSelector(selectSettingsError);
  const hasUnsavedChanges = useAppSelector(selectHasUnsavedChanges);
  const storageInfo = useAppSelector(selectFormattedStorageInfo);
  const isPreferencesLoaded = useAppSelector(selectIsPreferencesLoaded);
  
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showBackupSettings, setShowBackupSettings] = useState(false);
  
  // Backup-related state
  const backupConfig = useAppSelector(selectBackupConfig);
  const backupLoading = useAppSelector(selectBackupLoading);

  // Load preferences and backup config on component mount
  useEffect(() => {
    if (!isLocalMode) {
      if (!isPreferencesLoaded) {
        dispatch(loadPreferences());
      }
      dispatch(loadStorageInfo());
      dispatch(loadBackupConfig());
    }
  }, [dispatch, isPreferencesLoaded, isLocalMode]);

  // Show error alerts
  useEffect(() => {
    if (error) {
      Alert.alert(
        'Settings Error',
        error.message,
        [
          {
            text: 'OK',
            onPress: () => dispatch(clearError()),
          },
        ]
      );
    }
  }, [error, dispatch]);

  const handleLogout = () => {
    const actionText = isLocalMode ? 'Exit Local Mode' : 'Sign Out';
    const confirmText = isLocalMode ? 'Exit' : 'Sign Out';
    
    if (hasUnsavedChanges) {
      Alert.alert(
        'Unsaved Changes',
        `You have unsaved settings changes. Do you want to save them before ${actionText.toLowerCase()}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => dispatch(logoutUser()),
          },
          {
            text: `Save & ${confirmText}`,
            onPress: async () => {
              if (preferences) {
                await dispatch(savePreferences(preferences));
              }
              dispatch(logoutUser());
            },
          },
        ]
      );
    } else {
      Alert.alert(
        actionText,
        `Are you sure you want to ${actionText.toLowerCase()}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: confirmText,
            style: 'destructive',
            onPress: () => dispatch(logoutUser()),
          },
        ]
      );
    }
  };

  const handlePreferenceChange = (
    key: keyof AppPreferences,
    value: any
  ) => {
    dispatch(updateSinglePreference({ key, value }));
  };

  const handleResetToDefaults = () => {
    Alert.alert(
      'Reset Settings',
      'This will reset all settings to their default values. This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => dispatch(resetPreferencesToDefaults()),
        },
      ]
    );
  };

  const handleBackupConfigChange = (config: BackupConfig) => {
    // This is called when the user changes settings in the ScheduleSettings component
    // We don't need to do anything here as the component manages its own local state
  };

  const handleBackupConfigSave = async (config: BackupConfig) => {
    try {
      await dispatch(configureBackup(config)).unwrap();
      setShowBackupSettings(false);
      Alert.alert(
        'Backup Configured',
        'Your backup schedule has been saved successfully.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert(
        'Save Failed',
        error instanceof Error ? error.message : 'Failed to save backup configuration',
        [{ text: 'OK' }]
      );
    }
  };

  const handleBackupConfigCancel = () => {
    setShowBackupSettings(false);
  };

  const settingsOptions = [
    {
      title: 'Notifications',
      description: 'Configure backup reminders and notification preferences',
      onPress: () => setShowNotificationSettings(true),
      icon: '🔔',
      showInLocalMode: false, // Hide in local mode since no Google Photos backup
    },
    {
      title: 'Backup Settings',
      description: 'Configure automatic backup schedules',
      onPress: () => setShowBackupSettings(true),
      icon: '☁️',
      showInLocalMode: false, // Hide in local mode since no Google Photos backup
    },
    {
      title: 'Advanced Settings',
      description: 'Performance, storage, and developer options',
      onPress: () => setShowAdvancedSettings(true),
      icon: '⚙️',
      showInLocalMode: true,
    },
    {
      title: 'Debug Tools',
      description: 'Developer tools for testing and debugging',
      onPress: () => navigation.navigate('Debug'),
      icon: '🔧',
      showInLocalMode: true,
    },
    {
      title: 'About',
      description: 'App version and information',
      onPress: () => {
        // TODO: Navigate to about screen when implemented
        console.log('Navigate to about screen');
      },
      icon: 'ℹ️',
      showInLocalMode: true,
    },
  ].filter(option => !isLocalMode || option.showInLocalMode);

  const renderUserProfile = () => (
    <View style={styles.profileSection}>
      <View style={styles.profileInfo}>
        <Text style={styles.profileName}>
          {isLocalMode ? 'Local Gallery Mode' : (userProfile?.name || 'User')}
        </Text>
        <Text style={styles.profileEmail}>
          {isLocalMode ? 'Using device gallery only' : (userProfile?.email || 'No email available')}
        </Text>
        {!isLocalMode && userProfile?.quotaUsed !== undefined && userProfile?.quotaLimit !== undefined && (
          <Text style={styles.profileQuota}>
            Storage: {formatFileSize(userProfile.quotaUsed)} / {formatFileSize(userProfile.quotaLimit)}
          </Text>
        )}
        {isLocalMode && (
          <Text style={styles.profileQuota}>
            No Google Photos integration
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutButtonText}>
          {isLocalMode ? 'Exit Local Mode' : 'Sign Out'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderPreferenceToggle = (
    key: keyof AppPreferences,
    title: string,
    description: string,
    value: boolean
  ) => (
    <View style={styles.preferenceItem}>
      <View style={styles.preferenceContent}>
        <Text style={styles.preferenceTitle}>{title}</Text>
        <Text style={styles.preferenceDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={(newValue) => handlePreferenceChange(key, newValue)}
        trackColor={{ false: '#e9ecef', true: '#007bff' }}
        thumbColor={value ? '#ffffff' : '#ffffff'}
      />
    </View>
  );

  const renderPreferencesSection = () => {
    // In local mode, show a simplified preferences section
    if (isLocalMode) {
      return (
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Local Mode Settings</Text>
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceContent}>
              <Text style={styles.preferenceTitle}>Local Gallery Mode</Text>
              <Text style={styles.preferenceDescription}>
                You're using Pictia in local mode. Photos are organized on your device only.
              </Text>
            </View>
          </View>
        </View>
      );
    }

    if (!preferences) return null;

    return (
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>App Preferences</Text>
        
        {renderPreferenceToggle(
          'autoBackupEnabled',
          'Auto Backup',
          'Automatically backup organized photos',
          preferences.autoBackupEnabled
        )}
        
        {renderPreferenceToggle(
          'highQualityUploads',
          'High Quality Uploads',
          'Upload photos in original quality',
          preferences.highQualityUploads
        )}
        
        {renderPreferenceToggle(
          'wifiOnlyUploads',
          'WiFi Only Uploads',
          'Only upload when connected to WiFi',
          preferences.wifiOnlyUploads
        )}
        
        {renderPreferenceToggle(
          'hapticFeedbackEnabled',
          'Haptic Feedback',
          'Vibrate on swipe gestures',
          preferences.hapticFeedbackEnabled
        )}
        
        {renderPreferenceToggle(
          'showOnboardingTips',
          'Show Tips',
          'Display helpful tips and tutorials',
          preferences.showOnboardingTips
        )}
      </View>
    );
  };

  const renderAdvancedSettings = () => (
    <Modal
      visible={showAdvancedSettings}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Advanced Settings</Text>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowAdvancedSettings(false)}
          >
            <Text style={styles.modalCloseText}>Done</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          {preferences && (
            <>
              <View style={styles.settingsSection}>
                <Text style={styles.sectionTitle}>Performance</Text>
                
                <View style={styles.preferenceItem}>
                  <View style={styles.preferenceContent}>
                    <Text style={styles.preferenceTitle}>Cache Size</Text>
                    <Text style={styles.preferenceDescription}>
                      {preferences.maxCacheSize}MB - Maximum cache storage
                    </Text>
                  </View>
                </View>
                
                <View style={styles.preferenceItem}>
                  <View style={styles.preferenceContent}>
                    <Text style={styles.preferenceTitle}>Undo Timeout</Text>
                    <Text style={styles.preferenceDescription}>
                      {preferences.undoTimeoutSeconds}s - Time to undo swipe actions
                    </Text>
                  </View>
                </View>
                
                <View style={styles.preferenceItem}>
                  <View style={styles.preferenceContent}>
                    <Text style={styles.preferenceTitle}>Gesture Sensitivity</Text>
                    <Text style={styles.preferenceDescription}>
                      {Math.round(preferences.gestureThreshold * 100)}% - Swipe detection threshold
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.settingsSection}>
                <Text style={styles.sectionTitle}>Privacy</Text>
                
                {renderPreferenceToggle(
                  'enableAnalytics',
                  'Analytics',
                  'Help improve the app by sharing usage data',
                  preferences.enableAnalytics
                )}
                
                {renderPreferenceToggle(
                  'enableCrashReporting',
                  'Crash Reporting',
                  'Automatically report app crashes',
                  preferences.enableCrashReporting
                )}
              </View>

              {storageInfo && (
                <View style={styles.settingsSection}>
                  <Text style={styles.sectionTitle}>Storage</Text>
                  
                  <View style={styles.storageItem}>
                    <Text style={styles.storageLabel}>App Data</Text>
                    <Text style={styles.storageValue}>{storageInfo.totalAppStorage}</Text>
                  </View>
                  
                  <View style={styles.storageItem}>
                    <Text style={styles.storageLabel}>Settings</Text>
                    <Text style={styles.storageValue}>{storageInfo.preferencesSize}</Text>
                  </View>
                </View>
              )}

              <View style={styles.settingsSection}>
                <Text style={styles.sectionTitle}>Reset</Text>
                
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={handleResetToDefaults}
                >
                  <Text style={styles.resetButtonText}>Reset to Defaults</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderSettingsOption = (option: typeof settingsOptions[0], index: number) => (
    <TouchableOpacity
      key={index}
      style={styles.settingOption}
      onPress={option.onPress}
    >
      <View style={styles.settingIcon}>
        <Text style={styles.settingIconText}>{option.icon}</Text>
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{option.title}</Text>
        <Text style={styles.settingDescription}>{option.description}</Text>
      </View>
      <Text style={styles.settingChevron}>›</Text>
    </TouchableOpacity>
  );

  if (!isLocalMode && isLoading && !isPreferencesLoaded) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        {hasUnsavedChanges && (
          <View style={styles.unsavedIndicator}>
            <Text style={styles.unsavedText}>•</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderUserProfile()}
        
        {renderPreferencesSection()}
        
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>More Options</Text>
          {settingsOptions.map(renderSettingsOption)}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Pictia v1.0.0</Text>
          <Text style={styles.footerSubtext}>
            Photo organization made simple
          </Text>
          {storageInfo && (
            <Text style={styles.footerSubtext}>
              App storage: {storageInfo.totalAppStorage}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Notification Settings Modal */}
      <Modal
        visible={showNotificationSettings}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Notifications</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowNotificationSettings(false)}
            >
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
          <NotificationSettings
            onClose={() => setShowNotificationSettings(false)}
          />
        </SafeAreaView>
      </Modal>

      {/* Advanced Settings Modal */}
      {renderAdvancedSettings()}

      {/* Backup Settings Modal */}
      <Modal
        visible={showBackupSettings}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Backup Schedule</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={handleBackupConfigCancel}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <ScheduleSettings
            config={backupConfig}
            onConfigChange={handleBackupConfigChange}
            onSave={handleBackupConfigSave}
            onCancel={handleBackupConfigCancel}
            isLoading={backupLoading}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
  },
  unsavedIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffc107',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unsavedText: {
    fontSize: 8,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
  },
  content: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: '#6c757d',
  },
  profileQuota: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  settingsSection: {
    backgroundColor: '#ffffff',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#495057',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  settingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingIconText: {
    fontSize: 20,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 18,
  },
  settingChevron: {
    fontSize: 20,
    color: '#adb5bd',
    marginLeft: 8,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6c757d',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 14,
    color: '#adb5bd',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212529',
  },
  modalCloseButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007bff',
  },
  modalContent: {
    flex: 1,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
    backgroundColor: '#ffffff',
  },
  preferenceContent: {
    flex: 1,
    marginRight: 16,
  },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 2,
  },
  preferenceDescription: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 18,
  },
  storageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
    backgroundColor: '#ffffff',
  },
  storageLabel: {
    fontSize: 16,
    color: '#212529',
  },
  storageValue: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
  },
  resetButton: {
    backgroundColor: '#dc3545',
    marginHorizontal: 20,
    marginVertical: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default SettingsScreen;