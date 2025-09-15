/**
 * Theme Demo Component
 * Demonstrates the theme system colors and styling
 * This is a temporary component to showcase the theme implementation
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from './ThemeProvider';

export const ThemeDemo: React.FC = () => {
  const { theme } = useTheme();

  const ColorSwatch: React.FC<{ color: string; name: string }> = ({ color, name }) => (
    <View style={styles.swatchContainer}>
      <View style={[styles.colorSwatch, { backgroundColor: color, ...theme.shadows.CARD }]} />
      <Text style={[styles.colorName, { color: theme.colors.TEXT_PRIMARY }]}>{name}</Text>
      <Text style={[styles.colorValue, { color: theme.colors.TEXT_SECONDARY }]}>{color}</Text>
    </View>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.BACKGROUND_PRIMARY }]}>
      <Text style={[styles.title, { color: theme.colors.TEXT_PRIMARY }]}>Theme System Demo</Text>
      
      <Text style={[styles.sectionTitle, { color: theme.colors.PRIMARY }]}>Primary Colors</Text>
      <View style={styles.colorGrid}>
        <ColorSwatch color={theme.colors.PRIMARY} name="Primary" />
        <ColorSwatch color={theme.colors.SECONDARY} name="Secondary" />
        <ColorSwatch color={theme.colors.ACCENT} name="Accent" />
      </View>

      <Text style={[styles.sectionTitle, { color: theme.colors.PRIMARY }]}>Functional Colors</Text>
      <View style={styles.colorGrid}>
        <ColorSwatch color={theme.colors.SUCCESS} name="Success" />
        <ColorSwatch color={theme.colors.DANGER} name="Danger" />
        <ColorSwatch color={theme.colors.WARNING} name="Warning" />
        <ColorSwatch color={theme.colors.INFO} name="Info" />
      </View>

      <Text style={[styles.sectionTitle, { color: theme.colors.PRIMARY }]}>Neutral Colors</Text>
      <View style={styles.colorGrid}>
        <ColorSwatch color={theme.colors.WHITE} name="White" />
        <ColorSwatch color={theme.colors.LIGHT_GRAY} name="Light Gray" />
        <ColorSwatch color={theme.colors.GRAY} name="Gray" />
        <ColorSwatch color={theme.colors.DARK_GRAY} name="Dark Gray" />
      </View>

      <View style={[styles.shadowDemo, theme.shadows.CARD, { backgroundColor: theme.colors.WHITE }]}>
        <Text style={[styles.shadowText, { color: theme.colors.TEXT_PRIMARY }]}>
          Card with Shadow
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 16,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  swatchContainer: {
    alignItems: 'center',
    marginBottom: 16,
    width: '30%',
  },
  colorSwatch: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginBottom: 8,
  },
  colorName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  colorValue: {
    fontSize: 10,
    textAlign: 'center',
  },
  shadowDemo: {
    padding: 20,
    borderRadius: 16,
    marginTop: 24,
    alignItems: 'center',
  },
  shadowText: {
    fontSize: 16,
    fontWeight: '500',
  },
});