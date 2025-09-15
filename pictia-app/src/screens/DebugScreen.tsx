import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
  Share,
} from 'react-native';
import DebugService, { 
  DebugInfo, 
  APIConnectivityResult, 
  ConfigValidationResult,
  AppConfiguration 
} from '@/services/DebugService';

interface DebugScreenProps {
  navigation: any;
}

const DebugScreen: React.FC<DebugScreenProps> = ({ navigation }) => {
  const [debugService] = useState(() => DebugService.getInstance());
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<DebugInfo[]>([]);
  const [apiTestResult, setApiTestResult] = useState<APIConnectivityResult | null>(null);
  const [configValidation, setConfigValidation] = useState<ConfigValidationResult | null>(null);
  const [environmentChecks, setEnvironmentChecks] = useState<any>(null);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedLogCategory, setSelectedLogCategory] = useState<string>('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsDeveloperMode(debugService.isDeveloperModeEnabled());
    setLogs(debugService.getLogs());
  };

  const handleDeveloperModeToggle = async (enabled: boolean) => {
    try {
      if (enabled) {
        await debugService.enableDeveloperMode();
      } else {
        await debugService.disableDeveloperMode();
      }
      setIsDeveloperMode(enabled);
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle developer mode');
    }
  };

  const handleAPIConnectivityTest = async () => {
    setIsLoading(true);
    try {
      const result = await debugService.testAPIConnectivity();
      setApiTestResult(result);
      
      const status = result.errors.length === 0 ? 'Success' : 'Issues Found';
      Alert.alert(
        'API Connectivity Test',
        `${status}\n\nAuthenticated: ${result.isAuthenticated ? 'Yes' : 'No'}\nCan Access Photos: ${result.canAccessPhotos ? 'Yes' : 'No'}\nResponse Time: ${result.responseTime}ms\n\n${result.errors.length > 0 ? 'Errors:\n' + result.errors.join('\n') : 'All tests passed!'}`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to test API connectivity');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigValidation = async () => {
    setIsLoading(true);
    try {
      const result = await debugService.validateConfiguration();
      setConfigValidation(result);
      
      const status = result.isValid ? 'Valid' : 'Invalid';
      const details = [
        `Google Cloud Project: ${result.config.hasGoogleCloudProject ? 'Yes' : 'No'}`,
        `OAuth Credentials: ${result.config.hasOAuthCredentials ? 'Yes' : 'No'}`,
        `Correct Scopes: ${result.config.hasCorrectScopes ? 'Yes' : 'No'}`,
        `Valid Redirect URI: ${result.config.hasValidRedirectURI ? 'Yes' : 'No'}`,
      ].join('\n');
      
      const issues = [
        ...result.errors.map(e => `Error: ${e}`),
        ...result.warnings.map(w => `Warning: ${w}`),
      ].join('\n');
      
      Alert.alert(
        'Configuration Validation',
        `Status: ${status}\n\n${details}\n\n${issues || 'No issues found'}`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to validate configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnvironmentCheck = async () => {
    setIsLoading(true);
    try {
      const result = await debugService.performEnvironmentChecks();
      setEnvironmentChecks(result);
      
      const summary = result.checks.map(check => 
        `${check.name}: ${check.status.toUpperCase()} - ${check.message}`
      ).join('\n');
      
      Alert.alert(
        'Environment Check',
        `Overall Status: ${result.overall.toUpperCase()}\n\n${summary}`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to perform environment checks');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetAllPhotosReviewed = async () => {
    Alert.alert(
      'Set All Photos Reviewed',
      'This will mark all photos in your Google Photos library as reviewed. This action cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await debugService.setAllPhotosReviewed();
              Alert.alert('Success', 'All photos have been marked as reviewed');
            } catch (error) {
              Alert.alert('Error', 'Failed to mark photos as reviewed');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSetAllPhotosUnreviewed = async () => {
    Alert.alert(
      'Set All Photos Unreviewed',
      'This will clear all review history, making all photos appear as unreviewed. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await debugService.setAllPhotosUnreviewed();
              Alert.alert('Success', 'All photos have been marked as unreviewed');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear review history');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleExportConfiguration = async () => {
    setIsLoading(true);
    try {
      const config = await debugService.exportConfiguration();
      const configString = JSON.stringify(config, null, 2);
      
      await Share.share({
        message: configString,
        title: 'Pictia Configuration Export',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to export configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewLogs = (category?: string) => {
    setSelectedLogCategory(category || '');
    const filteredLogs = category ? debugService.getLogs(category) : debugService.getLogs();
    setLogs(filteredLogs);
    setShowLogsModal(true);
  };

  const handleClearLogs = () => {
    Alert.alert(
      'Clear Logs',
      'This will clear all debug logs. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            debugService.clearLogs();
            setLogs([]);
            Alert.alert('Success', 'Logs cleared');
          },
        },
      ]
    );
  };

  const renderDebugOption = (
    title: string,
    description: string,
    onPress: () => void,
    icon: string,
    disabled = false
  ) => (
    <TouchableOpacity
      style={[styles.debugOption, disabled && styles.debugOptionDisabled]}
      onPress={onPress}
      disabled={disabled || isLoading}
    >
      <View style={styles.debugOptionIcon}>
        <Text style={styles.debugOptionIconText}>{icon}</Text>
      </View>
      <View style={styles.debugOptionContent}>
        <Text style={[styles.debugOptionTitle, disabled && styles.debugOptionTitleDisabled]}>
          {title}
        </Text>
        <Text style={[styles.debugOptionDescription, disabled && styles.debugOptionDescriptionDisabled]}>
          {description}
        </Text>
      </View>
      <Text style={[styles.debugOptionChevron, disabled && styles.debugOptionChevronDisabled]}>
        ›
      </Text>
    </TouchableOpacity>
  );

  const renderLogItem = (log: DebugInfo, index: number) => {
    const levelColors = {
      info: '#007bff',
      warn: '#ffc107',
      error: '#dc3545',
      debug: '#6c757d',
    };

    return (
      <View key={index} style={styles.logItem}>
        <View style={styles.logHeader}>
          <View style={[styles.logLevel, { backgroundColor: levelColors[log.level] }]}>
            <Text style={styles.logLevelText}>{log.level.toUpperCase()}</Text>
          </View>
          <Text style={styles.logCategory}>{log.category}</Text>
          <Text style={styles.logTimestamp}>
            {new Date(log.timestamp).toLocaleTimeString()}
          </Text>
        </View>
        <Text style={styles.logMessage}>{log.message}</Text>
        {log.data && (
          <Text style={styles.logData}>
            {typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}
          </Text>
        )}
      </View>
    );
  };

  const renderLogsModal = () => (
    <Modal
      visible={showLogsModal}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            Debug Logs {selectedLogCategory && `- ${selectedLogCategory}`}
          </Text>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowLogsModal(false)}
          >
            <Text style={styles.modalCloseText}>Done</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.logsContainer}>
          {logs.length === 0 ? (
            <View style={styles.emptyLogsContainer}>
              <Text style={styles.emptyLogsText}>No logs available</Text>
            </View>
          ) : (
            logs.map(renderLogItem)
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Debug Tools</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Developer Mode Toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Developer Mode</Text>
          <View style={styles.developerModeContainer}>
            <View style={styles.developerModeContent}>
              <Text style={styles.developerModeTitle}>Enable Developer Mode</Text>
              <Text style={styles.developerModeDescription}>
                Show detailed logging and error information
              </Text>
            </View>
            <Switch
              value={isDeveloperMode}
              onValueChange={handleDeveloperModeToggle}
              trackColor={{ false: '#e9ecef', true: '#007bff' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* API Testing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API Testing</Text>
          {renderDebugOption(
            'Test API Connectivity',
            'Check Google Photos API connection and permissions',
            handleAPIConnectivityTest,
            '🔗'
          )}
          {renderDebugOption(
            'Validate Configuration',
            'Check Google Cloud Console and OAuth setup',
            handleConfigValidation,
            '⚙️'
          )}
          {renderDebugOption(
            'Environment Check',
            'Verify app environment and dependencies',
            handleEnvironmentCheck,
            '🔍'
          )}
        </View>

        {/* Photo Review Testing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photo Review Testing</Text>
          {renderDebugOption(
            'Mark All Photos Reviewed',
            'Set all photos as reviewed for testing',
            handleSetAllPhotosReviewed,
            '✅'
          )}
          {renderDebugOption(
            'Mark All Photos Unreviewed',
            'Clear all review history for testing',
            handleSetAllPhotosUnreviewed,
            '🔄'
          )}
        </View>

        {/* Configuration Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuration</Text>
          {renderDebugOption(
            'Export Configuration',
            'Export app settings for team sharing',
            handleExportConfiguration,
            '📤'
          )}
        </View>

        {/* Logging */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Logging</Text>
          {renderDebugOption(
            'View All Logs',
            'Show all debug logs and messages',
            () => handleViewLogs(),
            '📋'
          )}
          {renderDebugOption(
            'View Error Logs',
            'Show only error logs',
            () => handleViewLogs('error'),
            '🚨'
          )}
          {renderDebugOption(
            'Clear Logs',
            'Clear all debug logs',
            handleClearLogs,
            '🗑️'
          )}
        </View>

        {/* Test Results */}
        {(apiTestResult || configValidation || environmentChecks) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Last Test Results</Text>
            
            {apiTestResult && (
              <View style={styles.testResult}>
                <Text style={styles.testResultTitle}>API Connectivity</Text>
                <Text style={styles.testResultText}>
                  Authenticated: {apiTestResult.isAuthenticated ? '✅' : '❌'}
                </Text>
                <Text style={styles.testResultText}>
                  Can Access Photos: {apiTestResult.canAccessPhotos ? '✅' : '❌'}
                </Text>
                <Text style={styles.testResultText}>
                  Response Time: {apiTestResult.responseTime}ms
                </Text>
                {apiTestResult.errors.length > 0 && (
                  <Text style={styles.testResultError}>
                    Errors: {apiTestResult.errors.length}
                  </Text>
                )}
              </View>
            )}

            {configValidation && (
              <View style={styles.testResult}>
                <Text style={styles.testResultTitle}>Configuration</Text>
                <Text style={styles.testResultText}>
                  Status: {configValidation.isValid ? '✅ Valid' : '❌ Invalid'}
                </Text>
                <Text style={styles.testResultText}>
                  Errors: {configValidation.errors.length}
                </Text>
                <Text style={styles.testResultText}>
                  Warnings: {configValidation.warnings.length}
                </Text>
              </View>
            )}

            {environmentChecks && (
              <View style={styles.testResult}>
                <Text style={styles.testResultTitle}>Environment</Text>
                <Text style={styles.testResultText}>
                  Overall: {environmentChecks.overall === 'pass' ? '✅' : 
                           environmentChecks.overall === 'warning' ? '⚠️' : '❌'} {environmentChecks.overall.toUpperCase()}
                </Text>
                <Text style={styles.testResultText}>
                  Checks: {environmentChecks.checks.length}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007bff" />
            <Text style={styles.loadingText}>Running tests...</Text>
          </View>
        </View>
      )}

      {renderLogsModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 18,
    color: '#007bff',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212529',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#ffffff',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#495057',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  developerModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  developerModeContent: {
    flex: 1,
    marginRight: 16,
  },
  developerModeTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 2,
  },
  developerModeDescription: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 18,
  },
  debugOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  debugOptionDisabled: {
    opacity: 0.5,
  },
  debugOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  debugOptionIconText: {
    fontSize: 20,
  },
  debugOptionContent: {
    flex: 1,
  },
  debugOptionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 2,
  },
  debugOptionTitleDisabled: {
    color: '#6c757d',
  },
  debugOptionDescription: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 18,
  },
  debugOptionDescriptionDisabled: {
    color: '#adb5bd',
  },
  debugOptionChevron: {
    fontSize: 20,
    color: '#adb5bd',
    marginLeft: 8,
  },
  debugOptionChevronDisabled: {
    color: '#dee2e6',
  },
  testResult: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  testResultTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 8,
  },
  testResultText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  testResultError: {
    fontSize: 14,
    color: '#dc3545',
    marginTop: 4,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6c757d',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212529',
  },
  modalCloseButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007bff',
  },
  logsContainer: {
    flex: 1,
    padding: 16,
  },
  emptyLogsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyLogsText: {
    fontSize: 16,
    color: '#6c757d',
  },
  logItem: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logLevel: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  logLevelText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  logCategory: {
    fontSize: 12,
    fontWeight: '500',
    color: '#495057',
    marginRight: 8,
  },
  logTimestamp: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 'auto',
  },
  logMessage: {
    fontSize: 14,
    color: '#212529',
    marginBottom: 4,
  },
  logData: {
    fontSize: 12,
    color: '#6c757d',
    fontFamily: 'monospace',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 4,
  },
});

export default DebugScreen;