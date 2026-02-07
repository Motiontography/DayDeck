import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors, Dimensions } from '../../constants';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container} accessibilityRole="alert">
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            The app encountered an unexpected error. Please try again.
          </Text>
          {__DEV__ && this.state.error && (
            <Text style={styles.errorDetail} numberOfLines={6}>
              {this.state.error.message}
            </Text>
          )}
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={this.handleRetry}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Dimensions.screenPadding * 2,
  },
  title: {
    fontSize: Dimensions.fontXXL,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  message: {
    fontSize: Dimensions.fontMD,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  errorDetail: {
    fontSize: Dimensions.fontXS,
    color: Colors.error,
    backgroundColor: Colors.surfaceSecondary,
    padding: Dimensions.cardPadding,
    borderRadius: Dimensions.radiusSmall,
    marginBottom: 20,
    alignSelf: 'stretch',
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: Dimensions.radiusMedium,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  buttonPressed: {
    backgroundColor: Colors.primaryDark,
  },
  buttonText: {
    fontSize: Dimensions.fontMD,
    fontWeight: '600',
    color: Colors.surface,
  },
});
