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
        <div style={{
          padding: '32px',
          backgroundColor: '#f6f6f7',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 600 }}>
            Preview Failed
          </h3>
          <p style={{ color: '#6d7175', margin: '0 0 16px' }}>
            Something went wrong rendering the preview.
            {this.state.error?.message && (
              <>
                <br />
                <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                  {this.state.error.message}
                </span>
              </>
            )}
          </p>
          <s-button variant="primary" onClick={this.handleRetry}>
            Try Again
          </s-button>
        </div>
      );
    }

    return this.props.children;
  }
}
