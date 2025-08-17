import { useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { BackHandler } from 'react-native';

interface NavigationGuardOptions {
  hasUnsavedChanges: boolean;
  onNavigationBlocked: () => void;
  enabled?: boolean;
}

/**
 * Custom hook to prevent navigation when there are unsaved changes
 * Works with both tab navigation and hardware back button on Android
 */
export const useNavigationGuard = ({
  hasUnsavedChanges,
  onNavigationBlocked,
  enabled = true,
}: NavigationGuardOptions) => {
  const navigation = useNavigation();

  // Handle hardware back button on Android
  useEffect(() => {
    if (!enabled) return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (hasUnsavedChanges) {
        onNavigationBlocked();
        return true; // Prevent default back behavior
      }
      return false; // Allow default back behavior
    });

    return () => backHandler.remove();
  }, [hasUnsavedChanges, onNavigationBlocked, enabled]);

  // Handle tab navigation and other navigation events
  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!hasUnsavedChanges) {
        // No unsaved changes, allow navigation
        return;
      }

      // Prevent default behavior of leaving the screen
      e.preventDefault();

      // Show the session exit modal
      onNavigationBlocked();
    });

    return unsubscribe;
  }, [navigation, hasUnsavedChanges, onNavigationBlocked, enabled]);

  // Function to allow navigation (call after committing or discarding changes)
  const allowNavigation = useCallback(() => {
    // This will be handled by updating hasUnsavedChanges to false
    // The navigation will then proceed normally
  }, []);

  return { allowNavigation };
};

export default useNavigationGuard;