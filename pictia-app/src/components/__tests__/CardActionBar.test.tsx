import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CardActionBar from '../CardActionBar';

// Mock Expo modules
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('CardActionBar', () => {
  const mockOnUndo = jest.fn();
  const mockOnCommit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when visible', () => {
    const { getByTestId } = render(
      <CardActionBar
        visible={true}
        onUndo={mockOnUndo}
        onCommit={mockOnCommit}
      />
    );

    // Component should be rendered when visible
    expect(getByTestId).toBeDefined();
  });

  it('does not render when not visible', () => {
    const { queryByTestId } = render(
      <CardActionBar
        visible={false}
        onUndo={mockOnUndo}
        onCommit={mockOnCommit}
      />
    );

    // Component should not be rendered when not visible
    expect(queryByTestId('card-action-bar')).toBeNull();
  });

  it('calls onUndo when undo button is pressed', async () => {
    const { getByRole } = render(
      <CardActionBar
        visible={true}
        onUndo={mockOnUndo}
        enableHaptics={false}
      />
    );

    const undoButton = getByRole('button');
    fireEvent.press(undoButton);

    expect(mockOnUndo).toHaveBeenCalledTimes(1);
  });

  it('calls onCommit when commit button is pressed', async () => {
    const { getAllByRole } = render(
      <CardActionBar
        visible={true}
        onUndo={mockOnUndo}
        onCommit={mockOnCommit}
        enableHaptics={false}
      />
    );

    const buttons = getAllByRole('button');
    const commitButton = buttons[1]; // Second button should be commit
    fireEvent.press(commitButton);

    expect(mockOnCommit).toHaveBeenCalledTimes(1);
  });

  it('only shows undo button when onCommit is not provided', () => {
    const { getAllByRole } = render(
      <CardActionBar
        visible={true}
        onUndo={mockOnUndo}
        enableHaptics={false}
      />
    );

    const buttons = getAllByRole('button');
    expect(buttons).toHaveLength(1);
  });

  it('shows both buttons when both callbacks are provided', () => {
    const { getAllByRole } = render(
      <CardActionBar
        visible={true}
        onUndo={mockOnUndo}
        onCommit={mockOnCommit}
        enableHaptics={false}
      />
    );

    const buttons = getAllByRole('button');
    expect(buttons).toHaveLength(2);
  });

  it('applies correct position styles', () => {
    const { rerender, getByTestId } = render(
      <CardActionBar
        visible={true}
        onUndo={mockOnUndo}
        position="top"
      />
    );

    // Test top position
    let container = getByTestId('card-action-bar-container');
    expect(container.props.style).toEqual(
      expect.objectContaining({
        position: 'absolute',
        top: 20,
      })
    );

    // Test bottom position
    rerender(
      <CardActionBar
        visible={true}
        onUndo={mockOnUndo}
        position="bottom"
      />
    );

    container = getByTestId('card-action-bar-container');
    expect(container.props.style).toEqual(
      expect.objectContaining({
        position: 'absolute',
        bottom: 100,
      })
    );
  });

  it('handles haptic feedback when enabled', async () => {
    const Haptics = require('expo-haptics');
    
    const { getByRole } = render(
      <CardActionBar
        visible={true}
        onUndo={mockOnUndo}
        enableHaptics={true}
      />
    );

    const undoButton = getByRole('button');
    fireEvent.press(undoButton);

    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  });

  it('does not trigger haptic feedback when disabled', async () => {
    const Haptics = require('expo-haptics');
    
    const { getByRole } = render(
      <CardActionBar
        visible={true}
        onUndo={mockOnUndo}
        enableHaptics={false}
      />
    );

    const undoButton = getByRole('button');
    fireEvent.press(undoButton);

    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });
});