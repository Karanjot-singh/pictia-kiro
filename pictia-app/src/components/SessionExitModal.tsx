import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SessionStats {
  totalProcessed: number;
  keepCount: number;
  deleteCount: number;
  sessionDuration: number; // in milliseconds
}

interface SessionExitModalProps {
  visible: boolean;
  isCommitting: boolean;
  sessionStats: SessionStats;
  onCommit: () => Promise<void>;
  onDiscard: () => void;
  onCancel: () => void;
}

const SessionExitModal: React.FC<SessionExitModalProps> = ({
  visible,
  isCommitting,
  sessionStats,
  onCommit,
  onDiscard,
  onCancel,
}) => {
  const formatDuration = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const handleCommit = async () => {
    try {
      await onCommit();
    } catch (error) {
      console.error('Failed to commit session:', error);
      // Error handling could be improved with user feedback
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="albums" size={32} color="#007AFF" />
              </View>
              <Text style={styles.title}>Save Organization Session?</Text>
              <Text style={styles.subtitle}>
                You have unsaved changes from your organization session
              </Text>
            </View>

            {/* Session Statistics */}
            <View style={styles.statsContainer}>
              <Text style={styles.statsTitle}>Session Summary</Text>
              
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{sessionStats.totalProcessed}</Text>
                  <Text style={styles.statLabel}>Photos Organized</Text>
                </View>
                
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, styles.keepColor]}>
                    {sessionStats.keepCount}
                  </Text>
                  <Text style={styles.statLabel}>Kept</Text>
                </View>
                
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, styles.deleteColor]}>
                    {sessionStats.deleteCount}
                  </Text>
                  <Text style={styles.statLabel}>Deleted</Text>
                </View>
              </View>

              <View style={styles.durationContainer}>
                <Ionicons name="time-outline" size={16} color="#666" />
                <Text style={styles.durationText}>
                  Session duration: {formatDuration(sessionStats.sessionDuration)}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              {/* Commit Button */}
              <TouchableOpacity
                style={[styles.button, styles.commitButton]}
                onPress={handleCommit}
                disabled={isCommitting}
              >
                {isCommitting ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={[styles.buttonText, styles.commitButtonText, { marginLeft: 8 }]}>
                      Saving...
                    </Text>
                  </View>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={[styles.buttonText, styles.commitButtonText]}>
                      Save Changes
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Discard Button */}
              <TouchableOpacity
                style={[styles.button, styles.discardButton]}
                onPress={onDiscard}
                disabled={isCommitting}
              >
                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                <Text style={[styles.buttonText, styles.discardButtonText]}>
                  Discard Changes
                </Text>
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onCancel}
                disabled={isCommitting}
              >
                <Text style={[styles.buttonText, styles.cancelButtonText]}>
                  Continue Organizing
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
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
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  statsContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  keepColor: {
    color: '#34C759',
  },
  deleteColor: {
    color: '#FF3B30',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
  },
  durationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    minHeight: 48,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  commitButton: {
    backgroundColor: '#007AFF',
  },
  commitButtonText: {
    color: '#fff',
  },
  discardButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  discardButtonText: {
    color: '#FF3B30',
  },
  cancelButton: {
    backgroundColor: '#F8F9FA',
  },
  cancelButtonText: {
    color: '#333',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default SessionExitModal;