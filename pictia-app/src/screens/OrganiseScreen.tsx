import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAppSelector } from '@/store/hooks';
import { selectIsLocalMode } from '@/store/selectors/authSelectors';
import { OrganiseStackParamList } from '@/types';

// Import existing screens
import GalleryScreen from './GalleryScreen';
import OrganizeScreen from './OrganizeScreen';
import LocalOrganizeScreen from './LocalOrganizeScreen';
import LocalGalleryScreen from './LocalGalleryScreen';

const Stack = createStackNavigator<OrganiseStackParamList>();

const OrganiseScreen: React.FC = () => {
  const isLocalMode = useAppSelector(selectIsLocalMode);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#fff' },
      }}
      initialRouteName="Gallery"
    >
      <Stack.Screen 
        name="Gallery" 
        component={isLocalMode ? LocalGalleryScreen : GalleryScreen}
        options={{
          title: 'Organise',
        }}
      />
      <Stack.Screen 
        name="SwipeMode" 
        component={isLocalMode ? LocalOrganizeScreen : OrganizeScreen}
        options={{
          title: 'Organize Photos',
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
};

export default OrganiseScreen;