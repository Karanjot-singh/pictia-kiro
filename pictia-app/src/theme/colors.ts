/**
 * Color palette inspired by modern dating apps like Tinder
 * Provides a cohesive, vibrant color scheme for photo organization
 */

export const THEME_COLORS = {
  // Primary Colors (Tinder-inspired)
  PRIMARY: '#7444C0',           // Main brand color - vibrant purple
  SECONDARY: '#5636B8',         // Secondary brand color - deeper purple
  ACCENT: '#B644B2',            // Accent for highlights - pink-purple

  // Functional Colors
  SUCCESS: '#46A575',           // Keep/positive actions - green
  DANGER: '#D04949',            // Delete/negative actions - red
  WARNING: '#FFA200',           // Caution/star actions - orange
  INFO: '#5028D7',              // Information/flash actions - blue

  // Neutral Colors
  WHITE: '#FFFFFF',
  LIGHT_GRAY: '#F8F9FA',
  GRAY: '#757E90',
  DARK_GRAY: '#363636',
  BLACK: '#000000',

  // Background Colors
  BACKGROUND_PRIMARY: '#FFFFFF',
  BACKGROUND_SECONDARY: '#F8F9FA',
  SURFACE: '#FFFFFF',

  // Text Colors
  TEXT_PRIMARY: '#363636',
  TEXT_SECONDARY: '#757E90',
  TEXT_LIGHT: '#FFFFFF',

  // Gradients (arrays for LinearGradient)
  PRIMARY_GRADIENT: ['#7444C0', '#5636B8'] as const,
  ACCENT_GRADIENT: ['#B644B2', '#7444C0'] as const,
  SUCCESS_GRADIENT: ['#46A575', '#2E8B57'] as const,
  DANGER_GRADIENT: ['#D04949', '#B22222'] as const,
} as const;

// Dark theme colors (for future dark mode support)
export const DARK_THEME_COLORS = {
  ...THEME_COLORS,
  
  // Override specific colors for dark mode
  BACKGROUND_PRIMARY: '#1A1A1A',
  BACKGROUND_SECONDARY: '#2D2D2D',
  SURFACE: '#2D2D2D',
  TEXT_PRIMARY: '#FFFFFF',
  TEXT_SECONDARY: '#B0B0B0',
  LIGHT_GRAY: '#2D2D2D',
  GRAY: '#757E90',
  DARK_GRAY: '#FFFFFF',
} as const;

export type ColorPalette = typeof THEME_COLORS;