import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BackupConfig } from '@/types';

interface BackupControlsProps {
  onTriggerBackup: () => Promise<void>;
  onConfigureBackup: (config: BackupConfig) => void;
  currentConfig?: BackupConfig;
  isBackupInProgress?: boolean;
  lastBackupDate?: Date | undefined;
  nextScheduledBackup?: Date | undefined;
}

export const BackupControls: React.FC<BackupControlsProps> = ({
  onTriggerBackup,
  onConfigureBackup,
  currentConfig,
  isBackupInProgress = false,
  lastBackupDate,
  nextScheduledBackup,
}) => {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [tempConfig, setTempConfig] = useState<BackupConfig>(
    currentConfig || {
      frequency: 'monthly',
      dayOfMonth: 1,
      notificationEnabled: true,
      notificationOffset: 24, // 24 hours before
    }
  );

  const handleTriggerBackup = async () => {
    Alert.alert(
      'Start Manual Backup',
      'This will backup all your organized photos to Google Photos. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Backup',
          onPress: async () => {
            try {
              await onTriggerBackup();
            } catch (error) {
              Alert.alert(
                'Backup Failed',
                error instanceof Error ? error.message : 'Unknown error occurred',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  };

  const handleSaveConfig = () => {
    // Validate configuration
    if (tempConfig.frequency === 'monthly' && tempConfig.dayOfMonth) {
      if (tempConfig.dayOfMonth < 1 || tempConfig.dayOfMonth > 31) {
        Alert.alert('Invalid Configuration', 'Day of month must be between 1 and 31');
        return;
      }
    }

    if (tempConfig.frequency === 'weekly' && tempConfig.dayOfWeek !== undefined) {
      if (tempConfig.dayOfWeek < 0 || tempConfig.dayOfWeek > 6) {
        Alert.alert('Invalid Configuration', 'Day of week must be between 0 (Sunday) and 6 (Saturday)');
        return;
      }
    }

    if (tempConfig.notificationOffset < 1 || tempConfig.notificationOffset > 168) {
      Alert.alert('Invalid Configuration', 'Notification offset must be between 1 and 168 hours (1 week)');
      return;
    }

    onConfigureBackup(tempConfig);
    setShowConfigModal(false);
    
    Alert.alert(
      'Configuration Saved',
      'Your backup schedule has been updated successfully.',
      [{ text: 'OK' }]
    );
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFrequencyText = (config: BackupConfig): string => {
    if (config.frequency === 'weekly') {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = config.dayOfWeek !== undefined ? days[config.dayOfWeek] : 'Sunday';
      return `Weekly on ${dayName}`;
    } else {
      const dayOfMonth = config.dayOfMonth || 1;
      const suffix = dayOfMonth === 1 ? 'st' : dayOfMonth === 2 ? 'nd' : dayOfMonth === 3 ? 'rd' : 'th';
      return `Monthly on the ${dayOfMonth}${suffix}`;
    }
  };

  const getDayOfWeekName = (dayIndex: number): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayIndex] || 'Sunday';
  };

  return (
    <View style={styles.container}>
      {/* Manual Backup Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Manual Backup</Text>
        <Text style={styles.sectionDescription}>
          Trigger an immediate backup of your organized photos
        </Text>
        
        <TouchableOpacity
          style={[
            styles.backupButton,
            isBackupInProgress && styles.backupButtonDisabled
          ]}
          onPress={handleTriggerBackup}
          disabled={isBackupInProgress}
        >
          <Ionicons 
            name={isBackupInProgress ? "hourglass" : "cloud-upload"} 
            size={20} 
            color={isBackupInProgress ? "#999" : "#fff"} 
          />
          <Text style={[
            styles.backupButtonText,
            isBackupInProgress && styles.backupButtonTextDisabled
          ]}>
            {isBackupInProgress ? 'Backup in Progress...' : 'Start Backup Now'}
          </Text>
        </TouchableOpacity>

        {lastBackupDate && (
          <Text style={styles.lastBackupText}>
            Last backup: {formatDate(lastBackupDate)}
          </Text>
        )}
      </View>

      {/* Scheduled Backup Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Scheduled Backup</Text>
          <TouchableOpacity
            style={styles.configureButton}
            onPress={() => setShowConfigModal(true)}
          >
            <Ionicons name="settings-outline" size={18} color="#007AFF" />
            <Text style={styles.configureButtonText}>Configure</Text>
          </TouchableOpacity>
        </View>

        {currentConfig && (
          <View style={styles.configInfo}>
            <View style={styles.configRow}>
              <Ionicons name="calendar-outline" size={16} color="#666" />
              <Text style={styles.configText}>
                {getFrequencyText(currentConfig)}
              </Text>
            </View>
            
            <View style={styles.configRow}>
              <Ionicons 
                name={currentConfig.notificationEnabled ? "notifications" : "notifications-off"} 
                size={16} 
                color="#666" 
              />
              <Text style={styles.configText}>
                {currentConfig.notificationEnabled 
                  ? `Reminder ${currentConfig.notificationOffset}h before`
                  : 'No reminders'
                }
              </Text>
            </View>

            {nextScheduledBackup && (
              <View style={styles.configRow}>
                <Ionicons name="time-outline" size={16} color="#666" />
                <Text style={styles.configText}>
                  Next: {formatDate(nextScheduledBackup)}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Configuration Modal */}
      <Modal
        visible={showConfigModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowConfigModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowConfigModal(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Backup Configuration</Text>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handleSaveConfig}
            >
              <Text style={styles.modalSaveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Frequency Selection */}
            <View style={styles.configSection}>
              <Text style={styles.configSectionTitle}>Backup Frequency</Text>
              
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  tempConfig.frequency === 'weekly' && styles.optionButtonSelected
                ]}
                onPress={() => setTempConfig({ ...tempConfig, frequency: 'weekly', dayOfWeek: 0 })}
              >
                <View style={styles.optionContent}>
                  <Ionicons 
                    name={tempConfig.frequency === 'weekly' ? "radio-button-on" : "radio-button-off"} 
                    size={20} 
                    color={tempConfig.frequency === 'weekly' ? "#007AFF" : "#999"} 
                  />
                  <Text style={[
                    styles.optionText,
                    tempConfig.frequency === 'weekly' && styles.optionTextSelected
                  ]}>
                    Weekly
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionButton,
                  tempConfig.frequency === 'monthly' && styles.optionButtonSelected
                ]}
                onPress={() => setTempConfig({ ...tempConfig, frequency: 'monthly', dayOfMonth: 1 })}
              >
                <View style={styles.optionContent}>
                  <Ionicons 
                    name={tempConfig.frequency === 'monthly' ? "radio-button-on" : "radio-button-off"} 
                    size={20} 
                    color={tempConfig.frequency === 'monthly' ? "#007AFF" : "#999"} 
                  />
                  <Text style={[
                    styles.optionText,
                    tempConfig.frequency === 'monthly' && styles.optionTextSelected
                  ]}>
                    Monthly
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Day Selection */}
            {tempConfig.frequency === 'weekly' && (
              <View style={styles.configSection}>
                <Text style={styles.configSectionTitle}>Day of Week</Text>
                <View style={styles.daySelector}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dayButton,
                        tempConfig.dayOfWeek === index && styles.dayButtonSelected
                      ]}
                      onPress={() => setTempConfig({ ...tempConfig, dayOfWeek: index })}
                    >
                      <Text style={[
                        styles.dayButtonText,
                        tempConfig.dayOfWeek === index && styles.dayButtonTextSelected
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {tempConfig.frequency === 'monthly' && (
              <View style={styles.configSection}>
                <Text style={styles.configSectionTitle}>Day of Month</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Day:</Text>
                  <View style={styles.dayOfMonthSelector}>
                    {[1, 15, 30].map((day) => (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.dayOfMonthButton,
                          tempConfig.dayOfMonth === day && styles.dayOfMonthButtonSelected
                        ]}
                        onPress={() => setTempConfig({ ...tempConfig, dayOfMonth: day })}
                      >
                        <Text style={[
                          styles.dayOfMonthButtonText,
                          tempConfig.dayOfMonth === day && styles.dayOfMonthButtonTextSelected
                        ]}>
                          {day}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Notification Settings */}
            <View style={styles.configSection}>
              <Text style={styles.configSectionTitle}>Notifications</Text>
              
              <TouchableOpacity
                style={styles.notificationToggle}
                onPress={() => setTempConfig({ 
                  ...tempConfig, 
                  notificationEnabled: !tempConfig.notificationEnabled 
                })}
              >
                <View style={styles.optionContent}>
                  <Ionicons 
                    name={tempConfig.notificationEnabled ? "checkbox" : "checkbox-outline"} 
                    size={20} 
                    color={tempConfig.notificationEnabled ? "#007AFF" : "#999"} 
                  />
                  <Text style={styles.optionText}>
                    Send backup reminders
                  </Text>
                </View>
              </TouchableOpacity>

              {tempConfig.notificationEnabled && (
                <View style={styles.notificationOffsetContainer}>
                  <Text style={styles.inputLabel}>Remind me:</Text>
                  <View style={styles.offsetSelector}>
                    {[1, 6, 12, 24, 48].map((hours) => (
                      <TouchableOpacity
                        key={hours}
                        style={[
                          styles.offsetButton,
                          tempConfig.notificationOffset === hours && styles.offsetButtonSelected
                        ]}
                        onPress={() => setTempConfig({ ...tempConfig, notificationOffset: hours })}
                      >
                        <Text style={[
                          styles.offsetButtonText,
                          tempConfig.notificationOffset === hours && styles.offsetButtonTextSelected
                        ]}>
                          {hours}h
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  section: {
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  backupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
  },
  backupButtonDisabled: {
    backgroundColor: '#E5E5EA',
  },
  backupButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  backupButtonTextDisabled: {
    color: '#999',
  },
  lastBackupText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  configureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  configureButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  configInfo: {
    gap: 8,
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  configText: {
    fontSize: 14,
    color: '#666',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  modalCloseButton: {
    paddingVertical: 4,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalSaveButton: {
    paddingVertical: 4,
  },
  modalSaveText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
  },
  configSection: {
    backgroundColor: '#fff',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  configSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  optionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  optionButtonSelected: {
    backgroundColor: '#F0F8FF',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  optionTextSelected: {
    color: '#007AFF',
    fontWeight: '500',
  },
  daySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  dayButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  dayButtonSelected: {
    backgroundColor: '#007AFF',
  },
  dayButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  dayButtonTextSelected: {
    color: '#fff',
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  dayOfMonthSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  dayOfMonthButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    minWidth: 50,
    alignItems: 'center',
  },
  dayOfMonthButtonSelected: {
    backgroundColor: '#007AFF',
  },
  dayOfMonthButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  dayOfMonthButtonTextSelected: {
    color: '#fff',
  },
  notificationToggle: {
    paddingVertical: 8,
  },
  notificationOffsetContainer: {
    marginTop: 12,
    gap: 8,
  },
  offsetSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  offsetButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F2F2F7',
    minWidth: 50,
    alignItems: 'center',
  },
  offsetButtonSelected: {
    backgroundColor: '#007AFF',
  },
  offsetButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  offsetButtonTextSelected: {
    color: '#fff',
  },
});