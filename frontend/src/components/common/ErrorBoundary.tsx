import { Component, ErrorInfo, ReactNode } from 'react';
import { reportClientError } from '../../services/observability/clientErrorReporter.js';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportClientError(error, info.componentStack ?? undefined);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 text-center">
          <h2 className="font-serif text-heading-lg text-charcoal-900 mb-3">Something went wrong</h2>
          <p className="text-body text-charcoal-400 mb-6 max-w-md">
            We encountered an unexpected error. Please refresh the page or try again later.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-charcoal-900 text-ivory-100 text-body-sm font-medium tracking-wide hover:bg-charcoal-800 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
