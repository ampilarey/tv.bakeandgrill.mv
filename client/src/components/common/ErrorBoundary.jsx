import { Component } from 'react';
import Button from './Button';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // Optionally reload the page
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // Allow callers to supply a fully custom fallback component.
      const { FallbackComponent } = this.props;
      if (FallbackComponent) {
        return <FallbackComponent error={this.state.error} onReset={this.handleReset} />;
      }

      return (
        <div className="min-h-screen bg-tv-bg flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-tv-bgElevated rounded-2xl shadow-2xl border-2 border-tv-borderSubtle p-8">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-tv-error/20 flex items-center justify-center">
                <svg className="w-10 h-10 text-tv-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-bold text-tv-text mb-2">
                Oops! Something went wrong
              </h2>
              
              <p className="text-tv-textSecondary mb-6">
                {this.props.fallbackMessage || "We encountered an unexpected error. Don't worry, your data is safe."}
              </p>

              {this.state.error && (
                <details className="text-left mb-6 p-4 bg-tv-bgSoft rounded-lg border border-tv-borderSubtle">
                  <summary className="cursor-pointer text-tv-accent font-medium mb-2">
                    Error Details
                  </summary>
                  <pre className="text-xs text-tv-text overflow-auto whitespace-pre-wrap break-words">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => window.location.href = '/dashboard'}
                  className="flex-1"
                >
                  Go to Dashboard
                </Button>
                <Button
                  variant="primary"
                  onClick={this.handleReset}
                  className="flex-1"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

