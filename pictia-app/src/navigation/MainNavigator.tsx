import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList } from '@/types';
import { SettingsScreen } from '@/screens';
import { useAppSelector } from '@/store/hooks';
import { selectIsLocalMode } from '@/store/selectors/authSelectors';

// Import organize screens
import { OrganizeScreen, LocalOrganizeScreen } from '@/screens';

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

const MainNavigator: React.FC = () => {
  const isLocalMode = useAppSelector(selectIsLocalMode);

  // Choose the appropriate organize screen based on mode
  const OrganizeComponent = isLocalMode ? LocalOrganizeScreen : OrganizeScreen;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Organize') {
            iconName = focused ? 'albums' : 'albums-outline';
          } else if (route.name === 'Backup') {
            iconName = focused ? 'cloud-upload' : 'cloud-upload-outline';
          } else if (route.name === 'Upload') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Organize" 
        component={OrganizeComponent}
        options={{
          tabBarLabel: isLocalMode ? 'Local Gallery' : 'Organize',
        }}
      />
      {!isLocalMode && <Tab.Screen name="Backup" component={BackupScreen} />}
      {!isLocalMode && <Tab.Screen name="Upload" component={UploadScreen} />}
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
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
