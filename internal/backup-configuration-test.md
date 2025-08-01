# Backup Configuration UI Test Guide

## Overview
This document provides a manual testing guide for the backup configuration UI implementation.

## Components Implemented

### 1. ScheduleSettings Component
- **Location**: `src/components/ScheduleSettings.tsx`
- **Purpose**: Provides a comprehensive UI for configuring backup schedules
- **Features**:
  - Frequency selection (Weekly/Monthly)
  - Day selection with appropriate pickers
  - Notification settings with timing options
  - Real-time validation with error display
  - Configuration preview with confirmation flow
  - Proper persistence and state management

### 2. Settings Screen Integration
- **Location**: `src/screens/SettingsScreen.tsx`
- **Updates**:
  - Added backup configuration modal
  - Integrated with Redux state management
  - Added proper error handling and user feedback
  - Connected to backup service for persistence

### 3. Redux Integration
- **Selectors**: `src/store/selectors/backupSelectors.ts`
- **Thunks**: Uses existing `loadBackupConfig` and `configureBackup`
- **State Management**: Proper loading states and error handling

## Manual Testing Steps

### Test 1: Basic Configuration Flow
1. Open the app and navigate to Settings
2. Tap "Backup Settings"
3. Verify the modal opens with current configuration (or defaults)
4. Change frequency from Weekly to Monthly
5. Verify day picker updates to show days of month (1st-31st)
6. Select a specific day (e.g., 15th)
7. Toggle notifications on/off
8. If notifications enabled, select timing (e.g., "1 day before")
9. Tap "Preview" to see configuration summary
10. Verify preview shows correct information
11. Tap "Confirm & Save" to save configuration
12. Verify success message appears
13. Close and reopen backup settings to verify persistence

### Test 2: Validation Testing
1. Open backup settings
2. Try to save with invalid configurations:
   - Monthly backup on 32nd day (should show error)
   - Notification offset of 0 hours (should show error)
3. Verify validation errors appear in red box
4. Verify save button is disabled when errors exist
5. Fix errors and verify save button becomes enabled

### Test 3: Weekly Configuration
1. Set frequency to Weekly
2. Verify day picker shows days of week (Sunday-Saturday)
3. Select different days and verify preview updates correctly
4. Save configuration and verify it persists

### Test 4: Notification Configuration
1. Enable notifications
2. Try different notification timings:
   - 1 hour before
   - 1 day before
   - 3 days before
3. Verify preview shows correct notification timing
4. Save and verify persistence

### Test 5: Cancel and Error Handling
1. Make changes to configuration
2. Tap "Cancel" and verify changes are discarded
3. Simulate save error (if possible) and verify error handling
4. Verify loading states during save operations

## Expected Behavior

### Validation Rules
- Frequency must be "weekly" or "monthly"
- Weekly: dayOfWeek must be 0-6 (Sunday-Saturday)
- Monthly: dayOfMonth must be 1-31
- Notification offset must be 1-168 hours
- Warnings for potentially problematic settings

### UI States
- Loading indicators during save operations
- Disabled save button when validation errors exist
- Clear error messages with specific field information
- Proper modal navigation and state management

### Data Persistence
- Configuration saved to AsyncStorage via BackupService
- State properly synchronized with Redux store
- Changes reflected immediately in UI after save
- Configuration restored correctly on app restart

## Integration Points

### BackupService Integration
- Uses `setBackupConfig()` for persistence
- Uses `getBackupConfig()` for loading
- Validates configuration before saving
- Handles storage errors gracefully

### Redux Integration
- Uses `configureBackup` thunk for saving
- Uses `loadBackupConfig` thunk for loading
- Proper error handling through Redux state
- Loading states managed through Redux

### Navigation Integration
- Modal presentation from Settings screen
- Proper modal dismissal on save/cancel
- State cleanup on navigation

## Known Limitations

1. **Service Initialization**: BackupService must be properly initialized before use
2. **Test Environment**: Some features may not work in test/development environment
3. **Platform Differences**: Date/time handling may vary between iOS/Android

## Future Enhancements

1. **Advanced Scheduling**: Support for custom schedules (e.g., every 2 weeks)
2. **Time Selection**: Allow users to specify exact backup time
3. **Conditional Logic**: Smart defaults based on user behavior
4. **Backup Preview**: Show what will be backed up before scheduling
5. **History Integration**: Show previous backup schedules and their success rates

## Troubleshooting

### Common Issues
1. **Save Fails**: Check BackupService initialization
2. **Validation Errors**: Verify all required fields are properly set
3. **State Not Persisting**: Check AsyncStorage permissions and error logs
4. **Modal Not Opening**: Verify Redux state and component props

### Debug Steps
1. Check Redux DevTools for state changes
2. Verify AsyncStorage contents for persistence
3. Check console logs for validation errors
4. Test with different configurations to isolate issues