// Test setup file
import '@testing-library/react-native/extend-expect';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Expo SecureStore
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock Expo AuthSession
jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'http://localhost:19006'),
  useAuthRequest: jest.fn(() => [null, null, jest.fn()]),
  AuthRequest: jest.fn(),
  AuthSessionResult: {},
  ResponseType: { Code: 'code' },
}));

// Mock fetch globally
global.fetch = jest.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};