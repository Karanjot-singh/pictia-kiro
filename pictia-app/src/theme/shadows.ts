/**
 * Shadow and elevation system for depth and visual hierarchy
 * Provides consistent shadow styles across components
 */

import { THEME_COLORS } from './colors';

export const SHADOWS = {
  // Card shadows
  CARD: {
    shadowColor: THEME_COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3, // Android elevation
  },

  // Button shadows
  BUTTON: {
    shadowColor: THEME_COLORS.BLACK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },

  // Floating element shadows (FABs, modals)
  FLOATING: {
    shadowColor: THEME_COLORS.BLACK,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },

  // Subtle shadows for thumbnails
  THUMBNAIL: {
    shadowColor: THEME_COLORS.BLACK,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  // Tab bar shadow - iOS style
  TAB_BAR: {
    shadowColor: THEME_COLORS.BLACK,
    shadowOffset: { width: 0, height: -0.5 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  // Modal/overlay shadows
  MODAL: {
    shadowColor: THEME_COLORS.BLACK,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },

  // No shadow (for removing shadows)
  NONE: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
} as const;

export type ShadowSystem = typeof SHADOWS;