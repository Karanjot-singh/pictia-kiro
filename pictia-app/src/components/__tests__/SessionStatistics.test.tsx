import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SessionStatistics from '../SessionStatistics';

describe('SessionStatistics', () => {
  const defaultProps = {
    totalProcessed: 50,
    keepCount: 30,
    deleteCount: 20,
    sessionDuration: 600000, // 10 minutes
  };

  it('renders correctly with basic props', () => {
    const { getByText } = render(<SessionStatistics {...defaultProps} />);
    
    expect(getByText('Organization Session')).toBeTruthy();
    expect(getByText('50')).toBeTruthy(); // totalProcessed
    expect(getByText('30')).toBeTruthy(); // keepCount
    expect(getByText('20')).toBeTruthy(); // deleteCount
    expect(getByText('10m')).toBeTruthy(); // duration
  });

  it('renders as current session when isCurrentSession is true', () => {
    const { getByText } = render(
      <SessionStatistics {...defaultProps} isCurrentSession={true} />
    );
    
    expect(getByText('Current Session')).toBeTruthy();
  });

  it('renders in compact mode', () => {
    const { getByText } = render(
      <SessionStatistics {...defaultProps} compact={true} />
    );
    
    expect(getByText('Total')).toBeTruthy(); // compact label
  });

  it('shows percentages in non-compact mode', () => {
    const { getByText } = render(<SessionStatistics {...defaultProps} />);
    
    expect(getByText('Kept (60%)')).toBeTruthy(); // 30/50 = 60%
    expect(getByText('Deleted (40%)')).toBeTruthy(); // 20/50 = 40%
  });

  it('handles zero processed items correctly', () => {
    const { getByText } = render(
      <SessionStatistics
        totalProcessed={0}
        keepCount={0}
        deleteCount={0}
      />
    );
    
    expect(getByText('Kept (0%)')).toBeTruthy();
    expect(getByText('Deleted (0%)')).toBeTruthy();
  });

  it('calls onPress when pressable', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <SessionStatistics {...defaultProps} onPress={onPress} />
    );
    
    fireEvent.press(getByText('Organization Session'));
    
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('formats duration correctly for different time ranges', () => {
    // Test seconds only
    const { rerender, getByText } = render(
      <SessionStatistics {...defaultProps} sessionDuration={45000} />
    );
    expect(getByText('45s')).toBeTruthy();

    // Test minutes only
    rerender(
      <SessionStatistics {...defaultProps} sessionDuration={300000} />
    );
    expect(getByText('5m')).toBeTruthy();

    // Test hours and minutes
    rerender(
      <SessionStatistics {...defaultProps} sessionDuration={3900000} />
    );
    expect(getByText('1h 5m')).toBeTruthy();
  });

  it('shows progress bar for current session', () => {
    const { getByTestId } = render(
      <SessionStatistics {...defaultProps} isCurrentSession={true} />
    );
    
    // Progress bar should be rendered for current sessions
    // We can't easily test the visual progress bar, but we can verify the component structure
    expect(() => getByTestId('progress-bar')).not.toThrow();
  });

  it('does not show duration when not provided', () => {
    const { queryByText } = render(
      <SessionStatistics
        totalProcessed={50}
        keepCount={30}
        deleteCount={20}
      />
    );
    
    // Should not show any duration text
    expect(queryByText(/\d+[hms]/)).toBeNull();
  });

  it('calculates percentages correctly', () => {
    const { getByText } = render(
      <SessionStatistics
        totalProcessed={100}
        keepCount={75}
        deleteCount={25}
      />
    );
    
    expect(getByText('Kept (75%)')).toBeTruthy();
    expect(getByText('Deleted (25%)')).toBeTruthy();
  });

  it('handles edge case with uneven percentages', () => {
    const { getByText } = render(
      <SessionStatistics
        totalProcessed={3}
        keepCount={2}
        deleteCount={1}
      />
    );
    
    expect(getByText('Kept (67%)')).toBeTruthy(); // 2/3 = 66.67% rounded to 67%
    expect(getByText('Deleted (33%)')).toBeTruthy(); // 1/3 = 33.33% rounded to 33%
  });
});