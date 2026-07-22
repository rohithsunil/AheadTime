import React from "react";

// Wraps children in a React error boundary — prevents a single component
// crash from white-screening the entire app. Shows a friendly fallback.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("AheadTime ErrorBoundary caught:", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="glass-frost rounded-3xl p-8 max-w-sm w-full text-center">
            <div className="w-14 h-14 rounded-full bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[#FF8C42]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="text-foreground font-display text-xl mb-2">Something went wrong</h2>
            <p className="text-muted-foreground text-sm mb-6">The app hit an unexpected error. Try reloading — your data is safe.</p>
            <button
              onClick={this.handleReload}
              className="w-full accent-gradient text-white rounded-full py-3 font-semibold text-sm active:scale-[0.98] transition-transform"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}