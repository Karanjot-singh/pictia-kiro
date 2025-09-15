/**
 * Typography system for consistent text styling
 * Provides font sizes, weights, and line heights
 */

export const TYPOGRAPHY = {
  // Font Families (using system fonts for best performance)
  PRIMARY_FONT: 'System',
  
  // Font Sizes
  HEADING_LARGE: 28,
  HEADING_MEDIUM: 22,
  HEADING_SMALL: 18,
  BODY_LARGE: 16,
  BODY_MEDIUM: 14,
  BODY_SMALL: 12,
  CAPTION: 10,
  
  // Font Weights
  WEIGHT_LIGHT: '300' as const,
  WEIGHT_REGULAR: '400' as const,
  WEIGHT_MEDIUM: '500' as const,
  WEIGHT_SEMIBOLD: '600' as const,
  WEIGHT_BOLD: '700' as const,
  
  // Line Heights
  LINE_HEIGHT_TIGHT: 1.2,
  LINE_HEIGHT_NORMAL: 1.4,
  LINE_HEIGHT_RELAXED: 1.6,
} as const;

// Pre-defined text styles for common use cases
export const TEXT_STYLES = {
  heading1: {
    fontSize: TYPOGRAPHY.HEADING_LARGE,
    fontWeight: TYPOGRAPHY.WEIGHT_BOLD,
    lineHeight: TYPOGRAPHY.HEADING_LARGE * TYPOGRAPHY.LINE_HEIGHT_TIGHT,
  },
  
  heading2: {
    fontSize: TYPOGRAPHY.HEADING_MEDIUM,
    fontWeight: TYPOGRAPHY.WEIGHT_SEMIBOLD,
    lineHeight: TYPOGRAPHY.HEADING_MEDIUM * TYPOGRAPHY.LINE_HEIGHT_TIGHT,
  },
  
  heading3: {
    fontSize: TYPOGRAPHY.HEADING_SMALL,
    fontWeight: TYPOGRAPHY.WEIGHT_SEMIBOLD,
    lineHeight: TYPOGRAPHY.HEADING_SMALL * TYPOGRAPHY.LINE_HEIGHT_NORMAL,
  },
  
  bodyLarge: {
    fontSize: TYPOGRAPHY.BODY_LARGE,
    fontWeight: TYPOGRAPHY.WEIGHT_REGULAR,
    lineHeight: TYPOGRAPHY.BODY_LARGE * TYPOGRAPHY.LINE_HEIGHT_NORMAL,
  },
  
  bodyMedium: {
    fontSize: TYPOGRAPHY.BODY_MEDIUM,
    fontWeight: TYPOGRAPHY.WEIGHT_REGULAR,
    lineHeight: TYPOGRAPHY.BODY_MEDIUM * TYPOGRAPHY.LINE_HEIGHT_NORMAL,
  },
  
  bodySmall: {
    fontSize: TYPOGRAPHY.BODY_SMALL,
    fontWeight: TYPOGRAPHY.WEIGHT_REGULAR,
    lineHeight: TYPOGRAPHY.BODY_SMALL * TYPOGRAPHY.LINE_HEIGHT_NORMAL,
  },
  
  caption: {
    fontSize: TYPOGRAPHY.CAPTION,
    fontWeight: TYPOGRAPHY.WEIGHT_REGULAR,
    lineHeight: TYPOGRAPHY.CAPTION * TYPOGRAPHY.LINE_HEIGHT_NORMAL,
  },
  
  buttonText: {
    fontSize: TYPOGRAPHY.BODY_MEDIUM,
    fontWeight: TYPOGRAPHY.WEIGHT_SEMIBOLD,
    lineHeight: TYPOGRAPHY.BODY_MEDIUM * TYPOGRAPHY.LINE_HEIGHT_NORMAL,
  },
} as const;

export type TypographySystem = typeof TYPOGRAPHY;
export type TextStyles = typeof TEXT_STYLES;