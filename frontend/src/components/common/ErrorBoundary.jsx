import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === "function"
          ? this.props.fallback(this.state.error, this.handleReset)
          : this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] w-full flex-col items-center justify-center p-8 text-center">
          <div className="max-w-lg rounded-2xl border border-red-500/25 bg-[#0e1628]/95 p-8 shadow-2xl backdrop-blur-xl">
            <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-red-500/10 text-red-400 ring-1 ring-red-500/20">
              <AlertTriangle className="size-6" />
            </div>

            <h3 className="text-[17px] font-bold text-white">
              {this.props.title || "Something went wrong rendering this view"}
            </h3>

            <p className="mt-2 text-[13px] leading-relaxed text-slate-300">
              {this.state.error?.message ||
                "An unexpected rendering error occurred. You can reload this view or return to home."}
            </p>

            {this.state.errorInfo?.componentStack && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-[11px] font-medium text-slate-400 hover:text-slate-200">
                  Technical Error Details
                </summary>
                <pre className="mt-2 max-h-36 overflow-auto rounded-lg border border-[#1b2640] bg-[#070d18] p-3 text-[10.5px] font-mono text-red-300/90 leading-tight">
                  {this.state.error?.stack || this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-[12.5px] font-semibold text-white shadow-md shadow-blue-600/30 transition-all hover:bg-blue-500 active:scale-95"
              >
                <RefreshCw className="size-3.5" />
                <span>Try Again</span>
              </button>

              {this.props.onNavigateHome && (
                <button
                  type="button"
                  onClick={this.props.onNavigateHome}
                  className="flex items-center gap-2 rounded-xl border border-[#1c2a47] bg-[#0d1629] px-4 py-2 text-[12.5px] font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
                >
                  <Home className="size-3.5" />
                  <span>Return to Home</span>
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
