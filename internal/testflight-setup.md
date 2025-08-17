# TestFlight Development Build Setup

## Prerequisites
- Apple Developer Account ($99/year)
- iPhone added to your developer account

## Steps

### 1. Build for TestFlight
```bash
npx eas build --platform ios --profile preview
```

### 2. Submit to TestFlight
```bash
npx eas submit --platform ios
```

### 3. Install via TestFlight
- Download TestFlight app from App Store
- Accept invitation email
- Install development build

## Benefits
- No need to fix CocoaPods locally
- Easy distribution to team members
- Automatic updates
- Works with all native features