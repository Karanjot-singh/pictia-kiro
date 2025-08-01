import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import UndoButton from '../UndoButton';

// Mock timers
jest.useFakeTimers();

describe('UndoButton', () => {
  const mockOnUndo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  it('renders when visible is true', () => {
    const { getByText } = render(
      <UndoButton visible={true} onUndo={mockOnUndo} />
    );

    expect(getByText('Undo')).toBeTruthy();
  });

  it('does not render when visible is false', () => {
    const { queryByText } = render(
      <UndoButton visible={false} onUndo={mockOnUndo} />
    );

    expect(queryByText('Undo')).toBeNull();
  });

  it('calls onUndo when pressed', () => {
    const { getByText } = render(
      <UndoButton visible={true} onUndo={mockOnUndo} />
    );

    fireEvent.press(getByText('Undo'));
    expect(mockOnUndo).toHaveBeenCalledTimes(1);
  });

  it('shows countdown when showCountdown is true', () => {
    const { getByText } = render(
      <UndoButton 
        visible={true} 
        onUndo={mockOnUndo} 
        showCountdown={true}
        timeoutMs={5000}
      />
    );

    expect(getByText('5s')).toBeTruthy();
  });

  it('does not show countdown when showCountdown is false', () => {
    const { queryByText } = render(
      <UndoButton 
        visible={true} 
        onUndo={mockOnUndo} 
        showCountdown={false}
        timeoutMs={5000}
      />
    );

    expect(queryByText('5s')).toBeNull();
  });

  it('updates countdown timer', () => {
    const { getByText } = render(
      <UndoButton 
        visible={true} 
        onUndo={mockOnUndo} 
        showCountdown={true}
        timeoutMs={3000}
      />
    );

    expect(getByText('3s')).toBeTruthy();

    // Fast forward 1 second
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(getByText('2s')).toBeTruthy();

    // Fast forward another second
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(getByText('1s')).toBeTruthy();
  });

  it('uses custom timeout value', () => {
    const { getByText } = render(
      <UndoButton 
        visible={true} 
        onUndo={mockOnUndo} 
        showCountdown={true}
        timeoutMs={10000}
      />
    );

    expect(getByText('10s')).toBeTruthy();
  });

  it('clears timer when onUndo is called', () => {
    const { getByText } = render(
      <UndoButton 
        visible={true} 
        onUndo={mockOnUndo} 
        showCountdown={true}
        timeoutMs={5000}
      />
    );

    // Press undo button
    fireEvent.press(getByText('Undo'));

    // Advance timers - countdown should not continue
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(mockOnUndo).toHaveBeenCalledTimes(1);
  });

  it('applies custom styles', () => {
    const customStyle = { marginTop: 20 };
    const { getByTestId } = render(
      <UndoButton 
        visible={true} 
        onUndo={mockOnUndo} 
        style={customStyle}
      />
    );

    // Note: Testing styles in React Native Testing Library is limited
    // This test mainly ensures the component accepts style props without crashing
    const { getByText } = render(
      <UndoButton 
        visible={true} 
        onUndo={mockOnUndo} 
        style={customStyle}
      />
    );
    expect(getByText('Undo')).toBeTruthy();
  });

  it('positions at top when position prop is top', () => {
    const { getByText } = render(
      <UndoButton 
        visible={true} 
        onUndo={mockOnUndo} 
        position="top"
      />
    );

    expect(getByText('Undo')).toBeTruthy();
  });

  it('positions at bottom by default', () => {
    const { getByText } = render(
      <UndoButton 
        visible={true} 
        onUndo={mockOnUndo}
      />
    );

    expect(getByText('Undo')).toBeTruthy();
  });
});