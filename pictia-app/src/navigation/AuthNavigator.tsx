import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthStackParamList } from '@/types';
import { useAppSelector } from '@/store/hooks';
import { selectAuthLoading, selectIsAuthenticated } from '@/store/selectors/authSelectors';
import LoginScreen from '@/screens/auth/LoginScreen';
import AuthLoadingScreen from '@/screens/auth/AuthLoadingScreen';

const Stack = createStackNavigator<AuthStackParamList>();

const AuthNavigator: React.FC = () => {
  const isLoading = useAppSelector(selectAuthLoading);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  // Show loading screen while checking authentication
  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#fff' },
      }}
      initialRouteName="Login"
    >
      <Stack.Screen 
        name="Login" 
        component={LoginScreen}
        options={{
          animationEnabled: false,
        }}
      />
      <Stack.Screen 
        name="AuthLoading" 
        component={AuthLoadingScreen}
        options={{
          animationEnabled: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
