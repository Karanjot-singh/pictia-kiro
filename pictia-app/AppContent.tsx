import React, { useEffect, useState } from 'react';
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
import { SplashScreen } from '@/components';

const Stack = createStackNavigator<RootStackParamList>();

const AppContent: React.FC = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isLoading = useAppSelector(selectAuthLoading);
  const [showSplash, setShowSplash] = useState(true);
  const [splashProgress, setSplashProgress] = useState(0);

  useEffect(() => {
    // Simulate app initialization with progress updates
    const initializeApp = async () => {
      // Step 1: Check authentication (25%)
      setSplashProgress(0.25);
      dispatch(validateStoredAuth());
      
      // Step 2: Load notification config (50%)
      setSplashProgress(0.5);
      dispatch(loadNotificationConfig());
      
      // Step 3: Clean up expired reminders (75%)
      setSplashProgress(0.75);
      dispatch(cleanupExpiredReminders());
      
      // Step 4: Complete initialization (100%)
      setSplashProgress(1);
      
      // Show splash for minimum duration for better UX
      setTimeout(() => {
        setShowSplash(false);
      }, 2000);
    };

    initializeApp();
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

  // Show splash screen during app initialization
  if (showSplash) {
    return (
      <SplashScreen
        progress={splashProgress}
        message={
          splashProgress < 0.5 
            ? "Initializing app..." 
            : splashProgress < 1 
            ? "Loading your photos..." 
            : "Almost ready!"
        }
        onAnimationComplete={() => setShowSplash(false)}
      />
    );
  }

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