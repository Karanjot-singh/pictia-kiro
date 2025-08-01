import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Dimensions,
} from 'react-native';
import Slider from '@react-native-community/slider';

const { width: screenWidth } = Dimensions.get('window');

export interface GestureConfigOptions {
  swipeThreshold: number;
  enableHaptics: boolean;
  enableVisualFeedback: boolean;
  cardRotationEnabled: boolean;
  maxRotationDegrees: number;
  animationDuration: number;
}

interface GestureConfigProps {
  config: GestureConfigOptions;
  onConfigChange: (config: GestureConfigOptions) => void;
  style?: any;
}

const GestureConfig: React.FC<GestureConfigProps> = ({
  config,
  onConfigChange,
  style,
}) => {
  const updateConfig = (key: keyof GestureConfigOptions, value: any) => {
    onConfigChange({
      ...config,
      [key]: value,
    });
  };

  const getThresholdPercentage = () => {
    return Math.round((config.swipeThreshold / screenWidth) * 100);
  };

  const setThresholdFromPercentage = (percentage: number) => {
    const threshold = (percentage / 100) * screenWidth;
    updateConfig('swipeThreshold', threshold);
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>Gesture Settings</Text>
      
      {/* Swipe Threshold */}
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>
          Swipe Threshold: {getThresholdPercentage()}%
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={15}
          maximumValue={50}
          value={getThresholdPercentage()}
          onValueChange={setThresholdFromPercentage}
          step={5}
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#E5E5EA"
          thumbTintColor="#007AFF"
        />
        <Text style={styles.settingDescription}>
          Distance required to trigger swipe action
        </Text>
      </View>

      {/* Haptic Feedback */}
      <View style={styles.settingRow}>
        <View style={styles.switchRow}>
          <Text style={styles.settingLabel}>Haptic Feedback</Text>
          <Switch
            value={config.enableHaptics}
            onValueChange={(value) => updateConfig('enableHaptics', value)}
            trackColor={{ false: '#E5E5EA', true: '#34C759' }}
            thumbColor="#FFFFFF"
          />
        </View>
        <Text style={styles.settingDescription}>
          Vibration feedback when swiping
        </Text>
      </View>

      {/* Visual Feedback */}
      <View style={styles.settingRow}>
        <View style={styles.switchRow}>
          <Text style={styles.settingLabel}>Visual Feedback</Text>
          <Switch
            value={config.enableVisualFeedback}
            onValueChange={(value) => updateConfig('enableVisualFeedback', value)}
            trackColor={{ false: '#E5E5EA', true: '#34C759' }}
            thumbColor="#FFFFFF"
          />
        </View>
        <Text style={styles.settingDescription}>
          Show keep/delete overlays while swiping
        </Text>
      </View>

      {/* Card Rotation */}
      <View style={styles.settingRow}>
        <View style={styles.switchRow}>
          <Text style={styles.settingLabel}>Card Rotation</Text>
          <Switch
            value={config.cardRotationEnabled}
            onValueChange={(value) => updateConfig('cardRotationEnabled', value)}
            trackColor={{ false: '#E5E5EA', true: '#34C759' }}
            thumbColor="#FFFFFF"
          />
        </View>
        <Text style={styles.settingDescription}>
          Rotate cards while swiping
        </Text>
      </View>

      {/* Max Rotation Degrees */}
      {config.cardRotationEnabled && (
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>
            Max Rotation: {config.maxRotationDegrees}°
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={10}
            maximumValue={45}
            value={config.maxRotationDegrees}
            onValueChange={(value: number) => updateConfig('maxRotationDegrees', Math.round(value))}
            step={5}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor="#E5E5EA"
            thumbTintColor="#007AFF"
          />
          <Text style={styles.settingDescription}>
            Maximum card rotation angle
          </Text>
        </View>
      )}

      {/* Animation Duration */}
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>
          Animation Speed: {config.animationDuration}ms
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={200}
          maximumValue={600}
          value={config.animationDuration}
          onValueChange={(value: number) => updateConfig('animationDuration', Math.round(value))}
          step={50}
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#E5E5EA"
          thumbTintColor="#007AFF"
        />
        <Text style={styles.settingDescription}>
          Card animation duration
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
    textAlign: 'center',
  },
  settingRow: {
    marginBottom: 20,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  settingDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  slider: {
    width: '100%',
    height: 40,
  },
});

export default GestureConfig;