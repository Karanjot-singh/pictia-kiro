/**
 * Consistent spacing system based on 8px grid
 * Provides standardized spacing for layouts and components
 */

export const SPACING = {
  // Base spacing units (8px grid system)
  XS: 4,
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
  XXL: 48,
  XXXL: 64,

  // Component-specific spacing
  CARD_PADDING: 20,
  BUTTON_PADDING: 16,
  SCREEN_PADDING: 20,
  GRID_SPACING: 12,
  TAB_BAR_PADDING: 10,

  // Layout spacing
  SECTION_SPACING: 32,
  ITEM_SPACING: 16,
  CONTENT_SPACING: 24,
} as const;

export const BORDER_RADIUS = {
  NONE: 0,
  SM: 8,
  MD: 12,
  LG: 16,
  XL: 24,
  XXL: 32,
  CIRCLE: 999,
  
  // Component-specific radius
  CARD: 16,
  BUTTON: 12,
  THUMBNAIL: 12,
  INPUT: 8,
} as const;

export type SpacingSystem = typeof SPACING;
export type BorderRadiusSystem = typeof BORDER_RADIUS;