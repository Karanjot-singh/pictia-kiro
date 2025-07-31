# Getting SHA-1 Certificate Fingerprint for Android OAuth

## For Development (Debug Keystore):

### On macOS/Linux:
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

### On Windows:
```bash
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
```

### Using Expo CLI:
```bash
expo credentials:manager -p android
```

## For Production:
You'll need the SHA-1 from your production keystore when you create a production build.

## Copy the SHA-1 fingerprint and paste it in Google Cloud Console when creating the Android OAuth client.