import React from "react";
import { logError } from "../utils/errorHandling";

export default class ScreenErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    logError("AI Analysis render failed", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="screen-page">
          <section className="screen-hero">
            <div>
              <p className="eyebrow">AI Analysis</p>
              <h1>Live stock analysis from one search</h1>
              <p className="subtext">The analysis panel hit an unexpected rendering issue, but the rest of the app is still available.</p>
            </div>
          </section>
          <div className="screen-card panel-card">
            <p className="company-description">Try another ticker or refresh the analysis once the data finishes loading.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
