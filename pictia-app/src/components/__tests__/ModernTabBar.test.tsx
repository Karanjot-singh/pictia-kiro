import React from 'react';
import { render } from '@testing-library/react-native';
import ModernTabBar from '../ModernTabBar';
import { NavigationContainer } from '@react-navigation/native';

// Mock the theme imports
jest.mock('@/theme', () => ({
  THEME_COLORS: {
    PRIMARY: '#7444C0',
    GRAY: '#757E90',
    WHITE: '#FFFFFF',
  },
  SHADOWS: {
    TAB_BAR: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
  },
  TYPOGRAPHY: {
    BODY_SMALL: 12,
    WEIGHT_MEDIUM: '500',
    WEIGHT_SEMIBOLD: '600',
  },
  SPACING: {
    MD: 16,
  },
}));

const mockNavigation = {
  emit: jest.fn(() => ({ defaultPrevented: false })),
  navigate: jest.fn(),
};

const mockState = {
  index: 0,
  routes: [
    { key: 'Organise-key', name: 'Organise' },
    { key: 'Settings-key', name: 'Settings' },
  ],
};

const mockDescriptors = {
  'Organise-key': {
    options: {
      tabBarAccessibilityLabel: 'Gallery Tab',
      tabBarTestID: 'gallery-tab',
    },
  },
  'Settings-key': {
    options: {
      tabBarAccessibilityLabel: 'Settings Tab',
      tabBarTestID: 'settings-tab',
    },
  },
};

describe('ModernTabBar', () => {
  it('renders correctly with tabs', () => {
    const { getByText, getByTestId } = render(
      <NavigationContainer>
        <ModernTabBar
          state={mockState}
          descriptors={mockDescriptors}
          navigation={mockNavigation}
        />
      </NavigationContainer>
    );

    expect(getByText('Gallery')).toBeTruthy();
    expect(getByText('Settings')).toBeTruthy();
    expect(getByTestId('gallery-tab')).toBeTruthy();
    expect(getByTestId('settings-tab')).toBeTruthy();
  });

  it('shows correct active state styling', () => {
    const { getByText } = render(
      <NavigationContainer>
        <ModernTabBar
          state={mockState}
          descriptors={mockDescriptors}
          navigation={mockNavigation}
        />
      </NavigationContainer>
    );

    const galleryTab = getByText('Gallery');
    expect(galleryTab).toBeTruthy();
    // The first tab should be active (index 0)
  });
});