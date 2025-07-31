# Project Structure

## Root Directory
```
pictia-app/
├── src/                    # Main source code
├── assets/                 # Static assets (icons, images)
├── .expo/                  # Expo configuration
├── node_modules/           # Dependencies
├── App.tsx                 # Root component
├── AppContent.tsx          # Main app content wrapper
├── index.ts                # Entry point
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── eas.json                # EAS build configuration
└── app.json                # Expo app configuration
```

## Source Code Organization (`src/`)

### Components (`src/components/`)
- Reusable UI components
- Each component should have its own file
- Export from `index.ts` for clean imports
- Example: `ErrorDisplay.tsx`

### Navigation (`src/navigation/`)
- Navigation configuration and navigators
- `AuthNavigator.tsx` - Authentication flow navigation
- `MainNavigator.tsx` - Main app navigation

### Screens (`src/screens/`)
- Screen components organized by feature
- `auth/` - Authentication screens (LoginScreen, AuthLoadingScreen)
- `index.ts` - Export all screens

### Services (`src/services/`)
- Business logic and API clients
- `AuthService.ts` - Authentication service
- `GooglePhotosClient.ts` - Google Photos API client
- `MockAuthService.ts` - Mock service for testing
- `__tests__/` - Service unit tests

### Store (`src/store/`)
- Redux Toolkit state management
- `index.ts` - Store configuration
- `hooks.ts` - Typed Redux hooks
- `api/` - RTK Query API definitions
- `slices/` - Redux slices (authSlice, organizationSlice, backupSlice)
- `selectors/` - Reusable selectors
- `thunks/` - Async action creators

### Types (`src/types/`)
- TypeScript type definitions
- `index.ts` - Common types and exports
- `googlePhotos.ts` - Google Photos API types

### Utils (`src/utils/`)
- Utility functions and helpers
- `authErrors.ts` - Authentication error handling
- `mediaCache.ts` - Media caching utilities
- `mediaValidation.ts` - Media validation functions
- `pagination.ts` - Pagination helpers
- `__tests__/` - Utility unit tests

## Import Path Conventions

Use TypeScript path aliases defined in `tsconfig.json`:

```typescript
// Correct imports
import { AuthService } from '@/services';
import { ErrorDisplay } from '@/components';
import { RootState } from '@/store';
import { MediaItem } from '@/types';
import { validateMedia } from '@/utils';

// Avoid relative imports
import { AuthService } from '../../../services/AuthService';
```

## File Naming Conventions

- **Components**: PascalCase (e.g., `ErrorDisplay.tsx`)
- **Services**: PascalCase (e.g., `AuthService.ts`)
- **Utils**: camelCase (e.g., `mediaCache.ts`)
- **Types**: camelCase (e.g., `googlePhotos.ts`)
- **Tests**: `*.test.ts` or `*.test.tsx`
- **Index files**: `index.ts` for re-exports

## Code Organization Principles

1. **Feature-based grouping**: Related functionality stays together
2. **Clear separation of concerns**: Services, components, state management
3. **Consistent exports**: Use index files for clean imports
4. **Type safety**: All files use TypeScript with strict mode
5. **Testing co-location**: Tests live near the code they test (`__tests__/` folders)