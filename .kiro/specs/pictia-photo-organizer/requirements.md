# Requirements Document

## Introduction

Pictia is a cross-platform mobile application (Android + iOS) built with React Native + Expo that integrates with Google Photos to help users organize and back up their media efficiently. The app features an intuitive swipe-based interface for quick photo organization, automated backup scheduling, and seamless Google Photos integration. The development follows a phased approach, starting with core authentication and organization features (MVP), then expanding to include advanced backup automation and management capabilities.

## Requirements

### Requirement 1: Google Account Authentication

**User Story:** As a user, I want to securely authenticate with my Google account and connect to Google Photos, so that I can access and manage my photo library through the app.

#### Acceptance Criteria

1. WHEN a user opens the app for the first time THEN the system SHALL display a Google authentication screen
2. WHEN a user successfully authenticates THEN the system SHALL securely store authentication tokens
3. WHEN authentication is complete THEN the system SHALL connect to the Google Photos Library API
4. IF authentication fails THEN the system SHALL display an appropriate error message and allow retry
5. WHEN a user is already authenticated THEN the system SHALL automatically log them in on app launch

### Requirement 2: Gallery Mode Interface

**User Story:** As a user, I want to browse my photos in a gallery view similar to iOS Photos app with multi-selection capabilities, so that I can quickly review, select, and manage multiple photos at once.

#### Acceptance Criteria

1. WHEN a user accesses the gallery tab THEN the system SHALL display photos in a grid layout with thumbnails
2. WHEN a user taps on a photo THEN the system SHALL open it in full-screen view with zoom capabilities
3. WHEN in full-screen view THEN the system SHALL support pinch-to-zoom and pan gestures
4. WHEN a user long-presses on photos THEN the system SHALL enable multi-selection mode
5. WHEN in multi-selection mode THEN the system SHALL allow batch operations like delete
6. WHEN photos have been reviewed THEN the system SHALL display a small green checkmark on thumbnails
7. WHEN a user taps "Start Swipe Mode" in full-screen view THEN the system SHALL launch organization mode starting from that photo
8. WHEN the gallery loads THEN the system SHALL fetch photos from Google Photos API with efficient pagination

### Requirement 3: Enhanced Swipe Organization Interface

**User Story:** As a user, I want to organize my photos through an intuitive swipe-based interface with improved controls and session management, so that I can efficiently categorize photos with better control over the process.

#### Acceptance Criteria

1. WHEN a user accesses the organization interface THEN the system SHALL display photos one at a time in a card-based layout
2. WHEN a user swipes right on a photo THEN the system SHALL mark it for keeping/organizing
3. WHEN a user swipes left on a photo THEN the system SHALL mark it for deletion or removal
4. WHEN a user performs a swipe action THEN the system SHALL display an undo icon on the top of the card
5. WHEN a user taps the undo icon THEN the system SHALL reverse the last swipe action and restore the photo to the interface
6. WHEN a user taps the commit icon THEN the system SHALL permanently apply all marked actions in the current session
7. WHEN organization starts from gallery THEN the system SHALL begin with the selected photo and continue to most recent
8. WHEN organization starts naturally THEN the system SHALL show unreviewed photos from oldest to most recent
9. WHEN a user leaves organization mode without committing THEN the system SHALL show a popup to commit or discard the session
10. WHEN the interface loads THEN the system SHALL fetch photos from Google Photos API
11. WHEN the system tracks reviewed photos THEN it SHALL not show already reviewed items in natural organization mode
12. IF no more unreviewed photos are available THEN the system SHALL display a completion message

### Requirement 4: Cross-Platform Compatibility

**User Story:** As a user, I want the app to work seamlessly on both Android and iOS devices, so that I can use it regardless of my mobile platform.

#### Acceptance Criteria

1. WHEN the app is built THEN the system SHALL compile successfully for both Android and iOS platforms
2. WHEN running on Android THEN the system SHALL follow Android UI/UX conventions
3. WHEN running on iOS THEN the system SHALL follow iOS UI/UX conventions
4. WHEN using platform-specific features THEN the system SHALL handle platform differences gracefully
5. WHEN testing core functionality THEN the system SHALL behave consistently across both platforms

### Requirement 5: Scheduled Backup Automation

