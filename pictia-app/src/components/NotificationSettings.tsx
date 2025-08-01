import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  selectNotificationConfig,
  selectNotificationPermissions,
  selectNotificationLoading,
  selectNotificationError,
  selectCanSendNotifications,
  selectLastTestNotificationSent,
} from '@/store/selectors/notificationSelectors';
import {
  requestNotificationPermissions,
  saveNotificationConfig,
  sendTestNotification,
  updateConfig,
  clearError,
} from '@/store/slices/notificationSlice';
import { NotificationConfig } from '@/services';

interface NotificationSettingsProps {
  onClose?: () => void;
}

const HOURS_OPTIONS = [
  { label: '1 hour before', value: 1 },
  { label: '2 hours before', value: 2 },
  { label: '6 hours before', value: 6 },
  { label: '12 hours before', value: 12 },
  { label: '1 day before', value: 24 },
  { label: '2 days before', value: 48 },
  { label: '1 week before', value: 168 },
];

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ onClose }) => {
  const dispatch = useAppDispatch();
  const config = useAppSelector(selectNotificationConfig);
  const permissions = useAppSelector(selectNotificationPermissions);
  const isLoading = useAppSelector(selectNotificationLoading);
  const error = useAppSelector(selectNotificationError);
  const canSendNotifications = useAppSelector(selectCanSendNotifications);
  const lastTestSent = useAppSelector(selectLastTestNotificationSent);

  const [localConfig, setLocalConfig] = useState<NotificationConfig>(config);
  const [showHoursSelector, setShowHoursSelector] = useState(false);
  const [customMessage, setCustomMessage] = useState(config.customMessage || '');

  useEffect(() => {
    setLocalConfig(config);
    setCustomMessage(config.customMessage || '');
  }, [config]);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [
        { text: 'OK', onPress: () => dispatch(clearError()) },
      ]);
    }
  }, [error, dispatch]);

  const handlePermissionRequest = async () => {
    try {
      await dispatch(requestNotificationPermissions()).unwrap();
    } catch (err) {
      console.error('Failed to request permissions:', err);
    }
  };

  const handleConfigChange = (updates: Partial<NotificationConfig>) => {
    const newConfig = { ...localConfig, ...updates };
    setLocalConfig(newConfig);
    dispatch(updateConfig(updates));
  };

  const handleSaveConfig = async () => {
    try {
      const configToSave: NotificationConfig = {
        ...localConfig,
        customMessage: customMessage.trim() || undefined,
      };
      await dispatch(saveNotificationConfig(configToSave)).unwrap();
      Alert.alert('Success', 'Notification settings saved successfully!');
    } catch (err) {
      console.error('Failed to save config:', err);
    }
  };

  const handleTestNotification = async () => {
    if (!canSendNotifications) {
      Alert.alert(
        'Cannot Send Test',
        'Please enable notifications and grant permissions first.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      await dispatch(sendTestNotification()).unwrap();
      Alert.alert(
        'Test Sent!',
        'A test notification has been sent. You should see it shortly.',
        [{ text: 'OK' }]
      );
    } catch (err) {
      console.error('Failed to send test notification:', err);
    }
  };

  const getSelectedHoursLabel = () => {
    const option = HOURS_OPTIONS.find(opt => opt.value === localConfig.hoursBeforeBackup);
    return option?.label || `${localConfig.hoursBeforeBackup} hours before`;
  };

  const renderPermissionSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Permissions</Text>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Notification Permission</Text>
          <Text style={styles.settingDescription}>
            {permissions?.granted 
              ? 'Granted - You will receive notifications' 
              : permissions?.canAskAgain 
                ? 'Not granted - Tap to request permission'
                : 'Denied - Please enable in device settings'
            }
          </Text>
        </View>
        
        {!permissions?.granted && permissions?.canAskAgain && (
          <TouchableOpacity
            style={styles.button}
            onPress={handlePermissionRequest}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Requesting...' : 'Request'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {!permissions?.granted && !permissions?.canAskAgain && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            Notifications are disabled. To enable them:
            {Platform.OS === 'ios' 
              ? '\n1. Go to Settings > Pictia\n2. Enable Notifications'
              : '\n1. Go to Settings > Apps > Pictia\n2. Enable Notifications'
            }
          </Text>
        </View>
      )}
    </View>
  );

  const renderNotificationToggle = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Notification Settings</Text>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Enable Notifications</Text>
          <Text style={styles.settingDescription}>
            Receive reminders before scheduled backups
          </Text>
        </View>
        <Switch
          value={localConfig.enabled}
          onValueChange={(enabled) => handleConfigChange({ enabled })}
          disabled={!permissions?.granted}
        />
      </View>
    </View>
  );

  const renderTimingSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Reminder Timing</Text>
      
      <TouchableOpacity
        style={[
          styles.settingRow,
          !localConfig.enabled && styles.disabledSetting
        ]}
        onPress={() => setShowHoursSelector(!showHoursSelector)}
        disabled={!localConfig.enabled}
      >
        <View style={styles.settingInfo}>
          <Text style={[
            styles.settingLabel,
            !localConfig.enabled && styles.disabledText
          ]}>
            Reminder Time
          </Text>
          <Text style={[
            styles.settingDescription,
            !localConfig.enabled && styles.disabledText
          ]}>
            {getSelectedHoursLabel()}
          </Text>
        </View>
        <Text style={[
          styles.chevron,
          !localConfig.enabled && styles.disabledText
        ]}>
          {showHoursSelector ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {showHoursSelector && localConfig.enabled && (
        <View style={styles.optionsContainer}>
          {HOURS_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionRow,
                option.value === localConfig.hoursBeforeBackup && styles.selectedOption
              ]}
              onPress={() => {
                handleConfigChange({ hoursBeforeBackup: option.value });
                setShowHoursSelector(false);
              }}
            >
              <Text style={[
                styles.optionText,
                option.value === localConfig.hoursBeforeBackup && styles.selectedOptionText
              ]}>
                {option.label}
              </Text>
              {option.value === localConfig.hoursBeforeBackup && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderCustomMessage = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Custom Message (Optional)</Text>
      
      <View style={styles.textInputContainer}>
        <Text style={styles.inputLabel}>Notification Message</Text>
        <Text style={styles.inputDescription}>
          Leave empty to use the default message
        </Text>
        {/* Note: Using a simple text display for now since TextInput would require additional styling */}
        <TouchableOpacity
          style={[
            styles.textInputPlaceholder,
            !localConfig.enabled && styles.disabledSetting
          ]}
          disabled={!localConfig.enabled}
          onPress={() => {
            if (localConfig.enabled) {
              Alert.prompt(
                'Custom Message',
                'Enter your custom notification message:',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Save', 
                    onPress: (text) => setCustomMessage(text || '') 
                  },
                ],
                'plain-text',
                customMessage
              );
            }
          }}
        >
          <Text style={[
            styles.textInputText,
            !localConfig.enabled && styles.disabledText
          ]}>
            {customMessage || 'Tap to set custom message...'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTestSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Test Notifications</Text>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Send Test Notification</Text>
          <Text style={styles.settingDescription}>
            {lastTestSent 
              ? `Last test sent: ${lastTestSent.toLocaleTimeString()}`
              : 'Verify your notification settings are working'
            }
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.button,
            !canSendNotifications && styles.disabledButton
          ]}
          onPress={handleTestNotification}
          disabled={!canSendNotifications || isLoading}
        >
          <Text style={[
            styles.buttonText,
            !canSendNotifications && styles.disabledButtonText
          ]}>
            {isLoading ? 'Sending...' : 'Test'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderActionButtons = () => (
    <View style={styles.actionButtons}>
      <TouchableOpacity
        style={[styles.saveButton, isLoading && styles.disabledButton]}
        onPress={handleSaveConfig}
        disabled={isLoading}
      >
        <Text style={styles.saveButtonText}>
          {isLoading ? 'Saving...' : 'Save Settings'}
        </Text>
      </TouchableOpacity>
      
      {onClose && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onClose}
        >
          <Text style={styles.cancelButtonText}>Close</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Notification Settings</Text>
        <Text style={styles.subtitle}>
          Configure backup reminders and notification preferences
        </Text>
      </View>

      {renderPermissionSection()}
      {renderNotificationToggle()}
      {renderTimingSettings()}
      {renderCustomMessage()}
      {renderTestSection()}
      {renderActionButtons()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
  },
  section: {
    backgroundColor: '#ffffff',
    marginTop: 12,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e9ecef',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    minHeight: 60,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
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
  disabledSetting: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#adb5bd',
  },
  button: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  disabledButton: {
    backgroundColor: '#e9ecef',
  },
  disabledButtonText: {
    color: '#adb5bd',
  },
  warningBox: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    marginHorizontal: 20,
    marginTop: 8,
  },
  warningText: {
    color: '#856404',
    fontSize: 14,
    lineHeight: 18,
  },
  chevron: {
    fontSize: 16,
    color: '#6c757d',
    marginLeft: 8,
  },
  optionsContainer: {
    backgroundColor: '#f8f9fa',
    marginHorizontal: 20,
    borderRadius: 6,
    marginTop: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  selectedOption: {
    backgroundColor: '#e3f2fd',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#495057',
  },
  selectedOptionText: {
    color: '#1976d2',
    fontWeight: '500',
  },
  checkmark: {
    fontSize: 16,
    color: '#1976d2',
    fontWeight: 'bold',
  },
  textInputContainer: {
    paddingHorizontal: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#495057',
    marginBottom: 4,
  },
  inputDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
  },
  textInputPlaceholder: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    padding: 12,
    backgroundColor: '#ffffff',
    minHeight: 44,
    justifyContent: 'center',
  },
  textInputText: {
    fontSize: 16,
    color: '#495057',
  },
  actionButtons: {
    padding: 20,
    paddingBottom: 40,
  },
  saveButton: {
    backgroundColor: '#28a745',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default NotificationSettings;