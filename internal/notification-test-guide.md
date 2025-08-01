# Notification System Testing Guide

## Overview
This guide provides instructions for testing the notification system implementation in Pictia.

## Components Implemented

### 1. NotificationService
- **Location**: `src/services/NotificationService.ts`
- **Features**:
  - Permission management
  - Notification scheduling
  - Custom message support
  - Test notifications
  - Backup reminders

### 2. NotificationSettings Component
- **Location**: `src/components/NotificationSettings.tsx`
- **Features**:
  - Permission request UI
  - Timing configuration (1 hour to 1 week before backup)
  - Custom message input
  - Test notification functionality
  - Settings persistence

### 3. NotificationPermissionRequest Component
- **Location**: `src/components/NotificationPermissionRequest.tsx`
- **Features**:
  - Initial permission request modal
  - Benefits explanation
  - Skip option

### 4. Redux Integration
- **Slice**: `src/store/slices/notificationSlice.ts`
- **Selectors**: `src/store/selectors/notificationSelectors.ts`
- **Features**:
  - State management for notifications
  - Async actions for permissions and scheduling
  - Error handling

## Manual Testing Steps

### 1. Test Permission Request
1. Open the app
2. Navigate to Settings tab
3. Tap on "Notifications"
4. If permissions not granted, you should see a request button
5. Tap "Request" to request permissions
6. Grant permissions in the system dialog

### 2. Test Notification Settings
1. In notification settings, toggle "Enable Notifications"
2. Change the reminder timing (try different options)
3. Set a custom message (optional)
4. Tap "Save Settings"
5. Verify settings are persisted by closing and reopening

### 3. Test Notification Functionality
1. In notification settings, tap "Test" button
2. You should receive a test notification immediately
3. Tap the notification to verify it opens the app

### 4. Test Backup Reminder Scheduling
1. Use the NotificationService directly in code:
```typescript
const notificationService = NotificationService.getInstance();
const backupDate = new Date(Date.now() + 60000); // 1 minute from now
const config = { enabled: true, hoursBeforeBackup: 0.02 }; // ~1 minute before
await notificationService.scheduleBackupReminder(backupDate, config);
```

## Expected Behavior

### Permission States
- **Not Requested**: Show request button
- **Granted**: Show enabled toggle and settings
- **Denied**: Show instructions to enable in device settings

### Notification Timing Options
- 1 hour before
- 2 hours before
- 6 hours before
- 12 hours before
- 1 day before
- 2 days before
- 1 week before

### Error Handling
- Permission denied gracefully handled
- Network errors shown with retry options
- Invalid configurations prevented
- Past dates rejected for scheduling

## Integration Points

### With Backup System
The notification system is designed to integrate with the backup system (task 5) by:
1. Receiving backup schedule dates
2. Calculating notification times based on user preferences
3. Sending reminders before scheduled backups
4. Opening the organize screen when notifications are tapped

### With App Navigation
- Notification taps should navigate to the organize screen
- Settings accessible from main navigation
- Modal presentation for detailed settings

## Configuration Requirements

### app.json Updates
The following has been added to support notifications:
```json
{
  "plugins": [
    "expo-secure-store",
    [
      "expo-notifications",
      {
        "icon": "./assets/notification-icon.png",
        "color": "#ffffff",
        "sounds": ["./assets/notification.wav"]
      }
    ]
  ]
}
```

### Dependencies Added
- `expo-notifications`: Core notification functionality

## Known Limitations

### Testing Environment
- Jest tests currently have configuration issues with React Native 0.79.5
- Manual testing recommended for notification functionality
- Simulator testing may have limitations with actual notifications

### Platform Differences
- iOS and Android have different permission models
- Notification channels are Android-specific
- Sound and vibration patterns may vary

## Future Enhancements

1. **Rich Notifications**: Add images and action buttons
2. **Notification History**: Track sent notifications
3. **Smart Scheduling**: Avoid notifications during sleep hours
4. **Batch Notifications**: Group multiple backup reminders
5. **Analytics**: Track notification engagement

## Troubleshooting

### Common Issues
1. **Permissions not working**: Check device settings
2. **Notifications not appearing**: Verify app is not in Do Not Disturb
3. **Test notifications failing**: Check network connectivity
4. **Settings not saving**: Check AsyncStorage permissions

### Debug Steps
1. Check console logs for error messages
2. Verify notification permissions in device settings
3. Test with different timing configurations
4. Clear app data and retry permission flow