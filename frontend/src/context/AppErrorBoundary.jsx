import React from "react";
import { logError } from "../utils/errorHandling";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    logError("Unhandled render error", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="screen-page">
          <section className="screen-hero">
            <div>
              <p className="eyebrow">ImpactOne</p>
              <h1>Something went wrong</h1>
              <p className="subtext">The interface hit an unexpected error. Please refresh and try again.</p>
            </div>
          </section>
        </div>
      );
    }

    return this.props.children;
  }
}
