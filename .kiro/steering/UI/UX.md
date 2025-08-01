---
inclusion: always
---

# UI/UX Guidelines

## Platform Design Standards

Follow the latest platform-specific design guidelines:
- **iOS**: Human Interface Guidelines (HIG) for native iOS patterns
- **Android**: Material Design 3 for consistent Android experience
- Use React Native's platform-specific components when available

## Swipe Interface Design

The core photo organization feature should follow these principles:

### Swipe Mechanics
- **Left swipe**: Delete/remove photo (destructive action)
- **Right swipe**: Keep photo (positive action)
- **Visual feedback**: Clear animations and haptic feedback for swipe actions
- **Threshold**: Minimum swipe distance before action triggers
- **Snap back**: Return to center if swipe doesn't meet threshold

### Animation Inspiration
Draw inspiration from Bumble's card-based swipe interface:
- **Smooth transitions**: 60fps animations for fluid experience
- **Card rotation**: Subtle rotation during swipe for natural feel
- **Stack depth**: Show next photo underneath current one
- **Exit animations**: Cards should animate off-screen in swipe direction

### Visual Design
- **Card shadows**: Subtle elevation for depth perception
- **Corner radius**: Consistent with platform standards
- **Safe areas**: Respect device notches and home indicators
- **Loading states**: Skeleton screens while photos load

## Accessibility

- **VoiceOver/TalkBack**: Proper labels for all interactive elements
- **High contrast**: Support system accessibility settings
- **Large text**: Scale with user's preferred text size
- **Alternative actions**: Provide button alternatives to swipe gestures

## Performance Considerations

- **Image optimization**: Lazy load and cache photos appropriately
- **Smooth scrolling**: Maintain 60fps during swipe interactions
- **Memory management**: Preload next few photos, unload distant ones
- **Network efficiency**: Progressive image loading based on connection