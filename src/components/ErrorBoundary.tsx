import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryTimeout: NodeJS.Timeout | null = null;
  private maxRetries = 3;
  private retryDelay = 5000; // 5 seconds

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Store error info
    this.setState({
      error,
      errorInfo,
      errorCount: this.state.errorCount + 1,
    });

    // Log to external service in production (if needed)
    // this.logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    // Prevent infinite retry loops
    if (this.state.errorCount >= this.maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorCount: 0,
      });
      // Force a full page reload as last resort
      window.location.reload();
      return;
    }

    // Retry with exponential backoff
    const delay = this.retryDelay * Math.pow(2, this.state.errorCount);
    this.retryTimeout = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
      });
    }, delay);
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isMaxRetries = this.state.errorCount >= this.maxRetries;

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-4">
          <Card className="max-w-2xl w-full p-6 bg-card border-destructive/50">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="text-2xl font-bold text-destructive mb-2">
                    Something went wrong
                  </h1>
                  <p className="text-muted-foreground">
                    {isMaxRetries
                      ? 'Multiple errors occurred. The application will reload.'
                      : 'An unexpected error occurred. You can try to recover or reload the page.'}
                  </p>
                </div>

                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-4 p-4 bg-muted rounded-lg text-sm">
                    <summary className="cursor-pointer font-medium mb-2">
                      Error Details (Development Only)
                    </summary>
                    <div className="space-y-2">
                      <div>
                        <strong>Error:</strong>
                        <pre className="mt-1 p-2 bg-background rounded overflow-auto text-xs">
                          {this.state.error.toString()}
                        </pre>
                      </div>
                      {this.state.errorInfo && (
                        <div>
                          <strong>Stack Trace:</strong>
                          <pre className="mt-1 p-2 bg-background rounded overflow-auto text-xs max-h-40">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}

                <div className="flex gap-2 flex-wrap">
                  {!isMaxRetries && (
                    <Button onClick={this.handleReset} variant="default">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry ({this.maxRetries - this.state.errorCount} attempts left)
                    </Button>
                  )}
                  <Button onClick={this.handleReload} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reload Page
                  </Button>
                  <Button onClick={this.handleGoHome} variant="outline">
                    <Home className="h-4 w-4 mr-2" />
                    Go Home
                  </Button>
                </div>

                {this.state.errorCount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Error count: {this.state.errorCount}/{this.maxRetries}
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
