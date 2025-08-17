# OAuth and Local Gallery Fixes Summary

## Issues Fixed

### 1. ✅ Google OAuth Error: "Custom scheme URIs are not allowed for 'WEB' client type"

**Root Cause**: The app was trying to use custom scheme redirect URIs with a Google OAuth "Web" client type, which is not allowed.

**Solution**: Updated `AuthService.ts` to use the default `makeRedirectUri()` which automatically generates appropriate redirect URIs for the platform:
- In Expo Go: Uses `exp://` URLs that work with web clients
- In standalone builds: Uses the configured scheme from `app.json`

**Files Changed**:
- `pictia-app/src/services/AuthService.ts` - Simplified redirect URI generation

### 2. ✅ App Crash on Local Gallery Access

**Root Cause**: Missing exports and permissions for local media library access.

**Solution**: Fixed imports, exports, and added proper media library permissions:

**Files Changed**:
- `pictia-app/src/screens/index.ts` - Added `LocalOrganizeScreen` export
- `pictia-app/src/navigation/MainNavigator.tsx` - Fixed import path
- `pictia-app/app.json` - Added expo-media-library plugin and Android permissions
- `pictia-app/src/screens/LocalOrganizeScreen.tsx` - Improved error handling

**Permissions Added**:
- iOS: `NSPhotoLibraryUsageDescription` (already existed)
- Android: `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`
- Plugin: expo-media-library with descriptive permission messages

## Testing Instructions

### Test OAuth Fix
1. Run the app: `npm start`
2. Tap "Sign in with Google"
3. Should redirect to Google OAuth without the "Custom scheme URIs" error
4. Should successfully authenticate and return to app

### Test Local Gallery Fix
1. Run the app: `npm start`
2. Tap "Skip - Use Local Gallery Only"
3. Should navigate to local gallery screen without crashing
4. Should request media permissions
5. Should load and display device photos

## Configuration Details

### OAuth Configuration
- Uses default Expo redirect URI handling
- Works with existing Google Web client credentials
- No need to create separate iOS/Android OAuth clients
- Automatically handles Expo Go vs standalone builds

### Media Library Configuration
- expo-media-library plugin configured with descriptive permissions
- Android permissions added for API levels 33+ compatibility
- Improved error handling for permission requests and image loading

## Next Steps

If issues persist:

1. **OAuth still fails**: 
   - Verify Google OAuth client is "Web" type
   - Check client ID/secret in `.env` file
   - Ensure app is running in Expo Go or development build

2. **Local gallery still crashes**:
   - Check device permissions are granted
   - Test on physical device (simulators have limited media)
   - Check console logs for specific error messages

3. **Build issues**:
   - Run `npx expo prebuild --clean` to regenerate native code
   - Rebuild the app after permission changes

## Files Modified

```
pictia-app/
├── src/
│   ├── services/AuthService.ts          # Fixed OAuth redirect URI
│   ├── screens/
│   │   ├── index.ts                     # Added LocalOrganizeScreen export
│   │   └── LocalOrganizeScreen.tsx      # Improved error handling
│   └── navigation/MainNavigator.tsx     # Fixed import path
├── app.json                             # Added media permissions & plugin
└── internal/
    ├── oauth-local-gallery-fixes.md     # Detailed fix documentation
    └── fix-summary.md                   # This summary
```

Both issues should now be resolved and the app should work correctly in both Google OAuth and local gallery modes.