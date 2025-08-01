# Backup Progress Integration Example

This document shows how to integrate the new backup progress and logging components into the Pictia app.

## Components Created

### 1. BackupProgress Component
- **Location**: `src/components/BackupProgress.tsx`
- **Purpose**: Modal component for displaying real-time backup progress and history
- **Features**:
  - Real-time progress bar with percentage
  - Current file being uploaded
  - Upload speed and ETA estimation
  - Backup history with detailed statistics
  - Error display and retry functionality
  - Expandable details section

### 2. BackupStatusIndicator Component
- **Location**: `src/components/BackupStatusIndicator.tsx`
- **Purpose**: Compact status indicator for showing backup state throughout the app
- **Features**:
  - Animated status icons
  - Progress indication for active backups
  - Compact and full display modes
  - Last backup timestamp
  - Error state with retry option

### 3. BackupLogger Service
- **Location**: `src/services/BackupLogger.ts`
- **Purpose**: Comprehensive logging system for backup operations
- **Features**:
  - Structured logging with categories (upload, auth, network, system)
  - Error tracking with detailed context
  - Statistics generation
  - Log retention and cleanup
  - Export functionality for debugging

## Integration Example

### In a Screen Component (e.g., SettingsScreen)

```typescript
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { BackupProgress, BackupStatusIndicator } from '@/components';
import { 
  loadBackupHistory, 
  loadBackupLogEntries,
  generateBackupStatistics 
} from '@/store/thunks/backupThunks';

export const SettingsScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const [showProgress, setShowProgress] = useState(false);
  
  const {
    isBackupInProgress,
    progress,
    logs,
    currentBackup,
    statistics
  } = useAppSelector(state => state.backup);

  useEffect(() => {
    // Load backup data when component mounts
    dispatch(loadBackupHistory());
    dispatch(loadBackupLogEntries(undefined)); // Load recent logs
    dispatch(generateBackupStatistics());
  }, [dispatch]);

  const handleStatusPress = () => {
    setShowProgress(true);
  };

  const handleCancelBackup = () => {
    // Implementation would cancel the current backup
    console.log('Cancel backup requested');
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Backup Status Indicator */}
      <BackupStatusIndicator
        status={isBackupInProgress ? 'in_progress' : 'idle'}
        progress={progress?.percentage}
        currentItem={progress?.currentItem}
        totalItems={progress?.totalItems}
        lastBackup={logs[0]}
        onPress={handleStatusPress}
      />

      {/* Other settings content */}
      <TouchableOpacity onPress={() => setShowProgress(true)}>
        <Text>View Backup History</Text>
      </TouchableOpacity>

      {/* Backup Progress Modal */}
      <BackupProgress
        progress={progress}
        isVisible={showProgress}
        onClose={() => setShowProgress(false)}
        onCancel={isBackupInProgress ? handleCancelBackup : undefined}
        logs={logs}
        showHistory={!isBackupInProgress}
      />
    </View>
  );
};
```

### In the BackupService Integration

The BackupService has been enhanced to use the BackupLogger:

```typescript
// Example of how logging is integrated
await BackupLogger.logBackupStart(backupLog);

try {
  // Upload process
  await this.uploadMediaItem(queueItem);
  
  await BackupLogger.logInfo(
    backupId,
    `Successfully uploaded ${mediaItem.filename}`,
    { fileName: mediaItem.filename },
    'upload'
  );
} catch (error) {
  await BackupLogger.logUploadError(
    backupId,
    mediaItem.filename,
    error,
    queueItem.retryCount
  );
}
```

### Redux State Integration

The backup slice has been enhanced with new state properties:

```typescript
interface BackupState {
  // ... existing properties
  progress: BackupProgress | null;        // Real-time progress data
  logEntries: BackupLogEntry[];          // Recent log entries
  statistics: BackupStatistics | null;   // Backup analytics
}
```

New actions available:
- `setLogEntries`: Update log entries in state
- `addLogEntry`: Add a new log entry
- `setStatistics`: Update backup statistics
- `updateBackupProgress`: Enhanced progress updates

New thunks available:
- `loadBackupLogEntries`: Load log entries for a backup or recent logs
- `generateBackupStatistics`: Generate backup analytics
- `clearOldBackupLogs`: Clean up old log entries

## Usage Patterns

### 1. Real-time Progress Display
```typescript
// Component automatically updates when progress changes
const progress = useAppSelector(state => state.backup.progress);

// Show progress modal during backup
if (isBackupInProgress) {
  return (
    <BackupProgress
      progress={progress}
      isVisible={true}
      onClose={() => {}}
      onCancel={handleCancel}
    />
  );
}
```

### 2. Compact Status Indicator
```typescript
// In a header or status bar
<BackupStatusIndicator
  status={getBackupStatus()}
  progress={progress?.percentage}
  compact={true}
  onPress={openBackupDetails}
/>
```

### 3. Backup History View
```typescript
// Full history modal
<BackupProgress
  progress={null}
  isVisible={showHistory}
  onClose={() => setShowHistory(false)}
  logs={allBackupLogs}
  showHistory={true}
/>
```

## Error Handling and Logging

The system provides comprehensive error tracking:

1. **Upload Errors**: File-specific errors with retry counts
2. **Authentication Errors**: OAuth and token refresh issues
3. **Network Errors**: Connection and API errors
4. **System Errors**: General backup process errors

All errors are logged with context and can be viewed in the backup history for debugging.

## Performance Considerations

- Log entries are limited to 1000 in storage and 100 in Redux state
- Old logs are automatically cleaned up after 30 days
- Progress updates are throttled to avoid excessive re-renders
- Statistics are cached and only regenerated when needed

## Testing

The BackupLogger includes comprehensive unit tests covering:
- Log entry creation and storage
- Error logging with context
- Statistics generation
- Log filtering and retrieval
- Cleanup operations

Run tests with: `npm test -- --testPathPatterns=BackupLogger.test.ts`