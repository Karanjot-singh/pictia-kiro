import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { THEME_COLORS, SHADOWS, TYPOGRAPHY, SPACING } from '@/theme';

interface ModernTabBarProps extends BottomTabBarProps {}

const ModernTabBar: React.FC<ModernTabBarProps> = ({ state, descriptors, navigation }) => {
  const getIconName = (routeName: string, focused: boolean): keyof typeof Ionicons.glyphMap => {
    // iOS-style icons with more native feel
    switch (routeName) {
      case 'Organise':
        return focused ? 'images' : 'images-outline';
      case 'Organize':
        return focused ? 'albums' : 'albums-outline'; // Albums icon for organize stack
      case 'Backup':
        return focused ? 'cloud-done' : 'cloud-done-outline';
      case 'Upload':
        return focused ? 'add' : 'add-outline';
      case 'Settings':
        return focused ? 'cog' : 'cog-outline'; // iOS-style cog instead of settings
      default:
        return 'help-outline';
    }
  };

  const getTabLabel = (routeName: string): string => {
    switch (routeName) {
      case 'Organise':
        return 'Gallery';
      case 'Organize':
        return 'Organize';
      case 'Backup':
        return 'Backup';
      case 'Upload':
        return 'Upload';
      case 'Settings':
        return 'Settings';
      default:
        return routeName;
    }
  };

  return (
    <View style={styles.tabBarContainer}>
      {state.routes.map((route, index) => {
        const descriptor = descriptors[route.key];
        const { options } = descriptor || {};
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        const iconName = getIconName(route.name, isFocused);
        const label = getTabLabel(route.name);

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options?.tabBarAccessibilityLabel}
            testID={options?.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            <Animated.View style={[
              styles.tabIconContainer,
              isFocused && styles.activeTabIconContainer
            ]}>
              <Ionicons
                name={iconName}
                size={isFocused ? 25 : 23}
                color={isFocused ? THEME_COLORS.PRIMARY : THEME_COLORS.GRAY}
                style={isFocused && styles.activeIcon}
              />
            </Animated.View>
            
            <Text style={[
              styles.tabLabel,
              isFocused ? styles.activeTabLabel : styles.inactiveTabLabel
            ]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: Platform.OS === 'ios' 
      ? 'rgba(255, 255, 255, 0.95)' // iOS translucent background
      : THEME_COLORS.WHITE,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16, // Account for iOS home indicator
    paddingHorizontal: SPACING.SM,
    borderTopWidth: Platform.OS === 'ios' ? 0.5 : 0,
    borderTopColor: Platform.OS === 'ios' ? 'rgba(0, 0, 0, 0.1)' : 'transparent',
    ...SHADOWS.TAB_BAR,
    minHeight: Platform.OS === 'ios' ? 83 : 70, // Reduced height, iOS standard
    backdropFilter: Platform.OS === 'ios' ? 'blur(20px)' : undefined,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 2,
  },
  activeTabIconContainer: {
    backgroundColor: Platform.OS === 'ios' 
      ? `${THEME_COLORS.PRIMARY}08` // Very subtle background for iOS
      : `${THEME_COLORS.PRIMARY}15`,
    transform: [{ scale: 1.02 }], // Subtle scale for iOS
  },
  activeIcon: {
    // Subtle glow effect for active icons on iOS
    ...(Platform.OS === 'ios' && {
      shadowColor: THEME_COLORS.PRIMARY,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
    }),
  },
  tabLabel: {
    fontSize: Platform.OS === 'ios' ? 10 : TYPOGRAPHY.BODY_SMALL, // iOS uses smaller text
    fontWeight: TYPOGRAPHY.WEIGHT_MEDIUM,
    textAlign: 'center',
    marginTop: 1,
    letterSpacing: Platform.OS === 'ios' ? -0.1 : 0, // Tighter letter spacing on iOS
  },
  activeTabLabel: {
    color: THEME_COLORS.PRIMARY,
    fontWeight: Platform.OS === 'ios' ? TYPOGRAPHY.WEIGHT_SEMIBOLD : TYPOGRAPHY.WEIGHT_BOLD,
  },
  inactiveTabLabel: {
    color: Platform.OS === 'ios' ? '#8E8E93' : THEME_COLORS.GRAY, // iOS system gray
  },
});

export default ModernTabBar;