# Technology Stack

## Core Framework
- **React Native** with **Expo SDK ~53.0.20**
- **TypeScript** with strict configuration
- **React 19.0.0** and **React Native 0.79.5**

## State Management
- **Redux Toolkit** with RTK Query for API caching
- **React Redux** for component integration
- Slices: `authSlice`, `organizationSlice`, `backupSlice`

## Navigation & UI
- **React Navigation v6** (Stack Navigator)
- **React Native Gesture Handler** for swipe interactions
- **React Native Safe Area Context** for device compatibility
- **Expo Vector Icons** for iconography

## Authentication & Security
- **Expo AuthSession** for Google OAuth 2.0
- **Expo SecureStore** for token storage
- **Expo Crypto** for security utilities
- Google Photos Library API with required scopes:
  - `https://www.googleapis.com/auth/photoslibrary.readonly`
  - `https://www.googleapis.com/auth/photoslibrary.appendonly`

## Development Tools
- **ESLint** with TypeScript and React Native configs
- **Prettier** for code formatting
- **Jest** with React Native Testing Library
- **TypeScript** with path aliases (`@/` for src)

## Build & Deployment
- **Expo Application Services (EAS)** for builds
- **Expo CLI** for development workflow

## Common Commands

```bash
# Development
npm start              # Start Expo development server
npm run android        # Run on Android simulator/device
npm run ios           # Run on iOS simulator/device
npm run web           # Run web version

# Code Quality
npm run lint          # Run ESLint
npm run lint:fix      # Fix ESLint issues automatically
npm run format        # Format code with Prettier
npm run type-check    # TypeScript type checking

# Testing
npm test              # Run Jest tests
npm run test:watch    # Run tests in watch mode

# Build
eas build --platform android    # Build Android APK/AAB
eas build --platform ios        # Build iOS IPA
eas submit                       # Submit to app stores
```

## Configuration Files
- `tsconfig.json` - TypeScript with strict mode and path aliases
- `.eslintrc.js` - ESLint configuration
- `.prettierrc` - Prettier formatting rules
- `eas.json` - EAS build configuration
- `app.json` - Expo app configuration