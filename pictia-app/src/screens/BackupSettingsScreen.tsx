import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectIsLocalMode } from '@/store/selectors/authSelectors';
import { 
  selectPreferences,
  selectSettingsLoading,
} from '@/store/selectors/settingsSelectors';
import {
  updateSinglePreference,
} from '@/store/thunks/settingsThunks';
import { 
  loadBackupConfig,
  configureBackup 
} from '@/store/thunks/backupThunks';
import { selectBackupConfig, selectBackupLoading } from '@/store/selectors/backupSelectors';
import { ScheduleSettings } from '@/components';
import { BackupConfig, AppPreferences } from '@/types';

interface BackupSettingsScreenProps {
  navigation: any;
}

const BackupSettingsScreen: React.FC<BackupSettingsScreenProps> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const isLocalMode = useAppSelector(selectIsLocalMode);
  const preferences = useAppSelector(selectPreferences);
  const isLoading = useAppSelector(selectSettingsLoading);
  const backupConfig = useAppSelector(selectBackupConfig);
  const backupLoading = useAppSelector(selectBackupLoading);

  const [showScheduleSettings, setShowScheduleSettings] = useState(false);

  useEffect(() => {
    if (!isLocalMode) {
      dispatch(loadBackupConfig());
    }
  }, [dispatch, isLocalMode]);

  const handlePreferenceChange = (
    key: keyof AppPreferences,
    value: any
  ) => {
    if (preferences) {
      dispatch(updateSinglePreference({ key, value }));
    }
  };

  const handleBackupConfigSave = async (config: BackupConfig) => {
    try {
      await dispatch(configureBackup(config)).unwrap();
      setShowScheduleSettings(false);
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

  const renderPreferenceToggle = (
    key: keyof AppPreferences,
    title: string,
    description: string,
    value: boolean,
    disabled: boolean = false
  ) => (
    <View style={[styles.preferenceItem, disabled && styles.disabledItem]}>
      <View style={styles.preferenceContent}>
        <Text style={[styles.preferenceTitle, disabled && styles.disabledText]}>{title}</Text>
        <Text style={[styles.preferenceDescription, disabled && styles.disabledText]}>
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={(newValue) => {
          if (!disabled) {
            handlePreferenceChange(key, newValue);
          }
        }}
        trackColor={{ false: '#e9ecef', true: disabled ? '#e9ecef' : '#007bff' }}
        thumbColor={value && !disabled ? '#ffffff' : '#ffffff'}
        disabled={disabled}
      />
    </View>
  );

  const renderBackupOption = (
    title: string,
    description: string,
    onPress: () => void,
    disabled: boolean = false
  ) => (
    <TouchableOpacity
      style={[styles.backupOption, disabled && styles.disabledItem]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
    >
      <View style={styles.backupOptionContent}>
        <Text style={[styles.backupOptionTitle, disabled && styles.disabledText]}>{title}</Text>
        <Text style={[styles.backupOptionDescription, disabled && styles.disabledText]}>
          {description}
        </Text>
      </View>
      <Text style={[styles.backupOptionChevron, disabled && styles.disabledText]}>›</Text>
    </TouchableOpacity>
  );

  if (isLoading && !preferences) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Backup Settings</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Loading backup settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isGooglePhotosConnected = !isLocalMode;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Backup Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!isGooglePhotosConnected && (
          <View style={styles.notConnectedSection}>
            <View style={styles.notConnectedContent}>
              <Text style={styles.notConnectedTitle}>Google Photos Not Connected</Text>
              <Text style={styles.notConnectedDescription}>
                Connect your Google Photos account to enable backup features.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Backup Preferences</Text>
          
          {preferences && renderPreferenceToggle(
            'autoBackupEnabled',
            'Auto Backup',
            'Automatically backup organized photos to Google Photos',
            preferences.autoBackupEnabled,
            !isGooglePhotosConnected
          )}
          
          {preferences && renderPreferenceToggle(
            'highQualityUploads',
            'High Quality Uploads',
            'Upload photos in original quality (uses more storage)',
            preferences.highQualityUploads,
            !isGooglePhotosConnected
          )}
          
          {preferences && renderPreferenceToggle(
            'wifiOnlyUploads',
            'WiFi Only Uploads',
            'Only upload when connected to WiFi to save mobile data',
            preferences.wifiOnlyUploads,
            !isGooglePhotosConnected
          )}
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Schedule & Automation</Text>
          
          {renderBackupOption(
            'Backup Schedule',
            backupConfig 
              ? `Currently set to ${backupConfig.frequency} backups`
              : 'Configure automatic backup timing',
            () => setShowScheduleSettings(true),
            !isGooglePhotosConnected
          )}
          
          {renderBackupOption(
            'Notification Settings',
            'Configure backup reminders and completion notifications',
            () => {
              // Navigate to notification settings or show modal
              console.log('Navigate to notification settings');
            },
            !isGooglePhotosConnected
          )}
        </View>

        {isGooglePhotosConnected && (
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>Storage Information</Text>
            
            <View style={styles.storageInfo}>
              <Text style={styles.storageInfoText}>
                Backup settings will sync with your Google Photos account storage limits and preferences.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Schedule Settings Modal */}
      {showScheduleSettings && (
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Backup Schedule</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowScheduleSettings(false)}
              >
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <ScheduleSettings
              config={backupConfig}
              onConfigChange={() => {}}
              onSave={handleBackupConfigSave}
              onCancel={() => setShowScheduleSettings(false)}
              isLoading={backupLoading}
            />
          </SafeAreaView>
        </View>
      )}
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
  },
  backButton: {
    marginRight: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backButtonText: {
    fontSize: 18,
    color: '#007bff',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212529',
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
  notConnectedSection: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
    margin: 20,
    padding: 16,
    borderRadius: 8,
  },
  notConnectedContent: {
    alignItems: 'center',
  },
  notConnectedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  notConnectedDescription: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    lineHeight: 20,
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
  backupOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
    backgroundColor: '#ffffff',
  },
  backupOptionContent: {
    flex: 1,
  },
  backupOptionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 2,
  },
  backupOptionDescription: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 18,
  },
  backupOptionChevron: {
    fontSize: 20,
    color: '#adb5bd',
    marginLeft: 8,
  },
  disabledItem: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#adb5bd',
  },
  storageInfo: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
  },
  storageInfoText: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
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
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
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
});

export default BackupSettingsScreen;