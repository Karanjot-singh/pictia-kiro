import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SessionStatisticsProps {
  totalProcessed: number;
  keepCount: number;
  deleteCount: number;
  sessionDuration?: number;
  isCurrentSession?: boolean;
  onPress?: () => void;
  compact?: boolean;
}

const SessionStatistics: React.FC<SessionStatisticsProps> = ({
  totalProcessed,
  keepCount,
  deleteCount,
  sessionDuration,
  isCurrentSession = false,
  onPress,
  compact = false,
}) => {
  const formatDuration = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  };

  const getKeepPercentage = (): number => {
    if (totalProcessed === 0) return 0;
    return Math.round((keepCount / totalProcessed) * 100);
  };

  const getDeletePercentage = (): number => {
    if (totalProcessed === 0) return 0;
    return Math.round((deleteCount / totalProcessed) * 100);
  };

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[
        styles.container,
        compact && styles.compactContainer,
        isCurrentSession && styles.currentSessionContainer,
        onPress && styles.pressableContainer,
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons 
            name={isCurrentSession ? "play-circle" : "checkmark-circle"} 
            size={compact ? 16 : 20} 
            color={isCurrentSession ? "#007AFF" : "#34C759"} 
          />
          <Text style={[styles.title, compact && styles.compactTitle]}>
            {isCurrentSession ? 'Current Session' : 'Organization Session'}
          </Text>
        </View>
        
        {sessionDuration && (
          <View style={styles.durationContainer}>
            <Ionicons name="time-outline" size={compact ? 12 : 14} color="#666" />
            <Text style={[styles.durationText, compact && styles.compactDurationText]}>
              {formatDuration(sessionDuration)}
            </Text>
          </View>
        )}
      </View>

      {/* Statistics */}
      <View style={[styles.statsContainer, compact && styles.compactStatsContainer]}>
        {/* Total Processed */}
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, compact && styles.compactStatNumber]}>
            {totalProcessed}
          </Text>
          <Text style={[styles.statLabel, compact && styles.compactStatLabel]}>
            {compact ? 'Total' : 'Photos Organized'}
          </Text>
        </View>

        {/* Keep Count */}
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, styles.keepColor, compact && styles.compactStatNumber]}>
            {keepCount}
          </Text>
          <Text style={[styles.statLabel, compact && styles.compactStatLabel]}>
            Kept {!compact && `(${getKeepPercentage()}%)`}
          </Text>
        </View>

        {/* Delete Count */}
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, styles.deleteColor, compact && styles.compactStatNumber]}>
            {deleteCount}
          </Text>
          <Text style={[styles.statLabel, compact && styles.compactStatLabel]}>
            Deleted {!compact && `(${getDeletePercentage()}%)`}
          </Text>
        </View>
      </View>

      {/* Progress Bar (for current session) */}
      {isCurrentSession && totalProcessed > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressKeep, 
                { width: `${getKeepPercentage()}%` }
              ]} 
            />
            <View 
              style={[
                styles.progressDelete, 
                { width: `${getDeletePercentage()}%` }
              ]} 
            />
          </View>
        </View>
      )}

      {/* Action Indicator */}
      {onPress && (
        <View style={styles.actionIndicator}>
          <Ionicons name="chevron-forward" size={16} color="#999" />
        </View>
      )}
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  compactContainer: {
    padding: 12,
    marginVertical: 2,
  },
  currentSessionContainer: {
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  pressableContainer: {
    // Add subtle visual feedback for pressable items
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  compactTitle: {
    fontSize: 14,
    marginLeft: 6,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  compactDurationText: {
    fontSize: 12,
    marginLeft: 3,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  compactStatsContainer: {
    marginBottom: 0,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  compactStatNumber: {
    fontSize: 16,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  compactStatLabel: {
    fontSize: 10,
  },
  keepColor: {
    color: '#34C759',
  },
  deleteColor: {
    color: '#FF3B30',
  },
  progressContainer: {
    marginTop: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E5E7',
    borderRadius: 2,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  progressKeep: {
    height: '100%',
    backgroundColor: '#34C759',
  },
  progressDelete: {
    height: '100%',
    backgroundColor: '#FF3B30',
  },
  actionIndicator: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -8,
  },
});

export default SessionStatistics;