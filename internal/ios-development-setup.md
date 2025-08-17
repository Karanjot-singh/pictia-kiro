# iOS Development Setup Guide

## CocoaPods Architecture Fix

The error you're seeing is due to CocoaPods being installed with x86_64 architecture on an Apple Silicon Mac. Here's how to fix it:

### 1. Reinstall CocoaPods for ARM64

```bash
# Uninstall current CocoaPods
sudo gem uninstall cocoapods

# Install CocoaPods using Homebrew (recommended for Apple Silicon)
brew install cocoapods

# Or install using gem with proper architecture
sudo arch -arm64 gem install cocoapods
```

### 2. Clean and Reinstall Pods

```bash
cd pictia-app/ios
rm -rf Pods Podfile.lock
pod install
```

### 3. Alternative: Use Rosetta for CocoaPods

If the above doesn't work, you can run CocoaPods under Rosetta:

```bash
cd pictia-app/ios
arch -x86_64 pod install
```

## Development Build Options

### Option A: Local Development (Free)
- Requires fixing CocoaPods (see above)
- Run: `npx expo run:ios`
- Installs directly to connected iPhone via Xcode

### Option B: EAS Development Build (Requires Apple Developer Account)
- Costs $99/year for Apple Developer Program
- Run: `npx eas build --platform ios --profile development`
- Generates installable .ipa file

### Option C: Expo Go (Limited Features)
- Free but limited functionality
- Some native modules won't work
- Run: `npx expo start` and scan QR code

## Recommended Next Steps

1. Try fixing CocoaPods with the commands above
2. If successful, run `npx expo run:ios` 
3. If you need full native features, consider getting Apple Developer account