import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MainTabParamList } from '@/types';
import { SettingsScreen, DebugScreen, BackupSettingsScreen } from '@/screens';
import { useAppSelector } from '@/store/hooks';
import { selectIsLocalMode } from '@/store/selectors/authSelectors';
import { ModernTabBar } from '@/components';

// Import the new combined organise screen
import OrganiseScreen from '@/screens/OrganiseScreen';
import OrganizeDirectScreen from '@/screens/OrganizeDirectScreen';

const BackupScreen: React.FC = () => (
  <View style={styles.placeholderContainer}>
    <Text style={styles.placeholderText}>Backup Screen - Coming Soon</Text>
  </View>
);

const UploadScreen: React.FC = () => (
  <View style={styles.placeholderContainer}>
    <Text style={styles.placeholderText}>Upload Screen - Coming Soon</Text>
  </View>
);

// SettingsScreen is now imported from @/screens

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator();

const TabNavigator: React.FC = () => {
  const isLocalMode = useAppSelector(selectIsLocalMode);

  return (
    <Tab.Navigator
      tabBar={(props) => <ModernTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Organise" 
        component={OrganiseScreen}
        options={{
          tabBarLabel: 'Gallery',
        }}
      />
      <Tab.Screen 
        name="Organize" 
        component={OrganizeDirectScreen}
        options={{
          tabBarLabel: 'Organize',
        }}
      />
      {!isLocalMode && <Tab.Screen name="Backup" component={BackupScreen} />}
      {!isLocalMode && <Tab.Screen name="Upload" component={UploadScreen} />}
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

const MainNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen 
        name="Debug" 
        component={DebugScreen}
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="BackupSettings" 
        component={BackupSettingsScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  placeholderText: {
    fontSize: 18,
    color: '#666',
  },
});

export default MainNavigator;
