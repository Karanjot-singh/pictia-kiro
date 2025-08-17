import { renderHook } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import { useNavigationGuard } from '../useNavigationGuard';

// Mock React Navigation
const mockAddListener = jest.fn();
const mockNavigation = {
  addListener: mockAddListener,
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

// Mock BackHandler
jest.mock('react-native', () => ({
  BackHandler: {
    addEventListener: jest.fn(),
  },
}));

describe('useNavigationGuard', () => {
  const mockOnNavigationBlocked = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets up navigation listener when enabled', () => {
    renderHook(() =>
      useNavigationGuard({
        hasUnsavedChanges: true,
        onNavigationBlocked: mockOnNavigationBlocked,
        enabled: true,
      })
    );

    expect(mockAddListener).toHaveBeenCalledWith('beforeRemove', expect.any(Function));
  });

  it('sets up back handler when enabled', () => {
    renderHook(() =>
      useNavigationGuard({
        hasUnsavedChanges: true,
        onNavigationBlocked: mockOnNavigationBlocked,
        enabled: true,
      })
    );

    expect(BackHandler.addEventListener).toHaveBeenCalledWith(
      'hardwareBackPress',
      expect.any(Function)
    );
  });

  it('does not set up listeners when disabled', () => {
    renderHook(() =>
      useNavigationGuard({
        hasUnsavedChanges: true,
        onNavigationBlocked: mockOnNavigationBlocked,
        enabled: false,
      })
    );

    expect(mockAddListener).not.toHaveBeenCalled();
    expect(BackHandler.addEventListener).not.toHaveBeenCalled();
  });

  it('blocks navigation when there are unsaved changes', () => {
    const mockEvent = {
      preventDefault: jest.fn(),
    };

    mockAddListener.mockImplementation((event, callback) => {
      if (event === 'beforeRemove') {
        callback(mockEvent);
      }
      return jest.fn(); // Mock unsubscribe function
    });

    renderHook(() =>
      useNavigationGuard({
        hasUnsavedChanges: true,
        onNavigationBlocked: mockOnNavigationBlocked,
        enabled: true,
      })
    );

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockOnNavigationBlocked).toHaveBeenCalled();
  });

  it('allows navigation when there are no unsaved changes', () => {
    const mockEvent = {
      preventDefault: jest.fn(),
    };

    mockAddListener.mockImplementation((event, callback) => {
      if (event === 'beforeRemove') {
        callback(mockEvent);
      }
      return jest.fn(); // Mock unsubscribe function
    });

    renderHook(() =>
      useNavigationGuard({
        hasUnsavedChanges: false,
        onNavigationBlocked: mockOnNavigationBlocked,
        enabled: true,
      })
    );

    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    expect(mockOnNavigationBlocked).not.toHaveBeenCalled();
  });

  it('handles back button correctly when there are unsaved changes', () => {
    let backHandler: () => boolean;

    (BackHandler.addEventListener as jest.Mock).mockImplementation((event, handler) => {
      if (event === 'hardwareBackPress') {
        backHandler = handler;
      }
      return { remove: jest.fn() };
    });

    renderHook(() =>
      useNavigationGuard({
        hasUnsavedChanges: true,
        onNavigationBlocked: mockOnNavigationBlocked,
        enabled: true,
      })
    );

    const result = backHandler!();

    expect(result).toBe(true); // Should prevent default behavior
    expect(mockOnNavigationBlocked).toHaveBeenCalled();
  });

  it('handles back button correctly when there are no unsaved changes', () => {
    let backHandler: () => boolean;

    (BackHandler.addEventListener as jest.Mock).mockImplementation((event, handler) => {
      if (event === 'hardwareBackPress') {
        backHandler = handler;
      }
      return { remove: jest.fn() };
    });

    renderHook(() =>
      useNavigationGuard({
        hasUnsavedChanges: false,
        onNavigationBlocked: mockOnNavigationBlocked,
        enabled: true,
      })
    );

    const result = backHandler!();

    expect(result).toBe(false); // Should allow default behavior
    expect(mockOnNavigationBlocked).not.toHaveBeenCalled();
  });

  it('cleans up listeners on unmount', () => {
    const mockUnsubscribe = jest.fn();
    const mockRemove = jest.fn();

    mockAddListener.mockReturnValue(mockUnsubscribe);
    (BackHandler.addEventListener as jest.Mock).mockReturnValue({ remove: mockRemove });

    const { unmount } = renderHook(() =>
      useNavigationGuard({
        hasUnsavedChanges: true,
        onNavigationBlocked: mockOnNavigationBlocked,
        enabled: true,
      })
    );

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(mockRemove).toHaveBeenCalled();
  });
});