**User Story:** As a user, I want to schedule automated backups of my organized photos, so that my media is regularly backed up to Google Photos without manual intervention.

#### Acceptance Criteria

1. WHEN a user accesses backup settings THEN the system SHALL allow selection of backup frequency (weekly, monthly)
2. WHEN a user sets a specific backup date THEN the system SHALL schedule backups for that date (e.g., 30th of each month)
3. WHEN a scheduled backup time arrives THEN the system SHALL automatically trigger the backup process
4. WHEN a backup is scheduled THEN the system SHALL upload organized photos to Google Photos via API
5. IF a backup fails THEN the system SHALL retry and log the error for user review

### Requirement 6: Notification and Reminder System

**User Story:** As a user, I want to receive customizable notifications reminding me to organize photos before scheduled backups, so that I stay on top of my photo management routine.

#### Acceptance Criteria

1. WHEN a backup is scheduled THEN the system SHALL send a notification reminder before the backup date
2. WHEN a user configures notification settings THEN the system SHALL allow customization of reminder timing
3. WHEN a notification is sent THEN the system SHALL include relevant backup information
4. WHEN a user taps a notification THEN the system SHALL open the app to the organization interface
5. IF notifications are disabled THEN the system SHALL respect user preferences and not send reminders

### Requirement 7: Manual Backup Control

**User Story:** As a user, I want to manually trigger backups at any time, so that I have control over when my photos are backed up independent of scheduled backups.

#### Acceptance Criteria

1. WHEN a user accesses the backup interface THEN the system SHALL display a manual backup trigger button
2. WHEN a user initiates manual backup THEN the system SHALL immediately start uploading organized photos
3. WHEN manual backup is in progress THEN the system SHALL display real-time progress indicators
4. WHEN manual backup completes THEN the system SHALL show a success confirmation
5. IF manual backup fails THEN the system SHALL display error details and allow retry

### Requirement 8: Backup Status and Logging

**User Story:** As a user, I want to view backup progress and history, so that I can track the status of my backups and troubleshoot any issues.

#### Acceptance Criteria

1. WHEN a backup is in progress THEN the system SHALL display real-time progress with percentage and file counts
2. WHEN backups complete THEN the system SHALL log the backup details (date, files uploaded, duration)
3. WHEN a user accesses backup history THEN the system SHALL display a chronological list of completed backups
4. WHEN backup errors occur THEN the system SHALL log error details with timestamps
5. WHEN viewing backup logs THEN the system SHALL allow users to filter by date range or status

### Requirement 9: Photo Upload Management

**User Story:** As a user, I want a dedicated interface to manually upload photos and configure backup settings, so that I have granular control over my photo management workflow.

#### Acceptance Criteria

1. WHEN a user accesses the upload page THEN the system SHALL allow selection of photos/videos from device storage
2. WHEN photos are selected THEN the system SHALL upload them to Google Photos via the Library API
3. WHEN on the upload page THEN the system SHALL allow configuration of backup date and frequency
4. WHEN upload is in progress THEN the system SHALL show progress indicators for each file
5. WHEN uploads complete THEN the system SHALL confirm successful uploads and update local records

### Requirement 10: Data Security and Privacy

**User Story:** As a user, I want my authentication tokens and personal data to be handled securely, so that my privacy and account security are protected.

#### Acceptance Criteria

1. WHEN storing authentication tokens THEN the system SHALL use secure storage mechanisms
2. WHEN making API calls THEN the system SHALL use HTTPS encryption
3. WHEN handling user data THEN the system SHALL follow Google Photos API privacy guidelines
4. WHEN the app is uninstalled THEN the system SHALL properly clean up stored credentials
5. IF tokens expire THEN the system SHALL handle refresh tokens securely and transparently

### Requirement 11: Performance and Reliability

**User Story:** As a user, I want the app to perform smoothly and reliably, so that I can efficiently manage my photos without frustration.

#### Acceptance Criteria

1. WHEN loading photos THEN the system SHALL implement efficient caching and pagination
2. WHEN performing swipe gestures THEN the system SHALL respond with minimal latency
3. WHEN uploading large files THEN the system SHALL handle uploads efficiently without blocking the UI
4. WHEN network connectivity is poor THEN the system SHALL gracefully handle connection issues
5. WHEN the app crashes THEN the system SHALL preserve user progress and recover gracefully on restart