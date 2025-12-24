import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary to catch rendering errors in preview
 * Provides retry functionality and user-friendly error display
 */
export class PreviewErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Preview error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <s-box padding="large-400" background="subdued" borderRadius="base">
          <s-stack gap="base" alignItems="center">
            <s-icon type="alert-circle" />
            <s-heading>Preview Failed</s-heading>
            <s-text color="subdued">
              Something went wrong rendering the preview.
            </s-text>
            {this.state.error?.message && (
              <s-box padding="small" background="base" borderRadius="small">
                <s-text color="subdued">{this.state.error.message}</s-text>
              </s-box>
            )}
            <s-button variant="primary" onClick={this.handleRetry}>
              Try Again
            </s-button>
          </s-stack>
        </s-box>
      );
    }

    return this.props.children;
  }
}
