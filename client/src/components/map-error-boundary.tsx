import React, { Component, ReactNode } from "react";
import { MapPin, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMsg?: string;
}

export class MapErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMsg: error.message };
  }

  componentDidCatch(error: Error) {
    console.warn("[MapErrorBoundary] Caught map error:", error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-muted/30 gap-3">
          <MapPin className="w-8 h-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground text-center px-6">
            Errore nel caricamento della mappa.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Riprova
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
