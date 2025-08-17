import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SessionExitModal from '../SessionExitModal';

const mockSessionStats = {
  totalProcessed: 25,
  keepCount: 15,
  deleteCount: 10,
  sessionDuration: 300000, // 5 minutes
};

describe('SessionExitModal', () => {
  const defaultProps = {
    visible: true,
    isCommitting: false,
    sessionStats: mockSessionStats,
    onCommit: jest.fn(),
    onDiscard: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when visible', () => {
    const { getByText } = render(<SessionExitModal {...defaultProps} />);
    
    expect(getByText('Save Organization Session?')).toBeTruthy();
    expect(getByText('Session Summary')).toBeTruthy();
    expect(getByText('25')).toBeTruthy(); // totalProcessed
    expect(getByText('15')).toBeTruthy(); // keepCount
    expect(getByText('10')).toBeTruthy(); // deleteCount
    expect(getByText('Session duration: 5m 0s')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    const { queryByText } = render(
      <SessionExitModal {...defaultProps} visible={false} />
    );
    
    expect(queryByText('Save Organization Session?')).toBeNull();
  });

  it('calls onCommit when Save Changes button is pressed', async () => {
    const onCommit = jest.fn().mockResolvedValue(undefined);
    const { getByText } = render(
      <SessionExitModal {...defaultProps} onCommit={onCommit} />
    );
    
    fireEvent.press(getByText('Save Changes'));
    
    await waitFor(() => {
      expect(onCommit).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onDiscard when Discard Changes button is pressed', () => {
    const onDiscard = jest.fn();
    const { getByText } = render(
      <SessionExitModal {...defaultProps} onDiscard={onDiscard} />
    );
    
    fireEvent.press(getByText('Discard Changes'));
    
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Continue Organizing button is pressed', () => {
    const onCancel = jest.fn();
    const { getByText } = render(
      <SessionExitModal {...defaultProps} onCancel={onCancel} />
    );
    
    fireEvent.press(getByText('Continue Organizing'));
    
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows loading state when committing', () => {
    const { getByText } = render(
      <SessionExitModal {...defaultProps} isCommitting={true} />
    );
    
    expect(getByText('Saving...')).toBeTruthy();
  });

  it('disables buttons when committing', () => {
    const { getByText } = render(
      <SessionExitModal {...defaultProps} isCommitting={true} />
    );
    
    const discardButton = getByText('Discard Changes').parent;
    const cancelButton = getByText('Continue Organizing').parent;
    
    expect(discardButton?.props.accessibilityState?.disabled).toBe(true);
    expect(cancelButton?.props.accessibilityState?.disabled).toBe(true);
  });

  it('formats duration correctly for different time ranges', () => {
    // Test seconds only
    const { rerender, getByText } = render(
      <SessionExitModal 
        {...defaultProps} 
        sessionStats={{ ...mockSessionStats, sessionDuration: 45000 }} 
      />
    );
    expect(getByText('Session duration: 45s')).toBeTruthy();

    // Test minutes and seconds
    rerender(
      <SessionExitModal 
        {...defaultProps} 
        sessionStats={{ ...mockSessionStats, sessionDuration: 125000 }} 
      />
    );
    expect(getByText('Session duration: 2m 5s')).toBeTruthy();

    // Test hours and minutes
    rerender(
      <SessionExitModal 
        {...defaultProps} 
        sessionStats={{ ...mockSessionStats, sessionDuration: 3725000 }} 
      />
    );
    expect(getByText('Session duration: 1h 2m')).toBeTruthy();
  });

  it('handles commit errors gracefully', async () => {
    const onCommit = jest.fn().mockRejectedValue(new Error('Network error'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    const { getByText } = render(
      <SessionExitModal {...defaultProps} onCommit={onCommit} />
    );
    
    fireEvent.press(getByText('Save Changes'));
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to commit session:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('displays correct statistics', () => {
    const customStats = {
      totalProcessed: 100,
      keepCount: 75,
      deleteCount: 25,
      sessionDuration: 1800000, // 30 minutes
    };

    const { getByText } = render(
      <SessionExitModal {...defaultProps} sessionStats={customStats} />
    );
    
    expect(getByText('100')).toBeTruthy(); // totalProcessed
    expect(getByText('75')).toBeTruthy(); // keepCount
    expect(getByText('25')).toBeTruthy(); // deleteCount
    expect(getByText('Session duration: 30m 0s')).toBeTruthy();
  });
});