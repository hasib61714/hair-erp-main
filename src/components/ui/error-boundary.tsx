import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface State { hasError: boolean; message: string }

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{ fallback?: React.ReactNode }>,
  State
> {
  constructor(props: React.PropsWithChildren<{ fallback?: React.ReactNode }>) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-4">
          <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1">Something went wrong</p>
            <p className="text-xs text-muted-foreground max-w-xs">{this.state.message}</p>
          </div>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, message: "" })}
            className="btn-secondary h-8 px-3 text-xs gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
