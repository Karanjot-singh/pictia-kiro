/**
 * Main theme export file
 * Consolidates all theme constants for easy importing
 */

export { THEME_COLORS, DARK_THEME_COLORS, type ColorPalette } from './colors';
export { SPACING, BORDER_RADIUS, type SpacingSystem, type BorderRadiusSystem } from './spacing';
export { SHADOWS, type ShadowSystem } from './shadows';
export { TYPOGRAPHY, TEXT_STYLES, type TypographySystem, type TextStyles } from './typography';
export { ThemeProvider, useTheme, useThemeColors, useThemeSpacing } from './ThemeProvider';
export { ThemeDemo } from './ThemeDemo';

// Import all theme constants
import { THEME_COLORS, DARK_THEME_COLORS } from './colors';
import { SPACING, BORDER_RADIUS } from './spacing';
import { SHADOWS } from './shadows';
import { TYPOGRAPHY, TEXT_STYLES } from './typography';

// Complete theme object for easy access
export const THEME = {
  colors: THEME_COLORS,
  spacing: SPACING,
  borderRadius: BORDER_RADIUS,
  shadows: SHADOWS,
  typography: TYPOGRAPHY,
  textStyles: TEXT_STYLES,
} as const;

// Dark theme object
export const DARK_THEME = {
  ...THEME,
  colors: DARK_THEME_COLORS,
} as const;

export type Theme = {
  colors: typeof THEME_COLORS | typeof DARK_THEME_COLORS;
  spacing: typeof SPACING;
  borderRadius: typeof BORDER_RADIUS;
  shadows: typeof SHADOWS;
  typography: typeof TYPOGRAPHY;
  textStyles: typeof TEXT_STYLES;
};