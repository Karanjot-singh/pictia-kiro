import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectIsAuthenticated, selectAuthLoading } from '@/store/selectors/authSelectors';
import { validateStoredAuth } from '@/store/thunks/authThunks';
import { loadNotificationConfig, cleanupExpiredReminders } from '@/store/slices/notificationSlice';
import { NotificationService } from '@/services';
import { RootStackParamList } from '@/types';
import AuthNavigator from '@/navigation/AuthNavigator';
import MainNavigator from '@/navigation/MainNavigator';
import AuthLoadingScreen from '@/screens/auth/AuthLoadingScreen';

const Stack = createStackNavigator<RootStackParamList>();

const AppContent: React.FC = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isLoading = useAppSelector(selectAuthLoading);

  useEffect(() => {
    // Check for stored authentication on app startup
    dispatch(validateStoredAuth());
    
    // Load notification configuration
    dispatch(loadNotificationConfig());
    
    // Clean up expired reminders
    dispatch(cleanupExpiredReminders());
  }, [dispatch]);

  useEffect(() => {
    // Set up notification handlers
    const notificationService = NotificationService.getInstance();
    
    const handleBackupReminderTap = () => {
      // Navigate to organize screen when backup reminder is tapped
      if (isAuthenticated) {
        // This will be handled by the navigation system
        console.log('Backup reminder tapped - navigating to organize screen');
      }
    };

    const handleTestNotificationTap = () => {
      console.log('Test notification tapped');
    };

    notificationService.setupNotificationHandlers(
      handleBackupReminderTap,
      handleTestNotificationTap
    );
  }, [isAuthenticated]);

  // Show loading screen while checking authentication
  if (isLoading) {
    return <AuthLoadingScreen message="Loading..." />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen 
          name="Main" 
          component={MainNavigator}
          options={{
            animationEnabled: false,
          }}
        />
      ) : (
        <Stack.Screen 
          name="Auth" 
          component={AuthNavigator}
          options={{
            animationEnabled: false,
          }}
        />
      )}
    </Stack.Navigator>
  );
};

export default AppContent;