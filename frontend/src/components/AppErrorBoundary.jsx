import React from "react";
import { logError } from "../utils/errorHandling";

// Phase X6 — Part 1, Application Stability (Priority 0). Before this
// phase, nothing wrapped <AppProviders><AppRoot /></AppProviders> in
// main.jsx — any render-time throw (a broken provider, a bad lazy
// import, an undefined screen component) unmounted straight to a blank
// white page with no recovery path. This is the single backstop: no
// matter what throws anywhere in the tree, the user always sees a real
// screen with a real next step, never a blank page.
export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
    this.handleReload = this.handleReload.bind(this);
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Real diagnostic detail goes to the console/log only — never to the
    // screen (see PRIVATE_BETA_POLISH.md's "never a raw error" pattern,
    // extended here to the worst-case failure mode).
    logError("Application failed to render", error);
    if (info?.componentStack) {
      console.error("[frontend] component stack", info.componentStack);
    }
  }

  handleReload() {
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="onboarding-shell boot-loading" role="alert">
          <div className="onboarding-card onboarding-card--centered">
            <p className="eyebrow">ImpactOne</p>
            <h1 className="onboarding-title">Something went wrong loading the app</h1>
            <p className="company-description subtle">
              This is on our end, not yours — nothing you've saved was lost. Reloading usually fixes it. If it keeps
              happening, it's worth letting us know.
            </p>
            <button type="button" className="onboarding-continue-button" onClick={this.handleReload}>
              Reload ImpactOne
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
