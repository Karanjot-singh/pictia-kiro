import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  Modal,
  SafeAreaView,
} from 'react-native';
import { BackupConfig } from '@/types';

interface ScheduleSettingsProps {
  config: BackupConfig | null;
  onConfigChange: (config: BackupConfig) => void;
  onSave: (config: BackupConfig) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface ValidationError {
  field: string;
  message: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}${getOrdinalSuffix(i + 1)}`,
}));

const NOTIFICATION_OFFSETS = [
  { value: 1, label: '1 hour before' },
  { value: 2, label: '2 hours before' },
  { value: 6, label: '6 hours before' },
  { value: 12, label: '12 hours before' },
  { value: 24, label: '1 day before' },
  { value: 48, label: '2 days before' },
  { value: 72, label: '3 days before' },
];

function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) {
    return 'th';
  }
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

export const ScheduleSettings: React.FC<ScheduleSettingsProps> = ({
  config,
  onConfigChange,
  onSave,
  onCancel,
  isLoading = false,
}) => {
  const [localConfig, setLocalConfig] = useState<BackupConfig>(() => 
    config || {
      frequency: 'weekly',
      dayOfWeek: 0, // Sunday
      notificationEnabled: true,
      notificationOffset: 24, // 1 day before
    }
  );
  
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [showNotificationPicker, setShowNotificationPicker] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Update local config when prop changes
  useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);

  // Notify parent of changes
  useEffect(() => {
    onConfigChange(localConfig);
  }, [localConfig, onConfigChange]);

  const validateConfig = (configToValidate: BackupConfig): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!['weekly', 'monthly'].includes(configToValidate.frequency)) {
      errors.push({
        field: 'frequency',
        message: 'Frequency must be weekly or monthly',
      });
    }

    if (configToValidate.frequency === 'weekly') {
      if (configToValidate.dayOfWeek === undefined || 
          configToValidate.dayOfWeek < 0 || 
          configToValidate.dayOfWeek > 6) {
        errors.push({
          field: 'dayOfWeek',
          message: 'Day of week must be between 0 (Sunday) and 6 (Saturday)',
        });
      }
    }

    if (configToValidate.frequency === 'monthly') {
      if (configToValidate.dayOfMonth === undefined || 
          configToValidate.dayOfMonth < 1 || 
          configToValidate.dayOfMonth > 31) {
        errors.push({
          field: 'dayOfMonth',
          message: 'Day of month must be between 1 and 31',
        });
      }
    }

    if (configToValidate.notificationOffset < 1 || configToValidate.notificationOffset > 168) {
      errors.push({
        field: 'notificationOffset',
        message: 'Notification offset must be between 1 and 168 hours',
      });
    }

    return errors;
  };

  const handleFrequencyChange = (frequency: 'weekly' | 'monthly') => {
    let newConfig: BackupConfig;
    
    if (frequency === 'weekly') {
      newConfig = {
        ...localConfig,
        frequency,
        dayOfWeek: localConfig.dayOfWeek ?? 0,
      };
      // Remove dayOfMonth if it exists
      delete (newConfig as any).dayOfMonth;
    } else {
      newConfig = {
        ...localConfig,
        frequency,
        dayOfMonth: localConfig.dayOfMonth ?? 1,
      };
      // Remove dayOfWeek if it exists
      delete (newConfig as any).dayOfWeek;
    }
    
    setLocalConfig(newConfig);
    setValidationErrors(validateConfig(newConfig));
  };

  const handleDayChange = (day: number) => {
    let newConfig: BackupConfig;
    
    if (localConfig.frequency === 'weekly') {
      newConfig = {
        ...localConfig,
        dayOfWeek: day,
      };
      // Remove dayOfMonth if it exists
      delete (newConfig as any).dayOfMonth;
    } else {
      newConfig = {
        ...localConfig,
        dayOfMonth: day,
      };
      // Remove dayOfWeek if it exists
      delete (newConfig as any).dayOfWeek;
    }
    
    setLocalConfig(newConfig);
    setValidationErrors(validateConfig(newConfig));
    setShowDayPicker(false);
  };

  const handleNotificationToggle = (enabled: boolean) => {
    const newConfig: BackupConfig = {
      ...localConfig,
      notificationEnabled: enabled,
    };
    setLocalConfig(newConfig);
    setValidationErrors(validateConfig(newConfig));
  };

  const handleNotificationOffsetChange = (offset: number) => {
    const newConfig: BackupConfig = {
      ...localConfig,
      notificationOffset: offset,
    };
    setLocalConfig(newConfig);
    setValidationErrors(validateConfig(newConfig));
    setShowNotificationPicker(false);
  };

  const handleSave = async () => {
    const errors = validateConfig(localConfig);
    setValidationErrors(errors);

    if (errors.length > 0) {
      Alert.alert(
        'Invalid Configuration',
        errors.map(e => e.message).join('\n'),
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      await onSave(localConfig);
    } catch (error) {
      Alert.alert(
        'Save Failed',
        error instanceof Error ? error.message : 'Failed to save backup configuration',
        [{ text: 'OK' }]
      );
    }
  };

  const handlePreview = () => {
    const errors = validateConfig(localConfig);
    setValidationErrors(errors);

    if (errors.length > 0) {
      Alert.alert(
        'Invalid Configuration',
        'Please fix the configuration errors before previewing.',
        [{ text: 'OK' }]
      );
      return;
    }

    setShowPreview(true);
  };

  const getSelectedDayLabel = (): string => {
    if (localConfig.frequency === 'weekly') {
      const day = DAYS_OF_WEEK.find(d => d.value === localConfig.dayOfWeek);
      return day?.label || 'Select day';
    } else {
      const day = DAYS_OF_MONTH.find(d => d.value === localConfig.dayOfMonth);
      return day?.label || 'Select day';
    }
  };

  const getNotificationOffsetLabel = (): string => {
    const offset = NOTIFICATION_OFFSETS.find(o => o.value === localConfig.notificationOffset);
    return offset?.label || `${localConfig.notificationOffset} hours before`;
  };

  const getNextBackupDate = (): Date => {
    const now = new Date();
    const nextBackup = new Date(now);

    if (localConfig.frequency === 'weekly') {
      const dayOfWeek = localConfig.dayOfWeek || 0;
      const daysUntilBackup = (dayOfWeek - now.getDay() + 7) % 7;
      nextBackup.setDate(now.getDate() + (daysUntilBackup === 0 ? 7 : daysUntilBackup));
    } else if (localConfig.frequency === 'monthly') {
      const dayOfMonth = localConfig.dayOfMonth || 1;
      nextBackup.setDate(dayOfMonth);
      
      // If the day has already passed this month, move to next month
      if (nextBackup <= now) {
        nextBackup.setMonth(nextBackup.getMonth() + 1);
      }
    }

    // Set time to noon to avoid timezone issues
    nextBackup.setHours(12, 0, 0, 0);
    
    return nextBackup;
  };

  const renderFrequencySelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Backup Frequency</Text>
      
      <TouchableOpacity
        style={[
          styles.optionButton,
          localConfig.frequency === 'weekly' && styles.optionButtonSelected,
        ]}
        onPress={() => handleFrequencyChange('weekly')}
      >
        <View style={styles.optionContent}>
          <Text style={[
            styles.optionTitle,
            localConfig.frequency === 'weekly' && styles.optionTitleSelected,
          ]}>
            Weekly
          </Text>
          <Text style={[
            styles.optionDescription,
            localConfig.frequency === 'weekly' && styles.optionDescriptionSelected,
          ]}>
            Backup every week on the same day
          </Text>
        </View>
        <View style={[
          styles.radioButton,
          localConfig.frequency === 'weekly' && styles.radioButtonSelected,
        ]}>
          {localConfig.frequency === 'weekly' && <View style={styles.radioButtonInner} />}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.optionButton,
          localConfig.frequency === 'monthly' && styles.optionButtonSelected,
        ]}
        onPress={() => handleFrequencyChange('monthly')}
      >
        <View style={styles.optionContent}>
          <Text style={[
            styles.optionTitle,
            localConfig.frequency === 'monthly' && styles.optionTitleSelected,
          ]}>
            Monthly
          </Text>
          <Text style={[
            styles.optionDescription,
            localConfig.frequency === 'monthly' && styles.optionDescriptionSelected,
          ]}>
            Backup every month on the same date
          </Text>
        </View>
        <View style={[
          styles.radioButton,
          localConfig.frequency === 'monthly' && styles.radioButtonSelected,
        ]}>
          {localConfig.frequency === 'monthly' && <View style={styles.radioButtonInner} />}
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderDaySelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {localConfig.frequency === 'weekly' ? 'Day of Week' : 'Day of Month'}
      </Text>
      
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setShowDayPicker(true)}
      >
        <Text style={styles.pickerButtonText}>{getSelectedDayLabel()}</Text>
        <Text style={styles.pickerButtonChevron}>›</Text>
      </TouchableOpacity>
    </View>
  );

  const renderNotificationSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Notifications</Text>
      
      <View style={styles.switchRow}>
        <View style={styles.switchContent}>
          <Text style={styles.switchTitle}>Enable Reminders</Text>
          <Text style={styles.switchDescription}>
            Get notified before scheduled backups
          </Text>
        </View>
        <Switch
          value={localConfig.notificationEnabled}
          onValueChange={handleNotificationToggle}
          trackColor={{ false: '#e9ecef', true: '#007bff' }}
          thumbColor={localConfig.notificationEnabled ? '#ffffff' : '#ffffff'}
        />
      </View>

      {localConfig.notificationEnabled && (
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setShowNotificationPicker(true)}
        >
          <Text style={styles.pickerButtonText}>{getNotificationOffsetLabel()}</Text>
          <Text style={styles.pickerButtonChevron}>›</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderValidationErrors = () => {
    if (validationErrors.length === 0) return null;

    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Configuration Errors:</Text>
        {validationErrors.map((error, index) => (
          <Text key={index} style={styles.errorText}>
            • {error.message}
          </Text>
        ))}
      </View>
    );
  };

  const renderDayPicker = () => (
    <Modal
      visible={showDayPicker}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            Select {localConfig.frequency === 'weekly' ? 'Day of Week' : 'Day of Month'}
          </Text>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowDayPicker(false)}
          >
            <Text style={styles.modalCloseText}>Cancel</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          {(localConfig.frequency === 'weekly' ? DAYS_OF_WEEK : DAYS_OF_MONTH).map((day) => (
            <TouchableOpacity
              key={day.value}
              style={styles.dayOption}
              onPress={() => handleDayChange(day.value)}
            >
              <Text style={styles.dayOptionText}>{day.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderNotificationPicker = () => (
    <Modal
      visible={showNotificationPicker}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Notification Timing</Text>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowNotificationPicker(false)}
          >
            <Text style={styles.modalCloseText}>Cancel</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          {NOTIFICATION_OFFSETS.map((offset) => (
            <TouchableOpacity
              key={offset.value}
              style={styles.dayOption}
              onPress={() => handleNotificationOffsetChange(offset.value)}
            >
              <Text style={styles.dayOptionText}>{offset.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderPreview = () => {
    const nextBackup = getNextBackupDate();
    const notificationDate = new Date(nextBackup);
    notificationDate.setHours(notificationDate.getHours() - localConfig.notificationOffset);

    return (
      <Modal
        visible={showPreview}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Backup Schedule Preview</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowPreview(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.previewSection}>
              <Text style={styles.previewTitle}>Schedule Summary</Text>
              
              <View style={styles.previewItem}>
                <Text style={styles.previewLabel}>Frequency:</Text>
                <Text style={styles.previewValue}>
                  {localConfig.frequency === 'weekly' ? 'Weekly' : 'Monthly'}
                </Text>
              </View>
              
              <View style={styles.previewItem}>
                <Text style={styles.previewLabel}>
                  {localConfig.frequency === 'weekly' ? 'Day of Week:' : 'Day of Month:'}
                </Text>
                <Text style={styles.previewValue}>{getSelectedDayLabel()}</Text>
              </View>
              
              <View style={styles.previewItem}>
                <Text style={styles.previewLabel}>Notifications:</Text>
                <Text style={styles.previewValue}>
                  {localConfig.notificationEnabled ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
              
              {localConfig.notificationEnabled && (
                <View style={styles.previewItem}>
                  <Text style={styles.previewLabel}>Reminder:</Text>
                  <Text style={styles.previewValue}>{getNotificationOffsetLabel()}</Text>
                </View>
              )}
            </View>

            <View style={styles.previewSection}>
              <Text style={styles.previewTitle}>Next Backup</Text>
              
              <View style={styles.previewItem}>
                <Text style={styles.previewLabel}>Date:</Text>
                <Text style={styles.previewValue}>
                  {nextBackup.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>
              
              {localConfig.notificationEnabled && (
                <View style={styles.previewItem}>
                  <Text style={styles.previewLabel}>Reminder:</Text>
                  <Text style={styles.previewValue}>
                    {notificationDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => {
                setShowPreview(false);
                handleSave();
              }}
              disabled={isLoading}
            >
              <Text style={styles.confirmButtonText}>
                {isLoading ? 'Saving...' : 'Confirm & Save'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderFrequencySelector()}
        {renderDaySelector()}
        {renderNotificationSettings()}
        {renderValidationErrors()}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.previewButton}
          onPress={handlePreview}
          disabled={isLoading || validationErrors.length > 0}
        >
          <Text style={styles.previewButtonText}>Preview</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          disabled={isLoading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.saveButton,
            (isLoading || validationErrors.length > 0) && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={isLoading || validationErrors.length > 0}
        >
          <Text style={styles.saveButtonText}>
            {isLoading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      {renderDayPicker()}
      {renderNotificationPicker()}
      {renderPreview()}
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#ffffff',
    marginBottom: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#495057',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  optionButtonSelected: {
    backgroundColor: '#e3f2fd',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 2,
  },
  optionTitleSelected: {
    color: '#007bff',
  },
  optionDescription: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 18,
  },
  optionDescriptionSelected: {
    color: '#0056b3',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#dee2e6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },
  radioButtonSelected: {
    borderColor: '#007bff',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007bff',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#212529',
  },
  pickerButtonChevron: {
    fontSize: 20,
    color: '#adb5bd',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  switchContent: {
    flex: 1,
    marginRight: 16,
  },
  switchTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 2,
  },
  switchDescription: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 18,
  },
  errorContainer: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    margin: 20,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
    marginBottom: 4,
  },
  footer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  previewButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6c757d',
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#adb5bd',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
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
  dayOption: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
    backgroundColor: '#ffffff',
  },
  dayOptionText: {
    fontSize: 16,
    color: '#212529',
  },
  previewSection: {
    backgroundColor: '#ffffff',
    marginBottom: 20,
    paddingVertical: 16,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#495057',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  previewLabel: {
    fontSize: 16,
    color: '#6c757d',
    flex: 1,
  },
  previewValue: {
    fontSize: 16,
    color: '#212529',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  confirmButton: {
    backgroundColor: '#28a745',
    marginHorizontal: 20,
    marginVertical: 20,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default ScheduleSettings;