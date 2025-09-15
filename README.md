# Pictia - Photo Organization App

A React Native mobile application that helps users organize and backup their Google Photos library through an intuitive swipe-based interface.

## 🚀 Features

- **Swipe Organization**: Bumble-like interface for quickly sorting photos (swipe left to delete, right to keep)
- **Google Photos Integration**: Full integration with Google Photos Library API for reading and managing photo collections
- **Local Photo Management**: Organize photos from your device's local gallery
- **Automated Backup**: Scheduled backup system with weekly/monthly options and push notifications
- **Undo Functionality**: Time-limited undo for accidental swipes
- **Cross-Platform**: Native iOS and Android support via React Native and Expo

## 🛠 Tech Stack

### Core Framework
- **React Native** with **Expo SDK ~53.0.20**
- **TypeScript** with strict configuration
- **React 19.0.0** and **React Native 0.79.5**

### State Management
- **Redux Toolkit** with RTK Query for API caching
- **React Redux** for component integration

### Navigation & UI
- **React Navigation v6** (Stack Navigator)
- **React Native Gesture Handler** for swipe interactions
- **React Native Reanimated** for smooth animations
- **React Native Safe Area Context** for device compatibility
- **Expo Vector Icons** for iconography

### Authentication & Security
- **Expo AuthSession** for Google OAuth 2.0
- **Expo SecureStore** for token storage
- **Expo Crypto** for security utilities

### Media & Permissions
- **Expo Media Library** for local photo access
- **Expo Image Picker** for photo selection
- **Expo Image** for optimized image rendering

## 📱 Installation

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development) or Android Studio (for Android development)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pictia-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Run on specific platforms**
   ```bash
   # iOS Simulator
   npm run ios
   
   # Android Emulator/Device
   npm run android
   
   # Web (for testing)
   npm run web
   ```

## 🔧 Development Commands

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
```

## 🏗 Project Structure

```
pictia-app/
├── src/                    # Main source code
│   ├── components/         # Reusable UI components
│   ├── navigation/         # Navigation configuration
│   ├── screens/           # Screen components
│   ├── services/          # Business logic and API clients
│   ├── store/             # Redux Toolkit state management
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions and helpers
├── assets/                # Static assets (icons, images)
├── internal/              # Development reference files
├── App.tsx               # Root component
├── AppContent.tsx        # Main app content wrapper
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── eas.json             # EAS build configuration
└── app.json             # Expo app configuration
```

## 🔐 Authentication Setup

The app uses Google OAuth 2.0 for authentication with the following scopes:
- `https://www.googleapis.com/auth/photoslibrary.readonly`
- `https://www.googleapis.com/auth/photoslibrary.appendonly`

### Configuration Required:
1. Set up Google Cloud Console project
2. Enable Google Photos Library API
3. Configure OAuth 2.0 credentials
4. Add redirect URIs for your app scheme

## 📱 Platform Support

### iOS
- iOS 13.0+
- Supports tablets
- Bundle ID: `com.pictia.app`
- Required permissions: Photo Library access

### Android
- Android API 21+
- Edge-to-edge display support
- Package: `com.pictia.app`
- Required permissions: Media access (READ_MEDIA_IMAGES, READ_MEDIA_VIDEO)

## 🚀 Build & Deployment

The app uses Expo Application Services (EAS) for builds:

```bash
# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios

# Submit to app stores
eas submit
```

## 🧪 Testing

The project includes comprehensive testing setup:

- **Jest** for unit testing
- **React Native Testing Library** for component testing
- **TypeScript** type checking

Run tests with:
```bash
npm test                # Run all tests
npm run test:watch     # Run tests in watch mode
```

## 🎨 UI/UX Guidelines

### Swipe Interface
- **Left swipe**: Delete/remove photo (destructive action)
- **Right swipe**: Keep photo (positive action)
- **Visual feedback**: Clear animations and haptic feedback
- **Smooth transitions**: 60fps animations for fluid experience

### Design Standards
- **iOS**: Follows Human Interface Guidelines (HIG)
- **Android**: Implements Material Design 3 principles
- **Accessibility**: Full VoiceOver/TalkBack support

## 🤝 Contributing

1. Follow the established code style (ESLint + Prettier)
2. Write tests for new features
3. Use TypeScript with strict mode
4. Follow the project structure conventions
5. Test on both iOS and Android platforms

## 📄 License

GPL v3.0

## 🆘 Support

For issues and questions:
1. Check the `internal/` folder for development guides
2. Review existing issues in the repository
3. Create a new issue with detailed information

---

Built with ❤️ using React Native and Expo
